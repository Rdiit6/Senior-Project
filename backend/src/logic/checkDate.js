'use strict';

// Converts a moment in time to the calendar date in Jakarta (WIB), as "YYYY-MM-DD".
// A check-in tapped at 23:30 WIB belongs to that day even though it is 16:30 UTC.
function toLocalDate(date, timeZone = 'Asia/Jakarta') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Adds (or subtracts) whole days to a "YYYY-MM-DD" string.
function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = { toLocalDate, addDays };
