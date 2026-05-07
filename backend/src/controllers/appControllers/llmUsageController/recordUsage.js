const mongoose = require('mongoose');

const { calcCost, PRICING_VERSION } = require('@/constants/llmPricing');

// Resolved lazily so this module can be required at boot before
// models/utils/index.js has finished registering all mongoose models.
const lazyModel = () => mongoose.model('LlmUsage');

// Defaults reflect the current Ask Ola configuration (see
// ola/nanobot.config.template.json `agents.defaults`). They can be overridden
// per-request once nanobot starts surfacing per-call provider/model in the
// usage SSE frame; for now NanoBot uses one model per process so a static
// default is correct.
const NANOBOT_PROVIDER = process.env.NANOBOT_PROVIDER || 'gemini';
const NANOBOT_MODEL = process.env.NANOBOT_MODEL || 'gemini-3.1-flash-lite-preview';

// Persist one LLMUsage document. Always returns a Promise so the caller can
// `.catch()` if they want, but never throws — internally fail-silent so SSE
// finalizers can fire-and-forget without risking the user's response.
//
// Skip rules (returns without inserting):
//   - usage is missing / not an object → nanobot didn't surface real numbers
//     (e.g. legacy nanobot version, mocked path, error during streaming)
//   - totalTokens is 0 → no LLM call actually happened (rare; safety net)
async function recordUsage({
  userId,
  session,
  messageId = null,
  usage,
  latencyMs,
  requestId,
  errored = false,
}) {
  if (!usage || typeof usage !== 'object') return;
  if (!session || !session._id) return;

  const inputTokens = Number(usage.prompt_tokens || 0);
  const outputTokens = Number(usage.completion_tokens || 0);
  const totalTokens = Number(usage.total_tokens || inputTokens + outputTokens);
  const cachedTokens = Number(usage.cached_tokens || 0);
  const iterations = Number(usage.iterations || 1);

  if (totalTokens === 0) return;

  try {
    const costUsd = calcCost(NANOBOT_PROVIDER, NANOBOT_MODEL, {
      inputTokens,
      outputTokens,
      cachedTokens,
    });

    const LlmUsage = lazyModel();
    await LlmUsage.create({
      userId,
      sessionId: session._id,
      messageId,
      nanobotSessionId: session.nanobotSessionId,
      requestId,
      channel: 'ask-ola',
      provider: NANOBOT_PROVIDER,
      model: NANOBOT_MODEL,
      inputTokens,
      outputTokens,
      totalTokens,
      cachedTokens,
      iterations,
      costUsd,
      pricingVersion: PRICING_VERSION,
      latencyMs: Number(latencyMs) || 0,
      errored: !!errored,
      createdBy: userId,
    });
  } catch (err) {
    // Never let cost-tracking failure poison the user request. Surface in
    // logs so we notice if writes start systematically dropping (e.g. mongo
    // connection pool exhausted under load).
    console.error('[LLMUsage] persist failed:', err && err.message);
  }
}

module.exports = recordUsage;
