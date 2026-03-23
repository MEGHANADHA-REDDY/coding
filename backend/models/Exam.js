const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['coding', 'mcq'],
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    problems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem',
      },
    ],
    randomCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
      maxlength: 200,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    sections: {
      type: [sectionSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one section is required',
      },
    },
    allowedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    maxViolations: {
      type: Number,
      default: 3,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

examSchema.pre('validate', function (next) {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    this.invalidate('endTime', 'End time must be after start time');
  }
  next();
});

examSchema.virtual('totalDurationMinutes').get(function () {
  return (this.sections || []).reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
});

examSchema.index({ startTime: 1, endTime: 1 });

module.exports = mongoose.model('Exam', examSchema);
