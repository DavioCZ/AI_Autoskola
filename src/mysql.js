import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let mysqlPool;

if (process.env.DB_HOST) {
  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT),
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
  });
  console.log("✅ Připojeno k MySQL (V3 Schema).");
} else {
    console.warn("⚠️ MySQL proměnné nenalezeny. Databázové operace nebudou fungovat.");
}

export { mysqlPool };

/**
 * Ukončí connection pool.
 */
export async function endPool() {
    if (mysqlPool) {
        await mysqlPool.end();
        console.log('MySQL pool ukončen.');
    }
}

/**
 * Ensures a user record exists in the `users` table.
 * Uses INSERT IGNORE to avoid errors if the user already exists.
 * @param {string} userId
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function ensureUserExists(userId, email) {
    if (!mysqlPool || !userId || !email) return;
    try {
        await mysqlPool.query(
            'INSERT IGNORE INTO users (id, email, created_at) VALUES (?, ?, NOW())',
            [userId, email]
        );
    } catch (error) {
        console.error(`Chyba při zajišťování existence uživatele ${userId}:`, error);
        throw error;
    }
}

// =================================================================
// WRITE OPERATIONS (COMMANDS)
// =================================================================

export async function saveEventAndUpdateSummaries(conn, userId, eventData) {
  const { sessionId, questionId, topicId, answeredCorrectly, userAnswer, mode } = eventData;

  // 1. Vložit novou událost
  await conn.query(
    `INSERT INTO events (user_id, session_id, question_id, topic_id, answered_correctly, user_answer, mode, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [userId, sessionId, questionId, topicId, answeredCorrectly, userAnswer, mode]
  );

  // 2. Aktualizovat souhrn otázky
  await conn.query(
    `INSERT INTO question_summaries (user_id, question_id, topic_id, attempts, correct_attempts, success_rate, last_attempt_at)
     VALUES (?, ?, ?, 1, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       attempts = attempts + 1,
       correct_attempts = correct_attempts + VALUES(correct_attempts),
       success_rate = ROUND(100 * (correct_attempts) / (attempts), 1),
       last_attempt_at = NOW()`,
    [userId, questionId, topicId, answeredCorrectly, answeredCorrectly * 100]
  );

  // 3. Aktualizovat souhrn tématu
  await conn.query(
    `INSERT INTO topic_summaries (user_id, topic_id, attempts, correct_attempts, success_rate)
     VALUES (?, ?, 1, ?, ?)
     ON DUPLICATE KEY UPDATE
       attempts = attempts + 1,
       correct_attempts = correct_attempts + VALUES(correct_attempts),
       success_rate = ROUND(100 * (correct_attempts) / (attempts), 1)`,
    [userId, topicId, answeredCorrectly, answeredCorrectly * 100]
  );

  // 4. Aktualizovat denní pokrok
  await conn.query(
    `INSERT INTO daily_progress (user_id, activity_date, questions_answered, questions_correct, tests_completed)
     VALUES (?, CURDATE(), 1, ?, 0)
     ON DUPLICATE KEY UPDATE
       questions_answered = questions_answered + 1,
       questions_correct = questions_correct + VALUES(questions_correct)`,
    [userId, answeredCorrectly]
  );
}

export async function saveTestSession(conn, sessionData) {
  const { sessionId, userId, status, score, maxScore, timeSpentSeconds, startedAt, questionIds } = sessionData;

  // 1. Uložit session
  await conn.query(
    `INSERT INTO test_sessions (session_id, user_id, status, score, max_score, time_spent_seconds, started_at, finished_at, question_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [sessionId, userId, status, score, maxScore, timeSpentSeconds, startedAt, JSON.stringify(questionIds || [])]
  );

  // 2. Aktualizovat denní pokrok o dokončený test (robustně)
  await conn.query(
    `INSERT INTO daily_progress (user_id, activity_date, tests_completed)
     VALUES (?, CURDATE(), 1)
     ON DUPLICATE KEY UPDATE
       tests_completed = tests_completed + 1`,
    [userId]
  );
}


// =================================================================
// READ OPERATIONS (QUERIES)
// =================================================================

export async function getQuestionSummaries(userId) {
  if (!mysqlPool) return {};
  try {
    const [rows] = await mysqlPool.query('SELECT * FROM question_summaries WHERE user_id = ?', [userId]);
    const summary = {};
    for (const row of rows) {
      summary[row.question_id] = row;
    }
    return summary;
  } catch (error) {
    console.error(`Chyba při načítání question_summaries pro ${userId}:`, error);
    return {};
  }
}

export async function getTopicSummaries(userId) {
    if (!mysqlPool) return [];
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM topic_summaries WHERE user_id = ? ORDER BY success_rate ASC', [userId]);
        return rows;
    } catch (error) {
        console.error(`Chyba při načítání topic_summaries pro ${userId}:`, error);
        return [];
    }
}

export async function getTestSessions(userId) {
    if (!mysqlPool) return [];
    try {
        const [rows] = await mysqlPool.query(
            `SELECT 
                session_id,
                user_id,
                status,
                score,
                max_score,
                time_spent_seconds,
                started_at,
                finished_at,
                (SELECT COUNT(*) FROM events WHERE session_id = ts.session_id AND question_id NOT LIKE 'SESSION_END%') as total_questions_count,
                (SELECT COUNT(*) FROM events WHERE session_id = ts.session_id AND answered_correctly = 1) as correct_answers_count,
                question_ids
             FROM test_sessions ts
             WHERE user_id = ? 
             ORDER BY finished_at DESC`,
            [userId]
        );
        
        // Deserializace question_ids z JSON stringu
        return rows.map(row => ({
            ...row,
            question_ids: row.question_ids ? JSON.parse(row.question_ids) : []
        }));
    } catch (error) {
        console.error(`Chyba při načítání test_sessions pro ${userId}:`, error);
        return [];
    }
}

export async function getDailyProgress(userId) {
    if (!mysqlPool) return [];
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM daily_progress WHERE user_id = ? AND activity_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)', [userId]);
        return rows;
    } catch (error) {
        console.error(`Chyba při načítání daily_progress pro ${userId}:`, error);
        return [];
    }
}

export async function getUserBadges(userId) {
    if (!mysqlPool) return [];
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM user_badges WHERE user_id = ?', [userId]);
        return rows;
    } catch (error) {
        console.error(`Chyba při načítání user_badges pro ${userId}:`, error);
        return [];
    }
}

/**
 * Načte všechny události (odpovědi) pro daného uživatele.
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
export async function getAllEvents(userId) {
    if (!mysqlPool) return [];
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM events WHERE user_id = ? ORDER BY created_at ASC', [userId]);
        return rows;
    } catch (error) {
        console.error(`Chyba při načítání všech událostí pro ${userId}:`, error);
        return [];
    }
}

// =================================================================
// UTILITY OPERATIONS
// =================================================================

/**
 * Smaže všechna data pro daného uživatele napříč všemi tabulkami.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteAllUserData(userId) {
  if (!mysqlPool) return;
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    // Pořadí mazání je důležité kvůli foreign keys
    await connection.query('DELETE FROM events WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM test_sessions WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM question_summaries WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM topic_summaries WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM daily_progress WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM user_badges WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM due_cards WHERE user_id = ?', [userId]);
    // Samotného uživatele nemažeme, pouze jeho data
    // await connection.query('DELETE FROM users WHERE id = ?', [userId]);
    await connection.commit();
    console.log(`Všechna data pro uživatele ${userId} byla smazána.`);
  } catch (error) {
    await connection.rollback();
    console.error(`Chyba při mazání dat pro ${userId}:`, error);
    throw error;
  } finally {
    connection.release();
  }
}
