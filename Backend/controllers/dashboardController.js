const Complaint = require('../models/Complaint');
const Certificate = require('../models/Certificate');
const User = require('../models/User');

// @desc    PUBLIC aggregate stats for the citizen-facing homepage dashboard (no auth)
// @route   GET /api/dashboard/public-stats
// @access  Public
const getPublicStats = async (req, res, next) => {
  try {
    const openComplaints = await Complaint.countDocuments({ status: { $in: ['Registered', 'In Progress'] } });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'Resolved' });
    const totalComplaints = await Complaint.countDocuments();
    const permitsIssued = await Certificate.countDocuments({ status: 'Approved' });

    const byCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7Days = await Complaint.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Average resolution time in hours (based on resolved complaints)
    const resolvedDocs = await Complaint.find({ status: 'Resolved' }).select('createdAt updatedAt');
    let avgResolutionHrs = 0;
    if (resolvedDocs.length > 0) {
      const totalHrs = resolvedDocs.reduce((sum, c) => {
        return sum + (new Date(c.updatedAt) - new Date(c.createdAt)) / (1000 * 60 * 60);
      }, 0);
      avgResolutionHrs = Math.round(totalHrs / resolvedDocs.length);
    }

    res.status(200).json({
      success: true,
      openComplaints,
      resolvedComplaints,
      totalComplaints,
      permitsIssued,
      avgResolutionHrs,
      byCategory,
      last7Days,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Overall complaint statistics (counts by status/category/priority)
// @route   GET /api/dashboard/complaint-stats
// @access  Private (officer, admin)
const getComplaintStats = async (req, res, next) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const openComplaints = await Complaint.countDocuments({ status: { $in: ['Registered', 'In Progress'] } });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'Resolved' });

    const byCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const byStatus = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byPriority = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      totalComplaints,
      openComplaints,
      resolvedComplaints,
      byCategory,
      byStatus,
      byPriority,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Monthly complaint report (last 6 months trend)
// @route   GET /api/dashboard/monthly-report
// @access  Private (officer, admin)
const getMonthlyReport = async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthly = await Complaint.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.status(200).json({ success: true, monthly });
  } catch (error) {
    next(error);
  }
};

// @desc    Officer performance statistics
// @route   GET /api/dashboard/officer-stats
// @access  Private (admin)
const getOfficerStats = async (req, res, next) => {
  try {
    const stats = await Complaint.aggregate([
      { $match: { assignedOfficer: { $ne: null } } },
      {
        $group: {
          _id: '$assignedOfficer',
          totalAssigned: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'officer',
        },
      },
      { $unwind: '$officer' },
      {
        $project: {
          totalAssigned: 1,
          resolved: 1,
          'officer.name': 1,
          'officer.designation': 1,
        },
      },
    ]);

    res.status(200).json({ success: true, stats });
  } catch (error) {
    next(error);
  }
};

// @desc    Citizen engagement statistics
// @route   GET /api/dashboard/citizen-stats
// @access  Private (admin)
const getCitizenStats = async (req, res, next) => {
  try {
    const totalCitizens = await User.countDocuments({ role: 'citizen' });
    const totalComplaintsFiled = await Complaint.countDocuments({ citizen: { $ne: null } });
    const totalCertificatesApplied = await Certificate.countDocuments({ citizen: { $ne: null } });

    res.status(200).json({
      success: true,
      totalCitizens,
      totalComplaintsFiled,
      totalCertificatesApplied,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublicStats, getComplaintStats, getMonthlyReport, getOfficerStats, getCitizenStats };
