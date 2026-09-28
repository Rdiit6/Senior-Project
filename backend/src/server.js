'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Load backend/.env in development (Azure App Service provides real env vars instead).
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { loadConfig } = require('./config/env');
const { createPool } = require('./db/pool');
const { createApp } = require('./app');

const config = loadConfig();
const pool = createPool(config);
const app = createApp({ db: pool, config });

const server = app.listen(config.port, () => {
  console.log(`MindMeter API listening on port ${config.port} (NLP ${config.openrouter.enabled ? 'on' : 'off'})`);
});

// Azure restarts send SIGTERM: finish open requests, then close the database pool.
function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => pool.end().finally(() => process.exit(0)));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
