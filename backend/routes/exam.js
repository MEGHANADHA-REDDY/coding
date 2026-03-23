const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const examController = require('../controllers/examController');
const { validateViolation, validateExamId } = require('../utils/validators');
const rateLimit = require('express-rate-limit');

const router = express.Router();

router.use(auth, requireRole('student'));

const examStartLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many start requests. Please wait.' },
});

router.get('/', examController.getAvailableExams);
router.post('/:examId/start', validateExamId, examStartLimiter, examController.startExam);
router.get('/:examId/problems', validateExamId, examController.getExamProblems);
router.post('/:examId/advance-section', validateExamId, examController.advanceSection);
router.post('/:examId/violations', validateExamId, validateViolation, examController.reportViolation);
router.post('/:examId/auto-submit', validateExamId, examController.autoSubmitExam);

module.exports = router;
