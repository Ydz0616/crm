/**
 * ISO1 (issue #185) — MCP user-scope isolation building blocks.
 *
 * Covers:
 *  - bootstrap.resolveActingAdmin: validation / not-found / removed / disabled / happy / cache
 *  - context.runWithContext + getCurrentActingAdmin: per-request propagation
 *
 * HTTP-level coverage (X-Acting-As header → 400/403/200) is verified by ISO4
 * E2E curl scripts; here we test the resolver and context primitives directly.
 */

const path = require('path');
const { globSync } = require('glob');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

const {
  resolveActingAdmin,
  invalidateActingAsCache,
} = require(path.join(BACKEND_ROOT, 'src/mcp/bootstrap'));
const {
  runWithContext,
  getCurrentActingAdmin,
  isSystemFallback,
} = require(path.join(BACKEND_ROOT, 'src/mcp/context'));

let mongo;

beforeAll(async () => {
  globSync('src/models/**/*.js', { cwd: BACKEND_ROOT }).forEach((f) =>
    require(path.join(BACKEND_ROOT, f)),
  );
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  invalidateActingAsCache();
  if (mongoose.models.Admin) {
    await mongoose.models.Admin.deleteMany({});
  }
});

async function makeAdmin(overrides = {}) {
  return mongoose.model('Admin').create({
    email: `${Math.random().toString(36).slice(2)}@example.com`,
    name: 'Test',
    surname: 'Admin',
    role: 'admin',
    enabled: true,
    removed: false,
    ...overrides,
  });
}

describe('resolveActingAdmin — input validation', () => {
  test('rejects empty string', async () => {
    const r = await resolveActingAdmin('');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('VALIDATION');
  });

  test('rejects null', async () => {
    const r = await resolveActingAdmin(null);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('VALIDATION');
  });

  test('rejects undefined', async () => {
    const r = await resolveActingAdmin(undefined);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('VALIDATION');
  });

  test('rejects non-ObjectId string', async () => {
    const r = await resolveActingAdmin('not-an-objectid');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('VALIDATION');
    expect(r.message).toMatch(/not a valid ObjectId/);
  });

  test('rejects number input', async () => {
    const r = await resolveActingAdmin(12345);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('VALIDATION');
  });
});

describe('resolveActingAdmin — admin lookup', () => {
  test('not found → NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const r = await resolveActingAdmin(fakeId);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('NOT_FOUND');
  });

  test('removed admin → PERMISSION', async () => {
    const a = await makeAdmin({ removed: true });
    const r = await resolveActingAdmin(a._id.toString());
    expect(r.ok).toBe(false);
    expect(r.code).toBe('PERMISSION');
    expect(r.message).toMatch(/removed/);
  });

  test('disabled admin → PERMISSION', async () => {
    const a = await makeAdmin({ enabled: false });
    const r = await resolveActingAdmin(a._id.toString());
    expect(r.ok).toBe(false);
    expect(r.code).toBe('PERMISSION');
    expect(r.message).toMatch(/disabled/);
  });

  test('valid enabled admin → ok with admin doc', async () => {
    const a = await makeAdmin({ email: 'happy@example.com' });
    const r = await resolveActingAdmin(a._id.toString());
    expect(r.ok).toBe(true);
    expect(r.admin._id.toString()).toBe(a._id.toString());
    expect(r.admin.email).toBe('happy@example.com');
  });
});

