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
// import { Redis } from "@upstash/redis"; // Dočasně deaktivováno
// import { Ratelimit } from "@upstash/ratelimit"; // Dočasně deaktivováno
import { createClient } from "@supabase/supabase-js";
import { allBadges } from "./src/badges.js";
import { 
  mysqlPool,
  ensureUserExists,
  saveEventAndUpdateSummaries,
  saveTestSession,
  getQuestionSummaries,
  getTopicSummaries,
  getTestSessions,
  getDailyProgress,
  getUserBadges,
  deleteAllUserData,
  getAllEvents
} from "./src/mysql.js";

dotenv.config();
// let analysisIndex; // Odstraněno cachování, bude se generovat za běhu
const { 
  GEMINI_API_KEY, 
  UPSTASH_REDIS_REST_URL, 
  UPSTASH_REDIS_REST_TOKEN,
  VITE_SUPABASE_URL, 
  VITE_SUPABASE_ANON_KEY,
  TURNSTILE_SECRET_KEY 
} = process.env;
const MODEL_CHAT          = "gemini-1.5-flash-latest"; // Changed to a valid, recent model

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

if (!GEMINI_API_KEY) { console.error("❌  Chybí GEMINI_API_KEY v .env"); process.exit(1); }

const genAI   = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- Připojení k Upstash Redis (DEAKTIVOVÁNO) ---
// let redis;
// if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
//   redis = new Redis({
//     url: UPSTASH_REDIS_REST_URL,
//     token: UPSTASH_REDIS_REST_TOKEN,
//   });
//   console.log("✅ Připojeno k Upstash Redis.");
// } else {
//   console.warn("⚠️ Upstash Redis proměnné nenalezeny.");
// }

// --- Rate Limiter (DEAKTIVOVÁNO) ---
let ratelimit = null; // Deaktivováno
// if (redis) {
//   ratelimit = new Ratelimit({
//     redis: redis,
//     limiter: Ratelimit.slidingWindow(10, "10 s"),
//     analytics: true,
//     prefix: "@upstash/ratelimit",
//   });
// }

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));   // zvýšeno kvůli base64 médiím

// --- Statické soubory pro produkci ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Upravená cesta: směřuje o úroveň výš z `build` do `dist`
app.use(express.static(path.join(__dirname, "..", "dist")));

// --- CAPTCHA Verification Helper ---
async function verifyCaptcha(token) {
  if (!TURNSTILE_SECRET_KEY) {
    console.error("TURNSTILE_SECRET_KEY is not set.");
    // In development, you might want to bypass this check
    // return true; 
    return false;
  }
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
      }),
    }
  );
  const data = await response.json();
  return data.success;
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- Auth Endpoints ---

app.post("/api/signup", async (req, res) => {
  const { email, password, username, captchaToken } = req.body;

  const captchaVerified = await verifyCaptcha(captchaToken);
  if (!captchaVerified) {
    return res.status(403).json({ message: "Ověření CAPTCHA selhalo." });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
      },
    },
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }
  res.status(200).json({ user: data.user });
});

app.post("/api/login", async (req, res) => {
  const { identifier, password, captchaToken } = req.body;

  const captchaVerified = await verifyCaptcha(captchaToken);
  if (!captchaVerified) {
    return res.status(403).json({ message: "Ověření CAPTCHA selhalo." });
  }

  let email = identifier;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

  if (!isEmail) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', identifier)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: 'Uživatel s tímto jménem neexistuje.' });
    }
    email = profile.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ message: error.message });
  }

  // Send back the session to the client
  res.status(200).json({ session: data.session });
});


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

// Klíče pro Redis budou nyní dynamické, např. "user:123:analysis"
// const ANALYSIS_KEY = "analysis-data"; // Klíč pro statistiky - nahrazeno
// const BADGES_KEY = "unlocked-badges";   // Klíč pro odznaky - nahrazeno

// Logika pro odznaky bude dočasně zjednodušena a později reimplementována
// const checkAndAwardBadges = ...

