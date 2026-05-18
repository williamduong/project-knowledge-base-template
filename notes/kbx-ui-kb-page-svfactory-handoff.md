# SVFactory Handoff — KB Page Runtime Wiring

> Status: Slices A, B, C-1, C-2, C-3, C-4 all shipped 2026-05-18. Live KB page is now DB-first with drift detection, two-way sync, and inline edit. See `notes/kbx-ui-kb-page-runtime-contract.md` audit log for per-slice detail.
> Triggered by: KBX UI Builder (slice 3 of the /kb page is mock-backed and ready to switch to live data)
> Authority: KBX UI Builder may not expand the bridge from a UI slice; this note hands the work off explicitly so SVFactory owns the L2/L3/L4/L5 changes.
> Read together with: `notes/kbx-ui-kb-page-runtime-contract.md` (the contract this handoff implements)

---

## Why this exists

The `/kb` route in `site/uiv2` is fully built against generated mock data (`site/uiv2/src/app/mock/kb-data.generated.ts`, produced by `scripts/gen-kb-mock.mjs`). Three things still live on the UI side that should not:

1. Tree walk + frontmatter parse + markdown render — currently runs in a Node script at code-gen time, not at runtime.
2. Active-roots persistence — currently localStorage in the browser, invisible to `kbx` CLI and not synced across machines.
3. Doc body rendering — bundled into the UI build instead of streamed from a snapshot-backed endpoint.

SVFactory owns the move from "good enough for slice 3" to "snapshot-backed, layer-clean".

---

## Two-slice split

Pick this split unless there is a strong reason to bundle:

### Slice A — Read endpoints + collector (no mutation, no L5)

Goal: UI swaps `useKbTree` / `useKbDoc` from mock imports to `apiGet(...)` without changing any other behavior.

Scope:
- L4: server-side markdown renderer and frontmatter parser as a deterministic lib (not in a route handler). Port the logic from `scripts/gen-kb-mock.mjs` (`parseFrontmatter`, `renderMd`, `extractHeadings`) into `src/lib/kb-content.mjs` or similar; keep the function signatures pure.
- L3: extend `site/kbx-ui/system-snapshot-store.mjs` with a `kb` block per `notes/kbx-ui-kb-page-runtime-contract.md` ("Required Snapshot Block"). Use **lazy-cached** strategy for `kb.docs` as locked in that note. `kb.tree` is populated eagerly on snapshot refresh.
- L2: add four read endpoints to `site/kbx-ui/server.mjs`:
  - `GET /api/kb/tree`
  - `GET /api/kb/doc?path=`
  - `GET /api/kb/roots`
  - `GET /api/kb/impact?path=`
  Each one reads only from the snapshot store. None of them invokes `kbx`, `git`, `doctor`, `rules`, or `chaos` at request time.
- L3 trigger: `POST /api/kb/refresh` with optional `{ path? }` body (KB-only fast refresh, invalidates `kb.tree` and clears `kb.docs` cache).
- UI: replace the bodies of `useKbTree` and `useKbDoc` in `site/uiv2/src/app/hooks/useKb.ts` with `apiGet`. Add `useKbRoots()` for the workspace-folders dialog (still localStorage for active set in Slice A).

Active-roots remains in localStorage until Slice B.

Out of scope for Slice A:
- mutations
- any change to focus.state.json or other L5 stores

### Slice B — Mutation + L5 persistence for active roots

Goal: active-root set becomes machine-readable workspace state, not browser-local.

Scope:
- L5: new state file `site/kbx-ui/.runtime-state/kb-roots.json` with `{ activeRoots: string[], updatedAt }`. Document the file in `runtime-control-plane-architecture.md`.
- L4: helper to validate a candidate root: path is inside the workspace, exists, and contains at least one `.md` or `.html` file at any depth.
- L2 mutations on `site/kbx-ui/server.mjs`:
  - `POST /api/kb/roots` with `{ path, label? }` — validate, append to L5, trigger KB refresh, return the new set.
  - `DELETE /api/kb/roots/:path` — remove from L5, trigger refresh, return the new set.
- L3: include `kb.activeRoots` and `kb.rootCandidates` in the snapshot per the contract note.
- UI: replace localStorage in `KnowledgeBasePage.tsx` with `useKbRoots()` + `useAddKbRoot()` / `useRemoveKbRoot()` mutations. Drop the `ACTIVE_ROOTS_KEY` constant and the `readActiveRoots/writeActiveRoots` helpers.

---

## Non-negotiables (these are the architecture rules)

From `svfactory/runtime-control-plane-architecture.md`:

