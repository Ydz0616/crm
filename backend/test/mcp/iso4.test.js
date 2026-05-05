/**
 * ISO4 (issue #185) — HTTP-layer X-Acting-As header decision E2E.
 *
 * Covers the `decideActingAdmin` helper end-to-end with real Mongo +
 * registered Admin docs. This is what server.js calls per request before
 * wrapping transport.handleRequest in runWithContext.
 *
 * Status mapping verified:
 *   missing/empty header   → 200 path, isSystemFallback=true, actingAdmin=systemAdmin
 *   non-ObjectId           → 400 VALIDATION
 *   unknown ObjectId       → 403 NOT_FOUND
 *   removed/disabled admin → 403 PERMISSION
 *   valid enabled admin    → 200 path, isSystemFallback=false, actingAdmin=that admin
 */

const path = require('path');
const { globSync } = require('glob');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

const {
  resolveSystemAdmin,
  invalidateActingAsCache,
} = require(path.join(BACKEND_ROOT, 'src/mcp/bootstrap'));
const {
  decideActingAdmin,
} = require(path.join(BACKEND_ROOT, 'src/mcp/headerResolver'));

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
  await mongoose.model('Admin').deleteMany({});
});

async function makeAdmin(overrides = {}) {
  return mongoose.model('Admin').create({
    email: `${Math.random().toString(36).slice(2)}@example.com`,
    name: 'T',
    surname: 'A',
    role: 'admin',
    enabled: true,
    removed: false,
    ...overrides,
  });
}

async function bootstrapWithSystemAdmin() {
  // Mongo is already connected by beforeAll via MongoMemoryServer; we only
  // need to seed an owner Admin and prime the systemAdmin cache.
  await mongoose.model('Admin').create({
    email: 'sys@example.com',
    name: 'Sys',
    surname: 'Admin',
    role: 'owner',
    enabled: true,
    removed: false,
  });
  await resolveSystemAdmin();
}

describe('decideActingAdmin — header decision E2E', () => {
  test('missing header → fallback to systemAdmin', async () => {
    await bootstrapWithSystemAdmin();
    const d = await decideActingAdmin(undefined);
    expect(d.ok).toBe(true);
    expect(d.isSystemFallback).toBe(true);
    expect(d.actingAdmin.email).toBe('sys@example.com');
  });

  test('empty string header → fallback to systemAdmin', async () => {
    await bootstrapWithSystemAdmin();
    const d = await decideActingAdmin('');
    expect(d.ok).toBe(true);
    expect(d.isSystemFallback).toBe(true);
  });

  test('whitespace-only header → fallback to systemAdmin', async () => {
    await bootstrapWithSystemAdmin();
    const d = await decideActingAdmin('   ');
    expect(d.ok).toBe(true);
    expect(d.isSystemFallback).toBe(true);
  });

  test('non-ObjectId header → 400 VALIDATION', async () => {
    await bootstrapWithSystemAdmin();
    const d = await decideActingAdmin('not-a-valid-id');
    expect(d.ok).toBe(false);
    expect(d.status).toBe(400);
    expect(d.code).toBe('VALIDATION');
  });

  test('unknown ObjectId → 403 NOT_FOUND', async () => {
    await bootstrapWithSystemAdmin();
    const fakeId = new mongoose.Types.ObjectId().toString();
    const d = await decideActingAdmin(fakeId);
    expect(d.ok).toBe(false);
    expect(d.status).toBe(403);
    expect(d.code).toBe('NOT_FOUND');
  });

  test('removed admin → 403 PERMISSION', async () => {
    await bootstrapWithSystemAdmin();
    const a = await makeAdmin({ email: 'gone@example.com', removed: true });
    const d = await decideActingAdmin(a._id.toString());
    expect(d.ok).toBe(false);
    expect(d.status).toBe(403);
    expect(d.code).toBe('PERMISSION');
  });

  test('disabled admin → 403 PERMISSION', async () => {
    await bootstrapWithSystemAdmin();
    const a = await makeAdmin({ email: 'off@example.com', enabled: false });
    const d = await decideActingAdmin(a._id.toString());
    expect(d.ok).toBe(false);
    expect(d.status).toBe(403);
    expect(d.code).toBe('PERMISSION');
  });

  test('valid enabled admin → returns admin, not fallback', async () => {
    await bootstrapWithSystemAdmin();
    const a = await makeAdmin({ email: 'sales@example.com' });
    const d = await decideActingAdmin(a._id.toString());
    expect(d.ok).toBe(true);
    expect(d.isSystemFallback).toBe(false);
    expect(d.actingAdmin.email).toBe('sales@example.com');
  });

  test('header value with surrounding whitespace → trimmed and resolved', async () => {
    await bootstrapWithSystemAdmin();
    const a = await makeAdmin({ email: 'trimmed@example.com' });
    const d = await decideActingAdmin(`  ${a._id.toString()}  `);
    expect(d.ok).toBe(true);
    expect(d.actingAdmin.email).toBe('trimmed@example.com');
  });
});
