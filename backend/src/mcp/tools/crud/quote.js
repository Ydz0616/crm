// quote.* MCP tools (A7, issue #53)
//
// Wraps `quoteController`. 4 methods: search / read / create / update.
// NO delete in v1 (TD).
//
// quote.create is the heart of the Lead-to-Quote loop. Special rules:
//   - items[].price may be null  → MCP layer rewrites to 0 (Joi requires
//     number; price=0 is the "Agent didn't get a price" sentinel and the
//     salesperson edits it before sending). Memory locks this contract.
//   - `total` field is rejected at the MCP layer — server recomputes via
//     helpers.calculate.* (B-phase rule).
//   - currency / exchangeRate enforcement (USD→1, CNY>1 required) is
//     delegated to the controller (B3) — we do not duplicate the rule here.
//   - Sensible defaults are auto-filled when the Agent omits boilerplate:
//     number (Q-yyyymmddHHMM), year (current), status ('draft'),
//     date (today), expiredDate (today + 30d).
//
// quote.search currently matches on the `number` field only — that's the
// only short text identifier on the schema. Reads via id are the primary
// access pattern; search is a fallback for the Agent.

const { z } = require('zod');
const mongoose = require('mongoose');
const quoteController = require('@/controllers/appControllers/quoteController');
const { runController } = require('../../adapters/controllerAdapter');

// Auto-fill `items[].description` from the Merch master record (by
// serialNumber) so the generated Quote shows meaningful descriptions in
// the UI even when the Agent only passed itemName/quantity/price.
// EN preferred, falls back to CN (Phase N en-first default; Ola serves
// both US and CN markets, salesperson sets quote-document language at
// the consolidating step, default English). Items where the Agent
// already provided a description are left untouched. Items whose itemName
// doesn't match any Merch are also left untouched (no silent failure,
// no fabrication).
//
// Returns `{items, warnings}`. `warnings[]` is non-empty whenever an item
// ended up with a blank description that the salesperson will have to
// back-fill manually — either because the serialNumber wasn't found or
// because the Merch record itself has no description. The caller surfaces
// these into the MCP envelope so the Agent can read them verbatim to the
// salesperson (per SOUL.md). Never silent — see issue #58.
async function enrichItemDescriptions(items) {
  const Merch = mongoose.model('Merch');
  const warnings = [];

  const serialNumbersToLookUp = items
    .filter((it) => !it.description && it.itemName)
    .map((it) => it.itemName);

  if (serialNumbersToLookUp.length === 0) {
    return { items, warnings };
  }

  const merchDocs = await Merch.find({
    serialNumber: { $in: serialNumbersToLookUp },
    removed: false,
  }).lean();
  const bySerial = new Map(merchDocs.map((m) => [m.serialNumber, m]));

  const enriched = items.map((it) => {
    if (it.description) return it;
    const m = bySerial.get(it.itemName);
    if (!m) {
      warnings.push(
        `${it.itemName}: serialNumber not matched in Merch — description and unit left blank`,
      );
      return it;
    }
    const description = m.description_en || m.description_cn || '';
    if (!description) {
      warnings.push(
        `${it.itemName}: found in Merch but both description_cn and description_en are empty — description left blank`,
      );
    }
    return { ...it, description };
  });

  return { items: enriched, warnings };
}

async function call(method, input) {
  // ISO3 (issue #185): admin injected by server.js → context → buildReq.
  return runController(method, input);
}

function pad2(n) { return n < 10 ? `0${n}` : `${n}`; }

