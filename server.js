import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { spawn } from "child_process";
import fs from "node:fs/promises";
import { buildAnalysisIndex } from "./utils/buildAnalysisIndex.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
let analysisIndex;
const { GEMINI_API_KEY }  = process.env;
const MODEL_CHAT          = "gemini-1.5-flash-latest"; // Changed to a valid, recent model

if (!GEMINI_API_KEY) { console.error("❌  Chybí GEMINI_API_KEY v .env"); process.exit(1); }

const genAI   = new GoogleGenerativeAI(GEMINI_API_KEY);
// const vision model initialization is removed

// The SDK will handle the endpoint, so the manual URL is no longer needed.

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));   // zvýšeno kvůli base64 médiím

/* ---------- 1) klasické textové dotazy /api/ai -------------------------------- */
// The user's prompt mentioned "… tvůj původní prompt …" and "nechávám tvou poslední logiku"
// I will assume the /api/ai endpoint should remain as it was if there was prior logic.
// For now, I'll keep it minimal as per the provided snippet.
// If you have existing logic for /api/ai, it should be preserved here.
const SYSTEM_PROMPT_CHAT = `
Jsi AI lektor v autoškole. Tvá hlavní role je pomáhat studentům pochopit dopravní předpisy a situace.
Komunikuj přátelsky, trpělivě a povzbudivě.
Používej jednoduchý jazyk, vyhýbej se přílišnému formalismu, pokud to není nutné pro citaci zákona.
Tvým cílem není jen sdělit správnou odpověď, ale vést studenta k pochopení.

Klíčové pokyny pro interakci:
● Pokud je režim COACH, nikdy neprozrazuj správnou odpověď,
  dokud student sám nevybere možnost nebo si výslovně neřekne.
● V režimu COACH klad’ naváděcí otázky a připomeň relevantní pravidla (citace zákona, principy).
● V režimu FEEDBACK:
    – nejprve zhodnoť zvolenou odpověď (správná / chybná),
    – pak vysvětli proč, stručně vypiš důvody ostatních možností.
● Buď stručný a k věci, ale dostatečně vysvětlující.
● Pokud student položí otázku nesouvisející s autoškolou, zdvořile odmítni a vrať se k tématu.
● Používej markdown pro formátování textu (např. tučné písmo pro důležité termíny, odrážky pro výčty).
`.trim();

app.post("/api/ai", async (req, res) => {
  try {
    const { userQuestion, context, history } = req.body;

    if (!analysisIndex) {
      // This should not happen if the server started correctly, but it's a good fallback.
      console.warn("⚠️ Analysis index not ready, building dynamically...");
      analysisIndex = await buildAnalysisIndex();
      console.log(`✅ Dynamic index built, ${analysisIndex.size} items loaded.`);
    }

    const questionId = context?.question?.id_otazky;
    if (!questionId) {
      return res.status(400).json({ error: "Question ID is missing in the context." });
    }

    const analysis = analysisIndex.get(questionId);

    if (!userQuestion) {
      return res.status(400).json({ error: "User question is required for /api/ai" });
    }
    if (!context || typeof context.question === 'undefined') {
      return res.status(400).json({ error: "Context with question is required for /api/ai" });
    }

    let revealFlag = false;
    if (context.studentSelected !== null && typeof context.studentSelected !== 'undefined') {
      revealFlag = true;
    }
    if (context.explicitlyAsked === true) {
      revealFlag = true;
    }

    const analysisPromptPart = analysis
      ? `
## Detailní analýza k otázce
Shrnutí: ${analysis.shrnuti}
Relevantní poznatky:
- ${analysis.poznatky_relevantni_k_odpovedim.join("\n- ")}
`
      : `
## Detailní analýza k otázce
(Pro tuto otázku není k dispozici žádná předem připravená analýza. Odpověz na základě kontextu otázky.)
`;

    const dynamicPrompt = `
${SYSTEM_PROMPT_CHAT}

## Kontext otázky
${JSON.stringify(context.question, null, 2)}
${analysisPromptPart}
## Pokyny pro lektora
Režim: ${revealFlag ? "FEEDBACK" : "COACH"}
- COACH: nevyslovuj správnou odpověď; polož 2 – 3 naváděcí otázky a připomeň principy.
- FEEDBACK: vyhodnoť zvolenou možnost, vysvětli proč je (ne)správná a proč ostatní možnosti neplatí.

## Aktuální replika studenta
${userQuestion}
`.trim();

    // Using the official Google Generative AI SDK
    const model = genAI.getGenerativeModel({ model: MODEL_CHAT });
    const result = await model.generateContent(dynamicPrompt);
    const response = await result.response;
    const answer = response.text();

    res.json({ answer });

  } catch (e) {
    console.error("Error in /api/ai:", e);
    res.status(500).json({ error: e.message });
  }
});

/* ---------- 2) endpoint pro získání kontextu z obrázku /api/image-context --- */
app.post("/api/image-context", (req, res) => {
  const { question_id, url } = req.body;

  if (!question_id && !url) {
    return res.status(400).json({ error: "Je nutné poskytnout 'question_id' nebo 'url'." });
  }

  const args = ["py_scripts/image_context_cli.py"];
  if (question_id) {
    args.push("--question-id", question_id);
  }
  if (url) {
    args.push("--url", url);
  }
  
  // Cesta k adresářům s analýzami
  const analyza_okruh1 = "public/analyza_okruh1";
  args.push("--json-path", analyza_okruh1);
  // Zde můžete přidat další cesty, např.
  // const analyza_okruh2 = "public/analyza_okruh2";
  // args.push("--json-path", analyza_okruh2);


  const pythonProcess = spawn("python", args);

  let dataToSend = "";
  pythonProcess.stdout.on("data", (data) => {
    dataToSend += data.toString();
  });

  let errorToSend = "";
  pythonProcess.stderr.on("data", (data) => {
    errorToSend += data.toString();
  });

  pythonProcess.on("close", (code) => {
    if (code !== 0) {
      console.error(`Python script exited with code ${code}`);
      console.error("Chyba z Python skriptu:", errorToSend);
      return res.status(500).json({ error: "Chyba při zpracování v Pythonu.", details: errorToSend });
    }
    try {
      const jsonData = JSON.parse(dataToSend);
      res.json(jsonData);
    } catch (e) {
      console.error("Chyba při parsování JSON z Pythonu:", e);
      console.error("Data z Pythonu:", dataToSend);
      res.status(500).json({ error: "Nepodařilo se zpracovat odpověď z Python skriptu." });
    }
  });
});


// Vision API and downloadAndEncode helper are removed.

/**
 * Loads the analysis index from the static JSON file.
 * Falls back to building it dynamically if the file doesn't exist.
 */
async function loadAnalysisIndex() {
  try {
    console.log("🛠️  Loading static analysis index from public/analysisIndex.json...");
    const jsonContent = await fs.readFile("public/analysisIndex.json", "utf8");
    const jsonObject = JSON.parse(jsonContent);
    analysisIndex = new Map(Object.entries(jsonObject));
    console.log(`✅ Index loaded, ${analysisIndex.size} items ready.`);
  } catch (error) {
    console.error("❌ Failed to load static analysis index.", error.message);
    console.log("ℹ️ Falling back to dynamic index building...");
    analysisIndex = await buildAnalysisIndex();
    console.log(`✅ Dynamic index built, ${analysisIndex.size} items loaded.`);
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  await loadAnalysisIndex();
  console.log(`AI proxy běží na :${PORT} (chat=${MODEL_CHAT})`);
});
