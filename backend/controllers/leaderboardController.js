const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Exam = require('../models/Exam');
const Problem = require('../models/Problem');
const ExamSession = require('../models/ExamSession');
const User = require('../models/User');

async function computeMaxScores(exam) {
  const allProblems = (exam.sections || []).flatMap((s) => s.problems || []);
  const problemIds = allProblems.map((p) => (typeof p === 'object' && p._id ? p._id : p));
  const problems = await Problem.find({ _id: { $in: problemIds } })
    .select('type hiddenTestCases options')
    .lean();

  let codingMaxScore = 0;
  let mcqMaxScore = 0;

  problems.forEach((p) => {
    if (p.type === 'mcq') {
      mcqMaxScore += 1;
    } else {
      codingMaxScore += (p.hiddenTestCases || []).reduce((s, tc) => s + (tc.score || 1), 0);
    }
  });

  return { codingMaxScore, mcqMaxScore, maxPossibleScore: codingMaxScore + mcqMaxScore };
}

async function buildLeaderboard(examId, startedStudentIds) {
  const submissionScores = await Submission.aggregate([
    { $match: { examId: new mongoose.Types.ObjectId(examId) } },
    // Ensure "$first" corresponds to the highest score attempt for each problem.
    { $sort: { score: -1, createdAt: 1 } },
    {
      $lookup: {
        from: 'problems',
        localField: 'problemId',
        foreignField: '_id',
        as: 'problem',
      },
    },
    { $unwind: '$problem' },
    {
      $group: {
        _id: { studentId: '$studentId', problemId: '$problemId' },
        type: { $first: '$problem.type' }, // "coding" or "mcq"
        bestScore: { $max: '$score' },
        executionTime: { $first: '$executionTime' },
        status: { $first: '$status' },
      },
    },
    {
      $group: {
        _id: '$_id.studentId',
        codingScore: {
          $sum: { $cond: [{ $eq: ['$type', 'coding'] }, '$bestScore', 0] },
        },
        quizScore: {
          $sum: { $cond: [{ $eq: ['$type', 'mcq'] }, '$bestScore', 0] },
        },
        solvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'AC'] }, 1, 0] },
        },
        totalTime: { $sum: '$executionTime' },
      },
    },
  ]);

  const scoreMap = {};
  submissionScores.forEach((row) => {
    scoreMap[row._id.toString()] = row;
  });

  const allStudentIds = new Set([
    ...(startedStudentIds || []).map((id) => id.toString()),
    ...Object.keys(scoreMap),
  ]);

  const users = await User.find({
    _id: { $in: Array.from(allStudentIds) },
  })
    .select('name email rollNumber')
    .lean();

  const userMap = {};
  users.forEach((u) => {
    userMap[u._id.toString()] = u;
  });

  const leaderboard = Array.from(allStudentIds).map((sid) => {
    const scores = scoreMap[sid] || { codingScore: 0, quizScore: 0, solvedCount: 0, totalTime: 0 };
    const user = userMap[sid];
    const codingScore = scores.codingScore || 0;
    const quizScore = scores.quizScore || 0;
    const totalScore = codingScore + quizScore;
    return {
      studentId: sid,
      name: user?.name || 'Unknown',
      rollNumber: user?.rollNumber || '',
      email: user?.email || '',
      codingScore,
      quizScore,
      totalScore,
      solvedCount: scores.solvedCount || 0,
      totalTime: Math.round((scores.totalTime || 0) * 1000) / 1000,
    };
  });

  leaderboard.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    return a.totalTime - b.totalTime; // faster is better
  });

  return leaderboard;
}

exports.getLeaderboard = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId).lean();
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const { codingMaxScore, mcqMaxScore, maxPossibleScore } = await computeMaxScores(exam);
    // Include students who started the exam, even if they have 0 submissions.
    const startedStudentIds = await ExamSession.find({ examId }).distinct('studentId');
    const leaderboard = await buildLeaderboard(examId, startedStudentIds);

    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    res.json({
      examTitle: exam.title,
      maxPossibleScore,
      codingMaxScore,
      mcqMaxScore,
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

    const exam = await Exam.findById(examId).lean();
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const { maxPossibleScore } = await computeMaxScores(exam);
    const startedStudentIds = await ExamSession.find({ examId }).distinct('studentId');
    const leaderboard = await buildLeaderboard(examId, startedStudentIds);

    let csv = `Rank,Name,Roll Number,Email,Score,Max Score,Problems Solved,Total Time (s)\n`;
    leaderboard.forEach((entry, index) => {
      csv += `${index + 1},"${entry.name}","${entry.rollNumber}","${entry.email}",${entry.totalScore},${maxPossibleScore},${entry.solvedCount},${entry.totalTime}\n`;
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
  const startedStudentIds = await ExamSession.find({ examId }).distinct('studentId');
  return buildLeaderboard(examId, startedStudentIds);
};