app.post("/api/ingest", async (req, res) => {
  const { entries, session, userId, userEmail } = req.body;

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "No analysis entries provided." });
  }
  if (!userId || !userEmail) {
    return res.status(400).json({ error: "User ID and Email are required." });
  }
  const uid = userId.toLowerCase();

  if (ratelimit) {
    const identifier = uid || req.ip;
    const { success } = await ratelimit.limit(identifier);
    if (!success) {
      return res.status(429).json({ error: "Too many requests." });
    }
  }

  let conn;
  try {
    await ensureUserExists(uid, userEmail);

    conn = await mysqlPool.getConnection();
    await conn.beginTransaction();

    const sessionId = session?.sessionId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    for (const entry of entries) {
      const eventData = {
        sessionId,
        questionId: entry.questionId,
        topicId: entry.groupId, // FIX: Map groupId from client to topicId
        answeredCorrectly: entry.isCorrect, // FIX: Map isCorrect from client
        userAnswer: entry.selectedAnswer, // FIX: Map selectedAnswer from client
        mode: entry.mode || 'practice',
      };
      await saveEventAndUpdateSummaries(conn, uid, eventData);
    }

    // Oprava: Kontrolujeme 'dokončený' status z frontendu a voláme v transakci
    if (session && (session.status === 'dokončený' || session.status === 'nestihnutý' || session.status === 'nedokončený')) {
      const fullSessionData = {
        userId: uid,
        ...session,
      };
      await saveTestSession(conn, fullSessionData);
    }

    await conn.commit();
    res.json({ ok: true, message: "Data successfully saved." });

  } catch (e) {
    if (conn) await conn.rollback();
    console.error("Error in /api/ingest:", e);
    res.status(500).json({ error: e.message });
  } finally {
    if (conn) conn.release();
  }
});


