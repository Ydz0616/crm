/**
 * Tests for the internal-dashboard LLM Usage endpoint (Ola CRM issue #220 D3).
 *
 * Covers:
 *   1. Joi validation — invalid `range` returns 400 with the parser message
 *   2. Empty collection — every range returns zero totals + empty arrays
 *   3. 7d window aggregation — totals + byProviderModel + byChannel + erroredCount
 *      math match a hand-seeded 12-row fixture
 *   4. Top users — sorted descending by totalTokens, limited to 10
 *   5. Time windowing — `today` excludes a 2-day-old row that `7d` includes,
 *      and `30d` includes a 25-day-old row that `7d` excludes (proves the
 *      window is actually applied; this is the bug class plan called out)
 *
 * Pattern mirrors backend/test/llmUsageController.test.js: mongodb-memory-server
 * + manual model autoload + direct controller invocation with stub res. No
 * HTTP layer needed — the gate / catchErrors wrapping is covered separately
 * by backend/test/internalAuth.test.js (D1 unit) and the integration shell
 * script (D1 integration).
 */

const path = require('path');
const { globSync } = require('glob');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

let mongo;
let getLlmUsage;
let LlmUsage;
let Admin;

beforeAll(async () => {
  globSync('src/models/**/*.js', { cwd: BACKEND_ROOT }).forEach((f) =>
    require(path.join(BACKEND_ROOT, f))
  );

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  getLlmUsage = require(
    path.join(BACKEND_ROOT, 'src/controllers/internalDashboardController/llmUsage')
  );
  LlmUsage = mongoose.model('LlmUsage');
  Admin = mongoose.model('Admin');
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await LlmUsage.deleteMany({});
  await Admin.deleteMany({});
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

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Builds a syntactically valid LlmUsage row (all `required` fields). Only the
// fields the test cares about need overrides; the rest get harmless defaults.
function makeRow(overrides = {}) {
  const userId = overrides.userId || new mongoose.Types.ObjectId();
  return {
    userId,
    sessionId: new mongoose.Types.ObjectId(),
    nanobotSessionId: 'user:test:conv:' + userId,
    requestId: 'req-' + Math.random().toString(36).slice(2),
    channel: 'ask-ola',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    cachedTokens: 0,
    iterations: 1,
    costUsd: 0.0001,
    pricingVersion: 'test-1',
    latencyMs: 500,
    errored: false,
    created: new Date(),
    ...overrides,
  };
}

describe('getLlmUsage — internal dashboard panel D3', () => {
  test('Joi rejects invalid range with 400', async () => {
    const res = stubRes();
    await getLlmUsage({ query: { range: 'foo' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.success).toBe(false);
    expect(res._body.result).toBeNull();
    expect(res._body.message).toMatch(/range/);
  });

  test('empty collection returns zero totals and empty arrays', async () => {
    const res = stubRes();
    await getLlmUsage({ query: { range: 'today' } }, res);
    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.result.range).toBe('today');
    expect(res._body.result.totals).toEqual({
      records: 0, input: 0, output: 0, cached: 0, total: 0, costUsd: 0,
    });
    expect(res._body.result.byProviderModel).toEqual([]);
    expect(res._body.result.topUsers).toEqual([]);
    expect(res._body.result.erroredCount).toBe(0);
    expect(res._body.result.byChannel).toEqual([]);
  });

  test('7d window aggregates totals + byProviderModel + byChannel + errored', async () => {
    const u1 = new mongoose.Types.ObjectId();
    const u2 = new mongoose.Types.ObjectId();
    const now = Date.now();
    await LlmUsage.create([
      // 6 in-window gemini ask-ola
      ...Array.from({ length: 6 }, (_, i) =>
        makeRow({
          userId: u1,
          channel: 'ask-ola',
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cachedTokens: 10,
          costUsd: 0.0001,
          created: new Date(now - i * HOUR_MS),
        })
      ),
      // 4 in-window openai email — different provider+model+channel bucket
      ...Array.from({ length: 4 }, (_, i) =>
        makeRow({
          userId: u2,
          channel: 'email',
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 200,
          outputTokens: 100,
          totalTokens: 300,
          cachedTokens: 0,
          costUsd: 0.001,
          created: new Date(now - (i + 1) * HOUR_MS),
        })
      ),
      // 2 errored in-window
      makeRow({
        userId: u1, errored: true, totalTokens: 999, costUsd: 0,
        created: new Date(now - 2 * HOUR_MS),
      }),
      makeRow({
        userId: u2, errored: true, totalTokens: 999, costUsd: 0,
        created: new Date(now - 3 * HOUR_MS),
      }),
    ]);

    const res = stubRes();
    await getLlmUsage({ query: { range: '7d' } }, res);

    expect(res._status).toBe(200);
    const r = res._body.result;
    expect(r.totals.records).toBe(12);
    // 6*150 + 4*300 + 2*999
    expect(r.totals.total).toBe(6 * 150 + 4 * 300 + 2 * 999);
    // 6*100 + 4*200 + 2*100 (errored rows kept default 100 input)
    expect(r.totals.input).toBe(6 * 100 + 4 * 200 + 2 * 100);
    expect(r.totals.cached).toBe(6 * 10);
    // costUsd: 6*0.0001 + 4*0.001 + 2*0 — float compare with tolerance
    expect(r.totals.costUsd).toBeCloseTo(6 * 0.0001 + 4 * 0.001, 6);

    expect(r.erroredCount).toBe(2);

    // 3 distinct provider/model buckets: gemini/flash, openai/gpt-4o, gemini/flash (errored uses default model)
    const buckets = new Set(r.byProviderModel.map((b) => `${b.provider}/${b.model}`));
    expect(buckets.has('gemini/gemini-2.0-flash')).toBe(true);
    expect(buckets.has('openai/gpt-4o')).toBe(true);

    // byChannel covers ask-ola + email
    const channels = new Set(r.byChannel.map((c) => c.channel));
    expect(channels.has('ask-ola')).toBe(true);
    expect(channels.has('email')).toBe(true);
  });

  test('topUsers sorted by totalTokens desc, limit 10', async () => {
    const userIds = Array.from({ length: 12 }, () => new mongoose.Types.ObjectId());
    // Each user gets `tokensFor(i)` totalTokens — staircase so order is obvious.
    const tokensFor = (i) => (12 - i) * 100;
    await LlmUsage.create(
      userIds.map((userId, i) =>
        makeRow({ userId, totalTokens: tokensFor(i) })
      )
    );
    // Seed admins for the top three so the populate path is exercised too.
    await Admin.create([
      { _id: userIds[0], email: 'top@x.com', name: 'Top', surname: 'User', enabled: true, removed: false },
      { _id: userIds[1], email: 'second@x.com', name: 'Second', surname: 'User', enabled: true, removed: false },
    ]);

    const res = stubRes();
    await getLlmUsage({ query: { range: '7d' } }, res);
    expect(res._status).toBe(200);

    const top = res._body.result.topUsers;
    expect(top.length).toBe(10);
    // Descending check
    for (let i = 0; i < top.length - 1; i++) {
      expect(top[i].totalTokens).toBeGreaterThanOrEqual(top[i + 1].totalTokens);
    }
    // Populate path: top user has email, missing-admin user has '(unknown)'
    expect(top[0].email).toBe('top@x.com');
    expect(top[0].name).toBe('Top User');
    // The 3rd entry's user has no Admin row — name should fall back
    expect(top[2].email).toBeNull();
    expect(top[2].name).toBe('(unknown)');
  });

  test('time window includes/excludes the right rows', async () => {
    const now = Date.now();
    await LlmUsage.create([
      makeRow({ created: new Date(now - 2 * DAY_MS), totalTokens: 1 }),    // in 7d, in 30d, NOT in today
      makeRow({ created: new Date(now - 25 * DAY_MS), totalTokens: 10 }),  // in 30d only
      makeRow({ created: new Date(now - 90 * DAY_MS), totalTokens: 100 }), // out of every window
    ]);

    const todayRes = stubRes();
    await getLlmUsage({ query: { range: 'today' } }, todayRes);
    expect(todayRes._body.result.totals.records).toBe(0);

    const sevenRes = stubRes();
    await getLlmUsage({ query: { range: '7d' } }, sevenRes);
    expect(sevenRes._body.result.totals.records).toBe(1);
    expect(sevenRes._body.result.totals.total).toBe(1);

    const thirtyRes = stubRes();
    await getLlmUsage({ query: { range: '30d' } }, thirtyRes);
    expect(thirtyRes._body.result.totals.records).toBe(2);
    expect(thirtyRes._body.result.totals.total).toBe(11); // 1 + 10
  });
});
