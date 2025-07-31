// utils/buildAnalysisIndex.js
import fg from "fast-glob";
import fs from "node:fs/promises";

/**
 * @typedef {import('../src/dataModels.ts').Question} Question
 * @typedef {import('../src/dataModels.ts').Analysis} Analysis
 */

/**
 * @returns {Promise<Map<string, Analysis & { otazka?: string, groupId?: number }>>}
 */
export async function buildAnalysisIndex() {
  // console.log("Building analysis index...");

  // 1. Načteme všechny texty otázek a jejich groupId
  const questionFiles = await fg("public/okruh[0-9].json"); // Zpřesněný vzor, aby se nenačítaly soubory _seznam_URL
  /** @type {Map<string, { text: string, groupId: number }>} */
  const questionTextMap = new Map();

  for (const file of questionFiles) {
    try {
      const content = await fs.readFile(file, "utf8");
      /** @type {Question[]} */
      const questions = JSON.parse(content);
      const groupIdMatch = file.match(/okruh(\d+)\.json$/);
      const groupId = groupIdMatch ? parseInt(groupIdMatch[1], 10) : 0;

      for (const q of questions) {
        if (q.id && q.otazka) {
          questionTextMap.set(String(q.id), { text: q.otazka, groupId });
        }
      }
    } catch (e) {
      console.error(`Error processing question file ${file}:`, e);
    }
  }
  // console.log(`Loaded ${questionTextMap.size} question texts.`);

  // 2. Načteme všechny analýzy
  const analysisFiles = await fg("public/analyza_okruh*/*_analyza_URL_*.json");
  /** @type {Map<string, Analysis & { otazka?: string, groupId?: number }>} */
  const index = new Map();

  for (const file of analysisFiles) {
    try {
      const content = await fs.readFile(file, "utf8");
      /** @type {{ výsledky_okruhu: { id_otazky: string; url: { analyza: Analysis }[] }[] }} */
      const batch = JSON.parse(content);

      if (batch.výsledky_okruhu) {
        for (const item of batch.výsledky_okruhu) {
          const analysis = item.url?.[0]?.analyza;
          if (analysis?.id_otazky) {
            const questionData = questionTextMap.get(analysis.id_otazky);
            // Zkombinujeme analýzu s textem otázky a groupId
            const combinedData = {
              ...analysis,
              otazka: questionData?.text || "", // Přidáme text otázky
              groupId: questionData?.groupId, // Přidáme groupId
            };
            index.set(analysis.id_otazky, combinedData);
          }
        }
      }
    } catch (e) {
      console.error(`Error processing analysis file ${file}:`, e);
    }
  }
  // console.log(`Indexed ${index.size} analyses.`);

  // 3. Důležité: Přidáme i otázky, které nemají analýzu, aby měly alespoň text
  for (const [id, data] of questionTextMap.entries()) {
    if (!index.has(id)) {
      index.set(id, {
        id_otazky: id,
        otazka: data.text,
        groupId: data.groupId,
        shrnuti: "",
        klicove_body: [],
        princip: "",
        chyby: [],
        poznatky_relevantni_k_odpovedim: [],
      });
    }
  }
  // console.log(`Index complete with ${index.size} total items.`);

  return index;
}
