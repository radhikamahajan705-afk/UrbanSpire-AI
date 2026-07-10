const express = require('express');
const router = express.Router();
const { chatWithAI } = require('../controllers/chatbotController');
const { optionalAuth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { chatValidation } = require('../utils/validators');

// Public: AI Citizen Assistant chat endpoint (matches frontend chat widget)
// optionalAuth: if logged in, req.user is set so agent-filed complaints link to the account
router.post('/', optionalAuth, chatValidation, validate, chatWithAI);

module.exports = router;
