const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    language: {
      type: String,
      enum: ['python', 'java', ''],
      default: '',
    },
    code: {
      type: String,
      default: '',
    },
    selectedAnswer: {
      type: String,
      enum: ['a', 'b', 'c', 'd', ''],
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'AC', 'WA', 'TLE', 'RE', 'CE'],
      default: 'PENDING',
    },
    executionTime: {
      type: Number,
      default: null,
    },
    score: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    passedTestCases: {
      type: Number,
      default: 0,
    },
    totalTestCases: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

submissionSchema.index({ examId: 1, studentId: 1, problemId: 1 });
submissionSchema.index({ examId: 1, studentId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
