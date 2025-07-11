import fs from "fs/promises";
import { glob } from "glob"; // Import glob
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.error("❌  Chybí GEMINI_API_KEY v .env"); process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Poznámka: Jakmile Google uvolní novější modely, např. "gemini-2.5-pro-vision",
// stačí tento identifikátor modelu aktualizovat zde.
const vision = genAI.getGenerativeModel({ model: "gemini-1.5-pro-vision-preview" });

const SYSTEM_PROMPT = `
Jsi "Vizualizátor provozu - Autoškola B". Tvým úkolem je na základě poskytnutého vizuálního materiálu a dat vytvořit co nejpřesnější, strukturovaný a objektivní popis dopravní situace ve formátu JSON.
UPOZORNĚNÍ: PŘEDCHOZÍ ANALÝZA SELHALA!
Předchozí analýza kriticky selhala, protože nesprávně identifikovala svítící ČERVENÉ světlo na železničním přejezdu jako bílé. Tato chyba je fatální, protože zcela obrací význam dopravní situace (ze "Stůj!" na "Volno"). Je tvojí absolutní prioritou, aby se tato chyba již nikdy neopakovala. K tomu slouží následující, nová a závazná metodika.
NOVÁ, ABSOLUTNĚ ZÁSADNÍ METODIKA PRO ANALÝZU SVĚTELNÝCH SIGNÁLŮ
Pro každý světelný signál (semafor, přejezdové zařízení) MUSÍŠ PROVÉST NÁSLEDUJÍCÍ TŘÍKROKOVÝ VIZUÁLNÍ AUDIT:
KROK 1: IDENTIFIKACE FYZICKÉHO ZAŘÍZENÍ
Popiš samotné zařízení. Z čeho se skládá? (např. "Černá skříň se dvěma červenými čočkami nahoře a jednou bílou čočkou dole.") Tento popis pomůže ukotvit tvé pozorování.
KROK 2: AUDIT JEDNOTLIVÝCH SVĚTEL (NEJDŮLEŽITĚJŠÍ KROK)
Toto je nejdůležitější krok. Pro každou jednotlivou čočku/žárovku na zařízení proveď samostatné hodnocení:
Je toto světlo ZAPNUTÉ nebo VYPNUTÉ?
Pokud je ZAPNUTÉ, jakou má BARVU? (Červená, zelená, oranžová, bílá?)
Pokud je ZAPNUTÉ, je jeho svit PŘERUŠOVANÝ (bliká) nebo NEPŘERUŠOVANÝ (svítí)?
Výsledek tohoto detailního auditu zapíšeš do pole popis_svetel. JE ZAKÁZÁNO tento krok přeskočit nebo si stav domýšlet.
KROK 3: SYNTÉZA CELKOVÉHO STAVU
TEPRVE POTÉ, co jsi dokončil podrobný audit v Kroku 2, můžeš z těchto dílčích zjištění odvodit celkový stav zařízení.
Například: "Na základě faktu, že jedno červené světlo svítí nepřerušovaně a ostatní světla jsou vypnutá, je souhrnným stavem signál 'Stůj!'."
Tento proces (IDENTIFIKUJ -> AUDITUJ KAŽDOU ŽÁROVKU -> SHRNUJ) je povinný a nesmí být nikdy obejit.
Metodika pro analýzu svislých dopravních značek
(Zůstává v platnosti, viz předchozí verze: 1. Vizuální analýza, 2. Porovnání s referenčním obrazcem, 3. Identifikace)
Referenční obrazec: https://www.dopravniznacenikross.cz/img/svisle-znaceni-kross-2000.jpg
Výstupní formát (JSON)
Tvým výstupem musí být VŽDY validní JSON objekt. Dodržuj přesně tuto strukturu, včetně nové struktury pro svetelne_signaly.
Generated json
{
  "id_otazky": null,
  "shrnuti": "Statický pohled na železniční přejezd, který je uzavřený a dává světelným zařízením signál 'Stůj!'.",
  "akteri": [],
  "znaceni_a_zarizeni": {
    "svisle": [
      {
        "vizualni_popis": {
          "tvar": "Kříž ve tvaru 'X' se žlutým reflexním povrchem",
          "barva": "Žlutá s červeným okrajem",
          "symbol": "Dva zkřížené trámy"
        },
        "kod_nazev": "A 32a, Výstražný kříž pro železniční přejezd jednokolejný",
        "umisteni": "Na sloupku světelného signalizačního zařízení, po obou stranách přejezdu"
      }
    ],
    "vodorovne": [
      {
        "vizualni_popis": {
          "tvar": "Podélná čára",
          "barva": "Bílá",
          "symbol": "Nepřerušovaná (plná) čára"
        },
        "kod_nazev": "V 1a, Podélná čára souvislá",
        "umisteni": "Na pravém okraji vozovky"
      },
      {
        "vizualni_popis": {
            "tvar": "Příčná čára",
            "barva": "Bílá",
            "symbol": "Dvě rovnoběžné přerušované čáry a symbol kříže"
        },
        "kod_nazev": "V 8, Železniční přejezd",
        "umisteni": "Před železničním přejezdem"
      }
    ],
    "svetelne_signaly": [
      {
        "typ": "Světelné zabezpečovací zařízení pro železniční přejezd (PZS) se závorami",
        "popis_svetel": [
          "Na levém i pravém zařízení je vidět, že jedno horní červené světlo je ZAPNUTÉ a svítí nepřerušovaně.",
          "Druhé horní červené světlo na obou zařízeních je VYPNUTÉ.",
          "Případné bílé světlo je VYPNUTÉ."
        ],
        "souhrnny_stav": "Signál 'Stůj!'. Jedno červené světlo nepřerušovaně svítí."
      }
    ]
  },
  "detailni_popis": {
    "typ": "obrazek",
    "popis": "Záběr zachycuje pohled na železniční přejezd přes silnici vedoucí otevřenou krajinou. Přejezd je vybaven závorami a světelným signalizačním zařízením po obou stranách vozovky. Závory jsou v dolní, uzavřené poloze a blokují průjezd přes koleje. Na světelných zařízeních je aktivní signál 'Stůj!', což je indikováno jedním svítícím červeným světlem. Pod světly je viditelný nápis 'POZOR VLAK'. Vozovka je suchá, viditelnost je dobrá, obloha je zatažená."
  },
  "poznatky_relevantni_k_odpovedim": [],
  "mozna_rizika_a_konflikty": [
    "Pokus o objetí nebo podjetí sklopených závor.",
    "Selhání brzd vozidla blížícího se k uzavřenému přejezdu."
  ]
}
`.trim();

