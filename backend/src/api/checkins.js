'use strict';

const express = require('express');
const { parseCheckin, parseSync } = require('./validators');

// POST /api/checkins        { mood_value, note_text?, client_ts? } -> { id, saved, insight?, crisis_flag }
// POST /api/checkins/sync   [{ mood_value, note_text?, client_ts }] -> [{ client_ts, id, saved, crisis_flag }]
// GET  /api/checkins        -> [{ id, mood_value, note_text, created_at }]
function checkinsRouter({ checkins }) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const entry = parseCheckin(req.body);
    res.json(await checkins.submit(req.user.id, entry)); // 200, as in the contract example
  });

  router.post('/sync', async (req, res) => {
    const entries = parseSync(req.body);
    const rawClientTs = req.body.map((item) => item.client_ts);
    res.json(await checkins.sync(req.user.id, entries, rawClientTs));
  });

  router.get('/', async (req, res) => {
    res.json(await checkins.list(req.user.id));
  });

  return router;
}

module.exports = { checkinsRouter };
