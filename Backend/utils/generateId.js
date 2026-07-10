const { getNextSequence } = require('../models/Counter');

// Generates sequential, production-safe unique IDs.
// Uses an atomic MongoDB counter (see models/Counter.js) so concurrent
// submissions can NEVER collide, unlike a random-number approach.
// Complaints and Documents use SEPARATE counter sequences (complaint_YEAR vs certificate_YEAR)
// so their numbering never overlaps or interferes with each other.

const pad6 = (num) => String(num).padStart(6, '0');

const generateComplaintId = async () => {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`complaint_${year}`);
  return `USP-CMP-${year}-${pad6(seq)}`;
};

const generateCertificateId = async () => {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`certificate_${year}`);
  return `USP-DOC-${year}-${pad6(seq)}`;
};

const generateTaxReceiptId = async () => {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`tax_receipt_${year}`);
  return `USP-TAX-${year}-${pad6(seq)}`;
};

module.exports = { generateComplaintId, generateCertificateId, generateTaxReceiptId };
