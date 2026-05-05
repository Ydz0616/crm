// Ola CRM MCP — X-Acting-As header decision (ISO1 + ISO4, issue #185)
//
// Pure helper: takes the raw value of the X-Acting-As HTTP header and decides
// whether the caller is acting as a specific admin, falling back to the
// system admin (legacy back-compat for askola web), or rejecting the request.
//
// Extracted from server.js into its own module so jest can cover the full
// decision path without spinning the MCP server / SDK transport.

const { resolveActingAdmin, getSystemAdmin } = require('./bootstrap');

/**
 * Decide the acting-as admin for an MCP request.
 *
 * @param {string|undefined|null} rawHeader  raw X-Acting-As header value
 * @returns {Promise<
 *   | { ok: true, actingAdmin: object, isSystemFallback: boolean }
 *   | { ok: false, status: number, code: string, message: string }
 * >}
 */
async function decideActingAdmin(rawHeader) {
  if (typeof rawHeader !== 'string' || rawHeader.trim().length === 0) {
    // Back-compat: askola web flow does not yet inject the header.
    // Fall back to systemAdmin so existing tools keep working.
    return {
      ok: true,
      actingAdmin: getSystemAdmin(),
      isSystemFallback: true,
    };
  }
  const result = await resolveActingAdmin(rawHeader.trim());
  if (!result.ok) {
    // VALIDATION → 400; NOT_FOUND/PERMISSION → 403 (uniform deny to avoid
    // admin id enumeration through differing status codes).
    const status = result.code === 'VALIDATION' ? 400 : 403;
    return { ok: false, status, code: result.code, message: result.message };
  }
  return {
    ok: true,
    actingAdmin: result.admin,
    isSystemFallback: false,
  };
}

module.exports = { decideActingAdmin };
