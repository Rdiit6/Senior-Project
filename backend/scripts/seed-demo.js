'use strict';

// Creates the demo account with 4 weeks of mood history so the demo never opens on an empty chart.
// Usage: set DEMO_ANON_TOKEN in .env, then `npm run db:seed-demo`.
// In the browser, put the same token in localStorage for the demo.
// Only moods and notes are seeded. No AI results are faked: run Stage 2 on real notes if you want them.

const fs = require('node:fs');
const path = require('node:path');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { loadConfig } = require('../src/config/env');
const { createPool } = require('../src/db/pool');
const { hashToken, TOKEN_PATTERN } = require('../src/middleware/anonUser');
const { toLocalDate, addDays } = require('../src/logic/checkDate');

// 28 days, oldest first: a normal fortnight, an exam-week dip, then recovery.
const MOODS = [4, 4, 3, 4, 5, 4, 3, 4, 3, 4, 4, 3, 4, 4, 3, 2, 2, 1, 2, 3, 3, 3, 4, 3, 4, 4, 5, 4];
const NOTES = {
  15: 'Minggu ujian mulai, tugas numpuk.',
  16: 'Kurang tidur, begadang belajar.',
  17: 'Capek banget, rasanya sendirian ngerjain semuanya.',
  19: 'Ujian selesai satu, sedikit lega.',
  26: 'Jalan sore sama teman, lebih baik.',
};

async function main() {
  const token = process.env.DEMO_ANON_TOKEN;
  if (!token || !TOKEN_PATTERN.test(token)) {
    throw new Error('Set DEMO_ANON_TOKEN (16-128 chars: letters, digits, _ or -) in .env first.');
  }

  const pool = createPool(loadConfig());
  const client = await pool.connect(); // one connection, so BEGIN/COMMIT cover every query
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO users (anon_token_hash, is_demo) VALUES ($1, true)
       ON CONFLICT (anon_token_hash) DO UPDATE SET is_demo = true RETURNING id`,
      [hashToken(token)],
    );
    const userId = rows[0].id;
    await client.query('DELETE FROM checkins WHERE user_id = $1', [userId]);

    const today = toLocalDate(new Date());
    for (let i = 0; i < MOODS.length; i += 1) {
      const day = addDays(today, i - (MOODS.length - 1));
      const tappedAt = `${day}T20:00:00+07:00`;
      await client.query(
        `INSERT INTO checkins (user_id, mood_value, note_text, check_date, client_ts, created_at)
         VALUES ($1, $2, $3, $4, $5, $5)`,
        [userId, MOODS[i], NOTES[i] ?? null, day, tappedAt],
      );
    }
    await client.query('COMMIT');
    console.log(`Demo account ready with ${MOODS.length} days of check-ins.`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
