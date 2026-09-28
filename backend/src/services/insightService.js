'use strict';

const { computeTrend } = require('../logic/trendRules');
const { toLocalDate, addDays } = require('../logic/checkDate');

function createInsightService({ models, config, clock = () => new Date() }) {
  const today = () => toLocalDate(clock(), config.timeZone);

  // Rule-based trend (Stage 1 AI) over the last two weeks of this user's moods.
  async function trend(userId) {
    const day = today();
    const moods = await models.checkins.moodsSince(userId, addDays(day, -13));
    return computeTrend(moods, day);
  }

  return {
    trend,

    /** GET /api/insights -> { trend, message, themes[], resources[] } */
    async getInsight(userId) {
      const t = await trend(userId);
      const themes = await models.noteAnalyses.recentThemeCodes(userId, addDays(today(), -6));
      const resources = await models.resources.match({ themeCodes: themes, needsSupport: t.needsSupport });
      return { trend: t.trend, message: t.message, themes, resources };
    },
  };
}

module.exports = { createInsightService };
