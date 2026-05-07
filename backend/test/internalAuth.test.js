/**
 * Tests for internalAuth middleware (Ola issue #220 D1).
 *
 * Covers:
 *   1. Module load throws when INTERNAL_DASHBOARD_EMAILS is missing
 *   2. Module load throws when env exists but parses to empty (whitespace/commas only)
 *   3. Middleware returns 401 when req.admin is missing (auth chain prerequisite)
 *   4. Middleware returns 403 when admin email is not in allowlist
 *   5. Middleware calls next() when admin email is in allowlist (case-insensitive)
 *
 * Each test uses jest.isolateModules + manual env juggling to re-evaluate the
 * module's top-level allowSet from a clean state.
 */

const ENV_KEY = 'INTERNAL_DASHBOARD_EMAILS';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function loadFresh() {
  let mod;
  jest.isolateModules(() => {
    mod = require('@/middlewares/internalAuth');
  });
  return mod;
}

describe('internalAuth middleware', () => {
  const originalEnv = process.env[ENV_KEY];

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalEnv;
    }
  });

  test('throws when INTERNAL_DASHBOARD_EMAILS env is missing', () => {
    delete process.env[ENV_KEY];
    expect(loadFresh).toThrow(/INTERNAL_DASHBOARD_EMAILS not configured/);
  });

  test('throws when INTERNAL_DASHBOARD_EMAILS parses to empty after trim', () => {
    process.env[ENV_KEY] = ' , ,  ,';
    expect(loadFresh).toThrow(/INTERNAL_DASHBOARD_EMAILS not configured/);
  });

  test('returns 401 when req.admin is missing', () => {
    process.env[ENV_KEY] = 'a@x.com,b@x.com';
    const internalAuth = loadFresh();
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    internalAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      result: null,
      message: 'Authentication required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when admin email is not in allowlist', () => {
    process.env[ENV_KEY] = 'a@x.com,b@x.com';
    const internalAuth = loadFresh();
    const req = { admin: { email: 'evil@x.com' } };
    const res = mockRes();
    const next = jest.fn();

    internalAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      result: null,
      message: 'Internal access denied',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() when admin email matches allowlist (case-insensitive)', () => {
    process.env[ENV_KEY] = 'A@X.COM, b@x.com ';
    const internalAuth = loadFresh();
    const req = { admin: { email: 'a@x.com' } };
    const res = mockRes();
    const next = jest.fn();

    internalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
