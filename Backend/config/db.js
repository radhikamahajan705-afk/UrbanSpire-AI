const mongoose = require('mongoose');

/**
 * Connects to MongoDB Atlas.
 *
 * COMMON ISSUE: "querySrv ENOTFOUND _mongodb._tcp.xxxxx.mongodb.net"
 * This is a DNS resolution issue with the mongodb+srv:// protocol.
 * FIXES (try in order):
 *   1. Make sure your MONGO_URI in .env has no extra spaces/quotes.
 *   2. Whitelist your IP (or 0.0.0.0/0 for testing) in MongoDB Atlas -> Network Access.
 *   3. If on a restrictive network/college WiFi, switch DNS to Google DNS (8.8.8.8).
 *   4. As a fallback, in Atlas -> Connect -> Drivers, choose the "standard connection string"
 *      (mongodb:// with all shard hosts listed) instead of mongodb+srv:// — this avoids
 *      the SRV DNS lookup entirely and almost always fixes ENOTFOUND errors.
 *   5. On Render, DNS issues are rare, but if they occur, add family: 4 (below) which forces
 *      IPv4 lookup and resolves most cloud DNS problems.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      family: 4, // forces IPv4 - fixes many ENOTFOUND / DNS issues on cloud hosts
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error(`
    TROUBLESHOOTING STEPS:
    1. Check MONGO_URI in your .env file is correct (no <> brackets left in it).
    2. Go to MongoDB Atlas -> Network Access -> Add IP Address -> Allow Access from Anywhere (0.0.0.0/0).
    3. Go to MongoDB Atlas -> Database Access -> confirm your DB user & password are correct.
    4. If error mentions "ENOTFOUND" or "querySrv", try the non-SRV connection string
       (Atlas -> Connect -> Drivers -> toggle off "mongodb+srv" if available), or switch
       your machine's DNS to 8.8.8.8 / 1.1.1.1.
    `);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
  });
};

module.exports = connectDB;
