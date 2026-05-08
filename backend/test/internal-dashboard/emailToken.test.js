/**
 * Tests for the internal-dashboard Email Token endpoint (Ola CRM issue #220 D4).
 *
 * Covers:
 *   1. Empty-state path — no rows with channel matching /^email/i in the
 *      window returns `{ empty:true, hint:'...' }` (intentionally short
 *      shape so the UI can render an Alert rather than a wall of zeroes)
 *   2. Populated path — rows with channel='email' and 'email-imap' in the
 *      window aggregate correctly + non-email channels are excluded
 *
 * Pattern mirrors backend/test/internal-dashboard/llmUsage.test.js: same
 * mongodb-memory-server fixture + direct controller invocation with stub res.
 */

const path = require('path');
const { globSync } = require('glob');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

let mongo;
let getEmailToken;
let LlmUsage;

beforeAll(async () => {
  globSync('src/models/**/*.js', { cwd: BACKEND_ROOT }).forEach((f) =>
    require(path.join(BACKEND_ROOT, f))
  );

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  getEmailToken = require(
    path.join(BACKEND_ROOT, 'src/controllers/internalDashboardController/emailToken')
  );
  LlmUsage = mongoose.model('LlmUsage');
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await LlmUsage.deleteMany({});
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

describe('getEmailToken — internal dashboard panel D4', () => {
  test('returns { empty:true, hint } when no email-channel rows in window', async () => {
    // Seed only non-email rows so the email channel filter excludes everything.
    await LlmUsage.create([
      makeRow({ channel: 'ask-ola' }),
      makeRow({ channel: 'ask-ola-autotitle' }),
      makeRow({ channel: 'whatsapp' }),
    ]);

    const res = stubRes();
    await getEmailToken({ query: { range: '7d' } }, res);

    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.result.empty).toBe(true);
    expect(res._body.result.hint).toMatch(/email/i);
    expect(res._body.result.range).toBe('7d');
    // Empty-state response intentionally omits totals/topUsers/etc — the UI
    // branches on `empty:true` to render an Alert and skip the cards/tables.
    expect(res._body.result.totals).toBeUndefined();
    expect(res._body.result.topUsers).toBeUndefined();
  });

  test('aggregates email-channel rows + excludes non-email rows', async () => {
    const u1 = new mongoose.Types.ObjectId();
    const u2 = new mongoose.Types.ObjectId();
    await LlmUsage.create([
      // 5 email — included
      ...Array.from({ length: 5 }, () =>
        makeRow({
          userId: u1,
          channel: 'email',
          totalTokens: 200,
          costUsd: 0.001,
        })
      ),
      // 3 email-imap — included (regex prefix match)
      ...Array.from({ length: 3 }, () =>
        makeRow({
          userId: u2,
          channel: 'email-imap',
          totalTokens: 100,
          costUsd: 0.0005,
        })
      ),
      // 4 ask-ola — excluded
      ...Array.from({ length: 4 }, () =>
        makeRow({ channel: 'ask-ola', totalTokens: 9999, costUsd: 99 })
      ),
    ]);

    const res = stubRes();
    await getEmailToken({ query: { range: '7d' } }, res);

    expect(res._status).toBe(200);
    const r = res._body.result;
    expect(r.empty).toBe(false);
    // 5 email + 3 email-imap = 8 in-window rows
    expect(r.totals.records).toBe(8);
    // 5*200 + 3*100 = 1300 — proves ask-ola rows didn't leak in
    expect(r.totals.total).toBe(5 * 200 + 3 * 100);
    expect(r.totals.costUsd).toBeCloseTo(5 * 0.001 + 3 * 0.0005, 6);

    // byChannel should only contain email* channels
    const channels = r.byChannel.map((c) => c.channel).sort();
    expect(channels).toEqual(['email', 'email-imap']);

    // Two distinct senders, top-tokens user appears first
    expect(r.topUsers.length).toBe(2);
    expect(r.topUsers[0].totalTokens).toBeGreaterThanOrEqual(r.topUsers[1].totalTokens);
  });
});