// const out = []; // This variable is unused globally after processFile was introduced.

async function encodeMedia(url) {
  if (!url) return null;
  console.log(`🔄 Stahuji a kóduji: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} → ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = url.endsWith(".mp4") ? "video/mp4"
           : url.match(/\.jpe?g$/i) ? "image/jpeg"  // Corrected regex
           : url.match(/\.png$/i)   ? "image/png"   // Corrected regex
           : "application/octet-stream"; // Fallback MIME type
  console.log(`✅ Médium zakódováno: ${url} (MIME: ${mime})`);
  return { mimeType: mime, data: buf.toString("base64") };
}

async function processFile(filePath) {
  console.log(`ℹ️  Zpracovávám soubor: ${filePath}`);
  let rawData;
  try {
    rawData = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (e) {
    console.error(`❌ Chyba při čtení nebo parsování souboru ${filePath}: ${e.message}`);
    return; // Skip this file
  }

  const localOut = [];

  for (const q of rawData) {
    console.log(`🔎 Analyzuji otázku ID: ${q.id} ze souboru ${filePath}`);

    // Diagnostic: Sanitize question and options to ASCII
    // const sanitizedQuestion = q.otazka.replace(/[^\x00-\x7F]/g, "_");
    // const sanitizedOptions = (q.moznosti ?? []).map(opt =>
    // typeof opt === 'string' ? opt.replace(/[^\x00-\x7F]/g, "_") : opt
    // );

    const parts = [
      { text: SYSTEM_PROMPT }, // SYSTEM_PROMPT je již .trim()
      { text: JSON.stringify({ question: q.otazka, options: q.moznosti }, null, 2) }
    ];
    // console.log("ℹ️ DIAGNOSTIC: Sending only SYSTEM_PROMPT to API for question ID:", q.id); // Re-enable full parts

    // hlavní obrázek / video
    if (q.obrazek) {
      try {
        const mediaData = await encodeMedia(q.obrazek);
        if (mediaData) parts.push({ inlineData: mediaData });
      } catch (e) {
        console.warn(`⚠️  Nelze stáhnout hlavní médium ${q.obrazek} pro otázku ${q.id}: ${e.message}`);
      }
    }
    // obrázkové možnosti
    for (const m of q.moznosti ?? []) {
      if (typeof m === 'string' && /^https?:\/\/.+\.(png|jpe?g|gif|mp4)$/i.test(m)) { // Opravený regex
        try {
          const mediaData = await encodeMedia(m);
          if (mediaData) parts.push({ inlineData: mediaData });
        } catch (e) {
          console.warn(`⚠️  Nelze stáhnout obrázkovou možnost ${m} pro otázku ${q.id}: ${e.message}`);
        }
      }
    }

    try {
      // Implementace rate limitingu - pauza před každým API voláním
      console.log("⏳ Čekám 1.5s před dalším API voláním (rate limit)...");
      await new Promise(resolve => setTimeout(resolve, 1500));

      const resp = await vision.generateContent({ contents: [{ role: "user", parts }] });
      if (resp && resp.response) {
        const responseText = resp.response.text();
        localOut.push({ id: q.id, analysis: responseText });
        console.log(`✔️  Odpověď pro ${q.id} přijata.`);
      } else {
        console.warn(`⚠️  Žádná odpověď od API pro otázku ${q.id}.`);
        localOut.push({ id: q.id, error: "No response from API" });
      }
    } catch (e) {
      console.error(`❌  Chyba API u otázky ${q.id}: ${e.message}`);
      localOut.push({ id: q.id, error: e.message });
    }
  }

  const outFile = `out_${filePath.split('/').pop().replace(/\.json$/, '')}.json`;
  try {
    await fs.writeFile(outFile, JSON.stringify(localOut, null, 2));
    console.log(`✅ Hotovo pro ${filePath} → ${outFile}`);
  } catch (e) {
    console.error(`❌ Chyba při zápisu výstupního souboru ${outFile}: ${e.message}`);
  }
}

async function main() {
  const fileArgs = process.argv.slice(2);

  if (fileArgs.length === 0) {
    console.log("ℹ️  Nezadán vstupní soubor ani vzor, použije se výchozí 'public/okruh1.json'");
    const defaultFile = "public/okruh1.json";
    try {
      await fs.access(defaultFile);
      await processFile(defaultFile);
    } catch (error) {
      console.error(`❌ Výchozí soubor ${defaultFile} nebyl nalezen nebo k němu není přístup.`);
      console.log("Použití: node run_vision.js <cesta_k_souboru.json> | <glob_pattern>");
      process.exit(1);
    }
  } else {
    const inputPattern = fileArgs[0];
    console.log(`ℹ️  Hledám soubory pro vzor: ${inputPattern}`);
    const files = await glob(inputPattern, { nodir: true }); // nodir: true to exclude directories

    if (files.length === 0) {
      console.warn(`⚠️  Nebyly nalezeny žádné soubory pro vzor: ${inputPattern}`);
      // Pokusíme se zpracovat argument jako přímou cestu k souboru
      console.log(`ℹ️  Zkouším zpracovat ${inputPattern} jako přímou cestu k souboru.`);
      try {
        await fs.access(inputPattern); // Zkontroluje existenci souboru
        await processFile(inputPattern);
      } catch (error) {
        console.error(`❌ Soubor ${inputPattern} nebyl nalezen nebo k němu není přístup.`);
        console.log("Použití: node run_vision.js <cesta_k_souboru.json> | <glob_pattern>");
      }
    } else {
      console.log(`Nalezeno ${files.length} souborů k zpracování:`);
      files.forEach(file => console.log(`  - ${file}`));
      for (const file of files) {
        await processFile(file);
      }
    }
  }
}

main().catch(e => {
  console.error("❌  Nastala neočekávaná chyba v hlavním běhu:", e);
  process.exit(1);
});
