const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const QuizSubmission = require('../models/QuizSubmission');
const Exam = require('../models/Exam');

exports.getLeaderboard = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId)
      .populate('problems', 'title hiddenTestCases')
      .populate('quizzes', 'title questions');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const codingMaxScore = exam.problems.reduce((total, problem) => {
      return total + problem.hiddenTestCases.reduce((s, tc) => s + (tc.score || 1), 0);
    }, 0);

    const quizMaxScore = (exam.quizzes || []).reduce((total, quiz) => {
      return total + quiz.questions.reduce((s, q) => s + (q.score || 1), 0);
    }, 0);

    const maxPossibleScore = codingMaxScore + quizMaxScore;

    const codingScores = await Submission.aggregate([
      { $match: { examId: new mongoose.Types.ObjectId(examId) } },
      { $sort: { score: -1, createdAt: 1 } },
      {
        $group: {
          _id: { studentId: '$studentId', problemId: '$problemId' },
          bestScore: { $max: '$score' },
          executionTime: { $first: '$executionTime' },
          status: { $first: '$status' },
        },
      },
      {
        $group: {
          _id: '$_id.studentId',
          codingScore: { $sum: '$bestScore' },
          solvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'AC'] }, 1, 0] },
          },
          totalTime: { $sum: '$executionTime' },
        },
      },
    ]);

    const quizScores = await QuizSubmission.aggregate([
      { $match: { examId: new mongoose.Types.ObjectId(examId) } },
      {
        $group: {
          _id: '$studentId',
          quizScore: { $sum: '$score' },
          quizMaxScore: { $sum: '$maxScore' },
          correctCount: { $sum: '$correctCount' },
        },
      },
    ]);

    const codingMap = {};
    codingScores.forEach((c) => {
      codingMap[c._id.toString()] = c;
    });

    const quizMap = {};
    quizScores.forEach((q) => {
      quizMap[q._id.toString()] = q;
    });

    const allStudentIds = new Set([
      ...Object.keys(codingMap),
      ...Object.keys(quizMap),
    ]);

    const User = require('../models/User');
    const users = await User.find({
      _id: { $in: Array.from(allStudentIds) },
    }).select('name email rollNumber');

    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    const leaderboard = Array.from(allStudentIds).map((sid) => {
      const coding = codingMap[sid] || { codingScore: 0, solvedCount: 0, totalTime: 0 };
      const quiz = quizMap[sid] || { quizScore: 0, correctCount: 0 };
      const user = userMap[sid];
      return {
        studentId: sid,
        name: user?.name || 'Unknown',
        rollNumber: user?.rollNumber || '',
        email: user?.email || '',
        codingScore: coding.codingScore || 0,
        quizScore: quiz.quizScore || 0,
        totalScore: (coding.codingScore || 0) + (quiz.quizScore || 0),
        solvedCount: coding.solvedCount || 0,
        correctAnswers: quiz.correctCount || 0,
        totalTime: Math.round((coding.totalTime || 0) * 1000) / 1000,
      };
    });

    leaderboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
      return a.totalTime - b.totalTime;
    });

    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    res.json({
      examTitle: exam.title,
      maxPossibleScore,
      codingMaxScore,
      quizMaxScore,
      leaderboard: ranked,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to generate leaderboard.' });
  }
};

exports.exportLeaderboardCSV = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId)
      .populate('problems', 'title hiddenTestCases')
      .populate('quizzes', 'title questions');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const codingMaxScore = exam.problems.reduce((total, problem) => {
      return total + problem.hiddenTestCases.reduce((s, tc) => s + (tc.score || 1), 0);
    }, 0);

    const quizMaxScore = (exam.quizzes || []).reduce((total, quiz) => {
      return total + quiz.questions.reduce((s, q) => s + (q.score || 1), 0);
    }, 0);

    const maxPossibleScore = codingMaxScore + quizMaxScore;

    const lbRes = await exports.getLeaderboardData(examId);

    let csv = `Rank,Name,Roll Number,Email,Coding Score,Quiz Score,Total Score,Max Score,Problems Solved,Total Time (s)\n`;
    lbRes.forEach((entry, index) => {
      csv += `${index + 1},"${entry.name}","${entry.rollNumber}","${entry.email}",${entry.codingScore},${entry.quizScore},${entry.totalScore},${maxPossibleScore},${entry.solvedCount},${entry.totalTime}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=leaderboard-${exam.title.replace(/\s+/g, '_')}.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error('Export leaderboard error:', error);
    res.status(500).json({ error: 'Failed to export leaderboard.' });
  }
};

exports.getLeaderboardData = async (examId) => {
  const codingScores = await Submission.aggregate([
    { $match: { examId: new mongoose.Types.ObjectId(examId) } },
    { $sort: { score: -1, createdAt: 1 } },
    {
      $group: {
        _id: { studentId: '$studentId', problemId: '$problemId' },
        bestScore: { $max: '$score' },
        executionTime: { $first: '$executionTime' },
        status: { $first: '$status' },
      },
    },
    {
      $group: {
        _id: '$_id.studentId',
        codingScore: { $sum: '$bestScore' },
        solvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'AC'] }, 1, 0] },
        },
        totalTime: { $sum: '$executionTime' },
      },
    },
  ]);

  const quizScores = await QuizSubmission.aggregate([
    { $match: { examId: new mongoose.Types.ObjectId(examId) } },
    {
      $group: {
        _id: '$studentId',
        quizScore: { $sum: '$score' },
        correctCount: { $sum: '$correctCount' },
      },
    },
  ]);

  const codingMap = {};
  codingScores.forEach((c) => { codingMap[c._id.toString()] = c; });

  const quizMap = {};
  quizScores.forEach((q) => { quizMap[q._id.toString()] = q; });

  const allStudentIds = new Set([...Object.keys(codingMap), ...Object.keys(quizMap)]);

  const User = require('../models/User');
  const users = await User.find({ _id: { $in: Array.from(allStudentIds) } }).select('name email rollNumber');
  const userMap = {};
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const leaderboard = Array.from(allStudentIds).map((sid) => {
    const coding = codingMap[sid] || { codingScore: 0, solvedCount: 0, totalTime: 0 };
    const quiz = quizMap[sid] || { quizScore: 0, correctCount: 0 };
    const user = userMap[sid];
    return {
      studentId: sid,
      name: user?.name || 'Unknown',
      rollNumber: user?.rollNumber || '',
      email: user?.email || '',
      codingScore: coding.codingScore || 0,
      quizScore: quiz.quizScore || 0,
      totalScore: (coding.codingScore || 0) + (quiz.quizScore || 0),
      solvedCount: coding.solvedCount || 0,
      correctAnswers: quiz.correctCount || 0,
      totalTime: Math.round((coding.totalTime || 0) * 1000) / 1000,
    };
  });

  leaderboard.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    return a.totalTime - b.totalTime;
  });

  return leaderboard;
};