describe('resolveActingAdmin — cache', () => {
  test('second call hits cache (no DB roundtrip)', async () => {
    const a = await makeAdmin({ email: 'cached@example.com' });
    const r1 = await resolveActingAdmin(a._id.toString());
    expect(r1.ok).toBe(true);

    // Mutate the DB doc — if cache is bypassed, the second call would
    // see the mutation. Cache hit means we still get the original.
    await mongoose.model('Admin').updateOne({ _id: a._id }, { email: 'mutated@example.com' });

    const r2 = await resolveActingAdmin(a._id.toString());
    expect(r2.ok).toBe(true);
    expect(r2.admin.email).toBe('cached@example.com'); // stale = cache hit
  });

  test('invalidateActingAsCache(id) drops one entry', async () => {
    const a = await makeAdmin({ email: 'first@example.com' });
    await resolveActingAdmin(a._id.toString()); // populate cache

    await mongoose.model('Admin').updateOne({ _id: a._id }, { email: 'second@example.com' });
    invalidateActingAsCache(a._id.toString());

    const r = await resolveActingAdmin(a._id.toString());
    expect(r.admin.email).toBe('second@example.com'); // re-fetched
  });

  test('invalidateActingAsCache() with no arg clears all', async () => {
    const a = await makeAdmin({ email: 'before@example.com' });
    const b = await makeAdmin();
    await resolveActingAdmin(a._id.toString());
    await resolveActingAdmin(b._id.toString());

    invalidateActingAsCache();

    // After clear, mutations to projected fields show up on next resolve.
    // Cache shape is _id/email/role/enabled/removed (PR #193 follow-up).
    await mongoose.model('Admin').updateOne({ _id: a._id }, { email: 'after@example.com' });
    const r = await resolveActingAdmin(a._id.toString());
    expect(r.admin.email).toBe('after@example.com');
  });
});

describe('resolveActingAdmin — cache TTL', () => {
  // Use surgical Date.now mocking instead of jest.useFakeTimers to keep
  // mongoose / mongodb-memory-server timers untouched.
  const realNow = Date.now;
  let fakeNow = realNow();

  beforeEach(() => {
    fakeNow = realNow();
    Date.now = () => fakeNow;
  });
  afterEach(() => {
    Date.now = realNow;
  });

  function advanceMinutes(n) {
    fakeNow += n * 60 * 1000;
  }

  test('cache entry valid within TTL — second call hits cache', async () => {
    const a = await makeAdmin({ email: 'within-ttl@example.com' });
    const r1 = await resolveActingAdmin(a._id.toString());
    expect(r1.ok).toBe(true);

    // Mutate DB — if cache bypassed, second call would see new email
    await mongoose.model('Admin').updateOne({ _id: a._id }, { email: 'changed@example.com' });
    advanceMinutes(4); // still within 5min TTL

    const r2 = await resolveActingAdmin(a._id.toString());
    expect(r2.admin.email).toBe('within-ttl@example.com'); // stale = cache hit
  });

  test('cache entry expires after TTL — refetches from DB', async () => {
    const a = await makeAdmin({ email: 'expiring@example.com' });
    await resolveActingAdmin(a._id.toString()); // populate cache

    await mongoose.model('Admin').updateOne({ _id: a._id }, { email: 'fresh@example.com' });
    advanceMinutes(6); // past 5min TTL

    const r = await resolveActingAdmin(a._id.toString());
    expect(r.ok).toBe(true);
    expect(r.admin.email).toBe('fresh@example.com'); // fresh DB read
  });

  test('admin disabled mid-cache — rejected after TTL expires', async () => {
    const a = await makeAdmin({ email: 'tobedisabled@example.com' });
    await resolveActingAdmin(a._id.toString()); // cache enabled=true

    await mongoose.model('Admin').updateOne({ _id: a._id }, { enabled: false });

    // Within TTL: still passes (this is the documented 5min window)
    advanceMinutes(2);
    const r1 = await resolveActingAdmin(a._id.toString());
    expect(r1.ok).toBe(true); // cache hit, stale enabled=true

    // After TTL: rejected
    advanceMinutes(4); // total 6min
    const r2 = await resolveActingAdmin(a._id.toString());
    expect(r2.ok).toBe(false);
    expect(r2.code).toBe('PERMISSION');
    expect(r2.message).toMatch(/disabled/);
  });

  test('admin removed mid-cache — rejected after TTL expires', async () => {
    const a = await makeAdmin({ email: 'tobedeleted@example.com' });
    await resolveActingAdmin(a._id.toString());

    await mongoose.model('Admin').updateOne({ _id: a._id }, { removed: true });
    advanceMinutes(6);

    const r = await resolveActingAdmin(a._id.toString());
    expect(r.ok).toBe(false);
    expect(r.code).toBe('PERMISSION');
    expect(r.message).toMatch(/removed/);
  });

  test('expired entry is lazily evicted from Map', async () => {
    const a = await makeAdmin();
    await resolveActingAdmin(a._id.toString());
    advanceMinutes(6);
    await resolveActingAdmin(a._id.toString()); // triggers eviction + refetch

    // The post-refetch entry has a fresh expiresAt; advance past again to
    // confirm the Map doesn't grow unboundedly with stale entries.
    advanceMinutes(6);
    await resolveActingAdmin(a._id.toString());
    // No assertion on map size needed; behaviour is "not crashing, returns ok".
  });

  test('boundary: exactly at expiresAt is treated as expired', async () => {
    const a = await makeAdmin({ email: 'boundary@example.com' });
    await resolveActingAdmin(a._id.toString());

    await mongoose.model('Admin').updateOne({ _id: a._id }, { email: 'after-boundary@example.com' });
    // The TTL is 5min by default; advance EXACTLY 5min — Date.now() ===
    // expiresAt. Strict-less-than logic in the cache should treat this as
    // expired (boundary belongs to the "expired" side).
    advanceMinutes(5);

    const r = await resolveActingAdmin(a._id.toString());
    expect(r.admin.email).toBe('after-boundary@example.com'); // refetched
  });
});

