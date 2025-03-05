const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const app = express();
const port = process.env.PORT || 3000;

// Security middleware with CORS for Vercel
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());

// Endpoint to get API key with rate limiting
app.get("/api/config", (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("API key not found in environment");
    return res.status(500).json({ 
      error: "Server configuration error",
      details: "API key not configured" 
    });
  }

  res.json({ apiKey });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
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
