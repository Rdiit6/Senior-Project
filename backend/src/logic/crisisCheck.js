'use strict';

// Crisis keyword check. RULE: this runs BEFORE any AI/LLM step, in our own code.
// The LLM is never trusted to detect a crisis. The keyword list lives in the
// `crisis_keywords` table so the team can edit it without redeploying.

// Lowercase, turn punctuation into spaces, and collapse whitespace so that
// "Aku, capek." and "aku capek" compare equal.
function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// True if any phrase appears in the note as whole words.
function containsCrisisKeyword(note, phrases) {
  if (!note || !phrases || phrases.length === 0) return false;
  const haystack = ` ${normalize(note)} `;
  return phrases.some((phrase) => {
    const needle = normalize(phrase);
    return needle.length > 0 && haystack.includes(` ${needle} `);
  });
}

module.exports = { normalize, containsCrisisKeyword };
