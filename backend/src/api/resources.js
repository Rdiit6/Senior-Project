'use strict';

const express = require('express');

// GET /api/resources -> [{ id, title, description, url, tags }]  (primary crisis contact first)
function resourcesRouter({ models }) {
  const router = express.Router();
  router.get('/', async (req, res) => {
    res.json(await models.resources.listActive());
  });
  return router;
}

module.exports = { resourcesRouter };
