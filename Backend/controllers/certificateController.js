const path = require('path');
const Certificate = require('../models/Certificate');
const Notification = require('../models/Notification');
const { generateCertificateId } = require('../utils/generateId');
const { generateCertificatePDF } = require('../services/pdfService');

// @desc    Apply for a document/certificate
// @route   POST /api/certificates
// @access  Public (works for logged-in citizens and guests)
const applyCertificate = async (req, res, next) => {
  try {
    const { type, applicantName, idNumber, mobile } = req.body;

    const documents = [];
    if (req.files) {
      if (req.files.idProof) documents.push(`/uploads/certificates/${req.files.idProof[0].filename}`);
      if (req.files.supportingDoc) documents.push(`/uploads/certificates/${req.files.supportingDoc[0].filename}`);
    }
    if (documents.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload at least an ID proof document' });
    }

    const certificate = await Certificate.create({
      certificateId: await generateCertificateId(),
      citizen: req.user ? req.user._id : null,
      type,
      applicantName,
      idNumber,
      mobile,
      documents,
      status: 'Pending',
    });

    if (req.user) {
      await Notification.create({
        user: req.user._id,
        title: 'Document Application Received',
        message: `Your application for ${type} (${certificate.certificateId}) has been received and is under review.`,
        type: 'certificate',
        relatedId: certificate.certificateId,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Document application submitted successfully',
      certificate,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in citizen's own certificate applications
// @route   GET /api/certificates/my
// @access  Private (citizen)
const getMyCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ citizen: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: certificates.length, certificates });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all certificate applications (officer/admin)
// @route   GET /api/certificates?status=
// @access  Private (officer, admin)
const getAllCertificates = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const certificates = await Certificate.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: certificates.length, certificates });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/reject a certificate application (generates PDF on approval)
// @route   PUT /api/certificates/:id/review
// @access  Private (officer, admin)
const reviewCertificate = async (req, res, next) => {
  try {
    const { status, remarks } = req.body; // status: 'Approved' | 'Rejected' | 'Under Review'
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate application not found' });
    }

    certificate.status = status;
    certificate.remarks = remarks || '';

    if (status === 'Approved') {
      certificate.issuedDate = new Date();
      const pdfPath = await generateCertificatePDF(certificate);
      certificate.pdfPath = pdfPath;
    }

    await certificate.save();

    if (certificate.citizen) {
      await Notification.create({
        user: certificate.citizen,
        title: 'Document Application Update',
        message: `Your application ${certificate.certificateId} is now "${status}".`,
        type: 'certificate',
        relatedId: certificate.certificateId,
      });
    }

    res.status(200).json({ success: true, message: 'Certificate reviewed successfully', certificate });
  } catch (error) {
    next(error);
  }
};

// @desc    Check a certificate application's status by certificateId (public)
// @route   GET /api/certificates/status/:certificateId
// @access  Public
const checkCertificateStatus = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId });
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'No application found with this ID' });
    }
    // Citizen-facing status label per spec: Approved+pdfPath = "Ready for Download"
    const displayStatus =
      certificate.status === 'Approved' && certificate.pdfPath ? 'Ready for Download' : certificate.status;

    res.status(200).json({
      success: true,
      certificate: {
        certificateId: certificate.certificateId,
        type: certificate.type,
        applicantName: certificate.applicantName,
        status: displayStatus,
        remarks: certificate.remarks,
        createdAt: certificate.createdAt,
        issuedDate: certificate.issuedDate,
        canDownload: certificate.status === 'Approved' && !!certificate.pdfPath,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download the generated certificate PDF
// @route   GET /api/certificates/:certificateId/download
// @access  Public
const downloadCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId });
    if (!certificate || !certificate.pdfPath) {
      return res.status(404).json({ success: false, message: 'Certificate PDF not available yet. It may still be pending approval.' });
    }
    const filePath = path.join(__dirname, '..', certificate.pdfPath);
    res.download(filePath, `${certificate.certificateId}.pdf`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyCertificate,
  getMyCertificates,
  getAllCertificates,
  reviewCertificate,
  checkCertificateStatus,
  downloadCertificate,
};
