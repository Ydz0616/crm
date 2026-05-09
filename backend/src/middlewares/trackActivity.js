const mongoose = require('mongoose');

// Locked design (#220 D5 option 2): a tiny standalone middleware mounted
// AFTER isValidAuthToken so we can read req.admin._id, BEFORE the routers
// so a single update covers any authenticated request type. Intentionally
// does not modify isValidAuthToken — keeps the auth path off the spec §3
// infra red line.
//
// Throttle: at most one Admin write per 60 seconds per admin. We don't need
// minute-level precision on a "who's active right now" dashboard, and we
// definitely don't want to thrash Mongo on every API call.
//
// Memory model: a process-local Map<adminId, lastWriteEpochMs>. Admin IDs
// accumulate forever (no TTL eviction) but at Ola's scale (single-digit
// admins per tenant) the map is trivially small. Process restarts wipe it,
// which means the first request after restart triggers one write per
// admin — fine.
//
// Failure handling: writes are fire-and-forget via .catch. A failed
// findByIdAndUpdate must never break the request — auth has already passed,
// so the user gets their response either way. We log the failure to
// stderr so ops can spot persistent breakage.

const THROTTLE_MS = 60 * 1000;
const lastWriteByAdmin = new Map();

function trackActivity(req, res, next) {
  if (!req.admin || !req.admin._id) return next();

  const adminId = String(req.admin._id);
  const now = Date.now();
  const lastWrite = lastWriteByAdmin.get(adminId);
  if (lastWrite && now - lastWrite < THROTTLE_MS) return next();

  lastWriteByAdmin.set(adminId, now);

  const Admin = mongoose.model('Admin');
  Admin.findByIdAndUpdate(req.admin._id, { lastActivity: new Date(now) })
    .catch((err) => {
      console.error('[trackActivity] failed to update lastActivity:', err && err.message);
    });

  return next();
}

// Test hook: lets jest reset the throttle map between scenarios. Not used
// by production code paths.
trackActivity._resetThrottle = () => lastWriteByAdmin.clear();

module.exports = trackActivity;
