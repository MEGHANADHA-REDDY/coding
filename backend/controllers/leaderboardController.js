const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Exam = require('../models/Exam');
const User = require('../models/User');

exports.getLeaderboard = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const leaderboard = await Submission.aggregate([
      {
        $match: {
          examId: new mongoose.Types.ObjectId(examId),
          status: 'AC',
        },
      },
      {
        // Keep only one AC per student-problem pair (earliest)
        $sort: { createdAt: 1 },
      },
      {
        $group: {
          _id: { studentId: '$studentId', problemId: '$problemId' },
          executionTime: { $first: '$executionTime' },
        },
      },
      {
        $group: {
          _id: '$_id.studentId',
          solvedCount: { $sum: 1 },
          totalTime: { $sum: '$executionTime' },
        },
      },
      { $sort: { solvedCount: -1, totalTime: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $project: {
          _id: 0,
          studentId: '$_id',
          name: '$student.name',
          rollNumber: '$student.rollNumber',
          email: '$student.email',
          solvedCount: 1,
          totalTime: { $round: ['$totalTime', 3] },
        },
      },
    ]);

    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    res.json({ examTitle: exam.title, leaderboard: ranked });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to generate leaderboard.' });
  }
};

exports.exportLeaderboardCSV = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const leaderboard = await Submission.aggregate([
      {
        $match: {
          examId: new mongoose.Types.ObjectId(examId),
          status: 'AC',
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: { studentId: '$studentId', problemId: '$problemId' },
          executionTime: { $first: '$executionTime' },
        },
      },
      {
        $group: {
          _id: '$_id.studentId',
          solvedCount: { $sum: 1 },
          totalTime: { $sum: '$executionTime' },
        },
      },
      { $sort: { solvedCount: -1, totalTime: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $project: {
          _id: 0,
          name: '$student.name',
          rollNumber: '$student.rollNumber',
          email: '$student.email',
          solvedCount: 1,
          totalTime: { $round: ['$totalTime', 3] },
        },
      },
    ]);

    let csv = 'Rank,Name,Roll Number,Email,Solved,Total Time (s)\n';
    leaderboard.forEach((entry, index) => {
      csv += `${index + 1},"${entry.name}","${entry.rollNumber}","${entry.email}",${entry.solvedCount},${entry.totalTime}\n`;
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
