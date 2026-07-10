const mongoose = require('mongoose');

/**
 * Generic atomic counter collection used to generate sequential,
 * production-safe IDs like USP-2026-000001 (no collision risk, unlike random IDs).
 * One document per counter name (e.g. "complaint", "certificate", "tax_receipt").
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // counter name, e.g. "complaint_2026"
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomically increments and returns the next sequence number for a given counter name.
 * Using findOneAndUpdate with $inc is atomic at the MongoDB level, so it is safe
 * even under concurrent requests (no two complaints can ever get the same ID).
 */
const getNextSequence = async (counterName) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

module.exports = { Counter, getNextSequence };
