/**
 * Regression test for issue #198 — quote.update MCP tool PATCH semantics.
 *
 * Bug history (PR #193): the update handler built a fresh body with
 * `rest.X || default` fallbacks, so an agent that omitted number/date/
 * status/expiredDate silently got them rewritten with `now`/`+30d`/'draft'
 * (e.g. a quote marked `sent` would demote back to `draft`; the quote
 * number would be replaced by a fresh timestamp).
 *
 * Fix: PATCH semantics — handler reads the current persisted quote first,
 * then merges only the fields the agent actually passed. Tests below cover
 * both the regression (preservation) and the explicit-update path.
 */

const path = require('path');
const { globSync } = require('glob');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..');

const { runWithContext } = require(path.join(BACKEND_ROOT, 'src/mcp/context'));

let quoteTools;
let mongo;

beforeAll(async () => {
  globSync('src/models/**/*.js', { cwd: BACKEND_ROOT }).forEach((f) =>
    require(path.join(BACKEND_ROOT, f)),
  );
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  // eslint-disable-next-line global-require
  quoteTools = require(path.join(BACKEND_ROOT, 'src/mcp/tools/crud/quote'));
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  for (const name of ['Admin', 'Quote', 'Merch', 'Client']) {
    if (mongoose.models[name]) {
      await mongoose.models[name].deleteMany({});
    }
  }
});

function findTool(name) {
  return quoteTools.tools.find((t) => t.name === name);
}

async function makeAdmin() {
  return mongoose.model('Admin').create({
    email: 'patch-tester@example.com',
    name: 'Patch',
    surname: 'Tester',
    role: 'admin',
    enabled: true,
    removed: false,
  });
}

async function makeClient(createdBy) {
  return mongoose.model('Client').create({
    name: 'Acme Trading',
    country: 'US',
    createdBy,
    enabled: true,
    removed: false,
  });
}

async function seedQuote(admin, client, overrides = {}) {
  const Quote = mongoose.model('Quote');
  const baseDate = new Date('2026-01-15T10:00:00Z');
  const baseExpiry = new Date('2026-02-14T10:00:00Z');
  return Quote.create({
    number: 'Q-PRESERVE-ME',
    year: 2026,
    status: 'sent',
    date: baseDate,
    expiredDate: baseExpiry,
    client: client._id,
    createdBy: admin._id,
    currency: 'USD',
    exchangeRate: 1,
    items: [
      {
        itemName: 'WIDGET-1',
        description: 'Stainless widget',
        quantity: 10,
        price: 5,
        total: 50,
        unit_en: 'PCS',
        unit_cn: '件',
      },
    ],
    subTotal: 50,
    total: 50,
    notes: ['original note'],
    termsOfDelivery: ['DDP'],
    paymentTerms: ['net 30'],
    freight: 0,
    discount: 0,
    ...overrides,
  });
}

async function callUpdate(admin, payload) {
  const update = findTool('quote.update');
  return runWithContext(
    { actingAdmin: admin, isSystemFallback: false },
    async () => update.handler(payload),
  );
}

