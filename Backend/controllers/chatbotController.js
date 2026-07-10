const { askGemini } = require('../services/geminiService');
const { lookupDbContext, COMPLAINT_ID_REGEX, DOCUMENT_ID_REGEX, buildDeterministicReply } = require('../services/chatLookupService');
const { shouldHandleAsAgent, handleAgentTurn } = require('../services/agentService');

// Rule-based fallback replies (used only if GEMINI_API_KEY is missing or the API call fails,
// AND no ID was detected in the message - ID-based lookups never reach this, see below).
const fallbackReply = (message) => {
  const q = message.toLowerCase();
  const patterns = [
    { test: /hi|hello|hey|namaste/, reply: "Namaste! I'm UrbanSpire's Citizen Assistant. Ask me about complaints, tracking, property tax, or certificate applications." },
    { test: /complaint id|where.*id/, reply: 'Your Complaint ID (format USP-CMP-2026-000001) is shown on the success screen right after you submit a complaint via "Register Complaint", and sent as a notification if you were logged in.' },
    { test: /track/, reply: 'Please share your Complaint ID or Document ID (e.g. USP-CMP-2026-000001 or USP-DOC-2026-000001) and I\'ll fetch its live status for you.' },
    { test: /water|pipe|leak|supply/, reply: 'Register a water supply complaint via "Register Complaint" — it is auto-classified as Water Supply with High priority and routed to the Water Department.' },
    { test: /birth certificate/, reply: 'Apply for a Birth Certificate under "Apply for a Document / Certificate". Status moves from Pending → Under Review → Approved, after which a PDF becomes downloadable.' },
    { test: /tax/, reply: 'Check and pay your property tax under the Property Tax module by entering your Property ID — a PDF receipt is generated instantly after payment.' },
    { test: /permit|licen[cs]e/, reply: 'Permits and licenses (Trade License, Building Permit, Water Connection NOC) are applied for via "Apply for a Document / Certificate", with the same status tracking as certificates.' },
    { test: /ward|office/, reply: 'Ward office contact details are listed in the Contact Directory section of your Citizen Dashboard.' },
    { test: /sanitation|garbage|waste/, reply: 'Register a sanitation complaint via "Register Complaint" — it is routed to the Sanitation Department with High priority.' },
  ];
  for (const p of patterns) {
    if (p.test.test(q)) return p.reply;
  }
  return 'I can help with complaints, tracking, certificates, permits and property tax on UrbanSpire. Could you rephrase your question around one of these services?';
};

// @desc    Chat with the AI Citizen Assistant
// @route   POST /api/chatbot
// @access  Public
const chatWithAI = async (req, res, next) => {
  const traceId = Date.now().toString(36); // unique tag per request so Render logs can be correlated
  try {
    const { message, lang, sessionId } = req.body;
    console.log(`[chatbot ${traceId}] IN  message="${message}" lang="${lang}" sessionId="${sessionId}"`);

    if (!message || !message.trim()) {
      console.log(`[chatbot ${traceId}] REJECTED - empty message`);
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // STEP 1: Detect a Complaint ID (USP-CMP-...) or Document ID (USP-DOC-...) in the message.
    const hasComplaintId = COMPLAINT_ID_REGEX.test(message);
    const hasDocumentId = DOCUMENT_ID_REGEX.test(message);
    console.log(`[chatbot ${traceId}] regex test -> complaintId=${hasComplaintId} documentId=${hasDocumentId}`);

    if (hasComplaintId || hasDocumentId) {
      // STEP 2: ID detected -> go STRAIGHT to MongoDB. Gemini is intentionally NEVER called
      // for this path, so the final answer can never be genericized/paraphrased away from
      // the real database record. This is the fix for "generic response instead of live data".
      let record;
      try {
        record = await lookupDbContext(message);
        console.log(`[chatbot ${traceId}] DB lookup result: kind=${record?.kind} found=${record?.found} id=${record?.id}`);
      } catch (dbErr) {
        console.error(`[chatbot ${traceId}] DB ERROR:`, dbErr.message);
        return res.status(200).json({
          success: true,
          reply: 'I could not reach the database just now to fetch that record. Please try again in a moment.',
          source: 'db-error',
          dbLookupPerformed: true,
        });
      }

      const reply = buildDeterministicReply(record, lang || 'en');
      console.log(`[chatbot ${traceId}] OUT (deterministic, no-Gemini) source=db`);
      return res.status(200).json({ success: true, reply, source: 'database', dbLookupPerformed: true });
    }

    // STEP 3 (Agentic AI): does this message express intent to register a complaint,
    // or is a slot-filling conversation already in progress for this session?
    // sessionId is generated client-side (see index.html) - falls back to a per-request
    // id (no continuity) if the frontend hasn't been updated yet, so nothing breaks.
    const effectiveSessionId = sessionId || `anon-${traceId}`;
    if (shouldHandleAsAgent(effectiveSessionId, message)) {
      console.log(`[chatbot ${traceId}] AGENT branch engaged for session=${effectiveSessionId}`);
      try {
        const agentResult = await handleAgentTurn(effectiveSessionId, message, lang || 'en', req.user ? req.user._id : null);
        console.log(`[chatbot ${traceId}] OUT (agent) registered=${agentResult.complaintRegistered}`);
        return res.status(200).json({
          success: true,
          reply: agentResult.reply,
          source: 'agent',
          complaintRegistered: agentResult.complaintRegistered,
          complaintId: agentResult.complaint ? agentResult.complaint.complaintId : undefined,
        });
      } catch (agentErr) {
        console.error(`[chatbot ${traceId}] AGENT ERROR:`, agentErr.message);
        return res.status(200).json({
          success: true,
          reply: 'I understood you want to file a complaint, but something went wrong saving it. Please try again or use the "Register Complaint" form.',
          source: 'agent-error',
        });
      }
    }

    // STEP 4: No ID, no complaint-filing intent -> normal conversational question -> Gemini
    // (with the full UrbanSpire knowledge base in its system prompt, no live record involved).
    let reply;
    let source = 'gemini';
    try {
      reply = await askGemini(message, lang || 'en', null);
      console.log(`[chatbot ${traceId}] OUT (gemini)`);
    } catch (geminiError) {
      console.warn(`[chatbot ${traceId}] Gemini unavailable, using fallback:`, geminiError.message);
      reply = fallbackReply(message);
      source = 'fallback';
      console.log(`[chatbot ${traceId}] OUT (fallback)`);
    }

    res.status(200).json({ success: true, reply, source, dbLookupPerformed: false });
  } catch (error) {
    console.error(`[chatbot ${traceId}] UNCAUGHT ERROR:`, error.message);
    next(error);
  }
};

module.exports = { chatWithAI };
