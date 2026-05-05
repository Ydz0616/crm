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

// Naming constants + rawToolName() shared via mcpUtils.js — single source
// of truth for MCP server name (PR #171 review feedback).
const { MCP_SERVER_NAME, MCP_PREFIX, rawToolName } = require('./mcpUtils');

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
    unit: it.unit_en || it.unit_cn || '',
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

// quote.search returns {found, results[]} envelope (see mcp/tools/crud/quote.js).
// Renders a lightweight list (no per-row PDF) — user picks one, agent then
// calls quote.read which routes through quoteCreateToBlocks for full preview.
function quoteSearchToBlocks(data) {
  if (!data || data.found !== true) return [];
  const results = Array.isArray(data.results) ? data.results : [];
  if (results.length === 0) return [];

  return [
    {
      type: 'widget',
      widgetType: 'quote_list',
      data: {
        results: results.map((q) => ({
          quoteId: q._id,
          quoteNumber: q.number || '',
          client: (q.client && q.client.name) || '-',
          date: q.date,
          total: q.total,
          currency: q.currency || 'USD',
          status: q.status || 'draft',
        })),
      },
    },
  ];
}

const TOOL_BLOCK_PRODUCERS = {
  'quote.create': quoteCreateToBlocks,
  'quote.read': quoteCreateToBlocks,
  'quote.update': quoteCreateToBlocks,
  'quote.search': quoteSearchToBlocks,
};

function toolEventToBlocks(event) {
  if (!event || event.phase !== 'end') return [];
  const envelope = parseEnvelope(event.result);
  if (!envelope || envelope.ok !== true) return [];

  const producer = TOOL_BLOCK_PRODUCERS[rawToolName(event.name)];
  return producer ? producer(envelope.data) : [];
}

// Dedupe widget+file blocks within one assistant turn so multi-tool flows
// (e.g. agent reads then updates the same quote, or searches then reads)
// don't stack visually identical previews. Strategy: walk blocks in order,
// remember the LAST index of each (widgetType, quoteId) for widgets and
// each url for files, then keep only those last occurrences.
//
// Search widgets carry no quoteId — they dedupe on widgetType alone, so a
// repeated quote.search in the same turn keeps the latest list.
function dedupeBlocks(blocks) {
  const lastIdx = new Map();
  const keyOf = (b) => {
    if (b.type === 'widget') return `widget:${b.widgetType}:${(b.data && b.data.quoteId) || ''}`;
    if (b.type === 'file') return `file:${b.url}`;
    return null;
  };
  blocks.forEach((b, i) => {
    const k = keyOf(b);
    if (k !== null) lastIdx.set(k, i);
  });
  return blocks.filter((b, i) => {
    const k = keyOf(b);
    return k === null || lastIdx.get(k) === i;
  });
}

function toolEventsToBlocks(events) {
  if (!Array.isArray(events)) return [];
  const out = [];
  for (const ev of events) out.push(...toolEventToBlocks(ev));
  return dedupeBlocks(out);
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
