/// <reference lib="webworker" />
import { db } from '../db';

db.events.hook('creating', (primKey, obj, trans) => {
  // Po každé vytvořené události přepočítáme souhrn pro danou otázku.
  // 'trans' je transakce, která zajišťuje, že operace je atomická.
  const { qid, correct, sessionId } = obj;

  // Zpracováváme pouze události, které mají sessionId (tj. od hostů)
  if (!sessionId) return;

  trans.on('complete', () => {
    // Spustíme přepočet až po úspěšném dokončení transakce.
    // Tím se vyhneme race conditions.
    updateSummary(qid, correct, sessionId);
  });
});

async function updateSummary(qid: string, isCorrect: boolean, sessionId: string) {
  try {
    await db.transaction('rw', db.summary, async () => {
      const summary = await db.summary.get([sessionId, qid]);
      if (summary) {
        await db.summary.update([sessionId, qid], {
          attempts: summary.attempts + 1,
          corrects: summary.corrects + (isCorrect ? 1 : 0),
        });
        console.log(`[Worker] Updated summary for qid: ${qid} in session: ${sessionId}`);
      } else {
        await db.summary.add({
          qid: qid,
          sessionId: sessionId,
          attempts: 1,
          corrects: isCorrect ? 1 : 0,
        });
        console.log(`[Worker] Created summary for qid: ${qid} in session: ${sessionId}`);
      }
    });
  } catch (error) {
    console.error(`[Worker] Failed to update summary for qid: ${qid} in session: ${sessionId}`, error);
  }
}

// Tento export je jen pro ujištění, že TypeScript považuje soubor za modul.
export {};
