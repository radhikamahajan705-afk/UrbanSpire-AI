const { extractComplaintEntities } = require('./geminiService');
const { registerComplaintRecord } = require('./complaintService');

/**
 * In-memory session store for multi-turn complaint filing through chat.
 * NOT a database model (per requirement: no new MongoDB models) — this is
 * ephemeral conversation state only, lost on server restart, exactly like
 * a request-scoped variable would be, just kept alive across the few
 * chat turns needed to collect the required fields.
 * Keyed by a sessionId the frontend generates once per browser (see index.html).
 */
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min of inactivity auto-clears a stalled session

const REQUIRED_FIELDS = ['name', 'mobile', 'address', 'description'];

const INTENT_REGEX = /\b(register|file|lodge|raise|submit|report|log)\b[^.?!]{0,25}\bcomplaint\b|\bcomplaint\b[^.?!]{0,15}\b(register|file|lodge|about)\b/i;

const FIELD_QUESTIONS = {
  en: {
    name: 'your full name',
    mobile: 'a 10-digit mobile number',
    address: 'the exact location / address of the issue',
    description: 'a short description of the problem',
    ask: (missing) => `Sure, I can register that complaint for you. I just need: ${missing.join(', ')}. Could you share ${missing.length > 1 ? 'these' : 'that'}?`,
  },
  hi: {
    name: 'आपका पूरा नाम',
    mobile: '10 अंकों का मोबाइल नंबर',
    address: 'समस्या का सटीक स्थान / पता',
    description: 'समस्या का संक्षिप्त विवरण',
    ask: (missing) => `ज़रूर, मैं आपकी शिकायत दर्ज कर सकता हूं। बस मुझे चाहिए: ${missing.join(', ')}। क्या आप ${missing.length > 1 ? 'ये बता' : 'यह बता'} सकते हैं?`,
  },
  mr: {
    name: 'तुमचे पूर्ण नाव',
    mobile: '10 अंकी मोबाइल क्रमांक',
    address: 'समस्येचे नेमके ठिकाण / पत्ता',
    description: 'समस्येचे थोडक्यात वर्णन',
    ask: (missing) => `नक्कीच, मी तुमची तक्रार नोंदवू शकतो. मला फक्त हवे आहे: ${missing.join(', ')}. कृपया ${missing.length > 1 ? 'हे सांगाल' : 'हे सांगाल'} का?`,
  },
};

const CONFIRM_LABELS = {
  en: { id: 'Complaint ID', dept: 'Department Assigned', status: 'Status', eta: 'Estimated Resolution', done: (id) => `Your complaint has been registered successfully.` },
  hi: { id: 'शिकायत ID', dept: 'नियुक्त विभाग', status: 'स्थिति', eta: 'अनुमानित समाधान', done: () => `आपकी शिकायत सफलतापूर्वक दर्ज हो गई है।` },
  mr: { id: 'तक्रार ID', dept: 'नियुक्त विभाग', status: 'स्थिती', eta: 'अपेक्षित निराकरण', done: () => `तुमची तक्रार यशस्वीरित्या नोंदवली गेली आहे.` },
};

const isSessionStale = (session) => Date.now() - session.updatedAt > SESSION_TTL_MS;

/**
 * @returns {boolean} true if this message should be handled by the complaint-filing agent
 * (either it clearly expresses intent to register a complaint, OR a slot-filling
 * conversation is already in progress for this session).
 */
const shouldHandleAsAgent = (sessionId, message) => {
  const existing = sessions.get(sessionId);
  if (existing && existing.pending && !isSessionStale(existing)) return true;
  return INTENT_REGEX.test(message);
};

const getMissingFields = (slots) => REQUIRED_FIELDS.filter((f) => !slots[f] || String(slots[f]).trim() === '');

/**
 * Runs one turn of the agentic complaint-filing flow:
 *   1. Detect intent (handled by caller via shouldHandleAsAgent)
 *   2. Extract entities from the message (Gemini) and merge into session slots
 *   3. Classify + decide department/priority happens inside registerComplaintRecord
 *      (reuses the exact same classification the REST API uses - no duplicate logic)
 *   4. If required fields are complete, call the shared complaint service automatically
 *   5. Return the generated Complaint ID and a confirmation, or ask for missing info
 */
