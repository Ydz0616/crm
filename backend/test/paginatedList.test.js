/**
 * Regression test for issue #163 — paginatedList default sort.
 *
 * Bug history: the generic and per-entity paginatedList controllers defaulted
 * `sortBy='enabled'`, a field that does not exist on Quote / Invoice /
 * PurchaseOrder / Payment / Merch / Factory schemas. Mongo silently fell back
 * to natural order, so newly inserted documents did not reliably appear on
 * page 1 of the list. Fix: use `{ created: -1, _id: -1 }` as the default
 * sort spec — semantic for entities with `created`, deterministic via _id
 * tiebreaker for entities without it (Merch, Factory) and across same-second
 * inserts.
 */

const path = require('path');
const { globSync } = require('glob');
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..');
const adminId = new mongoose.Types.ObjectId();

let mongo;

beforeAll(async () => {
  globSync('src/models/**/*.js', { cwd: BACKEND_ROOT }).forEach((f) =>
    require(path.join(BACKEND_ROOT, f))
  );
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  for (const name of ['Quote', 'Invoice', 'PurchaseOrder', 'Payment', 'Merch', 'Factory', 'Client']) {
    if (mongoose.models[name]) {
      await mongoose.models[name].deleteMany({});
    }
  }
});

function buildEntityApp(controllerRelPath) {
  const controller = require(path.join(BACKEND_ROOT, controllerRelPath));
  const app = express();
  app.use((req, _res, next) => {
    req.admin = { _id: adminId };
    next();
  });
  app.get('/list', (req, res) => controller(req, res));
  return app;
}

function buildGenericApp(Model) {
  const generic = require(
    path.join(BACKEND_ROOT, 'src/controllers/middlewaresControllers/createCRUDController/paginatedList')
  );
  const app = express();
  app.use((req, _res, next) => {
    req.admin = { _id: adminId };
    next();
  });
  app.get('/list', (req, res) => generic(Model, req, res));
  return app;
}

async function seedClient() {
  return mongoose.model('Client').create({
    name: 'Test Client',
    country: 'CN',
    createdBy: adminId,
  });
}

function quoteFixture(overrides) {
  return {
    number: 'Q-DEFAULT',
    year: 2026,
    date: new Date('2026-01-01'),
    expiredDate: new Date('2026-02-01'),
    createdBy: adminId,
    items: [{ itemName: 'X', quantity: 1, price: 1, total: 1 }],
    total: 1,
    currency: 'USD',
    ...overrides,
  };
}

