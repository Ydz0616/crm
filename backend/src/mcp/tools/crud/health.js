// health.ping — registry sanity check tool.
//
// Permanent (not a temporary dummy): NanoBot can call this to verify the
// MCP connection is alive and the registry is wired correctly.
// No business side-effects, no auth-sensitive output.

module.exports = {
  name: 'health.ping',
  description: 'Liveness probe for the Ola CRM MCP server. Returns {pong:true, ts}.',
  inputSchema: {},
  handler: async () => ({
    ok: true,
    data: { pong: true, ts: Date.now() },
  }),
};
