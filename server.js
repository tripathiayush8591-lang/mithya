const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const fetch = (...args) =>
  import("node-fetch").then(({ default: nodeFetch }) => nodeFetch(...args));

const app = express();
const PORT = 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const getVerdictFromScore = (score) => {
  if (score <= 20) {
    return "FAKE";
  }

  if (score <= 40) {
    return "MISLEADING";
  }

  if (score <= 60) {
    return "UNCERTAIN";
  }

  if (score <= 80) {
    return "LIKELY TRUE";
  }

  return "VERIFIED";
};

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
  const content = `You are a fake news detector for Indian audiences. Analyze this claim carefully and return a credibility score from 0 to 100.

Use these exact verdict bands:
- 0-20: FAKE
- 21-40: MISLEADING
- 41-60: UNCERTAIN
- 61-80: LIKELY TRUE
- 81-100: VERIFIED

Scoring guidance:
- FAKE: demonstrably false, fabricated, or has no credible basis
- MISLEADING: contains some truth but is distorted, exaggerated, missing key context, or likely to mislead
- UNCERTAIN: subjective, opinion-based, unverifiable, partially true, or lacks enough context to confirm or deny
- LIKELY TRUE: mostly credible and consistent with known facts, but still not authoritative enough to mark as fully verified
- VERIFIED: strongly supported by established facts or highly credible, authoritative sources

For MISLEADING, UNCERTAIN, and LIKELY TRUE responses, the reason must be 4-5 clear sentences and must include:
1. What part of the claim is true, if any
2. What part is false, distorted, or unverifiable
3. Why it is rated MISLEADING, UNCERTAIN, or LIKELY TRUE instead of a definitive verdict
4. What the user should do next, such as cross-checking with ANI, PTI, or official government sources

For FAKE and VERIFIED, a brief explanation is fine.

Respond ONLY in valid JSON, no markdown, no explanation outside JSON:
{"verdict":"FAKE or MISLEADING or UNCERTAIN or LIKELY TRUE or VERIFIED","credibilityScore":number,"reason":"explanation"}

Claim to analyze: ${userText}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          // Google Search Grounding gives Gemini access to current web/news results.
          tools: [
            {
              google_search: {}
            }
          ],
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

    try {
      const parsed = JSON.parse(analysis);
      const rawScore = Number(parsed.credibilityScore ?? parsed.score);
      const credibilityScore = Number.isFinite(rawScore)
        ? Math.max(0, Math.min(100, rawScore))
        : 50;
      const verdict = getVerdictFromScore(credibilityScore);

      return res.json({
        verdict,
        credibilityScore,
        reason: parsed.reason || "No explanation returned by Gemini."
      });
    } catch (_parseError) {
      return res.json({ analysis });
    }
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
