# src/contracts/ — FE↔BE Contract Layer

Single source of truth for every request/response shape crossing the FE↔BE boundary, plus every cross-layer convention that was previously implicit (entity_id literals, version regex, lifecycle enums, magic strings).

## Why this exists

Audit 2026-05-19 found:

- 6 state surfaces (Goals, Intents, Focus, Rules, KB tree, Runtime services), each with implicit conventions scattered across `src/lib/*.js` and `site/kbx-ui/server.mjs`.
- 44 routes, 9 frontend hooks, **zero** typed contract between them. Frontend uses `apiGet<T>` casts; backend invents response shape inline per route.
- Recurring incident pattern: agent writes state at storage layer, claims done, user opens UI, sees nothing.

This module fixes the root cause: every shape and every convention must live here, encoded in zod, consumed by both adapters (HTTP + CLI) and by FE codegen.

## Layering position

```
src/contracts/      ← THIS MODULE — schemas only, no IO
src/domain/         ← entities + invariants, imports contracts
src/repos/          ← storage backends, imports contracts + domain
src/services/       ← use cases, imports repos + contracts
src/adapters/       ← cli + http, imports services + contracts
```

Contracts have **zero** dependencies on `src/lib/`, `node:fs`, `node:sqlite`, Express, React, or any IO library. Pure schemas.

## Conventions for adding a contract

Every surface gets its own file: `<surface>.contract.js`.

Inside, export:

- **Entity schemas** — entity invariants (e.g., `SystemGoal.entity_id = z.literal('workspace')`)
- **Request schemas** — one per input shape (create body, update patch, query params)
- **Response schemas** — one per response shape (list, tree, detail)
- **Operation map** — mapping of operation name → request schema + response schema. Used by both HTTP adapter and CLI adapter to wire routes/commands without duplicating glue.
- **Constants** — any literal or regex previously hardcoded in `server.mjs` or `src/lib/`

Example skeleton:

```js
const { z } = require('zod');
const { ApiResponse } = require('./common');

const Service = z.object({ id: z.string(), running: z.boolean(), /* ... */ });
const SummaryResponse = ApiResponse.extend({ services: z.array(Service) });

const operations = {
  list:    { request: z.void(), response: SummaryResponse },
  ensure:  { request: z.object({ id: z.string() }), response: ApiResponse },
};

module.exports = { Service, SummaryResponse, operations };
```

## Validation rules

- All response schemas extend `ApiResponse` (from `common.js`) to enforce `{ ok: boolean, ... }`.
- All convention literals go in `common.js` constants (e.g., `WORKSPACE_ENTITY_ID`, `VERSION_BUCKET_REGEX`).
- Use `z.literal()` for fixed values, not `z.string()`. The whole point is to encode conventions.
- Discriminated unions where state varies by `entity_level` or `kind`.
- Schemas are **append-only** within a contract version. Breaking changes bump contract version (see versioning below).

## How adapters consume contracts

Both `src/adapters/http/` and `src/adapters/cli/` use the same operations map:

```js
const { operations } = require('../../contracts/runtime-services.contract');

// HTTP adapter:
app.get('/api/runtime-services', async (req, res) => {
  const result = await runtimeServicesService.list();
  const validated = operations.list.response.parse(result);
  res.status(200).json(validated);
});

// CLI adapter:
program.command('runtime-services list').action(async () => {
  const result = await runtimeServicesService.list();
  const validated = operations.list.response.parse(result);
  console.log(JSON.stringify(validated, null, 2));
});
```

Parsing at the adapter boundary catches schema drift immediately — exit 1, no silent corruption.

## How FE consumes contracts

`tools/gen-fe-client.js` reads all `*.contract.js`, generates:

- TypeScript types via `z.infer<typeof Schema>` equivalent
- Typed fetch wrappers per operation
- Output to `site/uiv2/src/shared/api/generated/`

Frontend hooks import from `generated/`, never from `apiGet<T>` casts.

## Versioning

Each contract file declares `CONTRACT_VERSION` (semver). Breaking changes bump major. Adapters check version compatibility at runtime startup.

## Out of scope

- This module does NOT implement business logic.
- This module does NOT touch storage.
- This module does NOT generate code (codegen lives in `tools/gen-fe-client.js`).