describe('quote.update — PATCH semantics (issue #198)', () => {
  test('omitting number/date/status/expiredDate preserves persisted values', async () => {
    const admin = await makeAdmin();
    const client = await makeClient(admin._id);
    const quote = await seedQuote(admin, client);

    const result = await callUpdate(admin, {
      id: String(quote._id),
      items: [
        {
          itemName: 'WIDGET-1',
          quantity: 20, // qty change only — agent wouldn't re-send number/status/etc
          price: 5,
        },
      ],
    });

    expect(result.ok).toBe(true);

    const persisted = await mongoose.model('Quote').findById(quote._id).lean();
    expect(persisted.number).toBe('Q-PRESERVE-ME');
    expect(persisted.status).toBe('sent');
    expect(persisted.date.toISOString()).toBe('2026-01-15T10:00:00.000Z');
    expect(persisted.expiredDate.toISOString()).toBe('2026-02-14T10:00:00.000Z');
    // total recomputed from new qty × price (controller authoritative)
    expect(persisted.total).toBe(100);
    expect(persisted.items[0].quantity).toBe(20);
  });

  test('omitting items keeps existing items intact and recomputes the same total', async () => {
    const admin = await makeAdmin();
    const client = await makeClient(admin._id);
    const quote = await seedQuote(admin, client);

    const result = await callUpdate(admin, {
      id: String(quote._id),
      status: 'accepted',
    });

    expect(result.ok).toBe(true);

    const persisted = await mongoose.model('Quote').findById(quote._id).lean();
    expect(persisted.status).toBe('accepted');
    expect(persisted.number).toBe('Q-PRESERVE-ME');
    expect(persisted.items).toHaveLength(1);
    expect(persisted.items[0].itemName).toBe('WIDGET-1');
    expect(persisted.items[0].quantity).toBe(10);
    expect(persisted.items[0].price).toBe(5);
    expect(persisted.total).toBe(50);
  });

  test('explicit status update succeeds (does not block legitimate changes)', async () => {
    const admin = await makeAdmin();
    const client = await makeClient(admin._id);
    const quote = await seedQuote(admin, client, { status: 'draft' });

    const result = await callUpdate(admin, {
      id: String(quote._id),
      status: 'sent',
    });

    expect(result.ok).toBe(true);
    const persisted = await mongoose.model('Quote').findById(quote._id).lean();
    expect(persisted.status).toBe('sent');
  });

  test('explicit number update succeeds (caller can rename the quote)', async () => {
    const admin = await makeAdmin();
    const client = await makeClient(admin._id);
    const quote = await seedQuote(admin, client);

    const result = await callUpdate(admin, {
      id: String(quote._id),
      number: 'Q-MANUAL-RENAME-001',
    });

    expect(result.ok).toBe(true);
    const persisted = await mongoose.model('Quote').findById(quote._id).lean();
    expect(persisted.number).toBe('Q-MANUAL-RENAME-001');
  });

  test('non-existent id returns NOT_FOUND (does not silently create)', async () => {
    const admin = await makeAdmin();
    const fakeId = new mongoose.Types.ObjectId().toString();

    const result = await callUpdate(admin, {
      id: fakeId,
      status: 'sent',
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('NOT_FOUND');
    // Critical: nothing got created as a side effect
    expect(await mongoose.model('Quote').countDocuments()).toBe(0);
  });

  test('quote owned by another admin returns NOT_FOUND (acting-as isolation)', async () => {
    const ownerAdmin = await makeAdmin();
    const otherAdmin = await mongoose.model('Admin').create({
      email: 'other@example.com',
      name: 'Other',
      surname: 'X',
      role: 'admin',
      enabled: true,
      removed: false,
    });
    const client = await makeClient(ownerAdmin._id);
    const quote = await seedQuote(ownerAdmin, client);

    const result = await callUpdate(otherAdmin, {
      id: String(quote._id),
      status: 'declined',
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('NOT_FOUND');
    // Status untouched
    const persisted = await mongoose.model('Quote').findById(quote._id).lean();
    expect(persisted.status).toBe('sent');
  });

  test('passing `total` is rejected (server-computed only)', async () => {
    const admin = await makeAdmin();
    const client = await makeClient(admin._id);
    const quote = await seedQuote(admin, client);

    const result = await callUpdate(admin, {
      id: String(quote._id),
      total: 9999,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('VALIDATION');
    expect(result.message).toMatch(/total/);
  });

  test('CNY existing quote: omitting exchangeRate preserves the persisted rate', async () => {
    const admin = await makeAdmin();
    const client = await makeClient(admin._id);
    const Quote = mongoose.model('Quote');
    const quote = await Quote.create({
      number: 'Q-CNY-001',
      year: 2026,
      status: 'sent',
      date: new Date('2026-01-15'),
      expiredDate: new Date('2026-02-14'),
      client: client._id,
      createdBy: admin._id,
      currency: 'CNY',
      exchangeRate: 7.2,
      items: [
        { itemName: 'W-1', quantity: 1, price: 100, total: 100, description: '' },
      ],
      subTotal: 100,
      total: 100,
    });

    const result = await callUpdate(admin, {
      id: String(quote._id),
      status: 'accepted',
    });

    expect(result.ok).toBe(true);
    const persisted = await Quote.findById(quote._id).lean();
    expect(persisted.exchangeRate).toBe(7.2);
    expect(persisted.currency).toBe('CNY');
  });

  test('changing currency CNY → USD without explicit exchangeRate lets controller normalize to 1', async () => {
    const admin = await makeAdmin();
    const client = await makeClient(admin._id);
    const Quote = mongoose.model('Quote');
    const quote = await Quote.create({
      number: 'Q-FLIP-001',
      year: 2026,
      status: 'draft',
      date: new Date('2026-01-15'),
      expiredDate: new Date('2026-02-14'),
      client: client._id,
      createdBy: admin._id,
      currency: 'CNY',
      exchangeRate: 7.2,
      items: [
        { itemName: 'W-1', quantity: 1, price: 100, total: 100, description: '' },
      ],
      subTotal: 100,
      total: 100,
    });

    const result = await callUpdate(admin, {
      id: String(quote._id),
      currency: 'USD',
    });

    expect(result.ok).toBe(true);
    const persisted = await Quote.findById(quote._id).lean();
    expect(persisted.currency).toBe('USD');
    expect(persisted.exchangeRate).toBe(1);
  });

  test('changing currency USD → CNY without exchangeRate is rejected by controller', async () => {
    const admin = await makeAdmin();
    const client = await makeClient(admin._id);
    const quote = await seedQuote(admin, client); // USD, exchangeRate 1

    const result = await callUpdate(admin, {
      id: String(quote._id),
      currency: 'CNY',
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('VALIDATION');
    expect(result.message).toMatch(/汇率/);
    // Persisted record still USD
    const persisted = await mongoose.model('Quote').findById(quote._id).lean();
    expect(persisted.currency).toBe('USD');
  });

  test('item changes recompute total via helpers.calculate (qty × price)', async () => {
    const admin = await makeAdmin();
    const client = await makeClient(admin._id);
    const quote = await seedQuote(admin, client);

    const result = await callUpdate(admin, {
      id: String(quote._id),
      items: [
        { itemName: 'WIDGET-1', quantity: 7, price: 12.5 },
      ],
    });

    expect(result.ok).toBe(true);
    const persisted = await mongoose.model('Quote').findById(quote._id).lean();
    expect(persisted.items[0].quantity).toBe(7);
    expect(persisted.items[0].price).toBe(12.5);
    expect(persisted.items[0].total).toBe(87.5);
    expect(persisted.subTotal).toBe(87.5);
    expect(persisted.total).toBe(87.5);
  });

  test('id-only patch is a no-op that still succeeds and preserves everything', async () => {
    const admin = await makeAdmin();
    const client = await makeClient(admin._id);
    const quote = await seedQuote(admin, client);

    const result = await callUpdate(admin, { id: String(quote._id) });

    expect(result.ok).toBe(true);
    const persisted = await mongoose.model('Quote').findById(quote._id).lean();
    expect(persisted.number).toBe('Q-PRESERVE-ME');
    expect(persisted.status).toBe('sent');
    expect(persisted.total).toBe(50);
    expect(persisted.items).toHaveLength(1);
  });
});
