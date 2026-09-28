'use strict';

// Stage 2 results. Kept separate from check-ins so a slow or failed LLM call
// never blocks saving the check-in itself.
function createNoteAnalyses(db) {
  return {
    /** Starts a fresh analysis for a check-in, replacing any older one (its themes cascade away). */
    async createPending(checkinId) {
      const { rows } = await db.query(
        `INSERT INTO note_analyses (checkin_id, status) VALUES ($1, 'pending')
         ON CONFLICT (checkin_id) DO UPDATE SET
           status = 'pending', sentiment = NULL, score = NULL, model_name = NULL,
           error_message = NULL, analyzed_at = NULL
         RETURNING id`,
        [checkinId],
      );
      await db.query('DELETE FROM analysis_themes WHERE analysis_id = $1', [rows[0].id]);
      return rows[0].id;
    },

    async markDone(analysisId, { sentiment, score, modelName, themeCodes }) {
      await db.query(
        `UPDATE note_analyses
            SET status = 'done', sentiment = $2, score = $3, model_name = $4, analyzed_at = now()
          WHERE id = $1`,
        [analysisId, sentiment, score, modelName],
      );
      if (themeCodes.length > 0) {
        await db.query(
          `INSERT INTO analysis_themes (analysis_id, theme_id)
           SELECT $1, id FROM themes WHERE code = ANY($2::text[])
           ON CONFLICT DO NOTHING`,
          [analysisId, themeCodes],
        );
      }
    },

    async markFailed(analysisId, errorMessage, modelName) {
      await db.query(
        `UPDATE note_analyses SET status = 'failed', error_message = $2, model_name = $3, analyzed_at = now()
          WHERE id = $1`,
        [analysisId, String(errorMessage).slice(0, 500), modelName],
      );
    },

    /** Drops the analysis when a check-in's note is removed or turns out to be a crisis note. */
    async deleteForCheckin(checkinId) {
      await db.query('DELETE FROM note_analyses WHERE checkin_id = $1', [checkinId]);
    },

    /** Distinct theme codes from completed analyses since a WIB date. */
    async recentThemeCodes(userId, fromDate) {
      const { rows } = await db.query(
        `SELECT DISTINCT t.code
           FROM checkins c
           JOIN note_analyses a ON a.checkin_id = c.id AND a.status = 'done'
           JOIN analysis_themes at ON at.analysis_id = a.id
           JOIN themes t ON t.id = at.theme_id
          WHERE c.user_id = $1 AND c.check_date >= $2::date
          ORDER BY t.code`,
        [userId, fromDate],
      );
      return rows.map((r) => r.code);
    },
  };
}

module.exports = { createNoteAnalyses };
