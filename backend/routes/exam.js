const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const examController = require('../controllers/examController');
const { validateViolation, validateExamId } = require('../utils/validators');

const router = express.Router();

router.use(auth, requireRole('student'));

router.get('/', examController.getAvailableExams);
router.post('/:examId/start', validateExamId, examController.startExam);
router.get('/:examId/problems', validateExamId, examController.getExamProblems);
router.post('/:examId/violations', validateExamId, validateViolation, examController.reportViolation);
router.post('/:examId/quiz-submit', validateExamId, examController.submitQuiz);
router.post('/:examId/auto-submit', validateExamId, examController.autoSubmitExam);

module.exports = router;
