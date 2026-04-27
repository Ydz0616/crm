// Tests for thinkingLabels.js — friendly label dictionary for Ask Ola
// thinking panel (Issue #131, backlog L2).
//
// No DB / express needed — pure dictionary + helper logic.

const {
  TOOL_LABELS,
  SKIP_TOOLS,
  STAGE_LABELS,
  MCP_PREFIX,
  rawToolName,
  labelFor,
} = require('@/controllers/appControllers/olaController/thinkingLabels');

describe('thinkingLabels — TOOL_LABELS dictionary', () => {
  test('covers all 12 v1 user-facing MCP tools', () => {
    const expected = [
      'customer.search', 'customer.read', 'customer.create', 'customer.update',
      'merch.search', 'merch.read', 'merch.create', 'merch.update',
      'quote.search', 'quote.read', 'quote.create', 'quote.update',
    ];
    expect(Object.keys(TOOL_LABELS).sort()).toEqual(expected.sort());
  });

  test('does NOT include health.ping (it is in SKIP_TOOLS)', () => {
    expect(TOOL_LABELS).not.toHaveProperty('health.ping');
    expect(SKIP_TOOLS.has('health.ping')).toBe(true);
  });

  test('every value is a non-empty string ending with ellipsis-style "..."', () => {
    for (const [key, value] of Object.entries(TOOL_LABELS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      expect(value).toMatch(/\.\.\.$/);  // visual signal of in-progress
    }
  });
});

describe('thinkingLabels — STAGE_LABELS', () => {
  test('has __init__, __compose__, __unknown__ (all carry Ola subject)', () => {
    expect(STAGE_LABELS.__init__).toBe('Ola is thinking...');
    expect(STAGE_LABELS.__compose__).toBe('Ola is composing the reply...');
    expect(STAGE_LABELS.__unknown__).toBe('Ola is working on it...');
  });
});

describe('thinkingLabels — rawToolName()', () => {
  test('strips mcp_ola_crm_ prefix when present', () => {
    expect(rawToolName('mcp_ola_crm_merch.search')).toBe('merch.search');
    expect(rawToolName('mcp_ola_crm_quote.create')).toBe('quote.create');
  });

  test('returns input unchanged when prefix absent', () => {
    expect(rawToolName('merch.search')).toBe('merch.search');
    expect(rawToolName('something.else')).toBe('something.else');
  });

  test('returns empty string for non-string input', () => {
    expect(rawToolName(null)).toBe('');
    expect(rawToolName(undefined)).toBe('');
    expect(rawToolName(42)).toBe('');
    expect(rawToolName({})).toBe('');
  });
});

describe('thinkingLabels — labelFor()', () => {
  test('resolves a known raw tool name (with Ola subject)', () => {
    expect(labelFor('merch.search')).toBe('Ola is searching your products...');
    expect(labelFor('quote.create')).toBe('Ola is drafting your quote...');
  });

  test('resolves a prefixed tool name (mcp_ola_crm_*)', () => {
    expect(labelFor('mcp_ola_crm_customer.search')).toBe('Ola is searching customers...');
    expect(labelFor('mcp_ola_crm_merch.update')).toBe('Ola is updating product info...');
  });

  test('returns null for skip-list tools (caller should suppress)', () => {
    expect(labelFor('health.ping')).toBeNull();
    expect(labelFor('mcp_ola_crm_health.ping')).toBeNull();
  });

  test('falls back to __unknown__ for unregistered tools', () => {
    expect(labelFor('compute.profitMargin')).toBe('Ola is working on it...');
    expect(labelFor('mcp_ola_crm_factory.list')).toBe('Ola is working on it...');
    expect(labelFor('totally_made_up_tool')).toBe('Ola is working on it...');
  });

  test('falls back to __unknown__ for empty / non-string input', () => {
    expect(labelFor('')).toBe('Ola is working on it...');
    expect(labelFor(null)).toBe('Ola is working on it...');
    expect(labelFor(undefined)).toBe('Ola is working on it...');
  });
});

describe('thinkingLabels — MCP_PREFIX constant', () => {
  test('matches toolResultToBlocks.js convention exactly', () => {
    // toolResultToBlocks.js hardcodes MCP_SERVER_NAME = 'ola_crm';
    // both must agree or label resolution silently breaks for prefixed names.
    expect(MCP_PREFIX).toBe('mcp_ola_crm_');
  });
});
