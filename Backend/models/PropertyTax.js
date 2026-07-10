const mongoose = require('mongoose');

const propertyTaxSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    propertyId: {
      type: String,
      required: true, // citizen-entered property/house number used to look up dues
      trim: true,
    },
    ownerName: { type: String, required: true },
    ward: { type: String, default: '' },
    financialYear: { type: String, required: true }, // e.g. "2025-26"
    assessedValue: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Due', 'Paid', 'Overdue'],
      default: 'Due',
    },
    dueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

propertyTaxSchema.index({ propertyId: 1, financialYear: 1 }, { unique: true });

const paymentSchema = new mongoose.Schema(
  {
    receiptId: { type: String, unique: true, required: true },
    propertyTax: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PropertyTax',
      required: true,
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    propertyId: { type: String, required: true },
    ownerName: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['Mock Payment (UPI)', 'Mock Payment (Card)', 'Mock Payment (Net Banking)'],
      default: 'Mock Payment (UPI)',
    },
    // NOTE: this is a MOCK payment gateway for demo purposes (no real money moves).
    // To go live, replace processPayment() in controllers/propertyTaxController.js
    // with a real gateway integration (Razorpay/Stripe) and verify server-side signatures.
    transactionRef: { type: String, required: true },
    pdfPath: { type: String, default: '' },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PropertyTax = mongoose.model('PropertyTax', propertyTaxSchema);
const TaxPayment = mongoose.model('TaxPayment', paymentSchema);

module.exports = { PropertyTax, TaxPayment };
