const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const submissionController = require('../controllers/submissionController');
const { validateSubmission, validateExamId } = require('../utils/validators');

const router = express.Router();

router.use(auth, requireRole('student'));

router.post('/', validateSubmission, submissionController.submitCode);
router.get('/exam/:examId', validateExamId, submissionController.getSubmissionHistory);

module.exports = router;
