// MCP / Nanobot health probe endpoint for the dev dashboard (#220 D6).
//
// Probes three local services in parallel: the MCP server (8889), nanobot
// serve (8900), nanobot gateway (8901). Each probe has a 1s timeout so a
// hung backend doesn't stall the whole response.
//
// The dashboard endpoint always returns HTTP 200 — individual service
// failures surface inside the result object so the UI can render a red
// status pill rather than a blanket error. This matches the operator
// expectation for a status-board view: we want to see WHICH service is
// down, not just "something is down".
//
// Service URLs are hard-coded loopback addresses. We do NOT accept a URL
// from the query string — that would be an SSRF foothold against an
// internal-only endpoint, which is a hard no even behind the email
// allowlist.

const FETCH_TIMEOUT_MS = 1000;

const SERVICES = [
  { key: 'mcp', name: 'MCP Server', url: 'http://127.0.0.1:8889/health' },
  { key: 'nanobotServe', name: 'Nanobot Serve', url: 'http://127.0.0.1:8900/health' },
  { key: 'nanobotGateway', name: 'Nanobot Gateway', url: 'http://127.0.0.1:8901/health' },
];

async function probeService(svc, fetchImpl = fetch) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetchImpl(svc.url, { signal: controller.signal });
    const latencyMs = Date.now() - startedAt;
    if (r.status >= 400) {
      return {
        name: svc.name, url: svc.url,
        ok: false, latencyMs,
        error: `HTTP ${r.status}`,
      };
    }
    // Best-effort read — services that don't return JSON still count as
    // "responding" and we surface the status code as proof of life.
    let body = null;
    try {
      body = await r.json();
    } catch (_) {
      body = null;
    }
    return {
      name: svc.name, url: svc.url,
      ok: true, latencyMs,
      ...(body && typeof body === 'object' ? { body } : {}),
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    // Distinguish AbortError (our timeout) from connection errors so the
    // operator can tell "service is slow" vs "service is down".
    let error;
    if (err.name === 'AbortError') {
      error = `timeout after ${FETCH_TIMEOUT_MS}ms`;
    } else if (err.cause && err.cause.code) {
      error = err.cause.code;
    } else if (err.code) {
      error = err.code;
    } else {
      error = err.message || 'unknown error';
    }
    return {
      name: svc.name, url: svc.url,
      ok: false, latencyMs,
      error,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function getMcpHealth(req, res) {
  const probes = await Promise.all(SERVICES.map((svc) => probeService(svc)));
  const result = {};
  for (let i = 0; i < SERVICES.length; i++) {
    result[SERVICES[i].key] = probes[i];
  }
  return res.status(200).json({
    success: true,
    result,
    message: 'MCP / Nanobot health probe',
  });
}

module.exports = getMcpHealth;
module.exports.probeService = probeService;
module.exports.SERVICES = SERVICES;
module.exports.FETCH_TIMEOUT_MS = FETCH_TIMEOUT_MS;
