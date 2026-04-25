// Map NanoBot tool_events → Ask Ola chat blocks (Issue #129)
//
// NanoBot's /v1/chat/completions response carries `metadata.tool_events`
// (start/end payloads, schema v1) that olaController/chat.js translates
// into the `blocks[]` shape the frontend MessageBubble understands.
//
// Tool name conventions:
//   - MCP tools registered via NanoBot are renamed `mcp_<server>_<tool>` —
//     e.g. quote.create surfaces as `mcp_ola_crm_quote.create`.
//   - We match the trailing `quote.create` so the mapper survives renames
//     of the MCP server identifier.
//
// Envelope:
//   tool_events[].result is the MCP envelope JSON serialized as a string —
//   `{"ok":true,"data":{...}}` — and must be JSON.parse'd before use.
//
// Adding a new widget = add another case to the switch. Unknown tool names
// emit no block (the LLM's natural-language reply is still shown as text).

function shortToolName(name) {
  if (typeof name !== 'string') return '';
  const idx = name.lastIndexOf('_');
  return idx >= 0 ? name.slice(idx + 1) : name;
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

function toolEventToBlocks(event) {
  if (!event || event.phase !== 'end') return [];
  const envelope = parseEnvelope(event.result);
  if (!envelope || envelope.ok !== true) return [];

  switch (shortToolName(event.name)) {
    case 'quote.create':
      return quoteCreateToBlocks(envelope.data);
    default:
      return [];
  }
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
  shortToolName,
  parseEnvelope,
};