- L2 read endpoints must return cached snapshot only. Don't add a route handler that walks the filesystem on request.
- The collector module (`system-snapshot-store.mjs`) owns parse + cache. Route handlers stay pure readers.
- Lazy-cached docs are still snapshot-backed — the cache *is* the store. A first-hit parse on `/api/kb/doc` is allowed because it is bounded and deterministic. It does **not** invoke `kbx`, `git`, or `doctor`.
- New endpoints must declare in the response (or in the route comment) whether they are: read snapshot / refresh collector / mutation.

If any of these forces a redesign mid-slice, stop and reopen this note instead of finding a workaround in the route handler.

---

## Acceptance for Slice A

A slice is done only when all of the following are true:

- `curl http://localhost:<port>/api/kb/tree` returns the multi-root shape from `notes/kbx-ui-kb-page-runtime-contract.md` and the response stays stable across multiple consecutive calls without a refresh in between.
- `curl http://localhost:<port>/api/kb/doc?path=knowledge-base/15-governance/metadata-schema.md` returns frontmatter + headings + html, all populated.
- `POST /api/kb/system-snapshot/refresh` does not re-parse every KB doc; only `kb.tree` is rebuilt eagerly.
- A first call to `/api/kb/doc?path=X` parses doc X once; subsequent calls return `fromCache: true` until the next refresh.
- No KB endpoint triggers `kbx`, `git`, `doctor`, `rules`, or `chaos` on the request path (verifiable by tailing `runtime-services-cron.mjs` logs while hitting the endpoints).
- `notes/kbx-ui-kb-page-runtime-contract.md` audit case is updated to reflect what shipped.
- UI in `site/uiv2` swaps its mock imports to `apiGet` and the `/kb` page renders the same as before with `npm run dev`.

## Acceptance for Slice B

Adds, on top of Slice A:

- `kb-roots.json` exists, is writable, and survives server restart.
- `POST /api/kb/roots` and `DELETE /api/kb/roots/:path` round-trip through L5; the tree refreshes after each call.
- UI removes `ACTIVE_ROOTS_KEY` localStorage and depends only on snapshot data.
- Two clients in two tabs see the same active-root set within one refresh cycle.

---

## File touch list (informational, SVFactory may refactor)

Slice A:
- `src/lib/kb-content.mjs` (new) — frontmatter parser + markdown renderer extracted from `scripts/gen-kb-mock.mjs`
- `site/kbx-ui/system-snapshot-store.mjs` — add `kb` block + lazy-cache logic
- `site/kbx-ui/server.mjs` — add four read endpoints + `POST /api/kb/refresh`
- `site/uiv2/src/app/hooks/useKb.ts` — swap mock for `apiGet`
- `notes/kbx-ui-kb-page-runtime-contract.md` — audit cases updated

Slice B:
- `site/kbx-ui/.runtime-state/kb-roots.json` (new, gitignored runtime file)
- `src/lib/kb-roots.mjs` (new) — validate-candidate helper
- `site/kbx-ui/system-snapshot-store.mjs` — surface `kb.activeRoots`, `kb.rootCandidates`
- `site/kbx-ui/server.mjs` — add `POST /api/kb/roots`, `DELETE /api/kb/roots/:path`
- `site/uiv2/src/app/pages/KnowledgeBasePage.tsx` — drop localStorage, use mutations
- `svfactory/runtime-control-plane-architecture.md` — note the new L5 file
- `notes/kbx-ui-kb-page-runtime-contract.md` — audit cases updated

---

## What can go wrong (open questions for SVFactory to answer before coding)

1. **Markdown renderer choice.** The mock uses a custom function. The server-side renderer should be either (a) the same function ported as-is, or (b) a small well-known lib like `marked` (no plugins). Decide and lock before Slice A.
2. **Snapshot cost.** With 321 docs and lazy-cache for bodies, `kb.tree` parses 321 frontmatters every full refresh. Is that acceptable, or does the collector need an mtime-based dirty check?
3. **Refresh fan-out.** Does `POST /api/kb/refresh { path }` invalidate just the one doc and re-walk the parent folder, or is full-tree re-walk acceptable for slice A's scale?
4. **L5 file lock.** Slice B's `kb-roots.json` could race with concurrent UI clients. Pick: process-level mutex inside `kbx-ui`, or atomic rename (write to temp, rename).
5. **Mounting external paths.** If a user POSTs a root that resolves outside the workspace root (symlinks, `..`), the validator must reject. Decide on the canonical "workspace root" definition before Slice B.

---

## Trigger

When ready to start, use:

```text
/svfactory-runtime-contract
```

and reference this note plus `notes/kbx-ui-kb-page-runtime-contract.md`.
