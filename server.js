// server.js - entry point for the backend
// Responsibilities:
//  - Load environment variables
//  - Connect to MongoDB
//  - Apply top-level middleware (CORS)
//  - Start Express app exported from `app.js`
//  - Handle process-level errors (unhandled rejections / exceptions)
const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDatabase = require("./config/database");
const app = require("./app");

// Load environment variables from file only in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "config", "config.env") });
}

console.log("Running in:", process.env.NODE_ENV);

const requiredEnv = [
  "JWT_SECRET",
  "DB_LOCAL_URI",
  "COOKIE_EXPIRE",
  "BACKEND_URL",
  "FRONTEND_URL",
];


requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`${key} is missing`);
  }
});

// ✅ Enforce CORS globally (allows frontend to call API)
// This middleware ensures the server responds with appropriate
// Access-Control-Allow-* headers for requests coming from the
// frontend (localhost:3000) or deployed frontend URL.
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://favcart-frontend.vercel.app",
    ],
    credentials: true,
  })
);

// ✅ Connect database
connectDatabase();

// ✅ Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on PORT: ${PORT} in ${process.env.NODE_ENV}`);
  console.log("✅ CORS enabled for frontend URLs");
});

// ✅ Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error(`❌ Error: ${err.message}`);
  console.error("Shutting down due to unhandled promise rejection...");
  server.close(() => process.exit(1));
});

// ✅ Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(`❌ Error: ${err.message}`);
  console.error("Shutting down due to uncaught exception...");
  server.close(() => process.exit(1));
});
