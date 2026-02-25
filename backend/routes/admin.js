const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const adminController = require('../controllers/adminController');
const { upload } = require('../utils/csvParser');
const {
  validateProblem,
  validateExam,
  validateStudent,
  validateMongoId,
} = require('../utils/validators');

const router = express.Router();

router.use(auth, requireRole('admin'));

// Students
router.post('/students', validateStudent, adminController.createStudent);
router.post('/students/bulk', upload.single('file'), adminController.bulkUploadStudents);
router.get('/students', adminController.getStudents);

// Problems
router.post('/problems', validateProblem, adminController.createProblem);
router.get('/problems', adminController.getProblems);
router.get('/problems/:id', validateMongoId, adminController.getProblemById);
router.put('/problems/:id', validateMongoId, adminController.updateProblem);

// Exams
router.post('/exams', validateExam, adminController.createExam);
router.get('/exams', adminController.getExams);
router.put('/exams/:id', validateMongoId, adminController.updateExam);

// Submissions & Violations
router.get('/submissions', adminController.getSubmissions);
router.get('/violations', adminController.getViolations);

module.exports = router;
