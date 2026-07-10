/**
 * AI Complaint Classification Service.
 *
 * Uses fast, reliable keyword-based classification as the primary method
 * (zero latency, zero cost, works even if the Gemini API key is missing/rate-limited).
 * This mirrors the classification logic already used in the frontend demo,
 * so behaviour stays consistent across the whole platform.
 */
const classifyComplaint = (description = '') => {
  const text = description.toLowerCase();

  let category = 'Other';
  let department = 'General Administration';
  let priority = 'Medium';
  let eta = '72 hours';

  if (/water|pipe|leak|supply|tap/.test(text)) {
    category = 'Water Supply';
    department = 'Water Department';
    priority = 'High';
    eta = '24 hours';
  } else if (/road|pothole|footpath/.test(text)) {
    category = 'Roads';
    department = 'Public Works Department';
    priority = 'Medium';
    eta = '5 days';
  } else if (/electric|power|transformer|wire|current|voltage/.test(text)) {
    category = 'Electricity';
    department = 'Electricity Department';
    priority = 'High';
    eta = '12 hours';
  } else if (/garbage|waste|trash|sanitation|sewage|drain/.test(text)) {
    category = 'Sanitation';
    department = 'Sanitation Department';
    priority = 'High';
    eta = '24 hours';
  } else if (/streetlight|street light|lamp|dark/.test(text)) {
    category = 'Streetlights';
    department = 'Electrical (Street Lighting)';
    priority = 'Medium';
    eta = '48 hours';
  } else if (/health|hospital|disease|mosquito|dengue|malaria/.test(text)) {
    category = 'Public Health';
    department = 'Public Health Department';
    priority = 'High';
    eta = '24 hours';
  }

  return { category, department, priority, eta };
};

module.exports = { classifyComplaint };
