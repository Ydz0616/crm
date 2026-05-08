const Joi = require('joi');
const mongoose = require('mongoose');

// Time-window aggregation for the developer dashboard. Three fixed windows
// keep the surface tiny — adding "custom date range" would multiply the
// query-cost surface and is out of scope for v0 (see issue #220).
const querySchema = Joi.object({
  range: Joi.string().valid('today', '7d', '30d').default('7d'),
});

const DAY_MS = 24 * 60 * 60 * 1000;

function rangeToWindow(range) {
  const end = new Date();
  if (range === 'today') {
    const start = new Date(end);
    start.setUTCHours(0, 0, 0, 0);
    return { start, end };
  }
  if (range === '7d') return { start: new Date(end.getTime() - 7 * DAY_MS), end };
  if (range === '30d') return { start: new Date(end.getTime() - 30 * DAY_MS), end };
  // Joi guards against this, but throw rather than return garbage.
  throw new Error(`unknown range: ${range}`);
}

const EMPTY_TOTALS = Object.freeze({
  records: 0,
  input: 0,
  output: 0,
  cached: 0,
  total: 0,
  costUsd: 0,
});

async function getLlmUsage(req, res) {
  const { value, error } = querySchema.validate(req.query, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
  const { range } = value;
  const { start, end } = rangeToWindow(range);

  const LlmUsage = mongoose.model('LlmUsage');
  const Admin = mongoose.model('Admin');

  // `removed:false` mirrors the rest of the codebase. Unwritten LLMUsage rows
  // never carry removed:true today (writes are system-only) but we honor the
  // soft-delete contract anyway in case ops ever needs to retire bad rows.
  const baseMatch = { removed: false, created: { $gte: start, $lte: end } };

  const [totalsAgg, byProviderModel, topUsersAgg, erroredCount, byChannel] = await Promise.all([
    LlmUsage.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          records: { $sum: 1 },
          input: { $sum: '$inputTokens' },
          output: { $sum: '$outputTokens' },
          cached: { $sum: '$cachedTokens' },
          total: { $sum: '$totalTokens' },
          costUsd: { $sum: '$costUsd' },
        },
      },
    ]),
    LlmUsage.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { provider: '$provider', model: '$model' },
          count: { $sum: 1 },
          totalTokens: { $sum: '$totalTokens' },
          costUsd: { $sum: '$costUsd' },
        },
      },
      { $sort: { totalTokens: -1 } },
      {
        $project: {
          _id: 0,
          provider: '$_id.provider',
          model: '$_id.model',
          count: 1,
          totalTokens: 1,
          costUsd: 1,
        },
      },
    ]),
    LlmUsage.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$userId',
          totalTokens: { $sum: '$totalTokens' },
          costUsd: { $sum: '$costUsd' },
          requests: { $sum: 1 },
        },
      },
      { $sort: { totalTokens: -1 } },
      { $limit: 10 },
    ]),
    LlmUsage.countDocuments({ ...baseMatch, errored: true }),
    LlmUsage.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$channel',
          count: { $sum: 1 },
          totalTokens: { $sum: '$totalTokens' },
          costUsd: { $sum: '$costUsd' },
        },
      },
      { $sort: { totalTokens: -1 } },
      {
        $project: {
          _id: 0,
          channel: '$_id',
          count: 1,
          totalTokens: 1,
          costUsd: 1,
        },
      },
    ]),
  ]);

  const totals = totalsAgg[0]
    ? {
        records: totalsAgg[0].records,
        input: totalsAgg[0].input,
        output: totalsAgg[0].output,
        cached: totalsAgg[0].cached,
        total: totalsAgg[0].total,
        costUsd: totalsAgg[0].costUsd,
      }
    : { ...EMPTY_TOTALS };

  // Resolve top-user IDs to email/name in one round-trip rather than a
  // $lookup inside aggregate — keeps the aggregation pipeline portable
  // and admins is small enough that find({ $in: [...10 ids] }) is cheap.
  const topUserIds = topUsersAgg.map((u) => u._id).filter(Boolean);
  const admins = topUserIds.length
    ? await Admin.find(
        { _id: { $in: topUserIds } },
        { email: 1, name: 1, surname: 1 }
      )
    : [];
  const adminById = new Map(admins.map((a) => [String(a._id), a]));
  const topUsers = topUsersAgg.map((u) => {
    const admin = adminById.get(String(u._id));
    return {
      userId: u._id,
      email: admin ? admin.email : null,
      name: admin ? `${admin.name || ''} ${admin.surname || ''}`.trim() : '(unknown)',
      requests: u.requests,
      totalTokens: u.totalTokens,
      costUsd: u.costUsd,
    };
  });

  return res.status(200).json({
    success: true,
    result: {
      range,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      totals,
      byProviderModel,
      topUsers,
      erroredCount,
      byChannel,
    },
    message: `LLM usage aggregated for ${range} window`,
  });
}

module.exports = getLlmUsage;
