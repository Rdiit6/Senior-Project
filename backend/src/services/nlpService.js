'use strict';

// Stage 2 AI: sentiment + themes for a note, using a pre-trained LLM through OpenRouter.
// RULES (from the PRD):
//  - Called ONLY from the backend; the API key never reaches the browser.
//  - The model must answer with JSON only; its free text is never shown to users.
//  - Crisis notes are never sent here (checkinService enforces that).
//  - Off unless OPENROUTER_API_KEY and OPENROUTER_MODEL are both set.

const SENTIMENTS = ['positive', 'neutral', 'negative'];
const MAX_THEMES = 3;

function buildMessages(note, themeCodes) {
  return [
    {
      role: 'system',
      content:
        'You label short student journal notes written in Indonesian or English. ' +
        'Reply with a single JSON object and nothing else: ' +
        '{"sentiment":"positive|neutral|negative","score":<number 0-1, your confidence>,' +
        `"themes":[zero to ${MAX_THEMES} of: ${themeCodes.join(', ')}]}. ` +
        'Do not give advice, diagnoses or any other text.',
    },
    { role: 'user', content: note },
  ];
}

/** Parses and validates the model's reply. Throws if it is not usable. Exported for tests. */
function parseModelReply(text, allowedThemes) {
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) throw new Error('model reply contained no JSON object');
  const data = JSON.parse(match[0]);

  if (!SENTIMENTS.includes(data.sentiment)) throw new Error('model reply has an invalid sentiment');
  let score = Number(data.score);
  if (!Number.isFinite(score)) score = null;
  else score = Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000;

  const themes = Array.isArray(data.themes)
    ? [...new Set(data.themes.filter((t) => allowedThemes.includes(t)))].slice(0, MAX_THEMES)
    : [];

  return { sentiment: data.sentiment, score, themes };
}

function createNlpService({ config, models, logger = console, fetchImpl = globalThis.fetch }) {
  const { enabled, apiKey, model, baseUrl, timeoutMs } = config.openrouter;

  async function classify(note, themeCodes) {
    const res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'MindMeter',
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(note, themeCodes),
        temperature: 0,
        max_tokens: 120,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
    const body = await res.json();
    return parseModelReply(body?.choices?.[0]?.message?.content ?? '', themeCodes);
  }

  async function analyze(checkinId, note) {
    const analysisId = await models.noteAnalyses.createPending(checkinId);
    try {
      const themeCodes = await models.themes.listCodes();
      const result = await classify(note, themeCodes);
      await models.noteAnalyses.markDone(analysisId, {
        sentiment: result.sentiment,
        score: result.score,
        modelName: model,
        themeCodes: result.themes,
      });
    } catch (err) {
      // Never log the note itself: it is sensitive.
      logger.error(`[nlp] analysis failed for checkin ${checkinId}: ${err.message}`);
      await models.noteAnalyses.markFailed(analysisId, err.message, model);
    }
  }

  return {
    enabled,
    analyze,
    /** Runs after the HTTP response is sent, so a slow model never delays the check-in. */
    analyzeLater(checkinId, note) {
      if (!enabled || !note) return;
      setImmediate(() => analyze(checkinId, note).catch((err) => logger.error(`[nlp] ${err.message}`)));
    },
  };
}

module.exports = { createNlpService, parseModelReply, buildMessages };
