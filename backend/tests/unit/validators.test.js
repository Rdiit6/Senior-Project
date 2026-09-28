'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseCheckin, parseSync } = require('../../src/api/validators');

const now = new Date('2026-09-28T13:00:00Z');

describe('parseCheckin', () => {
  test('accepts a one-tap check-in', () => {
    assert.deepEqual(parseCheckin({ mood_value: 3 }, { now }), { mood_value: 3, note_text: null, client_ts: null });
  });

  test('trims the note and treats blank as no note', () => {
    assert.equal(parseCheckin({ mood_value: 3, note_text: '  hai  ' }, { now }).note_text, 'hai');
    assert.equal(parseCheckin({ mood_value: 3, note_text: '   ' }, { now }).note_text, null);
  });

  test('rejects mood outside 1-5 or non-integer', () => {
    for (const mood_value of [0, 6, 2.5, '3', null]) {
      assert.throws(() => parseCheckin({ mood_value }, { now }), { status: 400 });
    }
  });

  test('note limit is 200 characters, counting emoji as one', () => {
    assert.doesNotThrow(() => parseCheckin({ mood_value: 3, note_text: '😀'.repeat(200) }, { now }));
    assert.throws(() => parseCheckin({ mood_value: 3, note_text: 'a'.repeat(201) }, { now }), { status: 400 });
  });

  test('client_ts must be a sane ISO timestamp', () => {
    const ok = parseCheckin({ mood_value: 3, client_ts: '2026-09-28T20:00:00+07:00' }, { now });
    assert.equal(ok.client_ts.toISOString(), '2026-09-28T13:00:00.000Z');
    assert.throws(() => parseCheckin({ mood_value: 3, client_ts: 'kemarin' }, { now }), { status: 400 });
    assert.throws(() => parseCheckin({ mood_value: 3, client_ts: '2026-09-29T20:00:00+07:00' }, { now }), /future/);
    assert.throws(() => parseCheckin({ mood_value: 3, client_ts: '2026-07-01T20:00:00+07:00' }, { now }), /30 days/);
  });
});

describe('parseSync', () => {
  test('requires a non-empty array where every item has client_ts', () => {
    assert.throws(() => parseSync({}, { now }), { status: 400 });
    assert.throws(() => parseSync([], { now }), { status: 400 });
    assert.throws(() => parseSync([{ mood_value: 3 }], { now }), /Item 0: client_ts is required/);
  });

  test('caps the batch size', () => {
    const item = { mood_value: 3, client_ts: '2026-09-28T19:00:00+07:00' };
    assert.throws(() => parseSync(Array(51).fill(item), { now }), { status: 400 });
    assert.equal(parseSync(Array(50).fill(item), { now }).length, 50);
  });
});
