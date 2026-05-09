/**
 * Tests for the User Activity panel + trackActivity middleware
 * (Ola CRM issue #220 D5).
 *
 * Two parts:
 *   A. trackActivity middleware — the throttle-and-stamp logic that backs
 *      the "Active sessions" metric. Must (1) write Admin.lastActivity at
 *      most once per 60s per admin, (2) skip silently when req.admin is
 *      missing, (3) call next() on every request regardless of write
 *      decision.
 *   B. getUserActivity endpoint — Joi validation, dual-source aggregation
 *      (Admin.lastActivity AND LlmUsage.distinct userId), and shape
 *      contract matching what the panel renders.
 *
 * Pattern mirrors backend/test/internal-dashboard/llmUsage.test.js.
 */

const path = require('path');
const { globSync } = require('glob');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

let mongo;
let trackActivity;
let getUserActivity;
let Admin;
let LlmUsage;

beforeAll(async () => {
  globSync('src/models/**/*.js', { cwd: BACKEND_ROOT }).forEach((f) =>
    require(path.join(BACKEND_ROOT, f))
  );

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  trackActivity = require(path.join(BACKEND_ROOT, 'src/middlewares/trackActivity'));
  getUserActivity = require(
    path.join(BACKEND_ROOT, 'src/controllers/internalDashboardController/userActivity')
  );
  Admin = mongoose.model('Admin');
  LlmUsage = mongoose.model('LlmUsage');
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await Admin.deleteMany({});
  await LlmUsage.deleteMany({});
  trackActivity._resetThrottle();
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

function makeUsageRow(userId, overrides = {}) {
  return {
    userId,
    sessionId: new mongoose.Types.ObjectId(),
    nanobotSessionId: 'user:test:conv:' + userId,
    requestId: 'req-' + Math.random().toString(36).slice(2),
    channel: 'ask-ola',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    inputTokens: 100, outputTokens: 50, totalTokens: 150,
    cachedTokens: 0, iterations: 1,
    costUsd: 0.0001, pricingVersion: 'test-1',
    latencyMs: 500, errored: false,
    created: new Date(),
    ...overrides,
  };
}

// ===========================================================================
// A. trackActivity middleware
// ===========================================================================

describe('trackActivity middleware (D5)', () => {
  test('does nothing and calls next() when req.admin is missing', () => {
    const next = jest.fn();
    trackActivity({}, stubRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('writes Admin.lastActivity at most once per 60s window for the same admin', async () => {
    const admin = await Admin.create({
      email: 'busy@x.com', name: 'Busy', enabled: true, removed: false,
    });

    const next = jest.fn();
    // Fire 10 sequential requests as the same admin within the throttle window.
    for (let i = 0; i < 10; i++) {
      trackActivity({ admin: { _id: admin._id } }, stubRes(), next);
    }
    // Let the fire-and-forget findByIdAndUpdate flush.
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setTimeout(r, 50));

    expect(next).toHaveBeenCalledTimes(10);
    const after = await Admin.findById(admin._id);
    expect(after.lastActivity).toBeInstanceOf(Date);

    // Confirm only one write actually flowed by checking that resetting the
    // throttle and writing again moves the timestamp.
    const stampAfterFirstBatch = after.lastActivity.getTime();
    await new Promise((r) => setTimeout(r, 5));
    trackActivity._resetThrottle();
    trackActivity({ admin: { _id: admin._id } }, stubRes(), next);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setTimeout(r, 50));

    const refreshed = await Admin.findById(admin._id);
    expect(refreshed.lastActivity.getTime()).toBeGreaterThan(stampAfterFirstBatch);
  });

  test('different admins are throttled independently', async () => {
    const a1 = await Admin.create({ email: 'a@x.com', name: 'A', enabled: true });
    const a2 = await Admin.create({ email: 'b@x.com', name: 'B', enabled: true });

    const next = jest.fn();
    trackActivity({ admin: { _id: a1._id } }, stubRes(), next);
    trackActivity({ admin: { _id: a2._id } }, stubRes(), next);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setTimeout(r, 50));

    const after1 = await Admin.findById(a1._id);
    const after2 = await Admin.findById(a2._id);
    expect(after1.lastActivity).toBeInstanceOf(Date);
    expect(after2.lastActivity).toBeInstanceOf(Date);
  });
});

// ===========================================================================
// B. getUserActivity endpoint
// ===========================================================================

describe('getUserActivity endpoint (D5)', () => {
  test('Joi rejects bad windowMinutes with 400', async () => {
    const res = stubRes();
    await getUserActivity({ query: { windowMinutes: 'forever' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.success).toBe(false);
  });

  test('empty DB returns zero counts and empty lists', async () => {
    const res = stubRes();
    await getUserActivity({ query: {} }, res);
    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.result.activeSessionsLast).toBe(0);
    expect(res._body.result.aiActiveUsersLast).toBe(0);
    expect(res._body.result.sessions).toEqual([]);
    expect(res._body.result.aiUsers).toEqual([]);
    expect(res._body.result.windowMinutes).toBe(15);
  });

  test('counts both signals: lastActivity-recent admins AND LlmUsage-recent userIds', async () => {
    const now = Date.now();
    const inWindow = new Date(now - 5 * 60 * 1000);   // 5 min ago, in 15min window
    const outWindow = new Date(now - 30 * 60 * 1000); // 30 min ago, out

    // 2 active sessions: in-window lastActivity
    const sessionUser1 = await Admin.create({
      email: 'session1@x.com', name: 'Session1', enabled: true, removed: false,
      lastActivity: inWindow,
    });
    const sessionUser2 = await Admin.create({
      email: 'session2@x.com', name: 'Session2', enabled: true, removed: false,
      lastActivity: inWindow,
    });
    // 1 stale (out of window)
    await Admin.create({
      email: 'stale@x.com', name: 'Stale', enabled: true, removed: false,
      lastActivity: outWindow,
    });
    // 1 disabled (must be excluded even if recent)
    await Admin.create({
      email: 'disabled@x.com', name: 'Disabled', enabled: false, removed: false,
      lastActivity: inWindow,
    });
    // 1 removed (must be excluded)
    await Admin.create({
      email: 'removed@x.com', name: 'Removed', enabled: true, removed: true,
      lastActivity: inWindow,
    });

    // 1 AI-active user — exists in Admin, NOT in active-sessions set
    const aiOnlyUser = await Admin.create({
      email: 'aionly@x.com', name: 'AiOnly', enabled: true, removed: false,
      lastActivity: outWindow,
    });
    // 1 user is BOTH session-active and AI-active
    await LlmUsage.create([
      makeUsageRow(aiOnlyUser._id, { created: new Date(now - 2 * 60 * 1000) }),
      makeUsageRow(sessionUser1._id, { created: new Date(now - 1 * 60 * 1000) }),
      // Stale LlmUsage row outside window — must be excluded
      makeUsageRow(sessionUser2._id, { created: outWindow }),
    ]);

    const res = stubRes();
    await getUserActivity({ query: { windowMinutes: 15 } }, res);
    expect(res._status).toBe(200);

    const r = res._body.result;
    // 2 active sessions (sessionUser1 + sessionUser2; stale/disabled/removed excluded)
    expect(r.activeSessionsLast).toBe(2);
    // 2 distinct AI users in window (aiOnlyUser + sessionUser1; sessionUser2's LlmUsage is stale)
    expect(r.aiActiveUsersLast).toBe(2);

    const sessionEmails = r.sessions.map((s) => s.email).sort();
    expect(sessionEmails).toEqual(['session1@x.com', 'session2@x.com']);

    const aiEmails = r.aiUsers.map((u) => u.email).sort();
    expect(aiEmails).toEqual(['aionly@x.com', 'session1@x.com']);
  });
});
