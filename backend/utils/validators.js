const { body, param } = require('express-validator');

exports.validateProblem = [
  body('type')
    .optional()
    .isIn(['coding', 'mcq'])
    .withMessage('Type must be coding or mcq'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  body('company').optional().trim(),
  body('level').optional().trim(),
  body('boilerplateCode').optional(),
  body('inputFormat').optional(),
  body('outputFormat').optional(),
  body('sampleTestCases').optional().isArray(),
  body('sampleTestCases.*.input').optional({ values: 'falsy' }),
  body('sampleTestCases.*.output').optional(),
  body('hiddenTestCases').optional().isArray(),
  body('hiddenTestCases.*.input').optional({ values: 'falsy' }),
  body('hiddenTestCases.*.output').optional(),
  body('options').optional().isObject(),
  body('options.a').optional(),
  body('options.b').optional(),
  body('options.c').optional(),
  body('options.d').optional(),
  body('correctAnswer')
    .optional({ values: 'falsy' })
    .isIn(['a', 'b', 'c', 'd'])
    .withMessage('Correct answer must be a, b, c, or d'),
];

exports.validateExam = [
  body('title').trim().notEmpty().withMessage('Exam title is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('sections')
    .isArray({ min: 1 })
    .withMessage('At least one section is required'),
  body('sections.*.type')
    .isIn(['coding', 'mcq'])
    .withMessage('Section type must be coding or mcq'),
  body('sections.*.durationMinutes')
    .isInt({ min: 1 })
    .withMessage('Section duration must be at least 1 minute'),
  body('sections.*.problems')
    .isArray({ min: 1 })
    .withMessage('Each section must have at least one problem'),
  body('sections.*.label').optional().trim(),
  body('sections.*.randomCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Random count must be a non-negative integer'),
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
  body('batch').optional().trim(),
  body('mobileNumber').optional().trim(),
];

exports.validateSubmission = [
  body('examId').isMongoId().withMessage('Valid exam ID is required'),
  body('problemId').isMongoId().withMessage('Valid problem ID is required'),
  body('language')
    .optional()
    .isIn(['python', 'java'])
    .withMessage('Language must be python or java'),
  body('code').optional(),
  body('selectedAnswer')
    .optional()
    .isIn(['a', 'b', 'c', 'd'])
    .withMessage('Selected answer must be a, b, c, or d'),
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
