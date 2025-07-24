import { db } from './db';
import { getGuestSessionId } from './session';
import { Stats, DEFAULT_STATS, getTodayDateString, DEFAULT_PROGRESS_STATS } from './dataModels';
import { allBadges } from './badges.js';

// Importujeme GROUPS, abychom mohli načíst otázky
const GROUPS = [
  { id: 1, file: "/okruh1.json" }, { id: 2, file: "/okruh2.json" },
  { id: 3, file: "/okruh3.json" }, { id: 4, file: "/okruh4.json" },
  { id: 5, file: "/okruh5.json" }, { id: 6, file: "/okruh6.json" },
  { id: 7, file: "/okruh7.json" },
];

// Plné typy, aby odpovídaly DrivingTestApp
type SummaryData = Record<string, {
    questionId: string;
    questionText: string;
    groupId: number;
    attempts: number;
    correct: number;
    totalTimeToAnswer: number;
    history: { answeredAt: string; isCorrect: boolean; timeToAnswer: number }[];
    avgTime: number;
    successRate: number;
}>;

type UnlockedBadge = {
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
    level: number;
};

type QuestionMaster = {
    id: string;
    otazka: string;
    groupId: number;
};

let allQuestionsMap: Map<string, QuestionMaster> | null = null;

async function getAllQuestions() {
    if (allQuestionsMap) return allQuestionsMap;

    const map = new Map<string, QuestionMaster>();
    for (const group of GROUPS) {
        try {
            const res = await fetch(group.file);
            const data = await res.json();
            for (const q of data) {
                map.set(String(q.id), { id: String(q.id), otazka: q.otazka, groupId: group.id });
            }
        } catch (e) {
            console.error(`Failed to fetch questions for group ${group.id}`, e);
        }
    }
    allQuestionsMap = map;
    return allQuestionsMap;
}


/**
 * Vypočítá všechny statistiky pro hosta z IndexedDB, včetně summary a odznaků.
 */
export async function calculateGuestStats(): Promise<{ stats: Stats; summaryData: SummaryData; unlockedBadges: UnlockedBadge[] }> {
  const sessionId = getGuestSessionId();
  const allEvents = await db.events.where({ sessionId }).toArray();
  const questionsMap = await getAllQuestions();

  if (allEvents.length === 0) {
    return { stats: DEFAULT_STATS, summaryData: {}, unlockedBadges: [] };
  }

  const totalPracticeAnswered = allEvents.length;
  const totalPracticeCorrect = allEvents.filter(e => e.correct).length;

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

  const summaryData: SummaryData = allEvents.reduce((acc, event) => {
    const questionInfo = questionsMap.get(event.qid);
    if (!acc[event.qid]) {
      acc[event.qid] = {
        questionId: event.qid,
        questionText: questionInfo?.otazka || "Neznámá otázka",
        groupId: questionInfo?.groupId || 0,
        attempts: 0, correct: 0, totalTimeToAnswer: 0,
        history: [], avgTime: 0, successRate: 0
      };
    }
    acc[event.qid].attempts++;
    if (event.correct) acc[event.qid].correct++;
    return acc;
  }, {} as SummaryData);

  Object.values(summaryData).forEach(s => {
      s.successRate = s.attempts > 0 ? (s.correct / s.attempts) * 100 : 0;
  });

  const unlockedBadges: UnlockedBadge[] = [];
  const badgeMap = new Map(allBadges.map(b => [b.id, b]));

  if (totalPracticeAnswered > 0) {
    const badgeInfo = badgeMap.get('first_test_completed');
    if (badgeInfo) unlockedBadges.push({ ...badgeInfo, unlockedAt: new Date().toISOString(), level: 1 });
  }
  if (totalPracticeAnswered >= 10) {
    const badgeInfo = badgeMap.get('ten_tests_completed');
    if (badgeInfo) unlockedBadges.push({ ...badgeInfo, unlockedAt: new Date().toISOString(), level: 1 });
  }

  return { stats, summaryData, unlockedBadges };
}
