'use strict';

// Request validation for the frozen API contract. Unknown fields are ignored.

const { badRequest } = require('../middleware/errors');

const NOTE_MAX = 200;
const SYNC_MAX_ITEMS = 50;
const FUTURE_TOLERANCE_MS = 10 * 60 * 1000; // device clocks drift a little
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // offline queue older than 30 days is rejected

function parseClientTs(value, now, required) {
  if (value === undefined || value === null) {
    if (required) throw badRequest('client_ts is required for offline sync items.');
    return null;
  }
  const ts = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(ts.getTime())) {
    throw badRequest('client_ts must be an ISO 8601 timestamp.');
  }
  if (ts.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) throw badRequest('client_ts is in the future.');
  if (ts.getTime() < now.getTime() - MAX_AGE_MS) throw badRequest('client_ts is older than 30 days.');
  return ts;
}

/** Validates one check-in body: { mood_value, note_text?, client_ts? } */
function parseCheckin(body, { now = new Date(), requireClientTs = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Body must be a JSON object.');

  const mood = body.mood_value;
  if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
    throw badRequest('mood_value must be an integer from 1 to 5.');
  }

  let note = body.note_text;
  if (note === undefined || note === null) {
    note = null;
  } else if (typeof note !== 'string') {
    throw badRequest('note_text must be a string.');
  } else {
    note = note.trim();
    if (note.length === 0) note = null;
    else if ([...note].length > NOTE_MAX) throw badRequest(`note_text must be at most ${NOTE_MAX} characters.`);
  }

  return {
    mood_value: mood,
    note_text: note,
    client_ts: parseClientTs(body.client_ts, now, requireClientTs),
  };
}

/** Validates the offline sync body: an array of check-ins, each with client_ts. */
function parseSync(body, { now = new Date() } = {}) {
  if (!Array.isArray(body)) throw badRequest('Body must be a JSON array of check-ins.');
  if (body.length === 0) throw badRequest('Sync array is empty.');
  if (body.length > SYNC_MAX_ITEMS) throw badRequest(`At most ${SYNC_MAX_ITEMS} check-ins per sync.`);

  return body.map((item, index) => {
    try {
      return parseCheckin(item, { now, requireClientTs: true });
    } catch (err) {
      err.message = `Item ${index}: ${err.message}`;
      err.details = { index };
      throw err;
    }
  });
}

module.exports = { parseCheckin, parseSync, NOTE_MAX, SYNC_MAX_ITEMS };
