// scripts/generateIndex.js
import { buildAnalysisIndex } from "../utils/buildAnalysisIndex.js";
import fs from "node:fs/promises";

async function generate() {
  console.log("Generating analysis index...");
  const map = await buildAnalysisIndex();
  await fs.writeFile(
    "public/analysisIndex.json",
    JSON.stringify(Object.fromEntries(map), null, 2)
  );
  console.log("✅ analysisIndex.json generated ✔︎");
}

generate();
