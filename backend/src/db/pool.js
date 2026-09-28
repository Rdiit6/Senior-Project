'use strict';

const { Pool } = require('pg');

// One connection pool for the whole app. Only the backend talks to the database;
// the frontend always goes through the API.
function createPool(config) {
  return new Pool({
    connectionString: config.databaseUrl,
    ssl: config.dbSsl ? { rejectUnauthorized: true } : false,
    max: 10,
  });
}

module.exports = { createPool };
