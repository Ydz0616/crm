const { rangeSchema, rangeToWindow, aggregateUsage } = require('./_aggregations');

// Matches the LlmUsage rows whose channel begins with "email" — the planned
// email channel marker. Case-insensitive in case future writers use 'Email'
// or sub-prefixes like 'email-imap', 'email-smtp', etc.
const EMAIL_CHANNEL_MATCH = { $regex: /^email/i };
const EMPTY_HINT = 'No email channel data yet — pending email channel instrumentation';

async function getEmailToken(req, res) {
  const { value, error } = rangeSchema.validate(req.query, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
  const { range } = value;
  const { start, end } = rangeToWindow(range);

  const match = {
    removed: false,
    channel: EMAIL_CHANNEL_MATCH,
    created: { $gte: start, $lte: end },
  };
  const agg = await aggregateUsage(match);

  // Until the email channel is wired (LLMUsage email channel 埋点 in
  // the discovered tech debt), the panel will be empty. Surface the
  // status explicitly so the UI can render an Alert rather than a wall
  // of zeroes that looks like a bug.
  if (agg.totals.records === 0) {
    return res.status(200).json({
      success: true,
      result: {
        range,
        windowStart: start.toISOString(),
        windowEnd: end.toISOString(),
        empty: true,
        hint: EMPTY_HINT,
      },
      message: `No email channel LLM usage in ${range} window`,
    });
  }

  return res.status(200).json({
    success: true,
    result: {
      range,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      empty: false,
      ...agg,
    },
    message: `Email channel LLM usage aggregated for ${range} window`,
  });
}

module.exports = getEmailToken;
