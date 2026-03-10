const { validationResult } = require('express-validator');
const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');
const Violation = require('../models/Violation');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');

exports.getAvailableExams = async (req, res) => {
  try {
    const now = new Date();
    const exams = await Exam.find({
      allowedStudents: req.user.id,
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
      .select('title startTime endTime maxViolations problems quizzes')
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

    const exam = await Exam.findById(examId)
      .populate('problems', 'title description constraints difficulty sampleTestCases')
      .populate('quizzes', 'title description questions');

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

    const quizzesForStudent = (exam.quizzes || []).map((quiz) => ({
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions.map((q) => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        score: q.score,
      })),
    }));

    const existingQuizSubs = await QuizSubmission.find({ examId, studentId })
      .select('quizId answers score maxScore');

    res.json({
      exam: {
        _id: exam._id,
        title: exam.title,
        startTime: exam.startTime,
        endTime: exam.endTime,
        maxViolations: exam.maxViolations,
      },
      problems: exam.problems,
      quizzes: quizzesForStudent,
      quizSubmissions: existingQuizSubs,
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

exports.submitQuiz = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;
    const { quizId, answers } = req.body;

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

    if (!exam.quizzes.map((id) => id.toString()).includes(quizId)) {
      return res.status(400).json({ error: 'Quiz does not belong to this exam.' });
    }

    const session = await ExamSession.findOne({ examId, studentId });
    if (!session) {
      return res.status(403).json({ error: 'You must start the exam first.' });
    }
    if (session.isSubmitted) {
      return res.status(403).json({ error: 'Exam already submitted. Cannot submit quiz.' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    let earnedScore = 0;
    let correctCount = 0;
    const maxScore = quiz.questions.reduce((sum, q) => sum + (q.score || 1), 0);

    const gradedAnswers = (answers || []).map((ans) => {
      const question = quiz.questions.id(ans.questionId);
      if (question && ans.selectedOption === question.correctOption) {
        earnedScore += question.score || 1;
        correctCount++;
      }
      return { questionId: ans.questionId, selectedOption: ans.selectedOption };
    });

    const existing = await QuizSubmission.findOne({ examId, quizId, studentId });
    let quizSubmission;

    if (existing) {
      existing.answers = gradedAnswers;
      existing.score = earnedScore;
      existing.maxScore = maxScore;
      existing.correctCount = correctCount;
      existing.totalQuestions = quiz.questions.length;
      quizSubmission = await existing.save();
    } else {
      quizSubmission = await QuizSubmission.create({
        examId,
        quizId,
        studentId,
        answers: gradedAnswers,
        score: earnedScore,
        maxScore,
        correctCount,
        totalQuestions: quiz.questions.length,
      });
    }

    res.json({
      quizSubmission: {
        _id: quizSubmission._id,
        quizId: quizSubmission.quizId,
        score: quizSubmission.score,
        maxScore: quizSubmission.maxScore,
        correctCount: quizSubmission.correctCount,
        totalQuestions: quizSubmission.totalQuestions,
      },
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ error: 'Failed to submit quiz.' });
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
