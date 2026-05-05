// Tests for toolResultToBlocks.js — NanoBot tool_event → askola block
// dispatcher (Issue #170 真修).
//
// quote.create / quote.read / quote.update — full preview widget + PDF block
// quote.search — lightweight quote_list widget (no PDF; user expansion routes
//   through quote.read for full detail)

const {
  toolEventToBlocks,
  toolEventsToBlocks,
  TOOL_BLOCK_PRODUCERS,
} = require('@/controllers/appControllers/olaController/toolResultToBlocks');

function makeEvent(toolName, data) {
  return {
    name: `mcp_ola_crm_${toolName}`,
    phase: 'end',
    result: JSON.stringify({ ok: true, data }),
  };
}

const SAMPLE_QUOTE = {
  _id: '6650abc1234567890abcdef0',
  number: '25-001',
  currency: 'USD',
  subTotal: 100,
  total: 110,
  status: 'draft',
  date: '2026-05-04T00:00:00.000Z',
  client: { _id: 'cli1', name: 'Acme Trading' },
  items: [
    { itemName: 'WIDGET-1', description: 'Stainless widget', quantity: 10, unit_en: 'PCS', total: 100 },
  ],
};

describe('TOOL_BLOCK_PRODUCERS dispatcher map', () => {
  test('registers all 4 quote tools', () => {
    expect(Object.keys(TOOL_BLOCK_PRODUCERS).sort()).toEqual([
      'quote.create',
      'quote.read',
      'quote.search',
      'quote.update',
    ]);
  });

  test('quote.create / quote.read / quote.update share the same producer (full preview)', () => {
    expect(TOOL_BLOCK_PRODUCERS['quote.create']).toBe(TOOL_BLOCK_PRODUCERS['quote.read']);
    expect(TOOL_BLOCK_PRODUCERS['quote.create']).toBe(TOOL_BLOCK_PRODUCERS['quote.update']);
  });
});

describe('quote.create — regression (must not change shape)', () => {
  test('returns widget(quote_preview) + file(pdf)', () => {
    const blocks = toolEventToBlocks(makeEvent('quote.create', SAMPLE_QUOTE));
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({
      type: 'widget',
      widgetType: 'quote_preview',
      data: { quoteId: SAMPLE_QUOTE._id, quoteNumber: '25-001', currency: 'USD' },
    });
    expect(blocks[1]).toMatchObject({
      type: 'file',
      fileType: 'pdf',
      filename: 'quote-25-001.pdf',
      url: `/download/quote/quote-${SAMPLE_QUOTE._id}.pdf`,
    });
  });
});

describe('quote.read — full preview (same shape as create)', () => {
  test('happy path returns widget + file', () => {
    const blocks = toolEventToBlocks(makeEvent('quote.read', SAMPLE_QUOTE));
    expect(blocks).toHaveLength(2);
    expect(blocks[0].widgetType).toBe('quote_preview');
    expect(blocks[1].type).toBe('file');
  });

  test('missing _id returns []', () => {
    const blocks = toolEventToBlocks(makeEvent('quote.read', { number: '25-001' }));
    expect(blocks).toEqual([]);
  });
});

describe('quote.update — full preview', () => {
  test('happy path returns widget + file', () => {
    const blocks = toolEventToBlocks(makeEvent('quote.update', SAMPLE_QUOTE));
    expect(blocks).toHaveLength(2);
    expect(blocks[0].widgetType).toBe('quote_preview');
  });
});

