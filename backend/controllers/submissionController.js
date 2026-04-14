const { validationResult } = require('express-validator');
const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const { evaluateSubmission, runCode } = require('../services/judge0');

exports.submitCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { examId, problemId, language, code, selectedAnswer } = req.body;
    const studentId = req.user.id;

    const exam = await Exam.findById(examId);
    if (!exam || !exam.isActive) {
      return res.status(404).json({ error: 'Exam not found or not active.' });
    }

    const now = new Date();
    if (now < exam.startTime || now > exam.endTime) {
      return res.status(403).json({ error: 'Exam is not within the valid time window.' });
    }

    if (!exam.allowedStudents.map((id) => id.toString()).includes(studentId)) {
      return res.status(403).json({ error: 'You are not allowed to submit to this exam.' });
    }

    const session = await ExamSession.findOne({ examId, studentId });
    if (!session) {
      return res.status(403).json({ error: 'You must start the exam first.' });
    }
    if (session.isSubmitted) {
      return res.status(403).json({ error: 'Exam already submitted. Cannot submit more.' });
    }

    const sectionIndex = session.currentSection;
    const assignedSection = session.assignedSections[sectionIndex];
    if (!assignedSection) {
      return res.status(400).json({ error: 'Invalid section state.' });
    }

    const sectionProblemIds = assignedSection.problems.map((id) => id.toString());
    if (!sectionProblemIds.includes(problemId)) {
      return res.status(400).json({ error: 'Problem does not belong to the current section.' });
    }

    const examSection = exam.sections[sectionIndex];
    if (examSection) {
      const sectionDeadline = new Date(session.sectionStartedAt.getTime() + examSection.durationMinutes * 60000);
      if (now > sectionDeadline) {
        return res.status(403).json({ error: 'Section time has expired. Please advance to the next section.' });
      }
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    if (problem.type === 'mcq') {
      if (!selectedAnswer) {
        return res.status(400).json({ error: 'Selected answer is required for MCQ.' });
      }

      const isCorrect = selectedAnswer.toLowerCase() === problem.correctAnswer.toLowerCase();

      const submission = await Submission.create({
        examId,
        problemId,
        studentId,
        selectedAnswer: selectedAnswer.toLowerCase(),
        status: isCorrect ? 'AC' : 'WA',
        score: isCorrect ? 1 : 0,
        maxScore: 1,
        passedTestCases: isCorrect ? 1 : 0,
        totalTestCases: 1,
      });

      return res.json({
        submission: {
          _id: submission._id,
          status: submission.status,
          selectedAnswer: submission.selectedAnswer,
          createdAt: submission.createdAt,
        },
      });
    }

    if (!language || !code) {
      return res.status(400).json({ error: 'Language and code are required for coding problems.' });
    }

    const submission = await Submission.create({
      examId,
      problemId,
      studentId,
      language,
      code,
      status: 'PENDING',
    });

    try {
      const result = await evaluateSubmission(code, language, problem.hiddenTestCases);

      submission.status = result.status;
      submission.executionTime = result.executionTime;
      submission.score = result.score;
      submission.maxScore = result.maxScore;
      submission.passedTestCases = result.passedTestCases;
      submission.totalTestCases = result.totalTestCases;
      await submission.save();

      res.json({
        submission: {
          _id: submission._id,
          status: submission.status,
          executionTime: submission.executionTime,
          score: submission.score,
          maxScore: submission.maxScore,
          passedTestCases: submission.passedTestCases,
          totalTestCases: submission.totalTestCases,
          language: submission.language,
          details: result.details,
          createdAt: submission.createdAt,
        },
      });
    } catch (judgeError) {
      console.error('Judge0 evaluation error:', judgeError.message);
      submission.status = 'RE';
      await submission.save();

      res.json({
        submission: {
          _id: submission._id,
          status: 'RE',
          executionTime: 0,
          language: submission.language,
          details: judgeError.message || 'Code execution service error. Please try again.',
          createdAt: submission.createdAt,
        },
      });
    }
  } catch (error) {
    console.error('Submit code error:', error);
    res.status(500).json({ error: 'Failed to submit code.' });
  }
};

// Run code against a custom stdin — no DB save, no exam validation
exports.runCode = async (req, res) => {
  try {
    const { language, code, stdin } = req.body;

    if (!language || !code) {
      return res.status(400).json({ error: 'language and code are required.' });
    }
    if (!['python', 'java'].includes(language)) {
      return res.status(400).json({ error: 'Language must be python or java.' });
    }

    const result = await runCode(code, language, stdin || '');
    res.json(result);
  } catch (error) {
    console.error('Run code error:', error.message);
    res.status(500).json({ error: error.message || 'Code execution failed.' });
  }
};

exports.getSubmissionHistory = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    const submissions = await Submission.find({ examId, studentId })
      .populate('problemId', 'title type')
      .sort({ createdAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Get submission history error:', error);
    res.status(500).json({ error: 'Failed to fetch submission history.' });
  }
};