// DEPRECATED: Bude odstraněno po 14 dnech. Použijte /api/ingest
app.post("/api/save-analysis", async (req, res) => {
  const { entries, userId, userEmail, sessionData } = req.body;

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "No analysis entries provided." });
  }
  if (!userId || !userEmail) {
    return res.status(400).json({ error: "User ID and Email are required." });
  }
  const uid = userId.toLowerCase();

  // Rate limiting
  if (ratelimit) {
    const identifier = uid || req.ip;
    const { success } = await ratelimit.limit(identifier);
    if (!success) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
  }

  try {
    // Zajistíme, že uživatel existuje v naší databázi
    await ensureUserExists(uid, userEmail);

    const sessionId = sessionData?.sessionId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Uložíme každou odpověď jako samostatnou událost
    for (const entry of entries) {
      const eventData = {
        sessionId,
        questionId: entry.questionId,
        topicId: entry.groupId, // Předpokládáme, že groupId je topicId
        answeredCorrectly: entry.isCorrect,
        userAnswer: entry.selectedAnswer, // Předpokládáme tento název pole
        mode: entry.mode || 'practice', // 'test', 'practice', 'review', 'deck'
      };
      await saveEventAndUpdateSummaries(uid, eventData);
    }

    // Pokud byla ukončena testovací session (obsahuje sessionData), uložíme její výsledek.
    // To se děje pouze pro 'exam' mode, jak je definováno na klientovi.
    if (sessionData) {
      const fullSessionData = {
        userId: uid,
        ...sessionData,
      };
      await saveTestSession(fullSessionData);
    }

    // TODO: Reimplementovat logiku pro odznaky na základě nových dat
    const newlyAwardedBadges = [];

    res.status(200).json({
      message: "Analysis data saved successfully.",
      newlyAwardedBadges,
    });
  } catch (e) {
    console.error("Error in /api/save-analysis:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/analysis-data", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  const uid = userId.toLowerCase();

  try {
    // Vždy znovu sestavíme index pro zajištění čerstvých dat
    const analysisIndex = await buildAnalysisIndex();

    const [
      questionSummaries,
      testSessions,
      dailyProgress,
      userBadges,
      allEvents,
    ] = await Promise.all([
      getQuestionSummaries(uid),
      getTestSessions(uid),
      getDailyProgress(uid),
      getUserBadges(uid),
      getAllEvents(uid),
    ]);

    const analysisData = allEvents.map(event => {
      const questionInfo = analysisIndex.get(event.question_id) || {};
      return {
        user: uid,
        questionId: event.question_id,
        questionText: questionInfo.otazka || '',
        groupId: questionInfo.groupId || event.topic_id,
        answeredAt: new Date(event.created_at).toISOString(),
        isCorrect: !!event.answered_correctly,
        timeToAnswer: 0, // This is not stored in the DB
        isFirstAttemptCorrect: !!event.answered_correctly, // Simplification
        answerIndex: event.user_answer,
        mode: event.mode,
        sessionStatus: event.session_status,
      };
    });

    const summaryData = Object.values(questionSummaries).reduce((acc, summary) => {
      const questionInfo = analysisIndex.get(summary.question_id) || {};
      
      // Najdeme všechny relevantní události pro tuto otázku
      const historyEvents = allEvents.filter(event => event.question_id === summary.question_id);

      acc[summary.question_id] = {
        questionId: summary.question_id,
        questionText: questionInfo.otazka || 'Text otázky nebyl nalezen',
        groupId: summary.topic_id || questionInfo.groupId, // Priorita pro DB
        attempts: summary.attempts,
        correct: summary.correct_attempts,
        totalTimeToAnswer: 0, // Not in DB
        history: historyEvents.map(e => ({ // Sestavíme historii
          answeredAt: e.created_at,
          isCorrect: !!e.answered_correctly,
          selectedAnswer: e.user_answer,
          mode: e.mode,
        })),
        avgTime: 0, // Not in DB
        successRate: summary.success_rate,
      };
      return acc;
    }, {});
    
    // Helper to get a YYYY-MM-DD string from a Date object, respecting local timezone
    const toLocalDateString = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const today = toLocalDateString(new Date());
    const todayProgress = dailyProgress.find(d => toLocalDateString(d.activity_date) === today);

    const todaysEvents = allEvents.filter(e => toLocalDateString(e.created_at) === today);
    const practiceModes = ['practice', 'review', 'deck'];
    const todaysPracticeEvents = todaysEvents.filter(e => practiceModes.includes(e.mode) && !e.question_id.startsWith('SESSION_END'));
    
    const totalPracticeEvents = allEvents.filter(e => practiceModes.includes(e.mode) && !e.question_id.startsWith('SESSION_END'));
    const totalPracticeCorrect = totalPracticeEvents.filter(e => e.answered_correctly).length;

    const stats = {
      today: {
        examTaken: todayProgress?.tests_completed || 0,
        examPassed: testSessions.filter(s => new Date(s.finished_at).toISOString().slice(0, 10) === today && s.score >= 43).length,
        practiceAnswered: todaysPracticeEvents.length,
        practiceCorrect: todaysPracticeEvents.filter(e => e.answered_correctly).length,
      },
      total: {
        examTaken: testSessions.length,
        examPassed: testSessions.filter(s => s.score >= 43).length,
        practiceAnswered: totalPracticeEvents.length,
        practiceCorrect: totalPracticeCorrect,
      },
      examAvgScore: testSessions.length > 0 ? testSessions.reduce((sum, s) => sum + s.score, 0) / testSessions.length : 0,
      examAvgTime: testSessions.length > 0 ? testSessions.reduce((sum, s) => sum + s.time_spent_seconds, 0) / testSessions.length : 0,
    };

    const mappedTestSessions = testSessions.map(s => {
      const sessionEvents = allEvents.filter(e => e.session_id === s.session_id);
      return {
        date: s.started_at,
        entries: sessionEvents.map(e => ({
          questionId: e.question_id,
          answerIndex: e.user_answer,
        })),
        score: s.score,
        totalPoints: s.max_score,
        passed: s.score >= 43,
        status: s.status,
        correctAnswers: s.correct_answers_count,
        totalQuestions: (s.question_ids || []).length || s.total_questions_count,
        questionIds: s.question_ids,
        timeSpentSeconds: s.time_spent_seconds,
      };
    });

    const allQuestions = Array.from(analysisIndex.values());
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({
      analysisData,
      summaryData,
      stats,
      unlockedBadges: userBadges,
      testSessions: mappedTestSessions,
      allQuestions, // Přidáno
    });
  } catch (error) {
    console.error("Error reading user data:", error);
    res.status(500).json({ error: "Failed to read user data" });
  }
});

