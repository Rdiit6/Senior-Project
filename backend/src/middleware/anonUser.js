'use strict';

const crypto = require('node:crypto');
const { HttpError } = require('./errors');

// Identifies the anonymous student. The frontend generates a random token once
// (e.g. crypto.randomUUID()), keeps it in localStorage, and sends it on every
// request as the X-Anon-Token header. We store only its SHA-256 hash.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function anonUser(users) {
  return async (req, res, next) => {
    const token = req.get('X-Anon-Token');
    if (!token || !TOKEN_PATTERN.test(token)) {
      throw new HttpError(401, 'ANON_TOKEN_REQUIRED', 'Send a valid X-Anon-Token header (16-128 chars: letters, digits, _ or -).');
    }
    req.user = await users.findOrCreateByTokenHash(hashToken(token));
    next();
  };
}

module.exports = { anonUser, hashToken, TOKEN_PATTERN };
