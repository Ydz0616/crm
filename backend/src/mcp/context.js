// Ola CRM MCP — Per-request context (ISO1, issue #185)
//
// The MCP SDK's tool handler signature is async (input) => output — there is
// no request-scoped context parameter. To pass the resolved acting-as admin
// from server.js (HTTP handler) down to individual tool handlers, we use
// Node's AsyncLocalStorage, a standard idiomatic per-request context.
//
// Lifecycle:
//   1. server.js receives POST /mcp
//   2. server.js parses `X-Acting-As` header → bootstrap.resolveActingAdmin(id)
//   3. server.js wraps transport.handleRequest in runWithContext({...})
//   4. Tool handlers (loaded via registry.js) call getCurrentActingAdmin()
//      to read the resolved admin (or null when no header was sent)
//
// System-scope tools (salesperson.*, health.*) treat null as a fallback to
// systemAdmin (back-compat). Business-scope tools (customer/merch/quote) will
// reject when null in ISO3.

const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

/**
 * Run `fn` with the given per-request context.
 * Called by server.js HTTP handler to wrap transport.handleRequest.
 *
 * @param {{ actingAdmin: object|null, isSystemFallback: boolean }} ctx
 * @param {Function} fn  async function to run inside the context
 */
function runWithContext(ctx, fn) {
  return als.run(ctx, fn);
}

/**
 * Read the current request's resolved acting-as admin.
 * @returns {object|null} Mongoose Admin doc, or null when no header was sent.
 * @throws when called outside an MCP request scope (programmer error).
 */
function getCurrentActingAdmin() {
  const ctx = als.getStore();
  if (!ctx) {
    throw new Error(
      '[mcp/context] getCurrentActingAdmin called outside MCP request scope — ' +
        'ensure tool runs via server.js handler, not direct invocation.',
    );
  }
  return ctx.actingAdmin;
}

/**
 * Whether the current request fell back to systemAdmin (no X-Acting-As).
 * Used by tool handlers to decide back-compat vs strict-mode behavior.
 */
function isSystemFallback() {
  const ctx = als.getStore();
  if (!ctx) return false;
  return ctx.isSystemFallback === true;
}

module.exports = { runWithContext, getCurrentActingAdmin, isSystemFallback };
