const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { conversationHistory } = req.body;

  try {
    const apiKey = process.env.API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`;

    const payload = {
      contents: conversationHistory,
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      },
    };

    const response = await axios.post(apiUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const botResponse =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't process your request.";
    res.json({ botResponse });
  } catch (error) {
    console.error("Error getting bot response:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
