const { body, param } = require('express-validator');

exports.validateProblem = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  body('sampleTestCases')
    .isArray({ min: 1 })
    .withMessage('At least one sample test case is required'),
  body('sampleTestCases.*.input').optional({ values: 'falsy' }),
  body('sampleTestCases.*.output').notEmpty().withMessage('Sample test case output is required'),
  body('hiddenTestCases')
    .isArray({ min: 1 })
    .withMessage('At least one hidden test case is required'),
  body('hiddenTestCases.*.input').optional({ values: 'falsy' }),
  body('hiddenTestCases.*.output').notEmpty().withMessage('Hidden test case output is required'),
];

exports.validateExam = [
  body('title').trim().notEmpty().withMessage('Exam title is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('problems')
    .isArray({ min: 1 })
    .withMessage('At least one problem is required'),
  body('allowedStudents')
    .isArray({ min: 1 })
    .withMessage('At least one student must be allowed'),
  body('maxViolations')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max violations must be a positive integer'),
];

exports.validateStudent = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
];

exports.validateSubmission = [
  body('examId').isMongoId().withMessage('Valid exam ID is required'),
  body('problemId').isMongoId().withMessage('Valid problem ID is required'),
  body('language')
    .isIn(['python', 'java'])
    .withMessage('Language must be python or java'),
  body('code').notEmpty().withMessage('Code is required'),
];

exports.validateViolation = [
  body('type')
    .isIn(['tab_switch', 'window_blur', 'exit_fullscreen', 'right_click'])
    .withMessage('Invalid violation type'),
];

exports.validateMongoId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

exports.validateExamId = [
  param('examId').isMongoId().withMessage('Invalid exam ID format'),
];
