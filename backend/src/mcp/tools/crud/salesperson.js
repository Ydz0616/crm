// salesperson.* MCP tools (EM3, issue #187 — Ola CRM #176 email integration)
//
// System-scope reverse-lookup primitive. Channel adapters (e.g. nanobot's
// email channel in EM5a) call this BEFORE setting acting-as in the request
// contextvar — sender email → admin._id resolution is the chicken-and-egg
// step that cannot itself depend on acting-as.
//
// Unlike customer/merch/quote tools, this one does NOT route through
// createCRUDController; that scaffold filters by createdBy=req.admin._id
// which would be wrong here (we want to look up ANY enabled+!removed admin
// regardless of who's asking). We hit the Admin model directly with an
// explicit field projection.
//
// Trust boundary: any caller holding MCP_SERVICE_TOKEN can invoke this. That
// is appropriate for a service-to-service primitive — within that trust
// boundary, lookup_by_email returns a salesperson identifier that the
// caller can pass back as X-Acting-As for subsequent business-tool calls.
// salesperson.list is intentionally NOT exposed (would leak the internal
// salesperson roster without business need; v1 flow is exact-match lookup).

const mongoose = require('mongoose');
const { z } = require('zod');

// Explicit projection — defends against future Admin schema additions
// (e.g. if a sensitive field is ever added by mistake, it stays out by
// construction). password/salt/loggedSession/verificationCode/resetPasswordToken
// don't live on Admin today (they're in AdminPassword), but the .select()
// keeps the contract self-documenting.
const SAFE_FIELDS = '_id email name surname role language';

const lookupByEmail = {
  name: 'salesperson.lookup_by_email',
  description:
    'Reverse-lookup a salesperson by their exact email address. Returns {found:true, salesperson:{_id, email, name, surname, role, language}} or {found:false, message}. Used by channel adapters (email, etc.) to resolve sender → admin._id BEFORE setting the X-Acting-As header for subsequent business-tool calls. Disabled or removed admins are surfaced as found:false (not "found but disabled") so callers do not propagate stale identities downstream.',
  inputSchema: {
    email: z
      .string()
      .min(1)
      .email()
      .describe('Salesperson email — exact match, case-insensitive, leading/trailing whitespace trimmed'),
  },
  handler: async ({ email }) => {
    const normalized = email.toLowerCase().trim();
    const Admin = mongoose.model('Admin');
    // Include `enabled` in the projection because we use it for the gate;
    // we strip it from the returned shape so it doesn't bloat the envelope.
    const doc = await Admin.findOne({
      email: normalized,
      removed: false,
    })
      .select(`${SAFE_FIELDS} enabled`)
      .lean()
      .exec();

    if (!doc || doc.enabled === false) {
      return {
        ok: true,
        data: {
          found: false,
          message: `未找到匹配销售（email=${normalized}）— 请检查邮箱拼写或联系管理员添加 admin 账户`,
        },
      };
    }

    delete doc.enabled;
    return { ok: true, data: { found: true, salesperson: doc } };
  },
};

module.exports = { tools: [lookupByEmail] };
