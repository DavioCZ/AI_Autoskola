import { pool } from '../mysql.js';

// Specifická rozhraní pro různé výsledky dotazů
interface QuestionIdRow {
  question_id: string;
}
interface TopicIdRow {
  topic_id: string;
}
interface IdRow {
  id: string;
}

const DECK_SIZE = 20;

export async function buildDailyDeck(userId: string): Promise<string[]> {
  const conn = await pool.getConnection();
  try {
    // ---------- 1  poslední chybné -----------------------
    const [prevErrors] = await conn.query<QuestionIdRow[]>(`
      SELECT q.question_id
      FROM daily_deck_items q
      JOIN daily_decks d  ON d.id = q.deck_id
      WHERE d.user_id = ? AND q.answered_correctly = 0
      ORDER BY d.created_at DESC, q.slot
      LIMIT 5`, [userId]);

    const deck: string[] = prevErrors.map((r: QuestionIdRow) => r.question_id);

    // helper pro jedinečnost + limit
    const push = (qid: string) => {
      if (deck.length < DECK_SIZE && !deck.includes(qid)) deck.push(qid);
    };

    // ---------- 2  neopravené chyby ----------------------
    if (deck.length < DECK_SIZE) {
      const [mistakes] = await conn.query<QuestionIdRow[]>(`
        SELECT question_id
        FROM user_question_stats
        WHERE user_id = ? AND success_rate < 100
        ORDER BY success_rate ASC, times_wrong DESC`, [userId]);
      mistakes.forEach((r: QuestionIdRow) => push(r.question_id));
    }

    // ---------- 3  ověřovací otázky ----------------------
    if (deck.length < DECK_SIZE) {
      const [verifies] = await conn.query<QuestionIdRow[]>(`
        SELECT question_id
        FROM user_question_stats
        WHERE user_id = ? AND success_rate = 100
              AND last_answered_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY RAND()
        LIMIT 2`, [userId]);
      verifies.forEach((r: QuestionIdRow) => push(r.question_id));
    }

    // ---------- 4  nejslabší okruhy ----------------------
    if (deck.length < DECK_SIZE) {
      const [weakTopics] = await conn.query<TopicIdRow[]>(`
        SELECT t.topic_id
        FROM user_topic_stats t
        WHERE t.user_id = ? AND t.success_rate < 86
        ORDER BY t.success_rate ASC`, [userId]);

      for (const { topic_id } of weakTopics) {
        if (deck.length >= DECK_SIZE) break;
        const [qs] = await conn.query<IdRow[]>(`
          SELECT id
          FROM questions
          WHERE topic_id = ?
            AND id NOT IN (?) 
          ORDER BY RAND()`, [topic_id, deck.length > 0 ? deck : ['']]); // Ošetření prázdného pole
        qs.forEach((r: IdRow) => push(r.id));
      }
    }

    // ---------- 5  náhodné doplnění ----------------------
    if (deck.length < DECK_SIZE) {
      const [randomQs] = await conn.query<IdRow[]>(`
        SELECT id
        FROM questions
        WHERE id NOT IN (?)
        ORDER BY RAND()
        LIMIT ?`, [deck.length > 0 ? deck : [''], DECK_SIZE - deck.length]); // Ošetření prázdného pole
      randomQs.forEach((r: IdRow) => push(r.id));
    }

    return deck.slice(0, DECK_SIZE);
  } finally {
    conn.release();
  }
}
