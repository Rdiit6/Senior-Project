'use strict';

// Check-ins: one row per user per WIB day (UNIQUE user_id + check_date).
function createCheckins(db) {
  return {
    /**
     * Insert, or update the same day's row if this entry is newer (last write wins by client_ts).
     * Safe to repeat, which makes offline sync idempotent.
     * @returns {Promise<{id:string, applied:boolean}>} applied=false when a newer entry already exists
     */
    async upsert({ userId, moodValue, noteText, checkDate, clientTs, source, crisisFlag }) {
      const { rows } = await db.query(
        `INSERT INTO checkins (user_id, mood_value, note_text, check_date, client_ts, source, crisis_flag, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $5)
         ON CONFLICT (user_id, check_date) DO UPDATE SET
           mood_value  = EXCLUDED.mood_value,
           note_text   = EXCLUDED.note_text,
           client_ts   = EXCLUDED.client_ts,
           source      = EXCLUDED.source,
           crisis_flag = EXCLUDED.crisis_flag,
           updated_at  = now()
         WHERE checkins.client_ts IS NULL OR EXCLUDED.client_ts >= checkins.client_ts
         RETURNING id`,
        [userId, moodValue, noteText, checkDate, clientTs, source, crisisFlag],
      );
      if (rows.length > 0) return { id: rows[0].id, applied: true };

      // A newer check-in for that day already exists; keep it and report its id.
      const existing = await db.query('SELECT id FROM checkins WHERE user_id = $1 AND check_date = $2', [userId, checkDate]);
      return { id: existing.rows[0].id, applied: false };
    },

    /** Check-ins for the dashboard chart, oldest first. created_at is the time the mood was tapped. */
    async listForUser(userId, days = 90) {
      const { rows } = await db.query(
        `SELECT id, mood_value, note_text, created_at
           FROM checkins
          WHERE user_id = $1 AND check_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date - $2::int
          ORDER BY check_date ASC`,
        [userId, days],
      );
      return rows;
    },

    /** Mood values with their WIB dates, for the rule-based trend. */
    async moodsSince(userId, fromDate) {
      const { rows } = await db.query(
        `SELECT mood_value, to_char(check_date, 'YYYY-MM-DD') AS check_date
           FROM checkins WHERE user_id = $1 AND check_date >= $2::date`,
        [userId, fromDate],
      );
      return rows;
    },
  };
}

module.exports = { createCheckins };
