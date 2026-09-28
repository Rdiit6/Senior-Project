'use strict';

const { HttpError } = require('./errors');

function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}

// Every error leaves the API in the same shape: { error: { code, message, details? } }.
// Internal details are logged, never sent to the client.
function errorHandler(logger = console) {
  // Express recognises error handlers by their 4 arguments, so `next` must stay.
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Request body is too large.' } });
    }
    logger.error(`[error] ${req.method} ${req.path}:`, err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
  };
}

module.exports = { notFound, errorHandler };
