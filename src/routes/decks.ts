import express, { Request, Response, NextFunction } from 'express';
import { buildDailyDeck } from '../services/deckBuilder.js';
import { pool } from '../mysql.js';
import { ResultSetHeader } from 'mysql2';

export const router = express.Router();

// GET /api/decks/daily?user=<id>
router.get('/daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.query.user);
    if (!userId || userId === 'undefined') {
      return res.status(400).json({ message: 'User ID is required.' });
    }
    
    const deck = await buildDailyDeck(userId);

    // ulož hlavičku + položky
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query<ResultSetHeader>('INSERT INTO daily_decks (user_id) VALUES (?)', [userId]);
      const deckId = result.insertId;
      
      if (deck.length > 0) {
        await conn.batch(
          'INSERT INTO daily_deck_items (deck_id, question_id, slot) VALUES (?, ?, ?)',
          deck.map((q, i) => [deckId, q, i])
        );
      }
      
      await conn.commit();
      res.json({ deckId, questions: deck });

    } catch (dbError) {
      await conn.rollback();
      throw dbError; // Necháme to zpracovat globálním error handlerem
    } finally {
      conn.release();
    }

  } catch (e) { 
    console.error(`[API /daily-deck] Error for user ${req.query.user}:`, e);
    next(e); 
  }
});
