const { rangeSchema, rangeToWindow, aggregateUsage } = require('./_aggregations');

async function getLlmUsage(req, res) {
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

  // No channel filter — all LLM usage in the window.
  const match = { removed: false, created: { $gte: start, $lte: end } };
  const agg = await aggregateUsage(match);

  return res.status(200).json({
    success: true,
    result: {
      range,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      ...agg,
    },
    message: `LLM usage aggregated for ${range} window`,
  });
}

module.exports = getLlmUsage;
