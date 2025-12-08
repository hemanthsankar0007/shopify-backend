const express = require('express');
const app = express();
const errorMiddleware = require('./middlewares/error');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables (only in development)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });
}

// ==========================================
// 🚀 CORS FIX — MUST BE BEFORE ROUTES
// ==========================================
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,      // main vercel domain
      process.env.FRONTEND_URL_2,    // preview vercel domain
      "http://localhost:3000"        // local dev
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// Handle OPTIONS preflight
app.options("*", cors());

// Allow cookies
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// ==========================================
// 🚀 Core Middleware
// ==========================================
app.use(express.json());
app.use(cookieParser());

// Uploads Folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve public folder (images, CSS, static files)
app.use('/images', express.static(path.join(__dirname, '../frontend/public/images')));
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ==========================================
// 🚀 Import Routes
// ==========================================
const products = require('./routes/product');
const auth = require('./routes/auth');
const order = require('./routes/order');

// Use Routes
app.use('/api/v1', products);
app.use('/api/v1', auth);
app.use('/api/v1', order);

// ==========================================
// 🚀 Serve Frontend (Production Only)
// ==========================================
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build/index.html'));
  });
}

// ==========================================
// 🚀 Error Middleware (Always Last)
// ==========================================
app.use(errorMiddleware);

module.exports = app;
