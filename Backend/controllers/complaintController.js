const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const { registerComplaintRecord } = require('../services/complaintService');

// @desc    Register a new complaint (citizen or guest)
// @route   POST /api/complaints
// @access  Public (works for logged-in citizens and guests)
const createComplaint = async (req, res, next) => {
  try {
    const { name, mobile, category, address, description, ward, lat, lng } = req.body;
    const images = (req.files || []).map((f) => `/uploads/complaints/${f.filename}`);

    const { complaint, estimatedResolution } = await registerComplaintRecord({
      name,
      mobile,
      category,
      address,
      description,
      ward,
      images,
      lat: lat || null,
      lng: lng || null,
      citizenId: req.user ? req.user._id : null,
    });

    res.status(201).json({
      success: true,
      message: 'Complaint registered successfully',
      complaint,
      estimatedResolution,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Track a complaint by its complaintId (public)
// @route   GET /api/complaints/track/:complaintId
// @access  Public
const trackComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findOne({ complaintId: req.params.complaintId }).populate(
      'assignedOfficer',
      'name designation'
    );
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'No complaint found with this ID' });
    }
    res.status(200).json({ success: true, complaint });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in citizen's own complaints
// @route   GET /api/complaints/my
// @access  Private (citizen)
const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ citizen: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all complaints (officer/admin) with optional filters
// @route   GET /api/complaints?status=&category=&department=
// @access  Private (officer, admin)
const getAllComplaints = async (req, res, next) => {
  try {
    const { status, category, department, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (department) filter.department = department;

    const complaints = await Complaint.find(filter)
      .populate('assignedOfficer', 'name designation')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Complaint.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: complaints.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single complaint by MongoDB _id
// @route   GET /api/complaints/:id
// @access  Private (officer, admin)
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('assignedOfficer', 'name designation');
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    res.status(200).json({ success: true, complaint });
  } catch (error) {
    next(error);
  }
};

// @desc    Update complaint status / assign officer
// @route   PUT /api/complaints/:id/status
// @access  Private (officer, admin)
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, note, assignedOfficer } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const statusChanged = !!status && status !== complaint.status;
    const officerJustAssigned = !!assignedOfficer && String(complaint.assignedOfficer || '') !== String(assignedOfficer);

    if (status) {
      complaint.status = status;
      complaint.statusHistory.push({ status, note: note || '' });
    }
    if (assignedOfficer) {
      complaint.assignedOfficer = assignedOfficer;
    }

    await complaint.save();

    // Fire a notification for EVERY meaningful update, with the correct message per event type,
    // so citizens never see a misleading "status changed" message when only the officer changed.
    if (complaint.citizen) {
      if (officerJustAssigned && statusChanged) {
        await Notification.create({
          user: complaint.citizen,
          title: 'Officer Assigned & Status Updated',
          message: `An officer has been assigned to your complaint ${complaint.complaintId}, and its status is now "${complaint.status}".`,
          type: 'complaint',
          relatedId: complaint.complaintId,
        });
      } else if (officerJustAssigned) {
        await Notification.create({
          user: complaint.citizen,
          title: 'Officer Assigned',
          message: `An officer has been assigned to your complaint ${complaint.complaintId}.`,
          type: 'complaint',
          relatedId: complaint.complaintId,
        });
      } else if (statusChanged) {
        await Notification.create({
          user: complaint.citizen,
          title: 'Complaint Status Updated',
          message: `Your complaint ${complaint.complaintId} is now marked as "${complaint.status}".`,
          type: 'complaint',
          relatedId: complaint.complaintId,
        });
      }
    }

    res.status(200).json({ success: true, message: 'Complaint updated successfully', complaint });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  trackComplaint,
  getMyComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
};
