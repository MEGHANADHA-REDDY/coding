const mongoose = require('mongoose');

const mcqOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
  },
  { _id: false }
);

const mcqQuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
    },
    options: {
      type: [mcqOptionSchema],
      validate: {
        validator: (v) => v.length >= 2 && v.length <= 6,
        message: 'Each question must have between 2 and 6 options',
      },
    },
    correctOption: {
      type: Number,
      required: [true, 'Correct option index is required'],
      min: 0,
    },
    score: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: '',
    },
    questions: {
      type: [mcqQuestionSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one question is required',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

quizSchema.index({ title: 'text' });

module.exports = mongoose.model('Quiz', quizSchema);
