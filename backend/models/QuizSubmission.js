const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedOption: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const quizSubmissionSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    score: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

quizSubmissionSchema.index({ examId: 1, quizId: 1, studentId: 1 }, { unique: true });
quizSubmissionSchema.index({ examId: 1, studentId: 1 });

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);
