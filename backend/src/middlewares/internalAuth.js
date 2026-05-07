const rawEmails = process.env.INTERNAL_DASHBOARD_EMAILS;

const allowSet = new Set(
  (rawEmails || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

if (allowSet.size === 0) {
  throw new Error(
    'INTERNAL_DASHBOARD_EMAILS not configured — internal dashboard refuses to start without an explicit allowlist'
  );
}

module.exports = function internalAuth(req, res, next) {
  const email = req.admin && req.admin.email && String(req.admin.email).toLowerCase();
  if (!email) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Authentication required',
    });
  }
  if (!allowSet.has(email)) {
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Internal access denied',
    });
  }
  return next();
};
