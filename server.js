import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Reverted to use process.env
const app = express();

app.use(cors());
app.use(express.json());

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
`;

app.post("/api/ai", async (req, res) => {
  try {
    const { question, context } = req.body;
    // Using "gemini-1.5-pro-latest" as recommended for @google/generative-ai
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro-latest",
      // systemInstruction: SYSTEM_PROMPT, // Removed from here
    });

    const chat = model.startChat({ // Pass SYSTEM_PROMPT as first message in history
      history: [
        { role: "system", parts: [{ text: SYSTEM_PROMPT.trim() }] }
      ],
    });

    let studentContext = `Otázka: "${context.question.otazka}"
Možnosti: ${context.question.moznosti.join(" / ")}`;
    if (context.selectedAnswerIndex !== undefined && context.selectedAnswerIndex !== null && context.question.moznosti[context.selectedAnswerIndex]) {
      studentContext += `\nStudentem zvolená odpověď: "${context.question.moznosti[context.selectedAnswerIndex]}"`;
    }
    studentContext += `\nDotaz studenta: "${question}"`;

    const resp = await chat.sendMessage(studentContext);

    res.json({ answer: resp.response.text() });
  } catch (e) {
    console.error("Error in /api/ai:", e); 
    res.status(500).json({ answer: "⚠️ Omlouvám se, došlo k chybě při komunikaci s AI." });
  }
});

app.listen(3001, () => console.log("AI server běží na :3001 (using gemini-1.5-pro-latest)"));
