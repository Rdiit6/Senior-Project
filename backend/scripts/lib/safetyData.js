'use strict';

// Validation for backend/data/crisis-keywords.json and backend/data/resources.json.
// Pure functions (no database) so they can be unit-tested. Used by scripts/seed-safety.js.
// Both files are safety-critical, so the rules are strict: anything unreviewed or unverified is refused.

const { normalize } = require('../../src/logic/crisisCheck');

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = ['crisis', 'counselling', 'self_help'];

const isDate = (v) => typeof v === 'string' && DATE.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());
const blank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** @returns {{ phrases: string[], errors: string[] }} phrases are normalized and de-duplicated */
function validateKeywords(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return { phrases: [], errors: ['crisis-keywords.json must be a JSON object'] };
  if (blank(data.reviewed_by)) errors.push('crisis-keywords.json: reviewed_by is empty (who reviewed the list?)');
  if (!isDate(data.reviewed_on)) errors.push('crisis-keywords.json: reviewed_on must be a date (YYYY-MM-DD)');
  if (!Array.isArray(data.phrases) || data.phrases.length === 0) {
    errors.push('crisis-keywords.json: phrases must be a non-empty list');
    return { phrases: [], errors };
  }
  const phrases = [];
  data.phrases.forEach((p, i) => {
    const n = typeof p === 'string' ? normalize(p) : '';
    if (!n) errors.push(`crisis-keywords.json: phrase #${i + 1} is empty or not text`);
    else if (!phrases.includes(n)) phrases.push(n);
  });
  return { phrases, errors };
}

/** @returns {{ resources: object[], errors: string[] }} */
function validateResources(data, themeCodes) {
  const errors = [];
  const list = data && Array.isArray(data.resources) ? data.resources : null;
  if (!list || list.length === 0) return { resources: [], errors: ['resources.json: resources must be a non-empty list'] };

  const resources = list.map((r, i) => {
    const where = `resources.json: #${i + 1} "${r && r.title ? r.title : '?'}"`;
    if (!r || typeof r !== 'object') {
      errors.push(`${where} is not an object`);
      return null;
    }
    if (blank(r.title)) errors.push(`${where}: title is empty`);
    if (blank(r.description)) errors.push(`${where}: description is empty`);
    if (blank(r.url) && blank(r.phone)) errors.push(`${where}: needs a url or a phone`);
    if (!blank(r.url) && !/^https?:\/\//.test(r.url)) errors.push(`${where}: url must start with http:// or https://`);
    if (!TYPES.includes(r.type)) errors.push(`${where}: type must be one of ${TYPES.join(', ')}`);
    if (!isDate(r.verified_at)) errors.push(`${where}: verified_at is missing: open the official page, confirm the contact, then set the date (YYYY-MM-DD)`);
    const tags = Array.isArray(r.tags) ? r.tags : [];
    const unknown = tags.filter((t) => !themeCodes.includes(t));
    if (unknown.length > 0) errors.push(`${where}: unknown tags ${unknown.join(', ')}`);
    return {
      title: String(r.title || '').trim(),
      description: String(r.description || '').trim(),
      url: blank(r.url) ? null : r.url.trim(),
      phone: blank(r.phone) ? null : String(r.phone).trim(),
      type: r.type,
      is_primary_crisis: r.is_primary_crisis === true,
      tags: [...new Set(tags)],
      verified_at: r.verified_at,
      sort_order: i,
    };
  });

  const primaries = resources.filter((r) => r && r.is_primary_crisis).length;
  if (primaries > 1) errors.push(`resources.json: ${primaries} entries have is_primary_crisis: true (at most one)`);
  return { resources: resources.filter(Boolean), errors };
}

module.exports = { validateKeywords, validateResources };
