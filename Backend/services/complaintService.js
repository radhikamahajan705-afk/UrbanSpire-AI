const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const { classifyComplaint } = require('./classificationService');
const { generateComplaintId } = require('../utils/generateId');

/**
 * Core complaint-registration logic, extracted so it has exactly ONE implementation
 * shared by:
 *   - POST /api/complaints (controllers/complaintController.js, HTTP + file upload)
 *   - the chatbot Agentic AI flow (services/agentService.js, conversational)
 * Neither caller re-implements classification, ID generation, or notification logic.
 *
 * @param {Object} input
 * @param {string} input.name
 * @param {string} input.mobile
 * @param {string} [input.category] - optional; auto-classified from description if omitted/"Other"
 * @param {string} input.address
 * @param {string} input.description
 * @param {string} [input.ward]
 * @param {string[]} [input.images] - already-saved file paths (HTTP path only; empty for chat)
 * @param {number} [input.lat]
 * @param {number} [input.lng]
 * @param {string|null} [input.citizenId] - Mongo ObjectId string if the citizen is logged in
 */
const registerComplaintRecord = async ({
  name,
  mobile,
  category,
  address,
  description,
  ward = '',
  images = [],
  lat = null,
  lng = null,
  citizenId = null,
}) => {
  const auto = classifyComplaint(description);
  const finalCategory = category && category !== 'Other' ? category : auto.category;
  const finalDept = auto.category === finalCategory ? auto.department : `${finalCategory} Department`;

  const newComplaintId = await generateComplaintId();

  const complaint = await Complaint.create({
    complaintId: newComplaintId,
    citizen: citizenId || null,
    name,
    mobile,
    category: finalCategory,
    description,
    address,
    ward: ward || '',
    images,
    priority: auto.priority,
    department: finalDept,
    location: { lat, lng },
    statusHistory: [{ status: 'Registered', note: 'Complaint filed by citizen' }],
  });

  if (citizenId) {
    await Notification.create({
      user: citizenId,
      title: 'Complaint Registered',
      message: `Your complaint ${complaint.complaintId} has been registered and forwarded to ${finalDept}.`,
      type: 'complaint',
      relatedId: complaint.complaintId,
    });
  }

  return { complaint, estimatedResolution: auto.eta };
};

module.exports = { registerComplaintRecord };
