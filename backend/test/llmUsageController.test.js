/**
 * Tests for llmUsageController (Ola issue #98).
 *
 * Covers:
 *   1. denyWrite — create/update/delete return 403 with the documented Chinese
 *      message (LLMUsage rows are system-internal; external mutation is not
 *      allowed even with admin auth).
 *   2. recordUsage — internal helper invoked by olaController/chat.js after
 *      each Ask Ola turn:
 *        - Happy path persists a complete LlmUsage doc with computed costUsd
 *        - Skips quietly on null/empty usage, totalTokens=0
 *        - Survives mongo write errors silently (fail-silent — never throws)
 *
 * Pattern mirrors paginatedList.test.js: mongodb-memory-server + mongoose
 * model autoload. No HTTP layer needed for denyWrite (we call the controller
 * methods directly with a stub res), keeping these tests fast (<200ms each).
 */

const path = require('path');
const { globSync } = require('glob');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..');

let mongo;
let llmController;
let recordUsage;
let LlmUsage;

beforeAll(async () => {
  globSync('src/models/**/*.js', { cwd: BACKEND_ROOT }).forEach((f) =>
    require(path.join(BACKEND_ROOT, f))
  );

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  llmController = require(
    path.join(BACKEND_ROOT, 'src/controllers/appControllers/llmUsageController')
  );
  recordUsage = require(
    path.join(BACKEND_ROOT, 'src/controllers/appControllers/llmUsageController/recordUsage')
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

// Stub Express res with status() + json() chainable. Captures the call so we
// can assert on it.
function stubRes() {
  const res = {
    _status: null,
    _body: null,
    status(s) { this._status = s; return this; },
    json(b) { this._body = b; return this; },
  };
  return res;
}

// ===========================================================================
// denyWrite — create / update / delete must return 403 even from admin
// ===========================================================================

describe('llmUsageController — denyWrite (system-internal collection)', () => {
  test('controller exports the standard CRUD method set + recordUsage', () => {
    const expected = [
      'create', 'read', 'update', 'delete',
      'list', 'listAll', 'search', 'filter', 'summary',
      'recordUsage',
    ].sort();
    expect(Object.keys(llmController).sort()).toEqual(expected);
  });

  test('create returns 403 with success:false and Chinese message', () => {
    const res = stubRes();
    llmController.create({}, res);
    expect(res._status).toBe(403);
    expect(res._body.success).toBe(false);
    expect(res._body.result).toBeNull();
    expect(res._body.message).toBe('LLMUsage 写入仅限系统内部');
  });

  test('update returns 403 — same envelope as create', () => {
    const res = stubRes();
    llmController.update({}, res);
    expect(res._status).toBe(403);
    expect(res._body.success).toBe(false);
    expect(res._body.message).toBe('LLMUsage 写入仅限系统内部');
  });

  test('delete returns 403 — even with a valid ObjectId', () => {
    const res = stubRes();
    llmController.delete(
      { params: { id: new mongoose.Types.ObjectId().toString() } },
      res
    );
    expect(res._status).toBe(403);
    expect(res._body.success).toBe(false);
  });

  test('read/list/listAll/summary are NOT blocked (will be wired to dashboard)', () => {
    // We just confirm they are functions (the real implementations come from
    // createCRUDController and are tested separately). If denyWrite ever
    // accidentally clobbers a read path, this catches it.
    expect(typeof llmController.read).toBe('function');
    expect(typeof llmController.list).toBe('function');
    expect(typeof llmController.listAll).toBe('function');
    expect(typeof llmController.summary).toBe('function');
    expect(typeof llmController.search).toBe('function');
    expect(typeof llmController.filter).toBe('function');
  });
});

// ===========================================================================
// recordUsage — the internal write path
// ===========================================================================

const userId = new mongoose.Types.ObjectId();
const sessionId = new mongoose.Types.ObjectId();
const session = { _id: sessionId, nanobotSessionId: 'user:test:conv:abc' };

describe('recordUsage — happy path', () => {
  test('persists a complete LlmUsage doc with computed costUsd > 0', async () => {
    await recordUsage({
      userId,
      session,
      messageId: null,
      usage: {
        prompt_tokens: 1500,
        completion_tokens: 400,
        total_tokens: 1900,
        cached_tokens: 100,
        iterations: 2,
      },
      latencyMs: 1234,
      requestId: 'req-test-001',
      errored: false,
    });

    const docs = await LlmUsage.find({ requestId: 'req-test-001' }).lean();
    expect(docs).toHaveLength(1);
    const r = docs[0];
    expect(r.userId.toString()).toBe(userId.toString());
    expect(r.sessionId.toString()).toBe(sessionId.toString());
    expect(r.nanobotSessionId).toBe('user:test:conv:abc');
    expect(r.channel).toBe('ask-ola');
    expect(r.provider).toBe('gemini');
    expect(r.model).toBe('gemini-3.1-flash-lite-preview');
    expect(r.inputTokens).toBe(1500);
    expect(r.outputTokens).toBe(400);
    expect(r.totalTokens).toBe(1900);
    expect(r.cachedTokens).toBe(100);
    expect(r.iterations).toBe(2);
    expect(r.costUsd).toBeGreaterThan(0);
    expect(r.latencyMs).toBe(1234);
    expect(r.errored).toBe(false);
    expect(r.pricingVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('messageId is plumbed through when provided', async () => {
    const messageId = new mongoose.Types.ObjectId();
    await recordUsage({
      userId,
      session,
      messageId,
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      latencyMs: 200,
      requestId: 'req-msg-id',
    });
    const r = await LlmUsage.findOne({ requestId: 'req-msg-id' }).lean();
    expect(r.messageId.toString()).toBe(messageId.toString());
  });

  test('errored=true persists alongside the otherwise-valid usage', async () => {
    await recordUsage({
      userId,
      session,
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      latencyMs: 100,
      requestId: 'req-errored',
      errored: true,
    });
    const r = await LlmUsage.findOne({ requestId: 'req-errored' }).lean();
    expect(r.errored).toBe(true);
  });

  test('totalTokens defaults to inputTokens + outputTokens when provider omits it', async () => {
    await recordUsage({
      userId,
      session,
      usage: { prompt_tokens: 200, completion_tokens: 80 }, // no total_tokens
      latencyMs: 50,
      requestId: 'req-total-derived',
    });
    const r = await LlmUsage.findOne({ requestId: 'req-total-derived' }).lean();
    expect(r.totalTokens).toBe(280);
  });

  test('iterations defaults to 1 when nanobot omits it (legacy callers)', async () => {
    await recordUsage({
      userId,
      session,
      usage: {
        prompt_tokens: 100, completion_tokens: 50, total_tokens: 150,
        // no iterations
      },
      latencyMs: 50,
      requestId: 'req-iter-default',
    });
    const r = await LlmUsage.findOne({ requestId: 'req-iter-default' }).lean();
    expect(r.iterations).toBe(1);
  });
});

describe('recordUsage — skip rules (no-op, no row written)', () => {
  test('null usage → skips silently', async () => {
    await recordUsage({
      userId, session, usage: null, latencyMs: 100, requestId: 'skip-null',
    });
    expect(await LlmUsage.countDocuments({ requestId: 'skip-null' })).toBe(0);
  });

  test('undefined usage → skips silently', async () => {
    await recordUsage({
      userId, session, latencyMs: 100, requestId: 'skip-undef',
    });
    expect(await LlmUsage.countDocuments({ requestId: 'skip-undef' })).toBe(0);
  });

  test('empty object usage → skips silently', async () => {
    await recordUsage({
      userId, session, usage: {}, latencyMs: 100, requestId: 'skip-empty',
    });
    expect(await LlmUsage.countDocuments({ requestId: 'skip-empty' })).toBe(0);
  });

  test('totalTokens=0 → skips (safety net for "no real LLM call happened")', async () => {
    await recordUsage({
      userId,
      session,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      latencyMs: 50,
      requestId: 'skip-zero-total',
    });
    expect(await LlmUsage.countDocuments({ requestId: 'skip-zero-total' })).toBe(0);
  });

  test('missing session → skips (cannot reference a turn without session id)', async () => {
    await recordUsage({
      userId,
      session: null,
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      latencyMs: 100,
      requestId: 'skip-no-session',
    });
    expect(await LlmUsage.countDocuments({ requestId: 'skip-no-session' })).toBe(0);
  });

  test('non-object usage (e.g. string) → skips silently, no throw', async () => {
    let threw = false;
    try {
      await recordUsage({
        userId, session, usage: 'garbage', latencyMs: 100, requestId: 'skip-str',
      });
    } catch { threw = true; }
    expect(threw).toBe(false);
    expect(await LlmUsage.countDocuments({ requestId: 'skip-str' })).toBe(0);
  });
});

describe('recordUsage — fail-silent on persistence errors', () => {
  test('mongo write error is swallowed (logged via console.error, not thrown)', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Force schema validation to fail by passing a malformed userId
    // (LlmUsage.userId is required + ObjectId-typed; passing the literal
    // string "not-an-id" makes Mongoose CastError out at create time).
    let threw = false;
    try {
      await recordUsage({
        userId: 'not-an-id',
        session,
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        latencyMs: 100,
        requestId: 'fail-cast',
      });
    } catch { threw = true; }
    errSpy.mockRestore();

    expect(threw).toBe(false);
    expect(await LlmUsage.countDocuments({ requestId: 'fail-cast' })).toBe(0);
  });
});

// ===========================================================================
// Cost-calculation correctness reaches the persisted row
// ===========================================================================

describe('recordUsage — costUsd reflects llmPricing.calcCost', () => {
  test('costUsd matches the pure-function calculation for the same inputs', async () => {
    const { calcCost } = require('@/constants/llmPricing');

    await recordUsage({
      userId,
      session,
      usage: {
        prompt_tokens: 2_000,
        completion_tokens: 800,
        total_tokens: 2_800,
        cached_tokens: 500,
      },
      latencyMs: 500,
      requestId: 'cost-match',
    });
    const r = await LlmUsage.findOne({ requestId: 'cost-match' }).lean();
    const expected = calcCost('gemini', 'gemini-3.1-flash-lite-preview', {
      inputTokens: 2_000, outputTokens: 800, cachedTokens: 500,
    });
    expect(r.costUsd).toBeCloseTo(expected, 12);
  });
});
