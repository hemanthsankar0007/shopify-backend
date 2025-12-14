const express = require('express');
const app = express();
const errorMiddleware = require('./middlewares/error');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

// Load env (local only)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });
}

// 🔥 REQUIRED FOR RENDER (VERY IMPORTANT)
app.set('trust proxy', 1);

// ==========================================
// 🚀 CORS — MUST BE FIRST
// ==========================================
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,       // https://shopify-frontend-wheat.vercel.app
      process.env.FRONTEND_URL_2,     // preview vercel URL (optional)
      'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Preflight
app.options('*', cors());

// ==========================================
// 🚀 Core Middleware
// ==========================================
app.use(express.json());
app.use(cookieParser());

// Static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 🚀 Routes
// ==========================================
const products = require('./routes/product');
const auth = require('./routes/auth');
const order = require('./routes/order');

app.use('/api/v1', products);
app.use('/api/v1', auth);
app.use('/api/v1', order);

// ==========================================
// 🚀 Error Middleware (LAST)
// ==========================================
app.use(errorMiddleware);

module.exports = app;
