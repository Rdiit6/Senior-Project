'use strict';

// Loads the crisis keyword list and the verified support contacts into the database.
// Usage: npm run db:seed-safety
// Safe to run again after editing the files:
//  - keywords: new phrases are added; phrases removed from the file are switched off (kept for history).
//  - resources: the table is replaced with exactly what is in the file.
// Refuses to run unless the keyword list is reviewed and every contact has a verified_at date.

const fs = require('node:fs');
const path = require('node:path');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { loadConfig } = require('../src/config/env');
const { createPool } = require('../src/db/pool');
const { validateKeywords, validateResources } = require('./lib/safetyData');

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', name), 'utf8'));

async function main() {
  const pool = createPool(loadConfig());
  const client = await pool.connect();
  try {
    const themeCodes = (await client.query('SELECT code FROM themes')).rows.map((r) => r.code);
    const keywords = validateKeywords(readJson('crisis-keywords.json'));
    const resources = validateResources(readJson('resources.json'), themeCodes);
    const errors = [...keywords.errors, ...resources.errors];
    if (errors.length > 0) {
      console.error('Not loaded. Fix these first:\n  - ' + errors.join('\n  - '));
      process.exitCode = 1;
      return;
    }

    await client.query('BEGIN');
    await client.query('UPDATE crisis_keywords SET active = false');
    await client.query(
      `INSERT INTO crisis_keywords (phrase) SELECT unnest($1::text[])
       ON CONFLICT (phrase) DO UPDATE SET active = true`,
      [keywords.phrases],
    );

    await client.query('DELETE FROM resources');
    for (const r of resources.resources) {
      const { rows } = await client.query(
        `INSERT INTO resources (title, description, url, phone, type, is_primary_crisis, sort_order, verified_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [r.title, r.description, r.url, r.phone, r.type, r.is_primary_crisis, r.sort_order, r.verified_at],
      );
      if (r.tags.length > 0) {
        await client.query(
          `INSERT INTO resource_themes (resource_id, theme_id) SELECT $1, id FROM themes WHERE code = ANY($2::text[])`,
          [rows[0].id, r.tags],
        );
      }
    }
    await client.query('COMMIT');
    console.log(`Loaded ${keywords.phrases.length} crisis phrases and ${resources.resources.length} support contacts.`);
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