describe('paginatedList default sort — issue #163 regression', () => {
  describe('Quote (per-entity override)', () => {
    test('returns newest-first by created desc when sortBy is not provided', async () => {
      const client = await seedClient();
      const Quote = mongoose.model('Quote');
      await Quote.create([
        quoteFixture({ number: 'Q-OLD', client: client._id, created: new Date('2025-01-01') }),
        quoteFixture({ number: 'Q-MID', client: client._id, created: new Date('2025-06-01') }),
        quoteFixture({ number: 'Q-NEW', client: client._id, created: new Date('2026-04-27') }),
      ]);

      const app = buildEntityApp('src/controllers/appControllers/quoteController/paginatedList');
      const res = await request(app).get('/list?page=1&items=10');

      expect(res.status).toBe(200);
      expect(res.body.result.map((q) => q.number)).toEqual(['Q-NEW', 'Q-MID', 'Q-OLD']);
    });

    test('is stable across consecutive calls and produces no page-1/page-2 overlap when many docs share the same `created`', async () => {
      const client = await seedClient();
      const Quote = mongoose.model('Quote');
      const sameTime = new Date('2026-01-01T00:00:00Z');
      await Quote.insertMany(
        Array.from({ length: 25 }, (_, i) =>
          quoteFixture({
            number: `Q-${String(i).padStart(3, '0')}`,
            client: client._id,
            created: sameTime,
          })
        )
      );

      const app = buildEntityApp('src/controllers/appControllers/quoteController/paginatedList');
      const [r1a, r1b, r2a, r2b] = await Promise.all([
        request(app).get('/list?page=1&items=10'),
        request(app).get('/list?page=1&items=10'),
        request(app).get('/list?page=2&items=10'),
        request(app).get('/list?page=2&items=10'),
      ]);

      const numbers = (r) => r.body.result.map((q) => q.number);
      expect(numbers(r1a)).toEqual(numbers(r1b));
      expect(numbers(r2a)).toEqual(numbers(r2b));

      const page1Set = new Set(numbers(r1a));
      const overlap = numbers(r2a).filter((n) => page1Set.has(n));
      expect(overlap).toEqual([]);
    });

    test('honors caller-supplied sortBy', async () => {
      const client = await seedClient();
      const Quote = mongoose.model('Quote');
      await Quote.create([
        quoteFixture({ number: 'Q-A', client: client._id, total: 100 }),
        quoteFixture({ number: 'Q-B', client: client._id, total: 50 }),
        quoteFixture({ number: 'Q-C', client: client._id, total: 200 }),
      ]);

      const app = buildEntityApp('src/controllers/appControllers/quoteController/paginatedList');
      const res = await request(app).get('/list?page=1&items=10&sortBy=total&sortValue=1');

      expect(res.status).toBe(200);
      expect(res.body.result.map((q) => q.total)).toEqual([50, 100, 200]);
    });
  });

  describe('Invoice (per-entity override)', () => {
    test('returns newest-first by created desc when sortBy is not provided', async () => {
      const client = await seedClient();
      const Invoice = mongoose.model('Invoice');
      const baseDoc = (overrides) => ({
        number: 'INV-DEFAULT',
        year: 2026,
        date: new Date(),
        expiredDate: new Date(),
        client: client._id,
        createdBy: adminId,
        items: [{ itemName: 'X', quantity: 1, price: 1, total: 1 }],
        total: 1,
        currency: 'USD',
        ...overrides,
      });
      await Invoice.create([
        baseDoc({ number: 'INV-OLD', created: new Date('2025-01-01') }),
        baseDoc({ number: 'INV-NEW', created: new Date('2026-04-27') }),
      ]);

      const app = buildEntityApp('src/controllers/appControllers/invoiceController/paginatedList');
      const res = await request(app).get('/list?page=1&items=10');

      expect(res.status).toBe(200);
      expect(res.body.result.map((i) => i.number)).toEqual(['INV-NEW', 'INV-OLD']);
    });
  });

  describe('Generic CRUD (used by Merch / Payment / Factory / etc.)', () => {
    test('Merch — no `created` field, falls back to _id desc tiebreaker', async () => {
      const Merch = mongoose.model('Merch');
      await Merch.create({
        serialNumber: 'A-001',
        description_en: 'first',
        unit_en: 'PC',
        createdBy: adminId,
      });
      await Merch.create({
        serialNumber: 'A-002',
        description_en: 'second',
        unit_en: 'PC',
        createdBy: adminId,
      });
      await Merch.create({
        serialNumber: 'A-003',
        description_en: 'third',
        unit_en: 'PC',
        createdBy: adminId,
      });

      const app = buildGenericApp(Merch);
      const res = await request(app).get('/list?page=1&items=10');

      expect(res.status).toBe(200);
      expect(res.body.result.map((m) => m.serialNumber)).toEqual(['A-003', 'A-002', 'A-001']);
    });

    test('Payment — has `created` field, returns newest-first', async () => {
      const client = await seedClient();
      const Invoice = mongoose.model('Invoice');
      const PaymentMode = mongoose.model('PaymentMode');
      const Payment = mongoose.model('Payment');

      const invoice = await Invoice.create({
        number: 'INV-1',
        year: 2026,
        date: new Date(),
        expiredDate: new Date(),
        client: client._id,
        createdBy: adminId,
        items: [{ itemName: 'X', quantity: 1, price: 1, total: 1 }],
        total: 1,
        currency: 'USD',
      });
      const mode = await PaymentMode.create({
        name: 'cash',
        description: 'cash payment',
        createdBy: adminId,
      });

      const baseDoc = (overrides) => ({
        number: 1,
        date: new Date(),
        amount: 1,
        client: client._id,
        invoice: invoice._id,
        paymentMode: mode._id,
        createdBy: adminId,
        currency: 'USD',
        ...overrides,
      });

      await Payment.create([
        baseDoc({ number: 1, created: new Date('2025-01-01') }),
        baseDoc({ number: 2, created: new Date('2026-01-01') }),
        baseDoc({ number: 3, created: new Date('2026-04-01') }),
      ]);

      const app = buildGenericApp(Payment);
      const res = await request(app).get('/list?page=1&items=10');

      expect(res.status).toBe(200);
      expect(res.body.result.map((p) => p.number)).toEqual([3, 2, 1]);
    });
  });
});
