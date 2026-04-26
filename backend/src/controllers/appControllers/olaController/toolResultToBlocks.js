// Map NanoBot tool_events → Ask Ola chat blocks (Issue #129)
//
// NanoBot's /v1/chat/completions response carries `metadata.tool_events`
// (start/end payloads, schema v1) that olaController/chat.js translates
// into the `blocks[]` shape the frontend MessageBubble understands.
//
// Tool name conventions:
//   NanoBot prefixes every MCP tool as `mcp_<server>_<rawToolName>`.
//   Source of truth for `<server>` is `ola/nanobot.config.template.json`
//   under `nanobot.mcpServers.<server>` — currently `ola_crm`.
//   We strip the full known prefix (not lastIndexOf/regex on `_`), so raw
//   tool names with either dots (`quote.create`) or underscores
//   (`customer_search`) survive untouched.
//
// Envelope:
//   tool_events[].result is the MCP envelope JSON serialized as a string —
//   `{"ok":true,"data":{...}}` — and must be JSON.parse'd before use.
//
// Adding a new widget for a tool:
//   1. Write a `<tool>ToBlocks(envelopeData)` producer that returns Block[]
//   2. Add one entry to TOOL_BLOCK_PRODUCERS keyed by raw tool name
//   No changes elsewhere in this file are needed.

const MCP_SERVER_NAME = 'ola_crm';
const MCP_PREFIX = `mcp_${MCP_SERVER_NAME}_`;

function rawToolName(eventName) {
  if (typeof eventName !== 'string') return '';
  return eventName.startsWith(MCP_PREFIX)
    ? eventName.slice(MCP_PREFIX.length)
    : eventName;
}

function parseEnvelope(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function quoteCreateToBlocks(quote) {
  if (!quote || !quote._id) return [];

  const items = Array.isArray(quote.items) ? quote.items : [];
  const previewItems = items.map((it) => ({
    itemName: it.itemName || '',
    description: it.description || '',
    quantity: it.quantity,
    unit: it.unit_cn || it.unit_en || '',
    subTotal: it.total,
  }));

  const quoteIdentifier = quote.number || quote._id;

  return [
    {
      type: 'widget',
      widgetType: 'quote_preview',
      data: {
        quoteId: quote._id,
        quoteNumber: quote.number || '',
        currency: quote.currency || 'USD',
        items: previewItems,
        subTotal: quote.subTotal,
        total: quote.total,
      },
    },
    {
      type: 'file',
      fileType: 'pdf',
      filename: `quote-${quoteIdentifier}.pdf`,
      url: `/download/quote/quote-${quote._id}.pdf`,
    },
  ];
}

const TOOL_BLOCK_PRODUCERS = {
  'quote.create': quoteCreateToBlocks,
};

function toolEventToBlocks(event) {
  if (!event || event.phase !== 'end') return [];
  const envelope = parseEnvelope(event.result);
  if (!envelope || envelope.ok !== true) return [];

  const producer = TOOL_BLOCK_PRODUCERS[rawToolName(event.name)];
  return producer ? producer(envelope.data) : [];
}

function toolEventsToBlocks(events) {
  if (!Array.isArray(events)) return [];
  const out = [];
  for (const ev of events) out.push(...toolEventToBlocks(ev));
  return out;
}

module.exports = {
  toolEventToBlocks,
  toolEventsToBlocks,
  rawToolName,
  parseEnvelope,
  MCP_SERVER_NAME,
  MCP_PREFIX,
  TOOL_BLOCK_PRODUCERS,
};
