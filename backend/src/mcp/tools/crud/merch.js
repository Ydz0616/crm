// merch.* MCP tools (A6, issue #52)
//
// Wraps `merchController` (Mongoose model: `Merch`). 4 methods.
//
// search MUST return enough context for the Agent to reference back to the
// user (serialNumber + bilingual description + bilingual unit). Not-found
// surfaces an explicit `{found:false, message}` carrying the queried name —
// CLAUDE.md hard rule: "Agent never silent-errors on missing Merch".
//
// create requires a strict set of fields per the Mongoose schema; Agent must
// collect them from the user (with verbal confirmation) before calling.

const { z } = require('zod');
const merchController = require('@/controllers/appControllers/merchController');
const { runController } = require('../../adapters/controllerAdapter');
const { getSystemAdmin } = require('../../bootstrap');

// description_cn first so partial match wins for both zh and en inquiries
const SEARCH_FIELDS = 'serialNumber,description_cn,description_en,serialNumberLong';

function projectMerch(m) {
  if (!m) return m;
  const o = m.toObject ? m.toObject() : m;
  return {
    _id: o._id,
    serialNumber: o.serialNumber,
    serialNumberLong: o.serialNumberLong,
    description_en: o.description_en,
    description_cn: o.description_cn,
    unit_en: o.unit_en,
    unit_cn: o.unit_cn,
    weight: o.weight,
    VAT: o.VAT,
    ETR: o.ETR,
  };
}

async function call(method, input) {
  return runController(method, { ...input, admin: getSystemAdmin() });
}

const search = {
  name: 'merch.search',
  description:
    'Search merchandise by serialNumber or bilingual description (case-insensitive partial). Returns {found:true, results:[{serialNumber, description_en, description_cn, unit_en, unit_cn, ...}]} or {found:false, message:"No match for [product name]; please add it in Merchandise"}. Never returns an empty array.',
  inputSchema: {
    q: z
      .string()
      .min(1)
      .describe('Product name or serial number — partial match in EN/CN'),
  },
  handler: async ({ q }) => {
    const res = await call(merchController.search, {
      query: { q, fields: SEARCH_FIELDS },
    });
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      return { ok: true, data: { found: true, results: res.data.map(projectMerch) } };
    }
    return {
      ok: true,
      data: {
        found: false,
        message: `No match for ${q}; please add it in Merchandise`,
      },
    };
  },
};

const read = {
  name: 'merch.read',
  description: 'Read a single merchandise item by id.',
  inputSchema: { id: z.string().min(1).describe('Merch _id') },
  handler: async ({ id }) => {
    const res = await call(merchController.read, { params: { id } });
    if (res.ok && res.data) return { ok: true, data: projectMerch(res.data) };
    return res;
  },
};

const create = {
  name: 'merch.create',
  description:
    'Create a new merchandise item. ALL fields are required by the schema. The Agent MUST collect every field from the user and read them back verbally for confirmation before calling (human-in-the-loop). Numeric fields (weight/VAT/ETR) must be numbers, not strings.',
  inputSchema: {
    serialNumber: z.string().min(1).describe('SKU / serial number (required, key)'),
    serialNumberLong: z.string().min(1).describe('Long form serial number (required)'),
    description_en: z.string().min(1).describe('English description (required)'),
    description_cn: z.string().min(1).describe('Chinese description (required)'),
    weight: z.number().describe('Unit weight, kg (required)'),
    VAT: z.number().describe('VAT rate (required)'),
    ETR: z.number().describe('ETR rate (required)'),
    unit_en: z.string().min(1).describe('English unit, e.g. PCS (required)'),
    unit_cn: z.string().min(1).describe('Chinese unit, e.g. 个 (required)'),
  },
  handler: async (input) => call(merchController.create, { body: input }),
};

const update = {
  name: 'merch.update',
  description:
    'Update a merchandise item by id. Pass only fields to change. The Agent SHOULD echo the change to the user before calling.',
  inputSchema: {
    id: z.string().min(1),
    serialNumber: z.string().optional(),
    serialNumberLong: z.string().optional(),
    description_en: z.string().optional(),
    description_cn: z.string().optional(),
    weight: z.number().optional(),
    VAT: z.number().optional(),
    ETR: z.number().optional(),
    unit_en: z.string().optional(),
    unit_cn: z.string().optional(),
  },
  handler: async ({ id, ...patch }) =>
    call(merchController.update, { params: { id }, body: patch }),
};

module.exports = { tools: [search, read, create, update] };
