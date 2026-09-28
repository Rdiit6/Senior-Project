'use strict';

// Anonymous users. We store only a SHA-256 hash of the browser's token.
function createUsers(db) {
  return {
    async findOrCreateByTokenHash(tokenHash) {
      const { rows } = await db.query(
        `INSERT INTO users (anon_token_hash) VALUES ($1)
         ON CONFLICT (anon_token_hash) DO UPDATE SET anon_token_hash = EXCLUDED.anon_token_hash
         RETURNING id, is_demo`,
        [tokenHash],
      );
      return rows[0];
    },
  };
}

module.exports = { createUsers };
