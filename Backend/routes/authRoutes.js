const express = require('express');
const router = express.Router();
const { signupCitizen, loginCitizen, loginOfficer, getMe, getOfficers } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { registerValidation, loginValidation } = require('../utils/validators');

// @route   POST /api/auth/signup
router.post('/signup', registerValidation, validate, signupCitizen);

// @route   POST /api/auth/login
router.post('/login', loginValidation, validate, loginCitizen);

// @route   POST /api/auth/officer-login
router.post('/officer-login', loginValidation, validate, loginOfficer);

// @route   GET /api/auth/me
router.get('/me', protect, getMe);

// @route   GET /api/auth/officers (for Municipality Dashboard's assign-officer dropdown)
router.get('/officers', protect, authorize('officer', 'admin'), getOfficers);

module.exports = router;
