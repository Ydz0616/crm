const Joi = require('joi');
const mongoose = require('mongoose');

// Shared shape + Joi for any panel that aggregates LlmUsage by time window.
// Imported by llmUsage.js (D3) and emailToken.js (D4).
const rangeSchema = Joi.object({
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

// Runs the five canonical LlmUsage aggregations in parallel against `match`
// (which the caller has already shaped: must include `removed:false` and a
// `created` window). Returns the result block panels can serve directly.
async function aggregateUsage(match) {
  const LlmUsage = mongoose.model('LlmUsage');
  const Admin = mongoose.model('Admin');

  const [totalsAgg, byProviderModel, topUsersAgg, erroredCount, byChannel] = await Promise.all([
    LlmUsage.aggregate([
      { $match: match },
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
      { $match: match },
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
      { $match: match },
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
    LlmUsage.countDocuments({ ...match, errored: true }),
    LlmUsage.aggregate([
      { $match: match },
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

  // Resolve top-user IDs in one round-trip (admins is small enough that
  // find({ $in: [...10 ids] }) is cheap and keeps the aggregation portable).
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

  return { totals, byProviderModel, topUsers, erroredCount, byChannel };
}

module.exports = {
  rangeSchema,
  rangeToWindow,
  aggregateUsage,
  EMPTY_TOTALS,
};