describe('quote.search — lightweight quote_list widget (no PDF)', () => {
  test('found:true with N results → 1 widget block, N rows, no PDF', () => {
    const data = {
      found: true,
      results: [
        { ...SAMPLE_QUOTE, _id: 'q1', number: '25-001', total: 100 },
        { ...SAMPLE_QUOTE, _id: 'q2', number: '25-023', total: 250.5 },
        { ...SAMPLE_QUOTE, _id: 'q3', number: '25-123', total: 999 },
      ],
    };
    const blocks = toolEventToBlocks(makeEvent('quote.search', data));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: 'widget',
      widgetType: 'quote_list',
    });
    expect(blocks[0].data.results).toHaveLength(3);
    expect(blocks[0].data.results[0]).toMatchObject({
      quoteId: 'q1',
      quoteNumber: '25-001',
      client: 'Acme Trading',
      currency: 'USD',
      status: 'draft',
      total: 100,
    });
    // Critical: no `file` block — list view does NOT auto-render PDFs
    expect(blocks.some((b) => b.type === 'file')).toBe(false);
  });

  test('found:false → []', () => {
    const blocks = toolEventToBlocks(
      makeEvent('quote.search', { found: false, message: 'No matching quote' })
    );
    expect(blocks).toEqual([]);
  });

  test('found:true but empty results → []', () => {
    const blocks = toolEventToBlocks(makeEvent('quote.search', { found: true, results: [] }));
    expect(blocks).toEqual([]);
  });

  test('malformed envelope (results not array) → [] without throwing', () => {
    expect(() =>
      toolEventToBlocks(makeEvent('quote.search', { found: true, results: 'oops' }))
    ).not.toThrow();
    const blocks = toolEventToBlocks(makeEvent('quote.search', { found: true, results: 'oops' }));
    expect(blocks).toEqual([]);
  });

  test('null data → []', () => {
    const blocks = toolEventToBlocks(makeEvent('quote.search', null));
    expect(blocks).toEqual([]);
  });

  test('client unpopulated (no .name) falls back to "-"', () => {
    const data = {
      found: true,
      results: [{ ...SAMPLE_QUOTE, client: 'cli1' }], // raw ObjectId, no autopopulate
    };
    const blocks = toolEventToBlocks(makeEvent('quote.search', data));
    expect(blocks[0].data.results[0].client).toBe('-');
  });
});

describe('toolEventsToBlocks — array dispatch', () => {
  test('mixed events: search + read → list widget + preview widget + pdf', () => {
    const events = [
      makeEvent('quote.search', { found: true, results: [SAMPLE_QUOTE] }),
      makeEvent('quote.read', SAMPLE_QUOTE),
    ];
    const blocks = toolEventsToBlocks(events);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].widgetType).toBe('quote_list');
    expect(blocks[1].widgetType).toBe('quote_preview');
    expect(blocks[2].type).toBe('file');
  });

  test('non-array input → []', () => {
    expect(toolEventsToBlocks(null)).toEqual([]);
    expect(toolEventsToBlocks('nope')).toEqual([]);
  });
});

describe('toolEventsToBlocks — dedupe within one assistant turn', () => {
  test('read then update on SAME quote_id → keep only the latest preview + pdf (update wins)', () => {
    const before = { ...SAMPLE_QUOTE, total: 100 };
    const after = { ...SAMPLE_QUOTE, total: 250 };
    const blocks = toolEventsToBlocks([
      makeEvent('quote.read', before),
      makeEvent('quote.update', after),
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].widgetType).toBe('quote_preview');
    expect(blocks[0].data.total).toBe(250);
    expect(blocks[1].type).toBe('file');
  });

  test('two quote.search calls in same turn → keep the latest list only', () => {
    const blocks = toolEventsToBlocks([
      makeEvent('quote.search', { found: true, results: [{ ...SAMPLE_QUOTE, _id: 'q1' }] }),
      makeEvent('quote.search', {
        found: true,
        results: [
          { ...SAMPLE_QUOTE, _id: 'q2' },
          { ...SAMPLE_QUOTE, _id: 'q3' },
        ],
      }),
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].widgetType).toBe('quote_list');
    expect(blocks[0].data.results.map((r) => r.quoteId)).toEqual(['q2', 'q3']);
  });

  test('different quote_ids in same turn → BOTH preserved (intentional, not dedupe target)', () => {
    const blocks = toolEventsToBlocks([
      makeEvent('quote.update', { ...SAMPLE_QUOTE, _id: 'qA', number: 'Q-A' }),
      makeEvent('quote.create', { ...SAMPLE_QUOTE, _id: 'qB', number: 'Q-B' }),
    ]);
    expect(blocks.filter((b) => b.type === 'widget')).toHaveLength(2);
    expect(blocks.filter((b) => b.type === 'file')).toHaveLength(2);
  });

  test('search → read same quote → list survives + preview wins (different widgetType)', () => {
    const blocks = toolEventsToBlocks([
      makeEvent('quote.search', { found: true, results: [SAMPLE_QUOTE] }),
      makeEvent('quote.read', SAMPLE_QUOTE),
      makeEvent('quote.read', SAMPLE_QUOTE),  // duplicate read
    ]);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].widgetType).toBe('quote_list');
    expect(blocks[1].widgetType).toBe('quote_preview');
    expect(blocks[2].type).toBe('file');
  });
});
