const { validationResult } = require('express-validator');
const User = require('../models/User');
const Problem = require('../models/Problem');
const Quiz = require('../models/Quiz');
const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const QuizSubmission = require('../models/QuizSubmission');
const Violation = require('../models/Violation');
const ExamSession = require('../models/ExamSession');
const { parseCSV } = require('../utils/csvParser');

// ── Students ──

exports.createStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, rollNumber } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const student = await User.create({
      name,
      email,
      password,
      rollNumber,
      role: 'student',
    });

    res.status(201).json({ message: 'Student created successfully.', student });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ error: 'Failed to create student.' });
  }
};

exports.bulkUploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required.' });
    }

    const rows = await parseCSV(req.file.buffer);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty.' });
    }

    const results = { created: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row + 0-index

      if (!row.name || !row.email || !row.password || !row.rollnumber) {
        results.errors.push({
          row: rowNum,
          error: 'Missing required fields (name, email, password, rollnumber)',
        });
        continue;
      }

      try {
        const existing = await User.findOne({ email: row.email.trim().toLowerCase() });
        if (existing) {
          results.errors.push({ row: rowNum, error: `Email ${row.email} already exists` });
          continue;
        }

        await User.create({
          name: row.name.trim(),
          email: row.email.trim().toLowerCase(),
          password: row.password,
          rollNumber: row.rollnumber.trim(),
          role: 'student',
        });

        results.created++;
      } catch (err) {
        results.errors.push({ row: rowNum, error: err.message });
      }
    }

    res.json({
      message: `Bulk upload complete. ${results.created} students created.`,
      ...results,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Failed to process CSV upload.' });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({ students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
};

// ── Problems ──

exports.createProblem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, constraints, difficulty, sampleTestCases, hiddenTestCases } =
      req.body;

    const problem = await Problem.create({
      title,
      description,
      constraints,
      difficulty,
      sampleTestCases,
      hiddenTestCases,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: 'Problem created successfully.', problem });
  } catch (error) {
    console.error('Create problem error:', error);
    res.status(500).json({ error: 'Failed to create problem.' });
  }
};

exports.getProblems = async (req, res) => {
  try {
    const problems = await Problem.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ problems });
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ error: 'Failed to fetch problems.' });
  }
};

exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id).populate('createdBy', 'name email');

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    res.json({ problem });
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({ error: 'Failed to fetch problem.' });
  }
};

exports.updateProblem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const problem = await Problem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    res.json({ message: 'Problem updated successfully.', problem });
  } catch (error) {
    console.error('Update problem error:', error);
    res.status(500).json({ error: 'Failed to update problem.' });
  }
};

// ── Exams ──

exports.createExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, startTime, endTime, problems, quizzes, allowedStudents, maxViolations } = req.body;

    const exam = await Exam.create({
      title,
      startTime,
      endTime,
      problems: problems || [],
      quizzes: quizzes || [],
      allowedStudents,
      maxViolations: maxViolations || 3,
    });

    res.status(201).json({ message: 'Exam created successfully.', exam });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Failed to create exam.' });
  }
};

exports.getExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate('problems', 'title difficulty')
      .populate('quizzes', 'title questions')
      .populate('allowedStudents', 'name email rollNumber')
      .sort({ createdAt: -1 });

    res.json({ exams });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Failed to fetch exams.' });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    res.json({ message: 'Exam updated successfully.', exam });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ error: 'Failed to update exam.' });
  }
};

// ── Submissions & Violations (Admin View) ──

exports.getSubmissions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.examId) filter.examId = req.query.examId;
    if (req.query.studentId) filter.studentId = req.query.studentId;

    const submissions = await Submission.find(filter)
      .populate('examId', 'title')
      .populate('problemId', 'title')
      .populate('studentId', 'name email rollNumber')
      .sort({ createdAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
};

exports.getViolations = async (req, res) => {
  try {
    const filter = {};
    if (req.query.examId) filter.examId = req.query.examId;
    if (req.query.studentId) filter.studentId = req.query.studentId;

    const violations = await Violation.find(filter)
      .populate('examId', 'title')
      .populate('studentId', 'name email rollNumber')
      .sort({ timestamp: -1 });

    res.json({ violations });
  } catch (error) {
    console.error('Get violations error:', error);
    res.status(500).json({ error: 'Failed to fetch violations.' });
  }
};

// ── Exam Details (for edit page) ──

exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('problems', 'title difficulty')
      .populate('quizzes', 'title questions')
      .populate('allowedStudents', 'name email rollNumber');

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const sessions = await ExamSession.find({ examId: exam._id })
      .populate('studentId', 'name email rollNumber');

    const sessionMap = {};
    sessions.forEach((s) => {
      sessionMap[s.studentId._id.toString()] = {
        hasStarted: true,
        isSubmitted: s.isSubmitted,
        violationCount: s.violationCount,
      };
    });

    res.json({ exam, sessions: sessionMap });
  } catch (error) {
    console.error('Get exam by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch exam.' });
  }
};

// ── Quizzes ──

exports.createQuiz = async (req, res) => {
  try {
    const { title, description, questions } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Title and at least one question are required.' });
    }

    const quiz = await Quiz.create({
      title,
      description: description || '',
      questions,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: 'Quiz created successfully.', quiz });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Failed to create quiz.' });
  }
};

exports.getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ quizzes });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes.' });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    res.json({ quiz });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz.' });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    res.json({ message: 'Quiz updated successfully.', quiz });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ error: 'Failed to update quiz.' });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    res.json({ message: 'Quiz deleted successfully.' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: 'Failed to delete quiz.' });
  }
};

// ── Reset Student Exam (allow retake) ──

exports.resetStudentExam = async (req, res) => {
  try {
    const { examId, studentId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    await ExamSession.deleteOne({ examId, studentId });
    await Submission.deleteMany({ examId, studentId });
    await QuizSubmission.deleteMany({ examId, studentId });
    await Violation.deleteMany({ examId, studentId });

    res.json({ message: 'Student exam session reset. They can retake the exam.' });
  } catch (error) {
    console.error('Reset student exam error:', error);
    res.status(500).json({ error: 'Failed to reset student exam.' });
  }
};
