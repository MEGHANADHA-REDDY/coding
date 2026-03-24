const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Exam = require('../models/Exam');
const Problem = require('../models/Problem');
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

async function buildLeaderboard(examId) {
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

  const codingMap = {};
  codingScores.forEach((c) => {
    codingMap[c._id.toString()] = c;
  });

  const allStudentIds = new Set(Object.keys(codingMap));

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
    const coding = codingMap[sid] || { codingScore: 0, solvedCount: 0, totalTime: 0 };
    const user = userMap[sid];
    return {
      studentId: sid,
      name: user?.name || 'Unknown',
      rollNumber: user?.rollNumber || '',
      email: user?.email || '',
      codingScore: coding.codingScore || 0,
      totalScore: coding.codingScore || 0,
      solvedCount: coding.solvedCount || 0,
      totalTime: Math.round((coding.totalTime || 0) * 1000) / 1000,
    };
  });

  leaderboard.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    return a.totalTime - b.totalTime;
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
    const leaderboard = await buildLeaderboard(examId);

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
    const leaderboard = await buildLeaderboard(examId);

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

exports.getLeaderboardData = buildLeaderboard;
