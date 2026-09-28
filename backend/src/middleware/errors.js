'use strict';

// Error type used across the backend. The error handler turns it into
// { "error": { "code": "...", "message": "..." } } with the given HTTP status.
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new HttpError(400, 'VALIDATION_ERROR', message, details);

module.exports = { HttpError, badRequest };
