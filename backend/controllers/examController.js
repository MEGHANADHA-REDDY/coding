const { validationResult } = require('express-validator');
const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');
const Violation = require('../models/Violation');
const Submission = require('../models/Submission');

exports.getAvailableExams = async (req, res) => {
  try {
    const now = new Date();
    const exams = await Exam.find({
      allowedStudents: req.user.id,
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
      .select('title startTime endTime maxViolations')
      .sort({ startTime: 1 });

    const examsWithSession = await Promise.all(
      exams.map(async (exam) => {
        const session = await ExamSession.findOne({
          examId: exam._id,
          studentId: req.user.id,
        });
        return {
          ...exam.toObject(),
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
      session = await ExamSession.create({ examId, studentId });
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

    const exam = await Exam.findById(examId).populate(
      'problems',
      'title description constraints difficulty sampleTestCases'
    );

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

    res.json({
      exam: {
        _id: exam._id,
        title: exam.title,
        startTime: exam.startTime,
        endTime: exam.endTime,
        maxViolations: exam.maxViolations,
      },
      problems: exam.problems,
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

    res.json({ message: 'Exam auto-submitted due to violations.', session });
  } catch (error) {
    console.error('Auto-submit error:', error);
    res.status(500).json({ error: 'Failed to auto-submit exam.' });
  }
};
