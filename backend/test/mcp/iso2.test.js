/**
 * ISO2 (issue #185) — controllerAdapter buildReq picks up acting-as admin
 * from AsyncLocalStorage context when input.admin is omitted.
 *
 * Three-tier resolution priority:
 *   1. input.admin (explicit override — legacy path)
 *   2. context.actingAdmin (server.js per-request injection)
 *   3. null (controller will likely 401/500; ISO3 surfaces this as PERMISSION)
 */

const path = require('path');
const mongoose = require('mongoose');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

const { buildReq } = require(path.join(BACKEND_ROOT, 'src/mcp/adapters/controllerAdapter'));
const { runWithContext } = require(path.join(BACKEND_ROOT, 'src/mcp/context'));

describe('buildReq — admin resolution priority', () => {
  test('outside any context returns admin: null (no scope)', () => {
    const req = buildReq({});
    expect(req.admin).toBeNull();
  });

  test('explicit input.admin wins over context', async () => {
    const explicit = { _id: new mongoose.Types.ObjectId(), email: 'explicit@example.com' };
    const ctxAdmin = { _id: new mongoose.Types.ObjectId(), email: 'ctx@example.com' };

    const req = await runWithContext(
      { actingAdmin: ctxAdmin, isSystemFallback: false },
      async () => buildReq({ admin: explicit }),
    );

    expect(req.admin.email).toBe('explicit@example.com');
  });

  test('omitted input.admin falls back to context', async () => {
    const ctxAdmin = { _id: new mongoose.Types.ObjectId(), email: 'ctx@example.com' };

    const req = await runWithContext(
      { actingAdmin: ctxAdmin, isSystemFallback: false },
      async () => buildReq({ body: { name: 'foo' } }),
    );

    expect(req.admin.email).toBe('ctx@example.com');
    expect(req.body).toEqual({ name: 'foo' });
  });

  test('context.actingAdmin null (system fallback) propagates as null', async () => {
    const req = await runWithContext(
      { actingAdmin: null, isSystemFallback: true },
      async () => buildReq({}),
    );
    expect(req.admin).toBeNull();
  });

  test('input.admin null does NOT override context (only undefined/null skipped)', async () => {
    // Subtle behavior: input.admin === null is treated as "not provided"
    // because the legacy contract was `input.admin || null` — passing null
    // explicitly is indistinguishable from passing nothing. ISO3 tools should
    // not pass null deliberately.
    const ctxAdmin = { _id: new mongoose.Types.ObjectId(), email: 'ctx@example.com' };

    const req = await runWithContext(
      { actingAdmin: ctxAdmin, isSystemFallback: false },
      async () => buildReq({ admin: null }),
    );
    expect(req.admin.email).toBe('ctx@example.com');
  });

  test('builds full req shape with body/params/query/headers', () => {
    const req = buildReq({
      body: { a: 1 },
      params: { id: 'abc' },
      query: { q: 'foo' },
      headers: { 'x-test': '1' },
    });
    expect(req.body).toEqual({ a: 1 });
    expect(req.params).toEqual({ id: 'abc' });
    expect(req.query).toEqual({ q: 'foo' });
    expect(req.headers).toEqual({ 'x-test': '1' });
    expect(req.method).toBe('POST');
    expect(req.originalUrl).toBe('/mcp/internal');
  });
});
