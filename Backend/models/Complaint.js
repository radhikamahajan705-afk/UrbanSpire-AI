const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      unique: true,
      required: true,
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // allows guest complaints too
    },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'Water Supply',
        'Roads',
        'Electricity',
        'Sanitation',
        'Streetlights',
        'Public Health',
        'Other',
      ],
      default: 'Other',
    },
    description: { type: String, required: true },
    address: { type: String, required: true },
    ward: { type: String, default: '' },
    images: [{ type: String }], // file paths of uploaded images
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    department: { type: String, default: 'General Administration' },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['Registered', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Registered',
    },
    statusHistory: [
      {
        status: String,
        note: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

complaintSchema.index({ status: 1, category: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
