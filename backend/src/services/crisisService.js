'use strict';

const { containsCrisisKeyword } = require('../logic/crisisCheck');

// Loads the editable keyword list from the database and caches it briefly.
function createCrisisService({ models, logger = console, ttlMs = 60_000, clock = Date.now }) {
  let cache = null;
  let loadedAt = 0;
  let warnedEmpty = false;

  async function phrases() {
    if (!cache || clock() - loadedAt > ttlMs) {
      cache = await models.crisisKeywords.listActive();
      loadedAt = clock();
      if (cache.length === 0 && !warnedEmpty) {
        warnedEmpty = true;
        logger.warn('[crisis] crisis_keywords table is empty: crisis detection is OFF until the team adds keywords.');
      }
    }
    return cache;
  }

  return {
    async check(note) {
      if (!note) return false;
      return containsCrisisKeyword(note, await phrases());
    },
  };
}

module.exports = { createCrisisService };
