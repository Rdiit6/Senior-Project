'use strict';

// End-to-end tests of the frozen API contract against a real PostgreSQL database.
// Runs only when TEST_DATABASE_URL is set, and only if the database name contains "test",
// because it DROPS and recreates the public schema.
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/mindmeter_test npm test

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { createApp } = require('../../src/app');

const url = process.env.TEST_DATABASE_URL;
const skip = !url ? 'TEST_DATABASE_URL not set' : !/test/i.test(new URL(url).pathname) ? 'database name must contain "test"' : false;

const TOKEN = 'integration_test_token_0001';
const OTHER_TOKEN = 'integration_test_token_0002';
const CRISIS_PHRASE = 'frasa uji krisis'; // harmless fixture phrase, not a real keyword

describe('MindMeter API', { skip }, () => {
  let pool;
  let server;
  let base;
  const fakeOpenRouter = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: '{"sentiment":"negative","score":0.9,"themes":["sleep","workload"]}' } }] }),
  });

  const call = async (method, route, { body, token = TOKEN } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['X-Anon-Token'] = token;
    const res = await fetch(`${base}${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };

  const waitForAnalysis = async (checkinId) => {
    for (let i = 0; i < 50; i += 1) {
      const { rows } = await pool.query('SELECT status FROM note_analyses WHERE checkin_id = $1', [checkinId]);
      if (rows[0] && rows[0].status !== 'pending') return rows[0].status;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error('analysis never finished');
  };

  before(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await pool.query(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'models', 'schema.sql'), 'utf8'));
    await pool.query('INSERT INTO crisis_keywords (phrase) VALUES ($1)', [CRISIS_PHRASE]);
    await pool.query(`
      INSERT INTO resources (title, description, phone, type, is_primary_crisis, sort_order)
        VALUES ('Kontak krisis (uji)', 'Kontak uji', '+62 000-0000', 'crisis', true, 0);
      INSERT INTO resources (title, description, url, type, sort_order)
        VALUES ('Tips tidur (uji)', 'Sumber uji', 'https://example.org/tidur', 'self_help', 1);
      INSERT INTO resource_themes (resource_id, theme_id)
        SELECT r.id, t.id FROM resources r, themes t WHERE r.title = 'Tips tidur (uji)' AND t.code = 'sleep';`);

    const config = {
      timeZone: 'Asia/Jakarta',
      corsOrigins: [],
      openrouter: { enabled: true, apiKey: 'test', model: 'test/model', baseUrl: 'http://unused', timeoutMs: 1000 },
    };
    const app = createApp({ db: pool, config, logger: { warn() {}, error() {} }, fetchImpl: fakeOpenRouter });
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server?.close();
    await pool?.end();
  });

  test('GET /health', async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  });

  test('401 without X-Anon-Token', async () => {
    const res = await call('GET', '/api/checkins', { token: null });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'ANON_TOKEN_REQUIRED');
  });

  test('400 with the standard error shape for a bad mood', async () => {
    const res = await call('POST', '/api/checkins', { body: { mood_value: 9 } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/checkins returns the contract shape and stores a hashed token only', async () => {
    const res = await call('POST', '/api/checkins', { body: { mood_value: 2, note_text: 'tugas numpuk, kurang tidur' } });
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body).sort(), ['crisis_flag', 'id', 'insight', 'saved']);
    assert.equal(res.body.saved, true);
    assert.equal(res.body.crisis_flag, false);

    const { rows } = await pool.query('SELECT anon_token_hash FROM users');
    assert.ok(rows.every((r) => r.anon_token_hash !== TOKEN && r.anon_token_hash.length === 64));

    assert.equal(await waitForAnalysis(res.body.id), 'done'); // Stage 2 ran in the background
  });

  test('second check-in on the same day updates instead of duplicating', async () => {
    const token = 'integration_test_token_0003';
    await call('POST', '/api/checkins', { body: { mood_value: 2 }, token });
    await call('POST', '/api/checkins', { body: { mood_value: 3 }, token });
    const list = await call('GET', '/api/checkins', { token });
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].mood_value, 3);
    assert.deepEqual(Object.keys(list.body[0]).sort(), ['created_at', 'id', 'mood_value', 'note_text']);
  });

  test('crisis note: flagged, no insight, never analysed by the LLM', async () => {
    const res = await call('POST', '/api/checkins', { body: { mood_value: 1, note_text: `hari ini ${CRISIS_PHRASE}.` }, token: OTHER_TOKEN });
    assert.deepEqual(Object.keys(res.body).sort(), ['crisis_flag', 'id', 'saved']);
    assert.equal(res.body.crisis_flag, true);
    await new Promise((r) => setTimeout(r, 100));
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM note_analyses WHERE checkin_id = $1', [res.body.id]);
    assert.equal(rows[0].n, 0);
  });

  test('POST /api/checkins/sync is idempotent and the newer tap wins', async () => {
    const day = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const older = { mood_value: 2, client_ts: `${day}T08:00:00+07:00` };
    const newer = { mood_value: 4, client_ts: `${day}T20:00:00+07:00` };

    const first = await call('POST', '/api/checkins/sync', { body: [newer, older] });
    assert.equal(first.status, 200);
    assert.deepEqual(first.body.map((r) => r.client_ts), [newer.client_ts, older.client_ts]);
    assert.ok(first.body.every((r) => r.saved === true));
    assert.equal(first.body[0].id, first.body[1].id); // same day, same row

    await call('POST', '/api/checkins/sync', { body: [newer, older] }); // re-sent queue
    const { rows } = await pool.query(
      `SELECT mood_value, source FROM checkins c JOIN users u ON u.id = c.user_id WHERE c.check_date = $1`, [day]);
    assert.deepEqual(rows, [{ mood_value: 4, source: 'offline_sync' }]);
  });

  test('GET /api/insights returns trend, message, themes from Stage 2, matched resources', async () => {
    const res = await call('GET', '/api/insights');
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body).sort(), ['message', 'resources', 'themes', 'trend']);
    assert.ok(['stable', 'declining', 'improving'].includes(res.body.trend));
    assert.deepEqual(res.body.themes, ['sleep', 'workload']);
    assert.equal(res.body.resources[0].title, 'Tips tidur (uji)');
  });

  test('GET /api/resources works WITHOUT a token: support is always reachable', async () => {
    const res = await call('GET', '/api/resources', { token: null });
    assert.equal(res.status, 200);
    assert.ok(res.body.length > 0);
  });

  test('GET /api/resources: primary crisis contact first, phone as tel: link', async () => {
    const res = await call('GET', '/api/resources');
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body[0]).sort(), ['description', 'id', 'tags', 'title', 'url']);
    assert.equal(res.body[0].url, 'tel:+620000000');
    assert.deepEqual(res.body[1].tags, ['sleep']);
  });
});
