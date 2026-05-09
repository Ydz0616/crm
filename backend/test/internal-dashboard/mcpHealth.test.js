/**
 * Tests for the MCP Health probe (Ola CRM issue #220 D6).
 *
 * Covers:
 *   1. probeService — healthy 200 + JSON body → ok:true with latencyMs
 *      and the body merged in
 *   2. probeService — non-JSON 200 → still ok:true (best-effort json
 *      parse must not poison the result)
 *   3. probeService — HTTP 4xx/5xx → ok:false with `HTTP <status>` error
 *   4. probeService — connection refused (network throw) → ok:false with
 *      the err.code / err.cause.code surfaced
 *   5. probeService — abort signal fires after FETCH_TIMEOUT_MS → ok:false
 *      with a `timeout after Nms` error string (not just a generic abort)
 *   6. getMcpHealth controller — Promise.all wraps the three SERVICES,
 *      shape is `{ success:true, result:{ mcp, nanobotServe, nanobotGateway } }`
 *      where each entry has `name`, `url`, `ok`, `latencyMs`
 *
 * No mongo dependencies — these are pure HTTP probe tests, the global
 * fetch is mocked.
 */

const path = require('path');

const MODULE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'src',
  'controllers',
  'internalDashboardController',
  'mcpHealth'
);

let getMcpHealth;
let probeService;
let SERVICES;
let FETCH_TIMEOUT_MS;

beforeAll(() => {
  const mod = require(MODULE_PATH);
  getMcpHealth = mod;
  probeService = mod.probeService;
  SERVICES = mod.SERVICES;
  FETCH_TIMEOUT_MS = mod.FETCH_TIMEOUT_MS;
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

function fakeService() {
  return { key: 't', name: 'Test', url: 'http://test/health' };
}

describe('probeService (D6 unit)', () => {
  test('returns ok:true + latencyMs + body for a healthy 200 JSON response', async () => {
    const fetchImpl = jest.fn(async () => ({
      status: 200,
      json: async () => ({ ok: true, version: '1.2.3' }),
    }));

    const r = await probeService(fakeService(), fetchImpl);
    expect(r.ok).toBe(true);
    expect(r.name).toBe('Test');
    expect(r.url).toBe('http://test/health');
    expect(typeof r.latencyMs).toBe('number');
    expect(r.body).toEqual({ ok: true, version: '1.2.3' });
    expect(r.error).toBeUndefined();
  });

  test('returns ok:true even when response body is not valid JSON', async () => {
    const fetchImpl = jest.fn(async () => ({
      status: 200,
      json: async () => { throw new Error('not json'); },
    }));

    const r = await probeService(fakeService(), fetchImpl);
    expect(r.ok).toBe(true);
    expect(r.body).toBeUndefined();
  });

  test('HTTP 4xx/5xx returns ok:false with HTTP <status> error', async () => {
    const fetchImpl = jest.fn(async () => ({
      status: 503,
      json: async () => ({}),
    }));

    const r = await probeService(fakeService(), fetchImpl);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('HTTP 503');
    expect(typeof r.latencyMs).toBe('number');
  });

  test('connection refused surfaces err.code', async () => {
    const fetchImpl = jest.fn(async () => {
      const err = new Error('connect ECONNREFUSED 127.0.0.1:9999');
      err.code = 'ECONNREFUSED';
      throw err;
    });

    const r = await probeService(fakeService(), fetchImpl);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('ECONNREFUSED');
  });

  test('connection refused via err.cause.code (Node 20 fetch shape)', async () => {
    const fetchImpl = jest.fn(async () => {
      const err = new Error('fetch failed');
      err.cause = { code: 'ECONNREFUSED' };
      throw err;
    });

    const r = await probeService(fakeService(), fetchImpl);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('ECONNREFUSED');
  });

  test('AbortError gives a friendly timeout message', async () => {
    // probeService wires the controller's signal into fetchImpl. We simulate
    // a timeout by waiting longer than FETCH_TIMEOUT_MS — the real abort
    // will fire and propagate as AbortError.
    const fetchImpl = (url, opts) =>
      new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });

    const r = await probeService(fakeService(), fetchImpl);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/timeout/);
  // FETCH_TIMEOUT_MS is the cap; allow scheduling slop on top.
  }, FETCH_TIMEOUT_MS + 5000);
});

describe('getMcpHealth controller (D6 endpoint)', () => {
  test('returns 200 + the three documented service keys, regardless of probe outcome', async () => {
    // Stub global fetch to make every probe fail with ECONNREFUSED. The
    // panel exists exactly so this case still returns HTTP 200.
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => {
      const err = new Error('connect ECONNREFUSED');
      err.code = 'ECONNREFUSED';
      throw err;
    });

    const res = stubRes();
    try {
      await getMcpHealth({}, res);
    } finally {
      global.fetch = originalFetch;
    }

    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.result.mcp).toBeDefined();
    expect(res._body.result.nanobotServe).toBeDefined();
    expect(res._body.result.nanobotGateway).toBeDefined();
    for (const svc of [res._body.result.mcp, res._body.result.nanobotServe, res._body.result.nanobotGateway]) {
      expect(svc.ok).toBe(false);
      expect(svc.error).toBe('ECONNREFUSED');
      expect(typeof svc.latencyMs).toBe('number');
      expect(svc.url).toMatch(/^http:\/\/127\.0\.0\.1:/);
    }
  });

  test('SERVICES list is the documented loopback set', () => {
    expect(SERVICES.map((s) => s.key)).toEqual([
      'mcp', 'nanobotServe', 'nanobotGateway',
    ]);
    for (const svc of SERVICES) {
      expect(svc.url).toMatch(/^http:\/\/127\.0\.0\.1:(8889|8900|8901)\/health$/);
    }
  });
});
