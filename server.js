import express from "express";
import cors     from "cors";
import dotenv   from "dotenv";
import fetch    from "node-fetch";
// fs is removed as it's not used by the remaining code
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const { GEMINI_API_KEY }  = process.env;
const MODEL_CHAT          = "gemini-2.0-flash"; // Assuming this was your previous model, adjust if needed

if (!GEMINI_API_KEY) { console.error("❌  Chybí GEMINI_API_KEY v .env"); process.exit(1); }

const genAI   = new GoogleGenerativeAI(GEMINI_API_KEY);
// const vision model initialization is removed

// This ENDPOINT_CHAT seems to be for a direct HTTP call,
// but the rest of the /api/ai logic (if any was there) is not shown.
// If you were using the SDK for chat as well, this might not be needed.
const ENDPOINT_CHAT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_CHAT}:generateContent?key=${GEMINI_API_KEY}`;

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));   // zvýšeno kvůli base64 médiím

/* ---------- 1) klasické textové dotazy /api/ai -------------------------------- */
// The user's prompt mentioned "… tvůj původní prompt …" and "nechávám tvou poslední logiku"
// I will assume the /api/ai endpoint should remain as it was if there was prior logic.
// For now, I'll keep it minimal as per the provided snippet.
// If you have existing logic for /api/ai, it should be preserved here.
const SYSTEM_PROMPT_CHAT = `… tvůj původní prompt …`.trim();

app.post("/api/ai", async (req, res) => {
  // Placeholder for your existing /api/ai logic
  // Based on the prompt "nechávám tvou poslední logiku",
  // this part should contain the previous implementation for chat.
  // If there was no previous logic or it's simple, this might be okay.
  // For a more complete solution, the original /api/ai logic would be needed.
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required for /api/ai" });
    }
    // This is a generic placeholder. Replace with your actual chat model interaction.
    // For example, using the Gemini SDK like the vision part:
    // const chatModel = genAI.getGenerativeModel({ model: MODEL_CHAT });
    // const result = await chatModel.generateContentStream([{ role: "user", parts: [{text: SYSTEM_PROMPT_CHAT}, {text: prompt}] }]);
    // let fullResponse = "";
    // for await (const chunk of result.stream) {
    //   fullResponse += chunk.text();
    // }
    // res.json({ response: fullResponse });

    // Or if you were using fetch with ENDPOINT_CHAT:
    const response = await fetch(ENDPOINT_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                role: "user",
                parts: [{ text: SYSTEM_PROMPT_CHAT }, { text: prompt }]
            }]
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        console.error("Error from Gemini API (chat):", errorData);
        throw new Error(`Gemini API error: ${response.statusText}`);
    }
    const data = await response.json();
    // Extracting the text response might need adjustment based on the actual API response structure
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ response: answer });

  } catch (e) {
    console.error("Error in /api/ai:", e);
    res.status(500).json({ error: e.message });
  }
});

// Vision API and downloadAndEncode helper are removed.

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`AI proxy běží na :${PORT} (chat=${MODEL_CHAT})`)
);
