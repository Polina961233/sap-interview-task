import { Router } from "express";
import { requireBasicAuth } from "../auth/auth.middleware";
import { pool } from "../../lib/db";

export const responsesRouter = Router();
responsesRouter.use(requireBasicAuth);

responsesRouter.get("/mine", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.questionnaire_id, q.title, r.created_at
       FROM responses r
       JOIN questionnaires q ON q.id = r.questionnaire_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user!.id]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});
