const express = require('express');
const router = express.Router();
const {
  createComplaint,
  trackComplaint,
  getMyComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
} = require('../controllers/complaintController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');
const { uploadComplaintImages } = require('../middleware/upload');
const validate = require('../middleware/validateMiddleware');
const { complaintValidation } = require('../utils/validators');

// Public: works for logged-in citizens AND guests (frontend complaint form)
router.post(
  '/',
  optionalAuth,
  uploadComplaintImages.array('images', 3),
  complaintValidation,
  validate,
  createComplaint
);

// Public: track complaint by ID (matches frontend "Track your complaint")
router.get('/track/:complaintId', trackComplaint);

// Citizen: view own complaints
router.get('/my', protect, authorize('citizen'), getMyComplaints);

// Officer/Admin: view all complaints with filters
router.get('/', protect, authorize('officer', 'admin'), getAllComplaints);

// Officer/Admin: get single complaint
router.get('/:id', protect, authorize('officer', 'admin'), getComplaintById);

// Officer/Admin: update status / assign officer
router.put('/:id/status', protect, authorize('officer', 'admin'), updateComplaintStatus);

module.exports = router;
