import Dexie, { Table } from 'dexie';

export interface Event {
  id?: number;
  ts: number;
  qid: string;
  correct: boolean;
  expiresAt?: number; // Čas expirace v ms
  sessionId?: string; // ID session pro hosta
  mode?: 'exam' | 'practice';
  sessionStatus?: 'dokončený' | 'nedokončený' | 'nestihnutý';
}

export interface Summary {
  qid: string;
  attempts: number;
  corrects: number;
  sessionId?: string;
}

export interface Meta {
  key: string;
  value: any;
}

export class AppDB extends Dexie {
  events!: Table<Event>;
  summary!: Table<Summary>;
  meta!: Table<Meta>;

  constructor() {
    super('AutoSkolaDB');
    this.version(1).stores({
      events: '++id, ts, qid, correct',
      summary: '&qid, attempts, corrects',
      meta: '&key',
    });
    // Nová verze pro přidání indexu expirace
    this.version(2).stores({
      events: '++id, ts, qid, correct, expiresAt',
    });
    // Nová verze pro přidání sessionId
    this.version(3).stores({
      events: '++id, ts, qid, correct, expiresAt, sessionId',
    });
    // Nová verze pro session-specific summary
    this.version(4).stores({
      summary: '&[sessionId+qid]',
    });
    // Nová verze pro ukládání kontextu session
    this.version(5).stores({
      events: '++id, ts, qid, correct, expiresAt, sessionId, mode, sessionStatus',
    });
  }
}

export const db = new AppDB();

export async function cleanupExpiredEvents() {
  const now = Date.now();
  try {
    const expiredCount = await db.events.where('expiresAt').below(now).delete();
    if (expiredCount > 0) {
      console.log(`[DB Cleanup] Deleted ${expiredCount} expired guest events.`);
    }
  } catch (error) {
    console.error("[DB Cleanup] Failed to delete expired events:", error);
  }
}
