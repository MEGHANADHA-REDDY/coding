const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    output: { type: String, required: true },
    score: { type: Number, default: 1, min: 0 },
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['coding', 'mcq'],
      default: 'coding',
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    constraints: {
      type: String,
      default: '',
    },
    inputFormat: {
      type: String,
      default: '',
    },
    outputFormat: {
      type: String,
      default: '',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: [true, 'Difficulty is required'],
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    level: {
      type: String,
      trim: true,
      default: '',
    },
    boilerplateCode: {
      type: String,
      default: '',
    },
    sampleTestCases: {
      type: [testCaseSchema],
      default: [],
    },
    hiddenTestCases: {
      type: [testCaseSchema],
      default: [],
    },
    // MCQ fields
    options: {
      a: { type: String, default: '' },
      b: { type: String, default: '' },
      c: { type: String, default: '' },
      d: { type: String, default: '' },
    },
    correctAnswer: {
      type: String,
      enum: ['a', 'b', 'c', 'd', ''],
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

problemSchema.pre('validate', function (next) {
  if (this.type === 'coding') {
    if (!this.hiddenTestCases || this.hiddenTestCases.length === 0) {
      this.invalidate('hiddenTestCases', 'At least one hidden test case is required for coding problems');
    }
  }
  if (this.type === 'mcq') {
    if (!this.options?.a || !this.options?.b || !this.options?.c || !this.options?.d) {
      this.invalidate('options', 'All four options (A-D) are required for MCQ');
    }
    if (!this.correctAnswer) {
      this.invalidate('correctAnswer', 'Correct answer is required for MCQ');
    }
  }
  next();
});

problemSchema.index({ title: 'text' });
problemSchema.index({ company: 1, level: 1, type: 1 });

module.exports = mongoose.model('Problem', problemSchema);
