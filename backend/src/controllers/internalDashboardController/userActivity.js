const Joi = require('joi');
const mongoose = require('mongoose');

// Two side-by-side metrics on the panel reflect different signals:
//   - "Active sessions" — any authenticated API call updates Admin.lastActivity
//     via the trackActivity middleware. Reflects raw web/CRM activity.
//   - "AI active users" — distinct userId on LlmUsage in the same window.
//     Reflects Ask Ola / future email-channel agent usage. A user can be
//     present in one set but not the other (e.g. salesperson editing quotes
//     without invoking Ola, or email-agent activity without an active
//     browser session).
//
// Default 15 minutes is the operator's "right now" intuition; we cap at
// 1440 minutes (24h) so a stray query string can't run a full-table scan
// on lastActivity.
const querySchema = Joi.object({
  windowMinutes: Joi.number().integer().min(1).max(1440).default(15),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

async function getUserActivity(req, res) {
  const { value, error } = querySchema.validate(req.query, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
  const { windowMinutes, limit } = value;
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const Admin = mongoose.model('Admin');
  const LlmUsage = mongoose.model('LlmUsage');

  const sessionMatch = {
    removed: false,
    enabled: true,
    lastActivity: { $gte: windowStart },
  };

  const [sessionsList, sessionsCount, aiUserIds] = await Promise.all([
    Admin.find(sessionMatch, { email: 1, name: 1, surname: 1, lastActivity: 1 })
      .sort({ lastActivity: -1 })
      .limit(limit),
    Admin.countDocuments(sessionMatch),
    LlmUsage.distinct('userId', {
      removed: false,
      created: { $gte: windowStart },
    }),
  ]);

  // Resolve LLM-active user ids → admin info. A userId can land in
  // LlmUsage but no longer correspond to an existing Admin (rare:
  // soft-deleted account). Filter those out so the table doesn't
  // surface ghost rows.
  const aiUsers = aiUserIds.length
    ? await Admin.find(
        { _id: { $in: aiUserIds }, removed: false },
        { email: 1, name: 1, surname: 1 }
      )
    : [];

  return res.status(200).json({
    success: true,
    result: {
      windowMinutes,
      windowStart: windowStart.toISOString(),
      activeSessionsLast: sessionsCount,
      aiActiveUsersLast: aiUsers.length,
      sessions: sessionsList.map((a) => ({
        userId: a._id,
        email: a.email,
        name: `${a.name || ''} ${a.surname || ''}`.trim(),
        lastActivity: a.lastActivity,
      })),
      aiUsers: aiUsers.map((a) => ({
        userId: a._id,
        email: a.email,
        name: `${a.name || ''} ${a.surname || ''}`.trim(),
      })),
    },
    message: `User activity for last ${windowMinutes} minutes`,
  });
}

module.exports = getUserActivity;
