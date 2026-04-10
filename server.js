const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const fetch = (...args) =>
  import("node-fetch").then(({ default: nodeFetch }) => nodeFetch(...args));

const app = express();
const PORT = 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "MITHYA backend is running." });
});

app.post("/analyze", async (req, res) => {
  const { headline, articleText, source } = req.body;

  console.log("[/analyze] Incoming request body:", req.body);

  if (!headline && !articleText) {
    return res.status(400).json({
      error: "Provide at least a headline or articleText."
    });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not set in the environment."
    });
  }

  const userText = articleText || headline || "N/A";
  const content = `You are a fake news detector for Indian audiences. Analyze this headline carefully.

VERDICT must be:
- FAKE: if the claim is demonstrably false, fabricated, or has no credible basis
- REAL: if the claim is verifiably true or highly credible based on known facts
- UNCERTAIN: if the claim is subjective, opinion-based, unverifiable, partially true, or lacks enough context to confirm or deny

Confidence (0-100): how confident you are in your verdict.

Respond ONLY in valid JSON, no markdown, no explanation outside JSON:
{"verdict": "FAKE" or "REAL" or "UNCERTAIN", "confidence": number, "reason": "one sentence explanation"}

Headline to analyze: ${userText}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: content
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log("[/analyze] Gemini API response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Gemini API request failed.",
        details: data
      });
    }

    const analysis =
      data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") ||
      "No analysis returned by Gemini.";

    return res.json({ analysis });
  } catch (error) {
    console.error("[/analyze] Gemini API error:", error);

    return res.status(500).json({
      error: "Failed to analyze content.",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`MITHYA server running on http://localhost:${PORT}`);
});
