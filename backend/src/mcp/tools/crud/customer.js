// customer.* MCP tools (A5, issue #51)
//
// Wraps the existing `clientController` (Mongoose model: `Client`). 4 methods:
// search / read / create / update. NO delete in v1 (tracked as TD).
//
// Search semantics: never returns an empty array. On no matches we surface
// `{ found: false, message: 'No matching customer' }` so the Agent has an explicit
// signal to ask the user for more details (CLAUDE.md MVP rule).
//
// All tools impersonate the cached system admin (see ../../bootstrap.js).

const { z } = require('zod');
const clientController = require('@/controllers/appControllers/clientController');
const { runController } = require('../../adapters/controllerAdapter');
const { getSystemAdmin } = require('../../bootstrap');

const SEARCH_FIELDS = 'name,email,phone,country';

async function call(method, input) {
  return runController(method, { ...input, admin: getSystemAdmin() });
}

const search = {
  name: 'customer.search',
  description:
    'Search customers (clients) by name / email / phone / country (case-insensitive partial match). Returns {found:true, results:[...]} or {found:false, message}.',
  inputSchema: {
    q: z.string().min(1).describe('Search query — partial match across name/email/phone/country'),
  },
  handler: async ({ q }) => {
    const res = await call(clientController.search, {
      query: { q, fields: SEARCH_FIELDS },
    });
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      return { ok: true, data: { found: true, results: res.data } };
    }
    // controller returns 202 success:false on no matches → adapter maps to ok:false INTERNAL.
    // We re-translate to a successful "not found" envelope so the Agent doesn't crash.
    if (!res.ok || (Array.isArray(res.data) && res.data.length === 0)) {
      return {
        ok: true,
        data: { found: false, message: 'No matching customer' },
      };
    }
    return res;
  },
};

const read = {
  name: 'customer.read',
  description: 'Read a single customer by id.',
  inputSchema: {
    id: z.string().min(1).describe('Customer _id'),
  },
  handler: async ({ id }) => call(clientController.read, { params: { id } }),
};

const create = {
  name: 'customer.create',
  description:
    'Create a new customer. `name` is required; phone/email/country/address are optional. The Agent MUST confirm all fields with the user verbally before calling this (human-in-the-loop policy).',
  inputSchema: {
    name: z.string().min(1).describe('Customer / company name (required)'),
    phone: z.string().optional(),
    email: z.string().optional(),
    country: z.string().optional(),
    address: z.string().optional(),
  },
  handler: async (input) => call(clientController.create, { body: input }),
};

const update = {
  name: 'customer.update',
  description:
    'Update an existing customer by id. Pass only the fields to change. The Agent SHOULD echo the change to the user before calling this.',
  inputSchema: {
    id: z.string().min(1).describe('Customer _id'),
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    country: z.string().optional(),
    address: z.string().optional(),
  },
  handler: async ({ id, ...patch }) =>
    call(clientController.update, { params: { id }, body: patch }),
};

module.exports = { tools: [search, read, create, update] };
