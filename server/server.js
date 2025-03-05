const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());

// Endpoint to get API key with rate limiting
let requestCount = 0;
const resetTime = Date.now();

app.get("/api/config", (req, res) => {
  // Basic rate limiting
  const now = Date.now();
  if (now - resetTime > 3600000) {
    // Reset counter every hour
    requestCount = 0;
  }

  if (requestCount > 100) {
    // Limit requests per hour
    return res.status(429).json({ error: "Too many requests" });
  }

  requestCount++;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "API key not found" });
  }

  res.json({
    apiKey: process.env.GEMINI_API_KEY,
  });
});

// Handle Vercel serverless environment
if (process.env.VERCEL) {
  // Export the Express app as a serverless function
  module.exports = app;
} else {
  // Start the server normally
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}
