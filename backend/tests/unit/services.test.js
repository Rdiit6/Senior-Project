'use strict';

// Service-level tests with in-memory fakes: these pin down the PRD safety rules.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createCheckinService } = require('../../src/services/checkinService');
const { parseModelReply } = require('../../src/services/nlpService');

function setup({ crisisResult = false, nlpEnabled = true, applied = true } = {}) {
  const calls = { analyzeLater: [], deleted: [], upserts: [] };
  const service = createCheckinService({
    config: { timeZone: 'Asia/Jakarta' },
    clock: () => new Date('2026-09-28T13:00:00Z'),
    crisis: { check: async () => crisisResult },
    nlp: { enabled: nlpEnabled, analyzeLater: (id, note) => calls.analyzeLater.push({ id, note }) },
    insights: { trend: async () => ({ message: 'Mood kamu cukup stabil minggu ini.' }) },
    models: {
      checkins: { upsert: async (row) => (calls.upserts.push(row), { id: 'chk_1', applied }) },
      noteAnalyses: { deleteForCheckin: async (id) => calls.deleted.push(id) },
    },
  });
  return { service, calls };
}

describe('checkinService safety rules', () => {
  test('crisis note: flagged, saved, no insight, and NEVER sent to the LLM', async () => {
    const { service, calls } = setup({ crisisResult: true });
    const res = await service.submit('u1', { mood_value: 1, note_text: 'frasa uji', client_ts: null });
    assert.deepEqual(res, { id: 'chk_1', saved: true, crisis_flag: true });
    assert.equal(calls.upserts[0].crisisFlag, true);
    assert.equal(calls.analyzeLater.length, 0);
  });

  test('normal note: rule-based insight returned, NLP queued in the background', async () => {
    const { service, calls } = setup();
    const res = await service.submit('u1', { mood_value: 3, note_text: 'tugas numpuk', client_ts: null });
    assert.deepEqual(res, { id: 'chk_1', saved: true, insight: 'Mood kamu cukup stabil minggu ini.', crisis_flag: false });
    assert.deepEqual(calls.analyzeLater, [{ id: 'chk_1', note: 'tugas numpuk' }]);
  });

  test('NLP switched off: nothing is sent anywhere', async () => {
    const { service, calls } = setup({ nlpEnabled: false });
    await service.submit('u1', { mood_value: 3, note_text: 'tugas numpuk', client_ts: null });
    assert.equal(calls.analyzeLater.length, 0);
  });

  test('check_date is the WIB day of client_ts', async () => {
    const { service, calls } = setup();
    await service.submit('u1', { mood_value: 3, note_text: null, client_ts: new Date('2026-09-27T17:30:00Z') });
    assert.equal(calls.upserts[0].checkDate, '2026-09-28');
  });

  test('sync keeps request order in the response and echoes client_ts as sent', async () => {
    const { service } = setup();
    const entries = [
      { mood_value: 4, note_text: null, client_ts: new Date('2026-09-27T12:00:00Z') },
      { mood_value: 2, note_text: null, client_ts: new Date('2026-09-26T12:00:00Z') },
    ];
    const raw = ['2026-09-27T19:00:00+07:00', '2026-09-26T19:00:00+07:00'];
    const res = await service.sync('u1', entries, raw);
    assert.deepEqual(res.map((r) => r.client_ts), raw);
    assert.ok(res.every((r) => r.saved === true && r.crisis_flag === false));
  });
});

describe('nlpService.parseModelReply', () => {
  const allowed = ['sleep', 'workload'];

  test('accepts clean JSON and drops unknown themes', () => {
    const r = parseModelReply('{"sentiment":"negative","score":0.87,"themes":["sleep","romance","sleep"]}', allowed);
    assert.deepEqual(r, { sentiment: 'negative', score: 0.87, themes: ['sleep'] });
  });

  test('tolerates text around the JSON and clamps the score', () => {
    const r = parseModelReply('Here you go: {"sentiment":"positive","score":1.4,"themes":[]} ', allowed);
    assert.deepEqual(r, { sentiment: 'positive', score: 1, themes: [] });
  });

  test('rejects a reply without a valid sentiment', () => {
    assert.throws(() => parseModelReply('{"sentiment":"sad"}', allowed), /invalid sentiment/);
    assert.throws(() => parseModelReply('I think the student is stressed.', allowed), /no JSON/);
  });
});
