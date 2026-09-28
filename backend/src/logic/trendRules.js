'use strict';

// Stage 1 AI: transparent rule-based trend detection on the student's own mood history.
// No dataset and no training. Every rule is a named threshold the team can explain in the demo.

const { addDays } = require('./checkDate');

const WINDOW_DAYS = 7; // look at the last 7 calendar days
const MIN_ENTRIES = 3; // need at least 3 check-ins in the window to say anything
const LOW_MOOD = 2; // mood 1-2 counts as a low day
const LOW_AVERAGE = 2.5; // 7-day average at or below this is "low"
const LOW_STREAK_DAYS = 3; // this many consecutive low days suggests reaching out
const TREND_DELTA = 0.75; // change between first and second half of the window that counts as a trend

const MESSAGES = {
  notEnough: 'Check in beberapa hari lagi untuk melihat pola mood kamu.',
  lowStreak: (n) => `Mood kamu rendah ${n} hari berturut-turut. Tidak apa-apa untuk mencari teman bicara.`,
  declining: 'Mood kamu cenderung menurun minggu ini.',
  improving: 'Mood kamu cenderung membaik minggu ini.',
  low: 'Mood kamu cenderung rendah beberapa hari ini.',
  stable: 'Mood kamu cukup stabil minggu ini.',
};

const average = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

// Counts consecutive low days, walking back from the most recent check-in.
// A missing calendar day breaks the streak.
function lowStreak(entriesDesc) {
  let streak = 0;
  let expected = entriesDesc[0]?.check_date;
  for (const entry of entriesDesc) {
    if (entry.check_date !== expected || entry.mood_value > LOW_MOOD) break;
    streak += 1;
    expected = addDays(entry.check_date, -1);
  }
  return streak;
}

/**
 * @param {{mood_value:number, check_date:string}[]} entries  any order; one per day
 * @param {string} today  "YYYY-MM-DD" in WIB
 * @returns {{trend:'stable'|'declining'|'improving', message:string, needsSupport:boolean, average7:number|null, lowStreak:number}}
 */
function computeTrend(entries, today) {
  const from = addDays(today, -(WINDOW_DAYS - 1));
  const recent = entries
    .filter((e) => e.check_date >= from && e.check_date <= today)
    .sort((a, b) => a.check_date.localeCompare(b.check_date));

  if (recent.length < MIN_ENTRIES) {
    return { trend: 'stable', message: MESSAGES.notEnough, needsSupport: false, average7: null, lowStreak: 0 };
  }

  const moods = recent.map((e) => e.mood_value);
  const average7 = average(moods);
  const streak = lowStreak([...recent].reverse());

  const half = Math.floor(moods.length / 2);
  const delta = average(moods.slice(moods.length - half)) - average(moods.slice(0, half));

  let trend = 'stable';
  if (streak >= LOW_STREAK_DAYS || delta <= -TREND_DELTA) trend = 'declining';
  else if (delta >= TREND_DELTA) trend = 'improving';

  const needsSupport = streak >= LOW_STREAK_DAYS || average7 <= LOW_AVERAGE;

  let message;
  if (streak >= LOW_STREAK_DAYS) message = MESSAGES.lowStreak(streak);
  else if (trend === 'declining') message = MESSAGES.declining;
  else if (trend === 'improving') message = MESSAGES.improving;
  else if (average7 <= LOW_AVERAGE) message = MESSAGES.low;
  else message = MESSAGES.stable;

  return { trend, message, needsSupport, average7: Math.round(average7 * 100) / 100, lowStreak: streak };
}

module.exports = {
  computeTrend,
  lowStreak,
  MESSAGES,
  THRESHOLDS: { WINDOW_DAYS, MIN_ENTRIES, LOW_MOOD, LOW_AVERAGE, LOW_STREAK_DAYS, TREND_DELTA },
};
