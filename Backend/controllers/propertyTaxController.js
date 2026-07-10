const { PropertyTax, TaxPayment } = require('../models/PropertyTax');
const Notification = require('../models/Notification');
const { generateTaxReceiptId } = require('../utils/generateId');
const { generateTaxReceiptPDF } = require('../services/taxReceiptService');

// @desc    Check property tax dues for a property ID (auto-creates a demo record if none exists)
// @route   GET /api/property-tax/check/:propertyId
// @access  Public
const checkTax = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const currentFY = getCurrentFinancialYear();

    let tax = await PropertyTax.findOne({ propertyId, financialYear: currentFY });

    // DEMO NOTE: In a real deployment, tax records are pre-loaded by the Revenue
    // Department (bulk import from the municipal valuation register), not auto-generated.
    // Auto-creating a record here lets the hackathon demo work end-to-end without
    // requiring an admin to seed data for every possible property ID first.
    if (!tax) {
      const { ownerName, ward } = req.query;
      const assessedValue = 500000 + (hashCode(propertyId) % 2000000);
      const taxAmount = Math.round(assessedValue * 0.012); // demo 1.2% rate
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 2);

      tax = await PropertyTax.create({
        citizen: req.user ? req.user._id : null,
        propertyId,
        ownerName: ownerName || 'Property Owner',
        ward: ward || '',
        financialYear: currentFY,
        assessedValue,
        taxAmount,
        dueDate,
      });
    }

    res.status(200).json({ success: true, tax });
  } catch (error) {
    next(error);
  }
};

// @desc    Pay property tax (MOCK payment gateway - no real money moves)
// @route   POST /api/property-tax/pay
// @access  Public
const payTax = async (req, res, next) => {
  try {
    const { propertyId, financialYear, paymentMethod } = req.body;

    const tax = await PropertyTax.findOne({ propertyId, financialYear });
    if (!tax) {
      return res.status(404).json({ success: false, message: 'No tax record found for this property/year. Please check tax dues first.' });
    }
    if (tax.status === 'Paid') {
      return res.status(400).json({ success: false, message: 'This tax has already been paid.' });
    }

    // MOCK payment processing - replace with real gateway (Razorpay/Stripe) for production
    const transactionRef = `MOCKPAY-${Date.now()}`;

    tax.amountPaid = tax.taxAmount;
    tax.status = 'Paid';
    await tax.save();

    const receiptId = await generateTaxReceiptId();
    const payment = await TaxPayment.create({
      receiptId,
      propertyTax: tax._id,
      citizen: req.user ? req.user._id : null,
      propertyId: tax.propertyId,
      ownerName: tax.ownerName,
      amountPaid: tax.taxAmount,
      paymentMethod: paymentMethod || 'Mock Payment (UPI)',
      transactionRef,
    });

    const pdfPath = await generateTaxReceiptPDF(payment, tax);
    payment.pdfPath = pdfPath;
    await payment.save();

    if (req.user) {
      await Notification.create({
        user: req.user._id,
        title: 'Tax Receipt Generated',
        message: `Your property tax payment of Rs. ${tax.taxAmount} for ${tax.propertyId} (FY ${tax.financialYear}) is confirmed. Receipt: ${receiptId}.`,
        type: 'general',
        relatedId: receiptId,
      });
    }

    res.status(200).json({ success: true, message: 'Payment successful (mock)', receiptId, tax, payment });
  } catch (error) {
    next(error);
  }
};

// @desc    Download tax payment receipt PDF
// @route   GET /api/property-tax/receipt/:receiptId
// @access  Public
const downloadReceipt = async (req, res, next) => {
  try {
    const payment = await TaxPayment.findOne({ receiptId: req.params.receiptId });
    if (!payment || !payment.pdfPath) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }
    const path = require('path');
    const filePath = path.join(__dirname, '..', payment.pdfPath);
    res.download(filePath, `${payment.receiptId}.pdf`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in citizen's payment history
// @route   GET /api/property-tax/my-payments
// @access  Private (citizen)
const getMyPayments = async (req, res, next) => {
  try {
    const payments = await TaxPayment.find({ citizen: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    next(error);
  }
};

// ---- helpers ----
function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // FY starts April
  return `${year}-${String(year + 1).slice(2)}`;
}
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

module.exports = { checkTax, payTax, downloadReceipt, getMyPayments };
