'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { createModels } = require('./models');
const { createCrisisService } = require('./services/crisisService');
const { createNlpService } = require('./services/nlpService');
const { createInsightService } = require('./services/insightService');
const { createCheckinService } = require('./services/checkinService');
const { apiRouter } = require('./api');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Builds the Express app. `db` is a pg Pool; tests pass a test database.
function createApp({ db, config, logger = console, fetchImpl }) {
  const models = createModels(db);
  const crisis = createCrisisService({ models, logger });
  const nlp = createNlpService({ config, models, logger, fetchImpl });
  const insights = createInsightService({ models, config });
  const checkins = createCheckinService({ models, crisis, nlp, insights, config });
  const deps = { models, crisis, nlp, insights, checkins };

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
      allowedHeaders: ['Content-Type', 'X-Anon-Token'],
    }),
  );
  app.use(express.json({ limit: '32kb' }));

  // Health check for Azure App Service (not part of the frontend contract).
  app.get('/health', async (req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ok', nlp: nlp.enabled ? 'on' : 'off' });
  });

  app.use('/api', apiRouter(deps));
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}

module.exports = { createApp };
