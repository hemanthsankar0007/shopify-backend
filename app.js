const express = require('express');
const app = express();
const errorMiddleware = require('./middlewares/error');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

// Load env only in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });
}

// ==================================================
// 🔥 FINAL CORS CONFIG (PRODUCTION SAFE)
// ==================================================
app.use(
  cors({
    origin: "https://shopify-frontend-wheat.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// Preflight requests
app.options("*", cors());

// ==================================================
// Core Middleware
// ==================================================
app.use(express.json());
app.use(cookieParser());

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================================================
// Routes
// ==================================================
const products = require('./routes/product');
const auth = require('./routes/auth');
const order = require('./routes/order');

app.use('/api/v1', products);
app.use('/api/v1', auth);
app.use('/api/v1', order);

// ==================================================
// Error Middleware (ALWAYS LAST)
// ==================================================
app.use(errorMiddleware);

module.exports = app;
