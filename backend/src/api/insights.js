'use strict';

const express = require('express');

// GET /api/insights -> { trend, message, themes[], resources[] }
function insightsRouter({ insights }) {
  const router = express.Router();
  router.get('/', async (req, res) => {
    res.json(await insights.getInsight(req.user.id));
  });
  return router;
}

module.exports = { insightsRouter };
