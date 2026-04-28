/**
 * Tests for sseAwareCompressionFilter (Issue #131 follow-up).
 *
 * The bug this prevents: express compression() middleware was buffering
 * SSE responses entirely until res.end(), which defeated the real-time
 * streaming /api/ola/chat depends on. A passing browser smoke would
 * SILENTLY break if anyone re-applied plain compression() globally; this
 * test makes that regression loud.
 */

const path = require('path');
const compression = require('compression');
const express = require('express');
const request = require('supertest');

const { sseAwareCompressionFilter } = require(
  path.join(__dirname, '..', 'src/utils/sseCompression')
);

function buildApp() {
  const app = express();
  app.use(compression({ filter: sseAwareCompressionFilter }));
  app.get('/sse', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();
    res.write('event: tick\ndata: {"i":1}\n\n');
    res.write('event: tick\ndata: {"i":2}\n\n');
    res.end();
  });
  app.get('/json', (req, res) => {
    // Large enough that compression()'s default size threshold engages.
    res.json({ data: 'x'.repeat(2000) });
  });
  app.get('/sse-charset', (req, res) => {
    // Some clients/middleware tack on charset — make sure substring match wins.
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.flushHeaders();
    res.write('event: tick\ndata: {}\n\n');
    res.end();
  });
  return app;
}

describe('sseAwareCompressionFilter', () => {
  test('SSE response is NOT compressed (preserves real-time streaming)', async () => {
    const res = await request(buildApp())
      .get('/sse')
      .set('Accept-Encoding', 'gzip');
    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    // Frames present and intact (would be unreadable if gzipped accidentally).
    expect(res.text).toContain('event: tick');
    expect(res.text).toContain('"i":1');
    expect(res.text).toContain('"i":2');
  });

  test('SSE with charset suffix is also NOT compressed (substring match)', async () => {
    const res = await request(buildApp())
      .get('/sse-charset')
      .set('Accept-Encoding', 'gzip');
    expect(res.headers['content-encoding']).toBeUndefined();
  });

  test('Regular JSON response IS compressed (default behavior preserved)', async () => {
    const res = await request(buildApp())
      .get('/json')
      .set('Accept-Encoding', 'gzip');
    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
  });

  test('filter returns false for SSE Content-Type', () => {
    const fakeRes = { getHeader: (k) => (k === 'Content-Type' ? 'text/event-stream' : null) };
    expect(sseAwareCompressionFilter({}, fakeRes)).toBe(false);
  });

  test('filter returns false for SSE Content-Type with charset', () => {
    const fakeRes = { getHeader: () => 'text/event-stream; charset=utf-8' };
    expect(sseAwareCompressionFilter({}, fakeRes)).toBe(false);
  });

  test('filter delegates to compression default for non-SSE Content-Type', () => {
    // Default filter returns true when there's no Content-Type yet (compression
    // makes the call later) — we just verify ours doesn't short-circuit to false.
    const fakeReq = { headers: {} };
    const fakeRes = {
      getHeader: (k) => (k === 'Content-Type' ? 'application/json' : null),
    };
    // compression.filter signature: returns truthy for compressible, false otherwise.
    // Whatever it returns, we should match it (i.e. not false-by-our-rule).
    const expected = compression.filter(fakeReq, fakeRes);
    expect(sseAwareCompressionFilter(fakeReq, fakeRes)).toBe(expected);
  });
});
