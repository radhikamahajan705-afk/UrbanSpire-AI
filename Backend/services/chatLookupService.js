const Complaint = require('../models/Complaint');
const Certificate = require('../models/Certificate');

const COMPLAINT_ID_REGEX = /USP-CMP-\d{4}-\d{6}/i;
const DOCUMENT_ID_REGEX = /USP-DOC-\d{4}-\d{6}/i;

const etaByPriority = { High: '24-48 Hours', Medium: '3-5 Days', Low: '5-7 Days' };
const progressMap = { Registered: 20, 'In Progress': 60, Resolved: 100, Rejected: 100 };

/**
 * Scans the citizen's chat message for a Complaint ID or Document ID and, if found,
 * fetches the LIVE record from MongoDB. Returns a plain structured object (not a
 * pre-written sentence) so the caller can format it deterministically per language
 * without ever depending on an LLM to reproduce the facts correctly.
 * Returns null if no ID pattern is present in the message at all.
 */
const lookupDbContext = async (message) => {
  const complaintMatch = message.match(COMPLAINT_ID_REGEX);
  const documentMatch = message.match(DOCUMENT_ID_REGEX);

  if (complaintMatch) {
    const id = complaintMatch[0].toUpperCase();
    const complaint = await Complaint.findOne({ complaintId: id }).populate('assignedOfficer', 'name designation');

    if (!complaint) {
      return { kind: 'complaint', found: false, id };
    }

    return {
      kind: 'complaint',
      found: true,
      id: complaint.complaintId,
      status: complaint.status,
      category: complaint.category,
      department: complaint.department,
      officer: complaint.assignedOfficer
        ? `${complaint.assignedOfficer.name} (${complaint.assignedOfficer.designation || 'Officer'})`
        : 'Not yet assigned',
      priority: complaint.priority,
      progress: progressMap[complaint.status] ?? 20,
      eta: etaByPriority[complaint.priority] || '3-5 Days',
      filedOn: new Date(complaint.createdAt).toDateString(),
    };
  }

  if (documentMatch) {
    const id = documentMatch[0].toUpperCase();
    const certificate = await Certificate.findOne({ certificateId: id });

    if (!certificate) {
      return { kind: 'document', found: false, id };
    }

    return {
      kind: 'document',
      found: true,
      id: certificate.certificateId,
      type: certificate.type,
      status: certificate.status,
      applicantName: certificate.applicantName,
      remarks: certificate.remarks || 'None',
      pdfReady: certificate.status === 'Approved' && !!certificate.pdfPath,
      submittedOn: new Date(certificate.createdAt).toDateString(),
    };
  }

  return null; // no ID mentioned in the message
};

// Multilingual labels so the deterministic (non-Gemini) reply still respects the
// citizen's selected language (en/hi/mr), consistent with the rest of the platform.
const LABELS = {
  en: {
    complaintId: 'Complaint ID', status: 'Status', department: 'Department', officer: 'Assigned Officer',
    progress: 'Progress', eta: 'Expected Resolution', filedOn: 'Filed On',
    notFoundComplaint: (id) => `I couldn't find any complaint with ID ${id} in our system. Please double-check the ID and try again.`,
    docId: 'Application ID', docType: 'Document Type', applicant: 'Applicant Name', remarks: 'Remarks',
    pdfReady: 'PDF Ready for Download', submittedOn: 'Submitted On',
    notFoundDoc: (id) => `I couldn't find any document application with ID ${id} in our system. Please double-check the ID and try again.`,
    yes: 'Yes', no: 'Not yet',
  },
  hi: {
    complaintId: 'शिकायत ID', status: 'स्थिति', department: 'विभाग', officer: 'नियुक्त अधिकारी',
    progress: 'प्रगति', eta: 'अनुमानित समाधान', filedOn: 'दर्ज तिथि',
    notFoundComplaint: (id) => `हमें ${id} ID वाली कोई शिकायत नहीं मिली। कृपया ID दोबारा जांचें।`,
    docId: 'आवेदन ID', docType: 'दस्तावेज़ प्रकार', applicant: 'आवेदक का नाम', remarks: 'टिप्पणी',
    pdfReady: 'PDF डाउनलोड हेतु तैयार', submittedOn: 'जमा करने की तिथि',
    notFoundDoc: (id) => `हमें ${id} ID वाला कोई दस्तावेज़ आवेदन नहीं मिला। कृपया ID दोबारा जांचें।`,
    yes: 'हाँ', no: 'अभी नहीं',
  },
  mr: {
    complaintId: 'तक्रार ID', status: 'स्थिती', department: 'विभाग', officer: 'नियुक्त अधिकारी',
    progress: 'प्रगती', eta: 'अपेक्षित निराकरण', filedOn: 'नोंद तारीख',
    notFoundComplaint: (id) => `आम्हाला ${id} ID असलेली कोणतीही तक्रार सापडली नाही. कृपया ID पुन्हा तपासा.`,
    docId: 'अर्ज ID', docType: 'दस्तऐवज प्रकार', applicant: 'अर्जदाराचे नाव', remarks: 'शेरा',
    pdfReady: 'PDF डाउनलोडसाठी तयार', submittedOn: 'सादर तारीख',
    notFoundDoc: (id) => `आम्हाला ${id} ID असलेला कोणताही दस्तऐवज अर्ज सापडला नाही. कृपया ID पुन्हा तपासा.`,
    yes: 'होय', no: 'अजून नाही',
  },
};

/**
 * Builds the FINAL citizen-facing reply directly from the MongoDB record —
 * no LLM involved, so the real data can never be diluted, paraphrased away,
 * or replaced with a generic-sounding answer.
 */
const buildDeterministicReply = (record, lang = 'en') => {
  const L = LABELS[lang] || LABELS.en;
  if (!record) return L.notFoundComplaint('(unknown)');

  if (record.kind === 'complaint') {
    if (!record.found) return L.notFoundComplaint(record.id);
    return [
      `${L.complaintId}: ${record.id}`,
      `${L.status}: ${record.status}`,
      `${L.department}: ${record.department}`,
      `${L.officer}: ${record.officer}`,
      `${L.progress}: ${record.progress}%`,
      `${L.eta}: ${record.eta}`,
      `${L.filedOn}: ${record.filedOn}`,
    ].join('\n');
  }

  if (record.kind === 'document') {
    if (!record.found) return L.notFoundDoc(record.id);
    return [
      `${L.docId}: ${record.id}`,
      `${L.docType}: ${record.type}`,
      `${L.status}: ${record.status}`,
      `${L.applicant}: ${record.applicantName}`,
      `${L.remarks}: ${record.remarks}`,
      `${L.pdfReady}: ${record.pdfReady ? L.yes : L.no}`,
      `${L.submittedOn}: ${record.submittedOn}`,
    ].join('\n');
  }

  return L.notFoundComplaint('(unknown)');
};

module.exports = { lookupDbContext, buildDeterministicReply, COMPLAINT_ID_REGEX, DOCUMENT_ID_REGEX };
