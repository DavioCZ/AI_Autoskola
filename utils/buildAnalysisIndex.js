// utils/buildAnalysisIndex.js
import fg from "fast-glob";
import fs from "node:fs/promises";

/**
 * @returns {Promise<Map<string, Analysis>>}
 */
export async function buildAnalysisIndex() {
  // ❶   Najdi VŠECHNY *.json soubory se slůvkem „analyza“
  const files = await fg("public/analyza_okruh*/*_analyza_URL_*.json");

  /** @type {Map<string, Analysis>} */
  const index = new Map();

  // ❷   Projdeme soubory a jejich pole "vysledky_okruhu"
  for (const file of files) {
    try {
      const content = await fs.readFile(file, "utf8");
      /** @type {{ výsledky_okruhu: { id_otazky: string; url: { analyza: Analysis }[] }[] }} */
      const batch = JSON.parse(content);

      if (batch.výsledky_okruhu) {
        for (const item of batch.výsledky_okruhu) {
          const analysis = item.url?.[0]?.analyza;      // ← první z pole URL
          if (analysis?.id_otazky) {
            index.set(analysis.id_otazky, analysis);
          }
        }
      }
    } catch (e) {
      console.error(`Error processing file ${file}:`, e);
      // Optionally re-throw or handle the error as needed
    }
  }

  return index;   // Map<id, Analysis>
}
