'use strict';

function createCrisisKeywords(db) {
  return {
    async listActive() {
      const { rows } = await db.query('SELECT phrase FROM crisis_keywords WHERE active');
      return rows.map((r) => r.phrase);
    },
  };
}

module.exports = { createCrisisKeywords };
