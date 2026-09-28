'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { containsCrisisKeyword, normalize } = require('../../src/logic/crisisCheck');
const { computeTrend, lowStreak, MESSAGES } = require('../../src/logic/trendRules');
const { toLocalDate, addDays } = require('../../src/logic/checkDate');

describe('crisisCheck', () => {
  const phrases = ['frasa uji krisis', 'kata-uji'];

  test('matches a phrase regardless of case and punctuation', () => {
    assert.equal(containsCrisisKeyword('Hari ini... FRASA uji, krisis!', phrases), true);
    assert.equal(containsCrisisKeyword('ada kata uji di sini', phrases), true); // "kata-uji" normalises to "kata uji"
  });

  test('matches whole words only', () => {
    assert.equal(containsCrisisKeyword('frasa ujikrisis', phrases), false);
  });

  test('no note or no keywords means no crisis', () => {
    assert.equal(containsCrisisKeyword(null, phrases), false);
    assert.equal(containsCrisisKeyword('frasa uji krisis', []), false);
  });

  test('normalize collapses spaces and strips punctuation', () => {
    assert.equal(normalize('  Aku,   CAPEK. '), 'aku capek');
  });
});

describe('checkDate', () => {
  test('uses the Jakarta calendar day', () => {
    assert.equal(toLocalDate(new Date('2026-09-28T16:30:00Z')), '2026-09-28'); // 23:30 WIB
    assert.equal(toLocalDate(new Date('2026-09-28T17:30:00Z')), '2026-09-29'); // 00:30 WIB next day
  });

  test('addDays crosses month boundaries', () => {
    assert.equal(addDays('2026-09-30', 1), '2026-10-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });
});

describe('trendRules', () => {
  const today = '2026-09-28';
  const days = (moods) => moods.map((mood_value, i) => ({ mood_value, check_date: addDays(today, i - (moods.length - 1)) }));

  test('fewer than 3 check-ins: asks for more data', () => {
    const r = computeTrend(days([2, 2]), today);
    assert.equal(r.trend, 'stable');
    assert.equal(r.message, MESSAGES.notEnough);
    assert.equal(r.needsSupport, false);
  });

  test('3 consecutive low days: declining and needs support', () => {
    const r = computeTrend(days([4, 4, 4, 2, 1, 2]), today);
    assert.equal(r.lowStreak, 3);
    assert.equal(r.trend, 'declining');
    assert.equal(r.needsSupport, true);
    assert.equal(r.message, MESSAGES.lowStreak(3));
  });

  test('a missing day breaks the low streak', () => {
    const entries = [
      { mood_value: 2, check_date: '2026-09-28' },
      { mood_value: 2, check_date: '2026-09-26' },
    ];
    assert.equal(lowStreak(entries), 1);
  });

  test('rising moods: improving', () => {
    const r = computeTrend(days([2, 3, 3, 4, 5, 5]), today);
    assert.equal(r.trend, 'improving');
    assert.equal(r.message, MESSAGES.improving);
  });

  test('steady low average: low message, needs support', () => {
    const r = computeTrend(days([2, 3, 2, 3, 2, 3]), today);
    assert.equal(r.trend, 'stable');
    assert.equal(r.message, MESSAGES.low);
    assert.equal(r.needsSupport, true);
  });

  test('steady good mood: stable', () => {
    const r = computeTrend(days([4, 4, 5, 4, 4]), today);
    assert.equal(r.message, MESSAGES.stable);
    assert.equal(r.needsSupport, false);
  });

  test('ignores check-ins older than 7 days', () => {
    const old = [{ mood_value: 1, check_date: '2026-09-01' }, { mood_value: 1, check_date: '2026-09-02' }];
    const r = computeTrend([...old, ...days([4, 4])], today);
    assert.equal(r.message, MESSAGES.notEnough);
  });
});
