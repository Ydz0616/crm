/**
 * ISO3 (issue #185) — business tool integration: context → buildReq → controller
 * → mongoose query MUST filter by acting-as admin._id (not systemAdmin).
 *
 * Real-stack test: MongoMemoryServer + actual Admin/Client models + real
 * customer tool handler. Proves the full propagation chain.
 */

const path = require('path');
const { globSync } = require('glob');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

const { runWithContext } = require(path.join(BACKEND_ROOT, 'src/mcp/context'));

// customerTools is loaded inside beforeAll AFTER models are registered —
// requiring the tool triggers clientController which references models like
// Invoice that need to be loaded first.
let customerTools;
let mongo;

beforeAll(async () => {
  globSync('src/models/**/*.js', { cwd: BACKEND_ROOT }).forEach((f) =>
    require(path.join(BACKEND_ROOT, f)),
  );
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  // Now models are loaded — safe to require the tool.
  // eslint-disable-next-line global-require
  customerTools = require(path.join(BACKEND_ROOT, 'src/mcp/tools/crud/customer'));
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await mongoose.model('Admin').deleteMany({});
  await mongoose.model('Client').deleteMany({});
});

async function makeAdmin(email) {
  return mongoose.model('Admin').create({
    email,
    name: email.split('@')[0],
    surname: 'X',
    role: 'admin',
    enabled: true,
    removed: false,
  });
}

async function makeClient(name, createdBy) {
  return mongoose.model('Client').create({
    name,
    country: 'CN',
    createdBy,
    enabled: true,
    removed: false,
  });
}

function findTool(name) {
  return customerTools.tools.find((t) => t.name === name);
}

describe('ISO3 — business tool isolates by acting-as admin', () => {
  test('customer.search inside runWithContext(adminA) sees only A creations', async () => {
    const adminA = await makeAdmin('a@example.com');
    const adminB = await makeAdmin('b@example.com');
    await makeClient('Acme Corp', adminA._id);
    await makeClient('Beta Inc', adminB._id);

    const search = findTool('customer.search');
    const result = await runWithContext(
      { actingAdmin: adminA, isSystemFallback: false },
      async () => search.handler({ q: 'corp' }),
    );

    expect(result.ok).toBe(true);
    expect(result.data.found).toBe(true);
    const names = result.data.results.map((c) => c.name);
    expect(names).toContain('Acme Corp');
    expect(names).not.toContain('Beta Inc');
  });

  test('customer.search inside runWithContext(adminB) sees only B creations', async () => {
    const adminA = await makeAdmin('a@example.com');
    const adminB = await makeAdmin('b@example.com');
    await makeClient('Acme Corp', adminA._id);
    await makeClient('Beta Inc', adminB._id);

    const search = findTool('customer.search');
    const result = await runWithContext(
      { actingAdmin: adminB, isSystemFallback: false },
      async () => search.handler({ q: 'inc' }),
    );

    expect(result.ok).toBe(true);
    expect(result.data.found).toBe(true);
    const names = result.data.results.map((c) => c.name);
    expect(names).toContain('Beta Inc');
    expect(names).not.toContain('Acme Corp');
  });

  test('cross-tenant: A searches for B-owned name → not found', async () => {
    const adminA = await makeAdmin('a@example.com');
    const adminB = await makeAdmin('b@example.com');
    await makeClient('Beta Inc', adminB._id); // only B creates

    const search = findTool('customer.search');
    const result = await runWithContext(
      { actingAdmin: adminA, isSystemFallback: false },
      async () => search.handler({ q: 'beta' }),
    );

    expect(result.ok).toBe(true);
    expect(result.data.found).toBe(false);
    expect(result.data.message).toMatch(/No matching customer/);
  });

  test('customer.create writes createdBy = acting-as admin (not systemAdmin)', async () => {
    const adminA = await makeAdmin('a@example.com');

    const create = findTool('customer.create');
    const result = await runWithContext(
      { actingAdmin: adminA, isSystemFallback: false },
      async () => create.handler({ name: 'New Customer', country: 'US' }),
    );

    expect(result.ok).toBe(true);
    // Verify by direct DB read that createdBy === adminA._id
    const created = await mongoose
      .model('Client')
      .findOne({ name: 'New Customer' })
      .lean();
    expect(created).toBeTruthy();
    expect(created.createdBy.toString()).toBe(adminA._id.toString());
  });

  test('back-compat: systemFallback context (passes a sysAdmin) still works', async () => {
    // Mirrors server.js fallback path: askola web flow with no X-Acting-As
    // header still injects systemAdmin into context.actingAdmin.
    const sysAdmin = await makeAdmin('sys@example.com');
    await makeClient('Sys Corp', sysAdmin._id);

    const search = findTool('customer.search');
    const result = await runWithContext(
      { actingAdmin: sysAdmin, isSystemFallback: true },
      async () => search.handler({ q: 'sys' }),
    );

    expect(result.ok).toBe(true);
    expect(result.data.found).toBe(true);
    expect(result.data.results[0].name).toBe('Sys Corp');
  });
});
