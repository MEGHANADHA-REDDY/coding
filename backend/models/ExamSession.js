const mongoose = require('mongoose');

const examSessionSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    violationCount: {
      type: Number,
      default: 0,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

examSessionSchema.index({ examId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('ExamSession', examSessionSchema);
