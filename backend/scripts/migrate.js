'use strict';

// Creates all tables from src/models/schema.sql. Safe to run twice: it skips if the tables exist.
// Usage: npm run db:migrate

const fs = require('node:fs');
const path = require('node:path');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { loadConfig } = require('../src/config/env');
const { createPool } = require('../src/db/pool');

async function main() {
  const pool = createPool(loadConfig());
  const client = await pool.connect(); // one connection, so BEGIN/COMMIT cover every query
  try {
    const { rows } = await client.query("SELECT to_regclass('public.users') AS existing");
    if (rows[0].existing) {
      console.log('Schema already exists: nothing to do.');
      return;
    }
    const sql = fs.readFileSync(path.join(__dirname, '..', 'src', 'models', 'schema.sql'), 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Schema created.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
