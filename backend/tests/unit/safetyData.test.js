'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { validateKeywords, validateResources } = require('../../scripts/lib/safetyData');
const { toResource } = require('../../src/models/resources');

describe('toResource (how contacts reach the support screen)', () => {
  const row = { id: 'r1', title: 'T', description: 'D', url: 'https://ugm.id/x', phone: '+62 813-9173-7076', tags: [] };

  test('primary crisis contact with a phone and a website: the phone wins', () => {
    assert.equal(toResource({ ...row, type: 'counselling', is_primary_crisis: true }).url, 'tel:+6281391737076');
  });

  test('crisis contact without a phone: falls back to the website', () => {
    assert.equal(toResource({ ...row, phone: null, type: 'crisis', is_primary_crisis: false }).url, 'https://ugm.id/x');
  });

  test('ordinary resource: the website wins, phone-only becomes tel:', () => {
    assert.equal(toResource({ ...row, type: 'self_help', is_primary_crisis: false }).url, 'https://ugm.id/x');
    assert.equal(toResource({ ...row, url: null, type: 'self_help', is_primary_crisis: false }).url, 'tel:+6281391737076');
  });
});

const THEMES = ['sleep', 'workload', 'isolation'];

describe('validateKeywords', () => {
  test('refuses an unreviewed list', () => {
    const { errors } = validateKeywords({ reviewed_by: '', reviewed_on: '', phrases: ['frasa uji'] });
    assert.equal(errors.length, 2);
    assert.match(errors.join(), /reviewed_by/);
    assert.match(errors.join(), /reviewed_on/);
  });

  test('normalizes and de-duplicates phrases', () => {
    const { phrases, errors } = validateKeywords({ reviewed_by: 'Tim', reviewed_on: '2026-09-28', phrases: ['Frasa  Uji!', 'frasa uji', 'kata-uji'] });
    assert.deepEqual(errors, []);
    assert.deepEqual(phrases, ['frasa uji', 'kata uji']);
  });

  test('refuses empty phrases and an empty list', () => {
    assert.match(validateKeywords({ reviewed_by: 'Tim', reviewed_on: '2026-09-28', phrases: ['ok', '  ', 5] }).errors.join(), /#2.*#3|#2/);
    assert.match(validateKeywords({ reviewed_by: 'Tim', reviewed_on: '2026-09-28', phrases: [] }).errors.join(), /non-empty/);
  });
});

describe('validateResources', () => {
  const ok = { title: 'Kontak', description: 'Desc', phone: '+62 1', url: null, type: 'crisis', tags: ['sleep'], verified_at: '2026-09-28' };

  test('accepts a verified contact', () => {
    const { resources, errors } = validateResources({ resources: [ok] }, THEMES);
    assert.deepEqual(errors, []);
    assert.equal(resources[0].phone, '+62 1');
  });

  test('refuses a contact without verified_at', () => {
    const { errors } = validateResources({ resources: [{ ...ok, verified_at: '' }] }, THEMES);
    assert.match(errors.join(), /verified_at is missing/);
  });

  test('refuses a contact with no url and no phone, a bad type, or unknown tags', () => {
    const { errors } = validateResources({ resources: [{ ...ok, phone: null, type: 'hotline', tags: ['romance'] }] }, THEMES);
    assert.match(errors.join(), /url or a phone/);
    assert.match(errors.join(), /type must be/);
    assert.match(errors.join(), /unknown tags romance/);
  });

  test('allows at most one primary crisis contact', () => {
    const { errors } = validateResources({ resources: [{ ...ok, is_primary_crisis: true }, { ...ok, is_primary_crisis: true }] }, THEMES);
    assert.match(errors.join(), /at most one/);
  });

  test('the draft files in backend/data are refused until reviewed and verified', () => {
    const kw = validateKeywords(require('../../data/crisis-keywords.json'));
    const res = validateResources(require('../../data/resources.json'), ['sleep', 'workload', 'exams', 'isolation', 'relationships', 'finance', 'health', 'motivation']);
    assert.ok(kw.errors.length > 0, 'draft keyword list must not load before review');
    assert.ok(kw.phrases.length > 0);
    assert.ok(res.errors.every((e) => /verified_at/.test(e)), `only verification should be missing: ${res.errors.join(' | ')}`);
  });
});