app.post("/api/reset-analysis", async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  const uid = userId.toLowerCase();

  try {
    await deleteAllUserData(uid);
    res.status(200).json({ message: "All data for user " + uid + " reset successfully." });
  } catch (error) {
    console.error("Error in /api/reset-analysis:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/spaced-repetition-deck", async (req, res) => {
  const { userId, exclude, includeIncorrectFromPrevious } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  const uid = userId.toLowerCase();
  const DECK_SIZE = 20;
  const excludedIds = exclude ? exclude.split(',') : [];
  const incorrectFromPrevious = includeIncorrectFromPrevious ? includeIncorrectFromPrevious.split(',') : [];

  console.log(`[DeckBuilder] Start for user: ${uid}, exclude: ${excludedIds.length}, incorrectFromPrev: ${incorrectFromPrevious.length}`);

  try {
    const analysisIndex = await buildAnalysisIndex();
    const questionSummaries = await getQuestionSummaries(uid);
    const allUserQuestions = Object.values(questionSummaries || {});

    const deck = new Set();

    const addToDeck = (questionId) => {
      const id = String(questionId); // <<< sjednocení typu
      if (deck.size < DECK_SIZE && !deck.has(id) && !excludedIds.includes(id)) {
          deck.add(id);
      }
    };

    // 1. Zařadit až 5 špatně zodpovězených otázek z předchozího balíčku
    incorrectFromPrevious
      .filter(id => analysisIndex.has(String(id)))
      .slice(0, 5)
      .forEach(addToDeck);
    console.log(`[DeckBuilder] Step 1 (Incorrect from Prev): ${deck.size} questions`);

    // 2. Priorita 1: Otázky, které nejsou opraveny v "Přehledu chybovosti"
    const allEvents = await getAllEvents(uid);
    const eventsByQuestion = allEvents.reduce((acc, event) => {
        if (!acc[event.question_id]) {
            acc[event.question_id] = [];
        }
        acc[event.question_id].push(event);
        return acc;
    }, {});

    const uncorrectedMistakes = allUserQuestions
      .filter(q => {
          const history = eventsByQuestion[q.question_id] || [];
          if (history.length === 0) return false;
          const lastAttempt = history[history.length - 1];
          return !lastAttempt.answered_correctly;
      })
      .sort((a, b) => {
          const historyA = eventsByQuestion[a.question_id] || [];
          const historyB = eventsByQuestion[b.question_id] || [];
          const lastAttemptA = historyA.length > 0 ? new Date(historyA[historyA.length - 1].created_at) : 0;
          const lastAttemptB = historyB.length > 0 ? new Date(historyB[historyB.length - 1].created_at) : 0;
          return lastAttemptA - lastAttemptB; // Starší chyby první
      });
    
    uncorrectedMistakes.forEach(q => addToDeck(q.question_id));
    console.log(`[DeckBuilder] Step 2 (Uncorrected Mistakes): ${deck.size} questions`);

    // 3. Ověření: Občasně přidat 1-2 již opravené otázky (pouze pokud je místo)
    if (deck.size < DECK_SIZE) {
      const correctedMistakes = allUserQuestions
        .filter(q => {
          const lastCorrect = q.last_correct_at ? new Date(q.last_correct_at) : null;
          const lastIncorrect = q.last_incorrect_at ? new Date(q.last_incorrect_at) : null;
          return lastIncorrect && lastCorrect && lastCorrect > lastIncorrect;
        })
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);
        
      correctedMistakes.forEach(q => addToDeck(q.question_id));
    }
    console.log(`[DeckBuilder] Step 3 (Verification): ${deck.size} questions`);

    // 4. Priorita 2: Otázky z nejméně úspěšných okruhů (< 86% úspěšnost)
    if (deck.size < DECK_SIZE) {
      const topicSummaries = await getTopicSummaries(uid) || [];
      // jen okruhy < 86 % úspěšnosti, nejdřív ty úplně nejslabší
      const weakTopics = topicSummaries
            .filter(t => t.success_rate < 86)
            .sort((a, b) => a.success_rate - b.success_rate);

      // připrav mapu všech otázek podle okruhu z analysisIndex,
      // nejen těch, co už máš v question_summaries
      const allByTopic = {};
      for (const [qid, meta] of analysisIndex.entries()) {
        // V analysisIndex je groupId, v DB je topic_id. Musíme to sjednotit.
        const topicId = meta.groupId || meta.topic_id; 
        if (topicId) {
            if (!allByTopic[topicId]) allByTopic[topicId] = [];
            allByTopic[topicId].push(qid);
        }
      }

      for (const topic of weakTopics) {
        if (deck.size >= DECK_SIZE) break;
        const questionsInTopic =
              (allByTopic[topic.topic_id] || []).sort(() => 0.5 - Math.random());
        questionsInTopic.forEach(addToDeck);
      }
    }
    console.log(`[DeckBuilder] Step 4 (Weakest Topics): ${deck.size} questions`);

    // 5. Priorita 3: Náhodné otázky pro doplnění balíčku
    if (deck.size < DECK_SIZE) {
      const allPossibleQuestions = Array.from(analysisIndex.keys());
      const shuffledRemaining = allPossibleQuestions.sort(() => 0.5 - Math.random());
      shuffledRemaining.forEach(addToDeck);
    }
    console.log(`[DeckBuilder] Step 5 (Random Fill): ${deck.size} questions`);

    const finalDeck = Array.from(deck);
    console.log(`[DeckBuilder] Final deck size for user ${uid}: ${finalDeck.length}`);
    res.json({ questionIds: finalDeck.slice(0, DECK_SIZE) });

  } catch (error) {
    console.error(`[DeckBuilder] FATAL ERROR for user ${uid}:`, error);
    res.status(500).json({ error: "Failed to fetch spaced repetition deck." });
  }
});

// Tento endpoint je dočasně zjednodušen, protože nemáme přímý přístup k `events`
app.get("/api/export-data", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  const uid = userId.toLowerCase();

  try {
    // Prozatímní řešení: exportujeme souhrny místo surových událostí
    const [questionSummaries, userBadges] = await Promise.all([
        getQuestionSummaries(uid),
        getUserBadges(uid),
    ]);

    const exportData = {
      userId: uid,
      exportedAt: new Date().toISOString(),
      questionSummaries,
      unlockedBadges: userBadges,
    };

    res.setHeader('Content-Disposition', `attachment; filename="autoskola-data-${uid}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(exportData, null, 2));

  } catch (error) {
    console.error("Error exporting user data:", error);
    res.status(500).json({ error: "Failed to export user data" });
  }
});

// Endpointy pro přenos dat hosta jsou deaktivovány, protože vyžadují Redis
// app.post("/api/generate-transfer-token", ...);
// app.post("/api/claim-guest-data", ...);


// Vision API and downloadAndEncode helper are removed.

// --- Heatmap-related Functions (REMOVED) ---


/**
 * Loads the analysis index from the static JSON file.
 * Falls back to building it dynamically if the file doesn't exist.
 */
// Funkce loadAnalysisIndex se již nepoužívá, můžeme ji odstranit nebo zakomentovat
// async function loadAnalysisIndex() {
//   console.log("ℹ️  Building dynamic analysis index on startup...");
//   analysisIndex = await buildAnalysisIndex();
//   console.log(`✅ Dynamic index built, ${analysisIndex.size} items loaded.`);
// }

// Catch-all pro servírování index.html (pro React Router)
app.get('*', (req, res) => {
  // Pokud požadavek směřuje na API, nechej ho propadnout (nebo zpracuj jinak)
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Jinak pošli hlavní soubor aplikace
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, async () => {
  // await loadAnalysisIndex(); // Již se nenačítá při startu
  console.log(`AI proxy běží na :${PORT} (chat=${MODEL_CHAT})`);
});
