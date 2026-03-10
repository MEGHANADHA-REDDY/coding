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
      enum: ['python', 'java'],
      required: [true, 'Language is required'],
    },
    code: {
      type: String,
      required: [true, 'Code is required'],
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
