const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    output: { type: String, required: true },
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
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
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: [true, 'Difficulty is required'],
    },
    sampleTestCases: {
      type: [testCaseSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one sample test case is required',
      },
    },
    hiddenTestCases: {
      type: [testCaseSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one hidden test case is required',
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

problemSchema.index({ title: 'text' });

module.exports = mongoose.model('Problem', problemSchema);
