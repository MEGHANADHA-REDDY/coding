const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['tab_switch', 'window_blur', 'exit_fullscreen', 'right_click'],
    required: [true, 'Violation type is required'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

violationSchema.index({ examId: 1, studentId: 1 });

module.exports = mongoose.model('Violation', violationSchema);
