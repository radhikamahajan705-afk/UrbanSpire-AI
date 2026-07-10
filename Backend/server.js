const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Models must be registered with Mongoose before any populate('department', ...) call
// runs (e.g. in authController.loginOfficer). Previously only utils/seedDepartments.js
// required this file, so the live server process never registered the schema.
require('./models/Department');

// Route imports
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const propertyTaxRoutes = require('./routes/propertyTaxRoutes');

// Connect to MongoDB Atlas
connectDB();

const app = express();

// ===== Middleware =====
// CORS - allows your Vercel-hosted frontend to call this API.
// CLIENT_URL should be your deployed frontend URL, e.g. https://urbanspire-ai.vercel.app
// During local development, both localhost and the deployed URL are allowed.
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5500', // VS Code Live Server default
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve uploaded images/PDFs statically (e.g. /uploads/complaints/xyz.jpg)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== Health check =====
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'UrbanSpire AI Backend is running 🚀',
    version: '1.0.0',
  });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'OK', timestamp: new Date().toISOString() });
});

// ===== API Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/property-tax', propertyTaxRoutes);

// ===== Error Handling (must be last) =====
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ UrbanSpire AI backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
