// Shared MCP-naming helpers for olaController (PR #171 review feedback).
//
// NanoBot prefixes every MCP tool as `mcp_<server>_<rawToolName>`. The
// MCP server name is `ola_crm`, defined in ola/nanobot.config.template.json.
// Both thinkingLabels.js and toolResultToBlocks.js need to strip this
// prefix to look up labels / dispatch block producers; keeping the
// constants in one place prevents silent divergence if the server is ever
// renamed.

const MCP_SERVER_NAME = 'ola_crm';
const MCP_PREFIX = `mcp_${MCP_SERVER_NAME}_`;

function rawToolName(eventName) {
  if (typeof eventName !== 'string') return '';
  return eventName.startsWith(MCP_PREFIX)
    ? eventName.slice(MCP_PREFIX.length)
    : eventName;
}

module.exports = {
  MCP_SERVER_NAME,
  MCP_PREFIX,
  rawToolName,
};
