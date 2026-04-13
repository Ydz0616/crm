# MCP compute tools

Extension slot for deterministic compute tools that don't talk to the database
— pure functions exposed over MCP so NanoBot can offload math from the LLM.

Planned (not yet implemented):

- `profitMargin.js` — profit / margin from cost + price + qty
- `freightCalc.js`  — freight estimation from weight + volume + zone tariff
- `fxConvert.js`    — currency conversion using a snapshot rate

## Adding a new compute tool

1. Create `backend/src/mcp/tools/compute/<name>.js`
2. Export the standard tool contract (see `backend/src/mcp/tools/registry.js`):

   ```js
   module.exports = {
     name: 'compute.profitMargin',
     description: '...',
     inputSchema: { /* zod raw shape */ },
     handler: async (input) => ({ ok: true, data: { ... } }),
   };
   ```

3. Restart the MCP server (`npm run mcp:dev` from `backend/`).
   The registry auto-discovers the file — **no edits to `server.js` or
   `registry.js` required**.

4. Verify it appears in `tools/list` and that calling it returns the expected
   envelope. Add a curl smoke test to the PR description.

## Conventions

- Compute tools must be **pure** (no DB, no network, no side effects).
- Money math MUST use `helpers.calculate.*` — never native `+ - * /`
  (float precision rule from `CLAUDE.md`).
- Return the unified envelope `{ ok, data?, code?, message? }`.
- Files starting with `_` are skipped — use that prefix for shared helpers.
