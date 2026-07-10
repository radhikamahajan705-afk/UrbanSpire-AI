const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      unique: true,
      required: true,
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'Birth Certificate',
        'Death Certificate',
        'Property Tax Certificate',
        'Trade License',
        'Building Permit',
        'Water Connection NOC',
      ],
      required: true,
    },
    applicantName: { type: String, required: true },
    idNumber: { type: String, required: true },
    mobile: { type: String, required: true },
    documents: [{ type: String }], // uploaded file paths
    status: {
      type: String,
      enum: ['Pending', 'Under Review', 'Correction Requested', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    remarks: { type: String, default: '' },
    pdfPath: { type: String, default: '' },
    issuedDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Certificate', certificateSchema);
