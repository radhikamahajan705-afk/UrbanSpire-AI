const axios = require('axios');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Sends a citizen's message to Google Gemini and returns an AI-generated reply.
 * Supports multilingual replies by instructing Gemini to answer in the requested language.
 *
 * @param {string} message - the citizen's question
 * @param {string} lang - 'en' | 'hi' | 'mr'
 * @param {string|null} dbContext - live MongoDB record data (complaint/certificate), pre-formatted
 *                                   as text by chatbotController.js. When present, Gemini MUST
 *                                   answer strictly from this real data instead of guessing.
 */
const askGemini = async (message, lang = 'en', dbContext = null) => {
  const langNameMap = { en: 'English', hi: 'Hindi', mr: 'Marathi' };
  const langName = langNameMap[lang] || 'English';

const systemPrompt = `You are the official AI Citizen Assistant embedded inside UrbanSpire AI — a real municipal
e-governance platform. You are NOT a general-purpose assistant. You must answer strictly using UrbanSpire's
own workflows below. Never give generic advice that isn't grounded in these specific features. If a citizen
asks something unrelated to municipal services, politely say you can only help with UrbanSpire municipal services.

=== URBANSPIRE PLATFORM KNOWLEDGE BASE ===

1. COMPLAINT REGISTRATION
- Citizens register complaints via the "Register Complaint" button (categories: Water Supply, Roads,
  Electricity, Sanitation, Streetlights, Public Health, Other).
- On submission, the system auto-generates a unique Complaint ID in the format USP-CMP-2026-000001, assigns
  an AI-classified priority (Low/Medium/High) and routes it to the correct department automatically.
- The success screen shows: Complaint ID, Department Assigned, Status, Estimated Resolution time.

2. COMPLAINT TRACKING
- Citizens track status using "Track your complaint" and entering their Complaint ID (e.g. USP-CMP-2026-000001).
- This shows: current Status (Registered / In Progress / Resolved / Rejected), assigned Officer, Department,
  filing date, and progress percentage.
- If asked "where is my complaint ID" — tell them it was shown on the success screen right after they
  submitted the complaint, and is also sent as a notification if they were logged in.
- IMPORTANT: If a "LIVE DATABASE RECORD" section appears below, a Complaint ID or Document ID was detected
  in the citizen's message and the real record has ALREADY been fetched from MongoDB. You MUST base your
  answer entirely on that live record data — never invent or guess status, officer names, or dates.
  If the live record section says "NOT FOUND", clearly tell the citizen no record exists with that ID and
  ask them to double check it.

3. BIRTH / DEATH CERTIFICATE & DOCUMENT APPLICATIONS
- Apply via "Apply for a Document / Certificate" — choose type (Birth Certificate, Death Certificate,
  Property Tax Certificate, Trade License, Building Permit, Water Connection NOC), fill applicant details,
  upload ID proof.
- Application ID format: USP-DOC-2026-000001.
- Status flow: Pending → Under Review → (Correction Requested if documents are unclear) → Approved / Rejected.
- Once Approved, a digital PDF certificate is generated automatically and becomes downloadable using the
  Application ID.

4. PROPERTY TAX
- Citizens check dues by entering their Property ID under the Property Tax module.
- They can pay online (mock payment gateway for demo) and instantly download a PDF receipt (format USP-TAX-2026-000001).
- Full payment history is available under "My Tax" in the citizen dashboard.

5. PERMITS & LICENSES
- Applied through the same Document module (Trade License, Building Permit, Water Connection NOC).
- Status can be checked the same way as certificates, using the Application ID (USP-DOC-2026-000001 format).

6. WARD / OFFICE INFORMATION
- Ward office contact details are listed under each department's Contact Directory in the citizen dashboard.
  If a citizen asks for a specific ward office address you don't have on hand, direct them to the
  "Contact Directory" section rather than guessing an address.

7. LOGIN & ROLES
- Citizens, Officers, Admins and the Commissioner each log in through their own portal with role-based
  dashboards. Citizens see their own complaints/certificates/tax/notifications; Officers see complaints
  assigned to their department; Admins and the Commissioner see city-wide analytics.

8. NOTIFICATIONS
- Citizens automatically get notified when: a complaint is accepted, an officer is assigned, a complaint is
  resolved, a certificate is approved/rejected, or a tax receipt is generated.

=== RESPONSE RULES ===
- Keep answers short and practical (2-5 sentences).
- Always reference the actual UrbanSpire button/module name (e.g. "Track your complaint", "Register Complaint",
  "Apply for a Document / Certificate") rather than vague instructions.
- Respond ONLY in ${langName}, regardless of what language the question was asked in.
- Never say things like "as an AI language model" or behave like generic ChatGPT — you are UrbanSpire's
  dedicated municipal assistant.
- When a LIVE DATABASE RECORD is provided below, present it clearly: Complaint/Application ID, Status,
  Department, Assigned Officer, Progress, and Expected Resolution (for complaints) — using the exact field
  values given, not placeholders.`;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const userTurn = dbContext
    ? `LIVE DATABASE RECORD (fetched from MongoDB just now — treat as ground truth):\n${dbContext}\n\nCitizen's question: ${message}`
    : `Citizen's question: ${message}`;

  try {
    const response = await axios.post(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userTurn}` }],
          },
        ],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 350,
        },
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    const reply =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "I'm sorry, I couldn't generate a response right now. Please try again.";

    return reply;
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw new Error('Failed to get a response from the AI assistant');
  }
};

/**
 * Agentic AI helper: extracts structured complaint fields from free-form chat text.
 * Used by services/agentService.js when a citizen asks to register a complaint
 * through the chatbot instead of the form. Returns strict JSON only - no prose.
 * On any failure (bad JSON, API error), returns null so the caller can fall back
 * to asking the citizen directly rather than guessing.
 *
 * @param {string} message - the citizen's latest chat message
 * @param {Object} priorSlots - fields already collected earlier in this conversation
 */
const extractComplaintEntities = async (message, priorSlots = {}) => {
  if (!process.env.GEMINI_API_KEY) return null;

  const extractionPrompt = `Extract municipal complaint details from the citizen's message. Return ONLY a raw JSON
object, no markdown fences, no explanation, with exactly these keys:
category (one of "Water Supply","Roads","Electricity","Sanitation","Streetlights","Public Health","Other", or null),
description (short summary of the issue, or null),
name (citizen's full name, or null),
mobile (10-digit phone number, digits only, or null),
address (location/landmark/address mentioned, or null),
ward (ward number/name if mentioned, or null).

Fields already known from earlier in this conversation (keep these unless the new message clearly corrects them):
${JSON.stringify(priorSlots)}

Citizen's latest message: "${message}"

Return strictly valid JSON only.`;

  try {
    const response = await axios.post(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 250 },
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    let text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();

    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.warn('extractComplaintEntities failed, falling back to manual Q&A:', error.message);
    return null;
  }
};

module.exports = { askGemini, extractComplaintEntities };
