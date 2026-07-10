const express = require('express');
const router = express.Router();
const {
  applyCertificate,
  getMyCertificates,
  getAllCertificates,
  reviewCertificate,
  checkCertificateStatus,
  downloadCertificate,
} = require('../controllers/certificateController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');
const { uploadCertificateDocs } = require('../middleware/upload');
const validate = require('../middleware/validateMiddleware');
const { certificateValidation } = require('../utils/validators');

// Public: works for logged-in citizens AND guests (frontend document form)
router.post(
  '/',
  optionalAuth,
  uploadCertificateDocs.fields([
    { name: 'idProof', maxCount: 1 },
    { name: 'supportingDoc', maxCount: 1 },
  ]),
  certificateValidation,
  validate,
  applyCertificate
);

// Citizen: view own applications
router.get('/my', protect, authorize('citizen'), getMyCertificates);

// Officer/Admin: view all applications
router.get('/', protect, authorize('officer', 'admin'), getAllCertificates);

// Officer/Admin: approve/reject
router.put('/:id/review', protect, authorize('officer', 'admin'), reviewCertificate);

// Public: check application status by ID (matches frontend "Check Status")
router.get('/status/:certificateId', checkCertificateStatus);

// Public: download approved certificate PDF
router.get('/:certificateId/download', downloadCertificate);

module.exports = router;
