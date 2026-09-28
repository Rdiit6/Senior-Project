'use strict';

// Orchestrates a check-in. The order here IS the safety rule from the PRD:
//   1. crisis keyword check (our own code)
//   2. save the check-in (with crisis_flag)
//   3. crisis? -> stop. No AI output, no LLM call. Client shows the support screen.
//   4. otherwise: rule-based insight now, Stage 2 NLP later in the background.

const { toLocalDate } = require('../logic/checkDate');

function createCheckinService({ models, crisis, nlp, insights, config, clock = () => new Date() }) {
  async function saveOne(userId, entry, source) {
    const clientTs = entry.client_ts ?? clock();
    const crisisFlag = entry.note_text ? await crisis.check(entry.note_text) : false;

    const { id, applied } = await models.checkins.upsert({
      userId,
      moodValue: entry.mood_value,
      noteText: entry.note_text,
      checkDate: toLocalDate(clientTs, config.timeZone),
      clientTs,
      source,
      crisisFlag,
    });

    if (applied) {
      if (crisisFlag || !entry.note_text || !nlp.enabled) {
        await models.noteAnalyses.deleteForCheckin(id); // never keep an analysis of an old or crisis note
      } else {
        nlp.analyzeLater(id, entry.note_text);
      }
    }
    return { id, applied, crisisFlag };
  }

  return {
    /** POST /api/checkins -> { id, saved, insight?, crisis_flag } */
    async submit(userId, entry) {
      const { id, crisisFlag } = await saveOne(userId, entry, 'online');
      if (crisisFlag) return { id, saved: true, crisis_flag: true };
      const { message } = await insights.trend(userId);
      return { id, saved: true, insight: message, crisis_flag: false };
    },

    /**
     * POST /api/checkins/sync -> [{ client_ts, id, saved, crisis_flag }] in the same order as sent.
     * saved=true means the client can drop the item from its queue: it was stored, or a newer
     * check-in for that day already exists. crisis_flag reflects the note that was sent.
     */
    async sync(userId, entries, rawClientTs) {
      const order = entries.map((_, i) => i).sort((a, b) => entries[a].client_ts - entries[b].client_ts);
      const results = new Array(entries.length);
      for (const i of order) {
        const { id, crisisFlag } = await saveOne(userId, entries[i], 'offline_sync');
        results[i] = { client_ts: rawClientTs[i], id, saved: true, crisis_flag: crisisFlag };
      }
      return results;
    },

    async list(userId) {
      return models.checkins.listForUser(userId);
    },
  };
}

module.exports = { createCheckinService };
