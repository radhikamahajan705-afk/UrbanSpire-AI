const express = require('express');
const router = express.Router();
const {
  getPublicStats,
  getComplaintStats,
  getMonthlyReport,
  getOfficerStats,
  getCitizenStats,
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/public-stats', getPublicStats);
router.get('/complaint-stats', protect, authorize('officer', 'admin', 'commissioner'), getComplaintStats);
router.get('/monthly-report', protect, authorize('officer', 'admin', 'commissioner'), getMonthlyReport);
router.get('/officer-stats', protect, authorize('admin', 'commissioner'), getOfficerStats);
router.get('/citizen-stats', protect, authorize('admin', 'commissioner'), getCitizenStats);

module.exports = router;
