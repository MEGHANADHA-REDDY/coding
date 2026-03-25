const { validationResult } = require('express-validator');
const crypto = require('crypto');
const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');
const Problem = require('../models/Problem');
const Violation = require('../models/Violation');

function fisherYatesShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

exports.getAvailableExams = async (req, res) => {
  try {
    const now = new Date();
    const exams = await Exam.find({
      allowedStudents: req.user.id,
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
      .select('title startTime endTime maxViolations sections')
      .sort({ startTime: 1 })
      .lean();

    const examsWithSession = await Promise.all(
      exams.map(async (exam) => {
        const session = await ExamSession.findOne({
          examId: exam._id,
          studentId: req.user.id,
        }).lean();
        const totalDuration = exam.sections.reduce((s, sec) => s + sec.durationMinutes, 0);
        return {
          _id: exam._id,
          title: exam.title,
          startTime: exam.startTime,
          endTime: exam.endTime,
          maxViolations: exam.maxViolations,
          totalDurationMinutes: totalDuration,
          sectionCount: exam.sections.length,
          hasStarted: !!session,
          isSubmitted: session?.isSubmitted || false,
        };
      })
    );

    res.json({ exams: examsWithSession });
  } catch (error) {
    console.error('Get available exams error:', error);
    res.status(500).json({ error: 'Failed to fetch exams.' });
  }
};

exports.startExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    if (!exam.isActive) {
      return res.status(403).json({ error: 'Exam is not active.' });
    }

    const now = new Date();
    if (now < exam.startTime || now > exam.endTime) {
      return res.status(403).json({ error: 'Exam is not within the valid time window.' });
    }

    if (!exam.allowedStudents.map((id) => id.toString()).includes(studentId)) {
      return res.status(403).json({ error: 'You are not allowed to take this exam.' });
    }

    let session = await ExamSession.findOne({ examId, studentId });

    if (session && session.isSubmitted) {
      return res.status(403).json({ error: 'You have already submitted this exam.' });
    }

    if (!session) {
      const assignedSections = [];

      for (const section of exam.sections) {
        let problemIds = section.problems.map((id) => id);

        if (section.randomCount > 0 && section.randomCount < section.problems.length) {
          problemIds = fisherYatesShuffle(section.problems).slice(0, section.randomCount);
        }

        assignedSections.push({ problems: problemIds });
      }

      session = await ExamSession.create({
        examId,
        studentId,
        currentSection: 0,
        sectionStartedAt: now,
        assignedSections,
      });
    }

    res.json({ session });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ error: 'Failed to start exam.' });
  }
};

exports.getExamProblems = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    if (!exam.allowedStudents.map((id) => id.toString()).includes(studentId)) {
      return res.status(403).json({ error: 'You are not allowed to access this exam.' });
    }

    const session = await ExamSession.findOne({ examId, studentId });
    if (!session) {
      return res.status(403).json({ error: 'You must start the exam first.' });
    }

    if (session.isSubmitted) {
      return res.status(403).json({ error: 'Exam already submitted.' });
    }

    const sectionIndex = session.currentSection;
    const examSection = exam.sections[sectionIndex];
    const assignedSection = session.assignedSections[sectionIndex];

    if (!examSection || !assignedSection) {
      return res.status(400).json({ error: 'Invalid section state.' });
    }

    const problemIds = assignedSection.problems;
    const problems = await Problem.find({ _id: { $in: problemIds } })
      .select('title description constraints inputFormat outputFormat difficulty type sampleTestCases options boilerplateCode')
      .lean();

    const sections = exam.sections.map((s, i) => ({
      label: s.label || `Section ${i + 1}`,
      type: s.type,
      durationMinutes: s.durationMinutes,
    }));

    res.json({
      exam: {
        _id: exam._id,
        title: exam.title,
        maxViolations: exam.maxViolations,
      },
      sections,
      currentSection: sectionIndex,
      sectionStartedAt: session.sectionStartedAt,
      problems,
      session: {
        violationCount: session.violationCount,
        isSubmitted: session.isSubmitted,
      },
    });
  } catch (error) {
    console.error('Get exam problems error:', error);
    res.status(500).json({ error: 'Failed to fetch exam problems.' });
  }
};

exports.advanceSection = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    const session = await ExamSession.findOne({ examId, studentId });
    if (!session) {
      return res.status(404).json({ error: 'Exam session not found.' });
    }

    if (session.isSubmitted) {
      return res.status(403).json({ error: 'Exam already submitted.' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const nextSection = session.currentSection + 1;

    if (nextSection >= exam.sections.length) {
      session.isSubmitted = true;
      session.endedAt = new Date();
      await session.save();
      return res.json({ message: 'All sections complete. Exam submitted.', submitted: true });
    }

    session.currentSection = nextSection;
    session.sectionStartedAt = new Date();
    await session.save();

    res.json({
      message: `Advanced to section ${nextSection + 1}.`,
      submitted: false,
      currentSection: nextSection,
      sectionStartedAt: session.sectionStartedAt,
    });
  } catch (error) {
    console.error('Advance section error:', error);
    res.status(500).json({ error: 'Failed to advance section.' });
  }
};

exports.reportViolation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { examId } = req.params;
    const studentId = req.user.id;
    const { type } = req.body;

    const session = await ExamSession.findOne({ examId, studentId });
    if (!session) {
      return res.status(404).json({ error: 'Exam session not found.' });
    }

    if (session.isSubmitted) {
      return res.status(403).json({ error: 'Exam already submitted.' });
    }

    await Violation.create({ examId, studentId, type });
    session.violationCount += 1;

    const exam = await Exam.findById(examId);
    let autoSubmitted = false;

    if (session.violationCount >= exam.maxViolations) {
      session.isSubmitted = true;
      session.endedAt = new Date();
      autoSubmitted = true;
    }

    await session.save();

    res.json({
      violationCount: session.violationCount,
      maxViolations: exam.maxViolations,
      autoSubmitted,
    });
  } catch (error) {
    console.error('Report violation error:', error);
    res.status(500).json({ error: 'Failed to report violation.' });
  }
};

exports.autoSubmitExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    const session = await ExamSession.findOne({ examId, studentId });
    if (!session) {
      return res.status(404).json({ error: 'Exam session not found.' });
    }

    if (session.isSubmitted) {
      return res.status(400).json({ error: 'Exam already submitted.' });
    }

    session.isSubmitted = true;
    session.endedAt = new Date();
    await session.save();

    res.json({ message: 'Exam submitted successfully.', session });
  } catch (error) {
    console.error('Auto-submit error:', error);
    res.status(500).json({ error: 'Failed to submit exam.' });
  }
};
