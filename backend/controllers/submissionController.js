const { validationResult } = require('express-validator');
const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const { evaluateSubmission } = require('../services/judge0');

exports.submitCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { examId, problemId, language, code } = req.body;
    const studentId = req.user.id;

    // Validate exam exists and is active
    const exam = await Exam.findById(examId);
    if (!exam || !exam.isActive) {
      return res.status(404).json({ error: 'Exam not found or not active.' });
    }

    // Validate time window
    const now = new Date();
    if (now < exam.startTime || now > exam.endTime) {
      return res.status(403).json({ error: 'Exam is not within the valid time window.' });
    }

    // Validate student is allowed
    if (!exam.allowedStudents.map((id) => id.toString()).includes(studentId)) {
      return res.status(403).json({ error: 'You are not allowed to submit to this exam.' });
    }

    // Validate problem belongs to exam
    if (!exam.problems.map((id) => id.toString()).includes(problemId)) {
      return res.status(400).json({ error: 'Problem does not belong to this exam.' });
    }

    // Validate session exists and not submitted
    const session = await ExamSession.findOne({ examId, studentId });
    if (!session) {
      return res.status(403).json({ error: 'You must start the exam first.' });
    }
    if (session.isSubmitted) {
      return res.status(403).json({ error: 'Exam already submitted. Cannot submit more code.' });
    }

    // Fetch problem with hidden test cases
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    // Create submission as PENDING
    const submission = await Submission.create({
      examId,
      problemId,
      studentId,
      language,
      code,
      status: 'PENDING',
    });

    // Evaluate against hidden test cases
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

exports.getSubmissionHistory = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    const submissions = await Submission.find({ examId, studentId })
      .populate('problemId', 'title')
      .sort({ createdAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Get submission history error:', error);
    res.status(500).json({ error: 'Failed to fetch submission history.' });
  }
};
