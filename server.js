import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { spawn } from "child_process";
import fs from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { buildAnalysisIndex } from "./utils/buildAnalysisIndex.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Redis } from "@upstash/redis";
import { allBadges } from "./src/badges.js";

dotenv.config();
let analysisIndex;
const { GEMINI_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;
const MODEL_CHAT          = "gemini-1.5-flash-latest"; // Changed to a valid, recent model

if (!GEMINI_API_KEY) { console.error("❌  Chybí GEMINI_API_KEY v .env"); process.exit(1); }

const genAI   = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- Připojení k Upstash Redis ---
let redis;
if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  });
  console.log("✅ Připojeno k Upstash Redis.");
} else {
  console.warn("⚠️ Upstash Redis proměnné nenalezeny. Ukládání dat bude pouze dočasné (v paměti).");
  // Fallback na dočasné ukládání v paměti, pokud Redis není nakonfigurován
  const memoryStorage = new Map();
  redis = {
    get: async (key) => memoryStorage.get(key),
    set: async (key, value) => memoryStorage.set(key, value),
    del: async (key) => memoryStorage.delete(key),
  };
}

// const vision model initialization is removed

// The SDK will handle the endpoint, so the manual URL is no longer needed.

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));   // zvýšeno kvůli base64 médiím

// --- Statické soubory pro produkci ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "dist")));

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

const ANALYSIS_KEY = "analysis-data"; // Klíč pro statistiky
const BADGES_KEY = "unlocked-badges";   // Klíč pro odznaky

// Helper funkce pro kontrolu a udělení odznaků
const checkAndAwardBadges = async (allEntries, lastTestEntries) => {
  const awardedBadges = new Set();
  const existingBadgesRaw = await redis.get(BADGES_KEY);
  const existingBadges = existingBadgesRaw ? JSON.parse(existingBadgesRaw) : [];
  const existingBadgeIds = new Set(existingBadges.map(b => b.id));

  // 1. Odznak: První dokončený test
  if (!existingBadgeIds.has('first_test_completed')) {
    awardedBadges.add('first_test_completed');
  }

  // 2. Odznak: První úspěšně složený test
  if (!existingBadgeIds.has('first_test_passed')) {
    const wasSuccessful = lastTestEntries.every(e => e.isCorrect); // Zjednodušená logika
    if (wasSuccessful) {
      awardedBadges.add('first_test_passed');
    }
  }
  
  // 3. Odznak: Dokončeno 10 testů
  if (!existingBadgeIds.has('ten_tests_completed')) {
      // Logika pro zjištění počtu unikátních testů
      const testTimestamps = new Set(allEntries.map(e => e.timestamp));
      if (testTimestamps.size >= 10) {
          awardedBadges.add('ten_tests_completed');
      }
  }

  // 4. Odznak: Test bez chyb
  if (!existingBadgeIds.has('no_mistakes_test')) {
      if (lastTestEntries.every(e => e.isCorrect)) {
          awardedBadges.add('no_mistakes_test');
      }
  }

  // Přidání nových odznaků
  if (awardedBadges.size > 0) {
    const newBadges = [...awardedBadges]
      .map(id => ({ id, unlockedAt: new Date().toISOString() }));
    const updatedBadges = [...existingBadges, ...newBadges];
    await redis.set(BADGES_KEY, JSON.stringify(updatedBadges));
    return newBadges; // Vrací jen nově získané
  }
  return [];
};


app.post("/api/save-analysis", async (req, res) => {
  const { entries } = req.body;
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "No analysis entries provided." });
  }

  try {
    const existingDataRaw = await redis.get(ANALYSIS_KEY);
    const existingData = existingDataRaw ? JSON.parse(existingDataRaw) : [];
    const newData = [...existingData, ...entries];
    await redis.set(ANALYSIS_KEY, JSON.stringify(newData));

    // Logika pro udělení odznaků
    const newlyAwardedBadges = await checkAndAwardBadges(newData, entries);

    res.status(200).json({ 
      message: "Analysis data saved successfully.",
      newlyAwardedBadges: newlyAwardedBadges
    });
  } catch (e) {
    console.error("Error in /api/save-analysis:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/analysis-data", async (req, res) => {
  try {
    const analysisDataRaw = await redis.get(ANALYSIS_KEY);
    const badgesDataRaw = await redis.get(BADGES_KEY);

    const analysisData = analysisDataRaw ? JSON.parse(analysisDataRaw) : [];
    const unlockedBadges = badgesDataRaw ? JSON.parse(badgesDataRaw) : [];

    res.json({ analysisData, unlockedBadges });
  } catch (error) {
    console.error("Error reading user data:", error);
    res.status(500).json({ error: "Failed to read user data" });
  }
});

app.post("/api/reset-analysis", async (req, res) => {
  try {
    await redis.del(ANALYSIS_KEY);
    await redis.del(BADGES_KEY); // Smazat i odznaky
    res.status(200).json({ message: "Analysis and badge data reset successfully." });
  } catch (error) {
    console.error("Error in /api/reset-analysis:", error);
    res.status(500).json({ error: error.message });
  }
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

// Catch-all pro servírování index.html (pro React Router)
app.get('*', (req, res) => {
  // Pokud požadavek směřuje na API, nechej ho propadnout (nebo zpracuj jinak)
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Jinak pošli hlavní soubor aplikace
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  await loadAnalysisIndex();
  console.log(`AI proxy běží na :${PORT} (chat=${MODEL_CHAT})`);
});
