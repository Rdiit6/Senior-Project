'use strict';

function createThemes(db) {
  return {
    async listCodes() {
      const { rows } = await db.query('SELECT code FROM themes ORDER BY code');
      return rows.map((r) => r.code);
    },
  };
}

module.exports = { createThemes };
