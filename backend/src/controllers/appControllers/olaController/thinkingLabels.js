// Friendly in-progress labels for the Ask Ola thinking panel (Issue #131).
//
// Maps NanoBot MCP tool names → user-facing English strings. Lives in the
// CRM proxy (not in NanoBot) so UIUX (Will / Angel) can edit copy without
// redeploying NanoBot, and so new MCP tools auto-fallback to "Working on
// it..." instead of breaking when added before a label is registered.
//
// v1 is English-only; i18n / Chinese is tracked as a separate follow-up
// (idurar_app_language is application-level not user-level — tech debt).
//
// NanoBot prefixes every MCP tool as `mcp_<server>_<rawToolName>`. The
// MCP server name `ola_crm` is the same constant used in toolResultToBlocks.js.
// labelFor() handles prefix stripping + skip-list + fallback in one call.

const MCP_SERVER_NAME = 'ola_crm';
const MCP_PREFIX = `mcp_${MCP_SERVER_NAME}_`;

// Raw tool name (after stripping mcp_ola_crm_ prefix) → in-progress label.
// All labels carry an "Ola is X..." subject for warmth + clarity (zyd).
// Future v1.1: search-type tools should also surface the query argument
// (see follow-up issue for "Ola is searching for 'stainless steel'...").
const TOOL_LABELS = {
  // Customer
  'customer.search': 'Ola is searching customers...',
  'customer.read':   'Ola is loading customer details...',
  'customer.create': 'Ola is creating customer record...',
  'customer.update': 'Ola is updating customer info...',

  // Merchandise
  'merch.search':    'Ola is searching your products...',
  'merch.read':      'Ola is loading product details...',
  'merch.create':    'Ola is adding product to catalog...',
  'merch.update':    'Ola is updating product info...',

  // Quote
  'quote.search':    'Ola is searching quotes...',
  'quote.read':      'Ola is loading quote...',
  'quote.create':    'Ola is drafting your quote...',
  'quote.update':    'Ola is updating quote...',
};

// Tools that should NOT surface a thinking step to the end user.
// System-level / health-check tools belong here.
const SKIP_TOOLS = new Set([
  'health.ping',
]);

// Non-tool stages — used by chat.js / frontend when the agent is between
// tool calls (e.g. before first tool fires, while composing final response,
// or for unknown / unregistered tools).
const STAGE_LABELS = {
  __init__:    'Ola is thinking...',           // pre-tool / generic placeholder
  __compose__: 'Ola is composing the reply...',
  __unknown__: 'Ola is working on it...',      // fallback for unregistered tools
};

function rawToolName(eventName) {
  if (typeof eventName !== 'string') return '';
  return eventName.startsWith(MCP_PREFIX)
    ? eventName.slice(MCP_PREFIX.length)
    : eventName;
}

// Resolve a NanoBot tool event name (with or without mcp_ola_crm_ prefix)
// to the user-facing label. Returns null for skip-list tools (caller should
// suppress the SSE thinking_step entirely). Falls back to STAGE_LABELS.__unknown__
// for tools we haven't registered yet — keeps the panel informative without
// breaking when new MCP tools land.
function labelFor(toolName) {
  const raw = rawToolName(toolName);
  if (!raw) return STAGE_LABELS.__unknown__;
  if (SKIP_TOOLS.has(raw)) return null;
  return TOOL_LABELS[raw] || STAGE_LABELS.__unknown__;
}

module.exports = {
  TOOL_LABELS,
  SKIP_TOOLS,
  STAGE_LABELS,
  MCP_SERVER_NAME,
  MCP_PREFIX,
  rawToolName,
  labelFor,
};
