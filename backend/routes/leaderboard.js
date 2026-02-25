const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const leaderboardController = require('../controllers/leaderboardController');
const { validateExamId } = require('../utils/validators');

const router = express.Router();

router.get('/:examId', auth, validateExamId, leaderboardController.getLeaderboard);
router.get(
  '/:examId/export',
  auth,
  requireRole('admin'),
  validateExamId,
  leaderboardController.exportLeaderboardCSV
);

module.exports = router;
