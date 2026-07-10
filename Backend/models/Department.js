const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      // e.g. Water Department, Public Works Department, Sanitation Department
    },
    headOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    categoriesHandled: [{ type: String }], // maps to Complaint categories
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