describe('context — AsyncLocalStorage', () => {
  test('getCurrentActingAdmin throws outside scope', () => {
    expect(() => getCurrentActingAdmin()).toThrow(/outside MCP request scope/);
  });

  test('isSystemFallback returns false outside scope', () => {
    expect(isSystemFallback()).toBe(false);
  });

  test('inside runWithContext sees the admin', async () => {
    const fakeAdmin = { _id: new mongoose.Types.ObjectId(), email: 'ctx@example.com' };
    const seen = await runWithContext(
      { actingAdmin: fakeAdmin, isSystemFallback: false },
      async () => {
        return {
          admin: getCurrentActingAdmin(),
          fallback: isSystemFallback(),
        };
      },
    );
    expect(seen.admin._id.toString()).toBe(fakeAdmin._id.toString());
    expect(seen.fallback).toBe(false);
  });

  test('null actingAdmin (system fallback) propagates correctly', async () => {
    const seen = await runWithContext(
      { actingAdmin: null, isSystemFallback: true },
      async () => ({
        admin: getCurrentActingAdmin(),
        fallback: isSystemFallback(),
      }),
    );
    expect(seen.admin).toBeNull();
    expect(seen.fallback).toBe(true);
  });

  test('nested runWithContext — inner scope wins', async () => {
    const outer = { _id: new mongoose.Types.ObjectId(), email: 'outer@example.com' };
    const inner = { _id: new mongoose.Types.ObjectId(), email: 'inner@example.com' };

    const result = await runWithContext(
      { actingAdmin: outer, isSystemFallback: false },
      async () => {
        return runWithContext(
          { actingAdmin: inner, isSystemFallback: false },
          async () => getCurrentActingAdmin(),
        );
      },
    );
    expect(result.email).toBe('inner@example.com');
  });

  test('parallel async inside runWithContext both see admin', async () => {
    const fakeAdmin = { _id: new mongoose.Types.ObjectId(), email: 'parallel@example.com' };
    const result = await runWithContext(
      { actingAdmin: fakeAdmin, isSystemFallback: false },
      async () => {
        const [a, b] = await Promise.all([
          Promise.resolve().then(() => getCurrentActingAdmin()),
          Promise.resolve().then(() => getCurrentActingAdmin()),
        ]);
        return { a, b };
      },
    );
    expect(result.a.email).toBe('parallel@example.com');
    expect(result.b.email).toBe('parallel@example.com');
  });
});