const handleAgentTurn = async (sessionId, message, lang = 'en', citizenId = null) => {
  const L = FIELD_QUESTIONS[lang] || FIELD_QUESTIONS.en;
  const C = CONFIRM_LABELS[lang] || CONFIRM_LABELS.en;

  let session = sessions.get(sessionId);
  if (!session || isSessionStale(session)) {
    session = { pending: true, slots: {}, updatedAt: Date.now(), citizenId };
  }
  if (citizenId) session.citizenId = citizenId; // keep it current even if session already existed

  // STEP: extract entities from this message via Gemini, merged with what we already know
  const extracted = await extractComplaintEntities(message, session.slots);

  if (extracted) {
    Object.keys(extracted).forEach((key) => {
      if (extracted[key] !== null && extracted[key] !== undefined && String(extracted[key]).trim() !== '') {
        session.slots[key] = String(extracted[key]).trim();
      }
    });
  }

  // Regex-based supplementary extraction - ALWAYS runs (not just when Gemini fails).
  // Bug fixed here: this used to live in an `else` branch, so it never ran whenever
  // Gemini returned a technically-valid object with all fields null (which is normal
  // LLM behavior, not a failure) - meaning clearly-labeled details like "My name is X"
  // were silently discarded forever. It only fills fields still missing, so it never
  // overwrites anything Gemini already provided correctly.
  if (!session.slots.description) session.slots.description = message;

  if (!session.slots.mobile) {
    const mobileMatch = message.match(/\b\d{10}\b/);
    if (mobileMatch) session.slots.mobile = mobileMatch[0];
  }

  if (!session.slots.name) {
    const nameMatch = message.match(/(?:my name is|name\s*[:\-]|i am|this is)\s+([a-zA-Z][a-zA-Z .]{1,50}?)(?:[.,\n]|$)/i);
    if (nameMatch) session.slots.name = nameMatch[1].trim();
  }

  if (!session.slots.address) {
    const addressMatch = message.match(/(?:my address is|address\s*[:\-]|located at|i live at|i live in)\s+([^.\n]{3,80})/i);
    if (addressMatch) session.slots.address = addressMatch[1].trim();
  }

  const complaintMatch = message.match(/(?:my complaint is that|complaint is that|the problem is that|the issue is that|problem is|issue is)\s+([^.\n]{3,150})/i);
  if (complaintMatch) session.slots.description = complaintMatch[1].trim();

  console.log(`[agent] session=${sessionId} slots after merge:`, JSON.stringify(session.slots));

  session.updatedAt = Date.now();

  const missing = getMissingFields(session.slots);
  console.log(`[agent] session=${sessionId} missing after getMissingFields:`, missing);

  if (missing.length > 0) {
    sessions.set(sessionId, session);
    const missingLabels = missing.map((f) => L[f]);
    return { reply: L.ask(missingLabels), complaintRegistered: false };
  }

  // All required fields present -> auto-register via the SAME service the REST API uses
  try {
    const { complaint, estimatedResolution } = await registerComplaintRecord({
      name: session.slots.name,
      mobile: session.slots.mobile,
      category: session.slots.category || 'Other',
      address: session.slots.address,
      description: session.slots.description,
      ward: session.slots.ward || '',
      citizenId: session.citizenId || null,
    });

    sessions.delete(sessionId); // flow complete, clear state

    const reply = [
      C.done(),
      `${C.id}: ${complaint.complaintId}`,
      `${C.dept}: ${complaint.department}`,
      `${C.status}: ${complaint.status}`,
      `${C.eta}: ${estimatedResolution}`,
    ].join('\n');

    return { reply, complaintRegistered: true, complaint };
  } catch (err) {
    sessions.delete(sessionId);
    throw err;
  }
};

module.exports = { shouldHandleAsAgent, handleAgentTurn };