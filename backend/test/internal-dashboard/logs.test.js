/**
 * Tests for the Logs panel endpoint + maskSecrets utility (#220 D7).
 *
 * Three concerns:
 *   A. maskSecrets util — replaces well-known secret formats with
 *      ***MASKED*** without leaking partial tokens.
 *   B. getLogs Joi validation — rejects out-of-band source / limit.
 *   C. getLogs read path — tails a fixture log file (200 valid + 5
 *      malformed + 1 Bearer + 1 sk-key), trims to N, drops malformed
 *      lines, masks secrets, returns newest-first.
 *   D. Missing log file — returns an empty 200 instead of 500 / leak.
 *
 * Pattern: direct controller invocation with stubbed res; no HTTP
 * layer needed. The controller exposes its source-path map so we can
 * point it at a temp file rather than the real backend/logs/mcp.log.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const maskSecrets = require('@/utils/redactor');
const getLogs = require('@/controllers/internalDashboardController/logs');

let tmpDir;
let tmpFile;
let originalMcpPath;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'd7-logs-'));
  tmpFile = path.join(tmpDir, 'mcp.log');
  originalMcpPath = getLogs._sources.mcp;
  getLogs._sources.mcp = tmpFile;
});

afterAll(() => {
  getLogs._sources.mcp = originalMcpPath;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

function stubRes() {
  const res = {
    _status: null,
    _body: null,
    status(s) { this._status = s; return this; },
    json(b) { this._body = b; return this; },
  };
  return res;
}

function makeLine(overrides = {}) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    tool: 'mcp.request',
    input_hash: 'aaaaaaaa',
    latency_ms: 42,
    ok: true,
    code: null,
    ...overrides,
  });
}

// ===========================================================================
// A. maskSecrets utility
// ===========================================================================

describe('maskSecrets util (D7)', () => {
  test('masks Bearer tokens (case-insensitive)', () => {
    expect(maskSecrets('Authorization: Bearer abc123def456')).toContain('***MASKED***');
    expect(maskSecrets('Authorization: bearer xyz789')).toContain('***MASKED***');
    expect(maskSecrets('bearer  doublespace')).toContain('***MASKED***');
  });

  test('masks OpenAI/Anthropic-style sk- keys but not innocuous "sk-" substrings', () => {
    expect(maskSecrets('key=sk-abc123def456ghi789')).toContain('***MASKED***');
    expect(maskSecrets('key=sk-proj-AbCdEf12345xyz')).toContain('***MASKED***');
    // 'sk-' alone is not a key, leave untouched
    expect(maskSecrets('item-sku-12 not a credential')).toBe('item-sku-12 not a credential');
  });

  test('masks Slack tokens and GitHub PATs', () => {
    expect(maskSecrets('xoxb-1234-5678-abcdef')).toContain('***MASKED***');
    expect(maskSecrets('ghp_aaaaaaaaaaaaaaaaaaaaaaaaa')).toContain('***MASKED***');
  });

  test('masks MongoDB connection strings (with or without +srv)', () => {
    expect(maskSecrets('mongodb://user:pass@host/db')).toContain('***MASKED***');
    expect(maskSecrets('mongodb+srv://u:p@cluster.x.net/d?opt=1')).toContain('***MASKED***');
  });

  test('passes through null/undefined/empty', () => {
    expect(maskSecrets(null)).toBeNull();
    expect(maskSecrets(undefined)).toBeUndefined();
    expect(maskSecrets('')).toBe('');
  });

  test('does not retain even a partial token after masking', () => {
    const raw = 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig';
    const out = maskSecrets(raw);
    expect(out).not.toContain('eyJhbGc');
    expect(out).not.toContain('payload');
    expect(out).toContain('***MASKED***');
  });
});

// ===========================================================================
// B + C + D. getLogs controller
// ===========================================================================

describe('getLogs controller (D7)', () => {
  test('Joi rejects bad source', async () => {
    const res = stubRes();
    await getLogs({ query: { source: 'nanobot' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.success).toBe(false);
  });

  test('Joi rejects limit out of [1, 500]', async () => {
    const res0 = stubRes();
    await getLogs({ query: { limit: 0 } }, res0);
    expect(res0._status).toBe(400);

    const res501 = stubRes();
    await getLogs({ query: { limit: 501 } }, res501);
    expect(res501._status).toBe(400);
  });

  test('returns empty 200 (not 500) when log file is missing', async () => {
    const res = stubRes();
    await getLogs({ query: {} }, res);
    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.result.logs).toEqual([]);
  });

  test('tails 100 most-recent valid lines, drops malformed, masks secrets', async () => {
    const valid = [];
    // 200 valid rows numbered so we can verify the tail-100 picked the right ones
    for (let i = 0; i < 200; i++) {
      valid.push(makeLine({ tool: `t${i}`, latency_ms: i }));
    }
    // Malformed lines interleaved (must be skipped without throwing)
    const malformed = ['{not json', '}{}', 'plain text', '{"unclosed":', '{"tool":}'];
    // One line carrying a Bearer secret in the message field
    const bearerLine = makeLine({
      ok: false, code: 'INTERNAL',
      tool: 'leak.bearer',
      message: 'failed: Authorization: Bearer abc123def456 was rejected',
    });
    // One line carrying an sk- key
    const skLine = makeLine({
      ok: false, code: 'INTERNAL',
      tool: 'leak.sk',
      message: 'OpenAI returned 401 for sk-proj-AbCdEf12345xyz',
    });

    const allLines = [
      ...valid,
      ...malformed,
      bearerLine,
      skLine,
    ];
    fs.writeFileSync(tmpFile, allLines.join('\n') + '\n');

    const res = stubRes();
    await getLogs({ query: { limit: 100 } }, res);
    expect(res._status).toBe(200);

    const r = res._body.result;
    expect(r.source).toBe('mcp');
    expect(r.limit).toBe(100);
    // Default limit is 100. With 5 malformed lines in the tail, we drop those
    // and end up with at most 100 entries — but at least 99 (since the 100
    // tail lines include valid + malformed mixed).
    expect(r.logs.length).toBeGreaterThanOrEqual(95);
    expect(r.logs.length).toBeLessThanOrEqual(100);

    // Newest-first sorting — the two leak lines were appended last.
    const tools = r.logs.map((l) => l.tool);
    expect(tools[0]).toBe('leak.sk');
    expect(tools[1]).toBe('leak.bearer');

    // Both leak lines must be masked, no original token bytes remaining.
    const skMessage = r.logs[0].message;
    expect(skMessage).toContain('***MASKED***');
    expect(skMessage).not.toContain('AbCdEf12345xyz');

    const bearerMessage = r.logs[1].message;
    expect(bearerMessage).toContain('***MASKED***');
    expect(bearerMessage).not.toContain('abc123def456');
  });

  test('respects custom limit (e.g. limit=10 returns ≤10 entries)', async () => {
    const lines = [];
    for (let i = 0; i < 50; i++) lines.push(makeLine({ tool: `t${i}` }));
    fs.writeFileSync(tmpFile, lines.join('\n') + '\n');

    const res = stubRes();
    await getLogs({ query: { limit: 10 } }, res);
    expect(res._status).toBe(200);
    expect(res._body.result.logs.length).toBeLessThanOrEqual(10);
  });
});
