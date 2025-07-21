import { db } from './db';
import { getGuestSessionId } from './session';
import { Stats, DEFAULT_STATS, getTodayDateString, DEFAULT_PROGRESS_STATS } from './dataModels';

/**
 * Vypočítá statistiky pro hosta z IndexedDB.
 * Odděluje celkové statistiky od dnešních na základě časových značek událostí.
 */
export async function calculateGuestStats(): Promise<Stats> {
  const sessionId = getGuestSessionId();
  const allEvents = await db.events.where({ sessionId }).toArray();

  if (allEvents.length === 0) {
    return DEFAULT_STATS;
  }

  // Výpočet celkových statistik
  const totalPracticeAnswered = allEvents.length;
  const totalPracticeCorrect = allEvents.filter(e => e.correct).length;

  // Výpočet dnešních statistik
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfTodayTimestamp = today.getTime();

  const todayEvents = allEvents.filter(e => e.ts >= startOfTodayTimestamp);
  const todayPracticeAnswered = todayEvents.length;
  const todayPracticeCorrect = todayEvents.filter(e => e.correct).length;

  const stats: Stats = {
    ...DEFAULT_STATS,
    total: {
      ...DEFAULT_STATS.total,
      practiceAnswered: totalPracticeAnswered,
      practiceCorrect: totalPracticeCorrect,
    },
    today: {
      ...DEFAULT_PROGRESS_STATS,
      lastReset: getTodayDateString(),
      practiceAnswered: todayPracticeAnswered,
      practiceCorrect: todayPracticeCorrect,
    }
  };

  return stats;
}
