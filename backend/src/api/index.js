'use strict';

const express = require('express');
const { anonUser } = require('../middleware/anonUser');
const { checkinsRouter } = require('./checkins');
const { insightsRouter } = require('./insights');
const { resourcesRouter } = require('./resources');

// These five endpoints are the frozen contract.
// /resources is mounted BEFORE the token check on purpose: the support list must always load,
// even if the browser has no token yet or identifying the user fails (PRD: support always reachable).
function apiRouter(deps) {
  const router = express.Router();
  router.use('/resources', resourcesRouter(deps));
  router.use(anonUser(deps.models.users));
  router.use('/checkins', checkinsRouter(deps));
  router.use('/insights', insightsRouter(deps));
  return router;
}

module.exports = { apiRouter };