function defaultQuoteNumber(now = new Date()) {
  return `Q-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
}

function plusDays(d, days) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

const ItemShape = z.object({
  itemName: z.string().min(1).describe('Merch serialNumber or human-readable label'),
  quantity: z.number().positive(),
  price: z.number().nullable().describe('Unit price; null = Agent did not get a price (rewritten to 0 server-side, salesperson fills later)'),
  description: z.string().optional(),
  unit_en: z.string().optional(),
  unit_cn: z.string().optional(),
});

const search = {
  name: 'quote.search',
  description: 'Search quotes by quote number (partial match). Returns {found:true, results:[...]} or {found:false, message}.',
  inputSchema: {
    q: z.string().min(1).describe('Quote number fragment'),
  },
  handler: async ({ q }) => {
    const res = await call(quoteController.search, { query: { q, fields: 'number' } });
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      return { ok: true, data: { found: true, results: res.data } };
    }
    return { ok: true, data: { found: false, message: 'No matching quote' } };
  },
};

const read = {
  name: 'quote.read',
  description: 'Read a single quote by id (includes items, totals, currency, status).',
  inputSchema: { id: z.string().min(1) },
  handler: async ({ id }) => call(quoteController.read, { params: { id } }),
};

const create = {
  name: 'quote.create',
  description:
    'Create a new draft quote. Required: client (customer _id), items[], currency. Optional: exchangeRate (REQUIRED and >1 when currency=CNY; must be 1 or omitted when currency=USD). The Agent must NOT pass `total` — it is computed server-side. Items with unknown price should be sent as price:null (rewritten to 0; salesperson fills before sending).',
  inputSchema: {
    client: z.string().min(1).describe('Customer _id from customer.search/create'),
    currency: z.enum(['USD', 'CNY']),
    exchangeRate: z.number().positive().optional(),
    items: z.array(ItemShape).min(1),
    notes: z.array(z.string()).optional(),
    termsOfDelivery: z.array(z.string()).optional(),
    paymentTerms: z.array(z.string()).optional(),
    freight: z.number().optional(),
    discount: z.number().optional(),
  },
  handler: async (input) => {
    // MCP-layer guard: total is server-computed, never trusted from caller.
    if ('total' in input) {
      return {
        ok: false,
        code: 'VALIDATION',
        message: 'quote.create rejects `total` — totals are computed server-side',
      };
    }

    // Rewrite null prices → 0 (Joi requires number; price=0 is the "no price yet" sentinel).
    let items = input.items.map((it) => ({
      itemName: it.itemName,
      description: it.description || '',
      quantity: it.quantity,
      price: it.price == null ? 0 : it.price,
      total: 0, // server recomputes
      unit_en: it.unit_en || '',
      unit_cn: it.unit_cn || '',
    }));
    const enrichResult = await enrichItemDescriptions(items);
    items = enrichResult.items;
    const warnings = enrichResult.warnings;

    const now = new Date();
    const body = {
      client: input.client,
      number: defaultQuoteNumber(now),
      year: now.getFullYear(),
      status: 'draft',
      date: now,
      expiredDate: plusDays(now, 30),
      currency: input.currency,
      items,
      notes: input.notes || [],
      termsOfDelivery: input.termsOfDelivery || [],
      paymentTerms: input.paymentTerms || [],
      freight: input.freight ?? 0,
      discount: input.discount ?? 0,
    };
    if (input.exchangeRate !== undefined) body.exchangeRate = input.exchangeRate;

    const result = await call(quoteController.create, { body });
    if (result.ok && warnings.length > 0) {
      return { ...result, warnings };
    }
    return result;
  },
};

const update = {
  name: 'quote.update',
  description:
    'Update a quote by id. Caller must pass the FULL quote body (items, currency, etc) — this is a replace-style update enforced by the controller. The Agent should typically read first, modify, then update.',
  inputSchema: {
    id: z.string().min(1),
    client: z.string().min(1),
    currency: z.enum(['USD', 'CNY']),
    exchangeRate: z.number().positive().optional(),
    items: z.array(ItemShape).min(1),
    status: z.string().optional(),
    notes: z.array(z.string()).optional(),
    termsOfDelivery: z.array(z.string()).optional(),
    paymentTerms: z.array(z.string()).optional(),
    freight: z.number().optional(),
    discount: z.number().optional(),
    number: z.string().optional(),
    year: z.number().optional(),
    date: z.string().optional(),
    expiredDate: z.string().optional(),
  },
  handler: async ({ id, ...rest }) => {
    if ('total' in rest) {
      return {
        ok: false,
        code: 'VALIDATION',
        message: 'quote.update rejects `total` — totals are computed server-side',
      };
    }
    let items = rest.items.map((it) => ({
      itemName: it.itemName,
      description: it.description || '',
      quantity: it.quantity,
      price: it.price == null ? 0 : it.price,
      total: 0,
      unit_en: it.unit_en || '',
      unit_cn: it.unit_cn || '',
    }));
    const enrichResult = await enrichItemDescriptions(items);
    items = enrichResult.items;
    const warnings = enrichResult.warnings;
    const now = new Date();
    const body = {
      client: rest.client,
      number: rest.number || defaultQuoteNumber(now),
      year: rest.year || now.getFullYear(),
      status: rest.status || 'draft',
      date: rest.date || now,
      expiredDate: rest.expiredDate || plusDays(now, 30),
      currency: rest.currency,
      items,
      notes: rest.notes || [],
      termsOfDelivery: rest.termsOfDelivery || [],
      paymentTerms: rest.paymentTerms || [],
      freight: rest.freight ?? 0,
      discount: rest.discount ?? 0,
    };
    if (rest.exchangeRate !== undefined) body.exchangeRate = rest.exchangeRate;
    const result = await call(quoteController.update, { params: { id }, body });
    if (result.ok && warnings.length > 0) {
      return { ...result, warnings };
    }
    return result;
  },
};

module.exports = {
  tools: [search, read, create, update],
  // Test-only export — enrichItemDescriptions is the auto-fill helper that
  // populates `description` from Merch.description_en (preferred) or
  // description_cn (fallback). Surfaced so backend/test/language.test.js can
  // assert the en-first ordering without spinning the full quote.create stack.
  __forTesting: { enrichItemDescriptions },
};
