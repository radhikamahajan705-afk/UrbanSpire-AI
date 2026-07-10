const express = require('express');
const router = express.Router();
const { checkTax, payTax, downloadReceipt, getMyPayments } = require('../controllers/propertyTaxController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');

// Public: check dues (works for guests and logged-in citizens)
router.get('/check/:propertyId', optionalAuth, checkTax);

// Public: mock payment (works for guests and logged-in citizens)
router.post('/pay', optionalAuth, payTax);

// Public: download receipt PDF
router.get('/receipt/:receiptId', downloadReceipt);

// Citizen: payment history
router.get('/my-payments', protect, authorize('citizen'), getMyPayments);

module.exports = router;
