import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const { GEMINI_API_KEY, MODEL_ID = "gemini-2.0-flash" } = process.env;
if (!GEMINI_API_KEY) {
  console.error("❌  Chybí GEMINI_API_KEY v .env"); process.exit(1);
}

const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

const SYSTEM_PROMPT = `
Jsi odborný lektor autoškoly.  
Tvým cílem je studentovi pomoci pochopit dopravní předpisy a situace, ne pouze „vyplivnout“ správnou volbu.

Jak postupovat:
1. Nejprve reaguj na otázku diskusně – podpoř studenta, aby popsal svou úvahu. Ptej se na klíčové okolnosti (dopravní značky, postavení vozidel, pravidla přednosti ap.).
2. Vysvětluj principy, na kterých rozhodování stojí, a naznač, jak by měl postupovat při analýze situace.
3. Teprve pokud student požádá o potvrzení, nebo je zřejmé, že už vyčerpal vlastní argumenty, sděl správnou odpověď.
4. Uveď, proč je správná možnost logická a proč jsou ostatní chybné.
5. Odpověď drž stručnou, jasnou a přátelskou, vždy v češtině.
Nepoužívej limit 150 slov; rozsah přizpůsob aktuální potřebě studenta.

Specifické pokyny pro režimy:
● Pokud je režim COACH, nikdy neprozrazuj správnou odpověď, dokud student sám nevybere možnost nebo si výslovně neřekne.
● V režimu COACH klad’ naváděcí otázky a připomeň relevantní pravidla (citace zákona, principy).
● V režimu FEEDBACK:
    – nejprve zhodnoť zvolenou odpověď (správná / chybná),
    – pak vysvětli proč, stručně vypiš důvody ostatních možností.
`.trim();

app.post("/api/ai", async (req, res) => {
  try {
    // Očekáváme context ve formátu: { question: object, studentSelected: number | null, explicitlyAsked: boolean }
    const { userQuestion, context, history = [] } = req.body;

    if (!context || typeof context.question === 'undefined') {
      return res.status(400).json({ error: "Chybí 'context.question' v požadavku." });
    }

    const histParts = history
      .filter((m, idx) => !(idx === 0 && m.role === "assistant"))
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }]
      }));

    let revealFlag = false;
    if (context.studentSelected !== null && typeof context.studentSelected !== 'undefined') {
      revealFlag = true;
    }
    if (context.explicitlyAsked === true) {
      revealFlag = true;
    }

    // Sestavení hlavního promptu pro aktuální dotaz uživatele
    // Tento prompt se přidá k historii.
    // Pokud je historie prázdná, SYSTEM_PROMPT a kontext otázky se přidají jako první "user" zpráva.
    // Jinak se přidá pouze userQuestion s instrukcemi pro lektora.

    const currentUserPromptText = `
## Pokyny pro lektora
Režim: ${revealFlag ? "FEEDBACK" : "COACH"}
- COACH: nevyslovuj správnou odpověď; polož 2 – 3 naváděcí otázky a připomeň principy.
- FEEDBACK: vyhodnoť zvolenou možnost, vysvětli proč je (ne)správná a proč ostatní možnosti neplatí.

## Aktuální replika studenta
${userQuestion}
`.trim();

    const contents = [...histParts];

    if (histParts.length === 0) { // Pokud je historie prázdná (po odfiltrování případné úvodní assistant zprávy)
                                  // nebo pokud klient poslal prázdnou historii.
      const initialUserMessage = `
${SYSTEM_PROMPT}

## Kontext otázky
${JSON.stringify(context.question, null, 2)}

${currentUserPromptText}
      `.trim();
      contents.push({ role: "user", parts: [{ text: initialUserMessage }] });
    } else {
      // Pokud historie již existuje, přidáme jen aktuální dotaz studenta s pokyny pro lektora
      contents.push({ role: "user", parts: [{ text: currentUserPromptText }] });
    }

    const body = { contents };

    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }
    const data = await r.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "(prázdná odpověď)";
    res.json({ answer });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () =>
  console.log(`AI proxy běží na :3001 (model ${MODEL_ID})`));
