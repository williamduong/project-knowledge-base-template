# KBX UI Knowledge Base Page Runtime Contract

## Purpose

This note records the runtime contract expectations for the UIV2 Knowledge Base page (three-pane reader: folder tree, document body, TOC/Meta rail).

It exists so KBX UI Builder can build the KB slice against a stable mock-then-wire contract, without silently expanding the bridge from a UI slice. Anything in this note that does not yet exist in `site/kbx-ui/server.mjs` or the snapshot collector is an **SVFactory follow-up** to be implemented at L3 (collector) and L2 (read API), per `svfactory/runtime-control-plane-architecture.md`.

## Scope

- UI slice: `site/uiv2/src/app/pages/KnowledgeBasePage.tsx`
- Source of truth on disk: **any folder under the workspace root** containing `.md` or `.html` files. `knowledge-base/` is the default root, not the only one — the UI is a VS Code-style multi-root workspace where the operator can mount any project folder.
- Allowed file extensions (server-side filter): `.md`, `.html`. All other files (e.g. `.js`, `.ts`, `.json`) are excluded from tree walks even when their parent folder is mounted.
- Impact data on disk: `knowledge-base/.kb/impact.json`
- Layer ownership:
  - L1 (UI) reads through `useKbTree()`, `useKbDoc(path)`, `useKbImpact(path)` only.
  - L2 serves snapshot-backed read endpoints; no live `git`/`doctor`/`rules` execution on read path.
  - L3 collector parses the KB tree + frontmatter on refresh and on controlled cadence.
  - L4 deterministic helpers (frontmatter parser, markdown→html) are CLI/runtime libs, not route handlers.

Out of scope for this contract:
- Editing documents from the UI (separate mutation contract).
- Rebuilding `impact.json` from the UI (already produced by `kbx` CLI; UI only reads).

## Default UI Behavior That Drives The Contract

- Left rail (folder tree) is expanded by default → `kbTree` must be available on first render of KB page without an explicit refresh.
- Right rail (TOC/Meta) is collapsed/floating by default → `kbDoc.headings` and frontmatter must arrive in the same payload as the body, so opening the floating rail does not trigger a second slow request.
- Tree grouping follows the literal folder structure under `knowledge-base/` (00–16), not document `type`. Type appears only as a per-node badge.

## Required Endpoints

All three are pure read endpoints. They must be served from the snapshot store and must not execute `kbx` subcommands at request time.

### `GET /api/kb/tree`

Returns the multi-root tree with per-document metadata sufficient to render badges in the left rail. **Breaking change vs the original draft**: the response now exposes `roots: KbRootNode[]` instead of a single `root`, because the UI mounts multiple workspace folders à la VS Code.

Each root carries the per-folder shape used elsewhere, plus a `label` and `defaultActive` flag so the UI can render the workspace-folders dialog.

Response shape:

```json
{
  "generatedAt": "2026-05-17T08:00:00Z",
  "roots": [{
    "path": "knowledge-base",
    "kind": "folder",
    "title": "knowledge-base",
    "label": "knowledge-base",
    "defaultActive": true,
    "docCount": 232,
    "stalest": { "path": "...", "daysSinceVerified": 92 },
    "children": [
      {
        "path": "knowledge-base/00-start-here",
        "kind": "folder",
        "title": "00-start-here",
        "docCount": 12,
        "stalest": { "path": "...", "daysSinceVerified": 87 },
        "children": [
          {
            "path": "knowledge-base/00-start-here/how-to-use-this-kb.md",
            "kind": "doc",
            "title": "How To Use This KB",
            "type": "orientation",
            "status": "active",
            "verification": "unverified",
            "time_state": "current",
            "owner": "knowledge-management",
            "last_updated": "2026-05-02",
            "last_verified": "2026-04-28",
            "daysSinceVerified": 19,
            "stale": false,
            "tags": ["index", "navigation"]
          }
        ]
      }
    ]
  }]
}
```

Companion endpoints:
- `GET /api/kb/roots` — returns the list of candidate roots discoverable on disk (folders under the workspace root containing at least one allowed file), each with `{ path, label, defaultActive, docCount }`.
- `POST /api/kb/roots` `{ path, label? }` — add a new root to the active set. Server validates path is inside the workspace and contains at least one allowed file.
- `DELETE /api/kb/roots/:path` — remove a root from the active set. Active-root persistence belongs to L5 state, not UI-only localStorage, once this endpoint exists.

Notes:
- `daysSinceVerified` is computed at refresh time, not at request time, against the snapshot's `generatedAt`.
- Server-side ext filter: only `.md` and `.html`. Files outside this allowlist are silently skipped during the tree walk. The list is intentionally narrow to keep the tree focused on doc-like artifacts.
- `stale` is true when `daysSinceVerified > 60` (amber threshold) — exact thresholds may live in `metadata-schema` later; pick 60/180 as initial defaults and expose them as config later.
- Folder nodes carry `stalest` so the tree can render an aggregate dot on the folder row without traversing children in the UI.
- `kind` is `"folder" | "doc"`. Non-`.md` files are excluded.
- `title` falls back to first H1 if frontmatter `title` is missing; `type`/`status` fall back to `"unknown"` so the UI can render a neutral chip.

### `GET /api/kb/doc?path=<relative-path>`

Returns one document's parsed frontmatter, rendered body, and heading list.

Response shape:

```json
{
  "path": "knowledge-base/15-governance/metadata-schema.md",
  "frontmatter": {
    "title": "Metadata Schema",
    "type": "governance",
    "status": "active",
    "owner": "knowledge-management",
    "time_state": "current",
    "verification": "self-referential",
    "last_updated": "2026-05-09",
    "last_verified": "2026-05-01",
    "last_verified_commit": null,
    "source_of_truth": null,
    "related_strong": [],
    "related_weak": [],
    "released_in": null,
    "extraction_sources": [],
    "tags": ["governance", "metadata"]
  },
  "headings": [
    { "id": "boundary-and-naming-reference", "level": 2, "text": "Boundary and Naming Reference" },
    { "id": "required-frontmatter",          "level": 2, "text": "Required Frontmatter" }
  ],
  "html": "<h2 id=\"...\">...</h2>...",
  "fromCache": true,
  "snapshotAt": "2026-05-17T08:00:00Z"
}
```

Notes:
- `html` is server-rendered markdown. Anchor IDs must match `headings[].id` exactly (scrollspy contract).
- `path` is validated against `contentRoot`. Reject any path that escapes `knowledge-base/`.
- `headings` is required so the right-rail Outline tab does not need to re-parse markdown in the browser.
- The endpoint must remain pure: no `git blame`, no `doctor`, no verification recomputation on request.

### `GET /api/kb/impact?path=<relative-path>`

Returns 1-hop impact data for one document, sourced from `knowledge-base/.kb/impact.json`.

Response shape:

```json
{
  "path": "knowledge-base/15-governance/metadata-schema.md",
  "incoming_strong": ["..."],
  "incoming_weak":   ["..."],
  "outgoing_strong": ["..."],
  "outgoing_weak":   ["..."],
  "affectedCount": 7,
  "impactGeneratedAt": "2026-05-17T07:55:00Z"
}
```

Notes:
- If `impact.json` is missing or stale relative to snapshot, return `200` with empty arrays plus `impactGeneratedAt: null`. The UI shows a "Impact data unavailable" hint; it must not crash.
- Re-running `kbx impact` is a CLI/collector concern, not a request-path concern.

## Required Snapshot Block

Add a `kb` block to the system snapshot owned by `site/kbx-ui/system-snapshot-store.mjs`:

```json
{
  "kb": {
    "tree": { "roots": [ /* same shape as /api/kb/tree response.roots */ ] },
    "rootCandidates": [ /* discoverable roots not yet active */ ],
    "activeRoots": [ "knowledge-base" ],
    "docs": {
      "<relative-path>": {
        "frontmatter": { /* ... */ },
        "headings":    [ /* ... */ ],
        "html":        "..."
      }
    },
    "impactGeneratedAt": "2026-05-17T07:55:00Z",
    "thresholds": { "staleAmberDays": 60, "staleRedDays": 180 }
  }
}
```

**Locked strategy: Lazy-cached.**

- Collector populates `kb.tree` eagerly on snapshot refresh (cheap; just walks frontmatter).
- `kb.docs[path]` is filled on first `/api/kb/doc?path=` call and kept in the snapshot store until next full refresh or explicit KB refresh invalidation.
- The store, not the route handler, owns parse + cache. Route handlers stay pure readers.
- A cache miss on `/api/kb/doc` triggers a single deterministic parse via L4 helpers and returns; this is allowed because parsing a single markdown file is bounded and deterministic, not the kind of mixed-layer recomputation forbidden by the architecture rules. It does **not** run `kbx`/`git`/`doctor`.

## Refresh Semantics

- Triggered by the existing snapshot refresh path (`POST /api/system-snapshot/refresh`) — invalidates `kb.tree` and the entire `kb.docs` cache.
- **`POST /api/kb/refresh` (KB-only fast refresh) is in scope.** It re-walks `knowledge-base/**/*.md` to rebuild `kb.tree` and clears `kb.docs` cache, without rebuilding the rest of the system snapshot. Cheaper than a full snapshot refresh after the user edits a KB doc.
- Optional `POST /api/kb/refresh` body: `{ path?: string }` — when `path` is given, invalidate only that doc entry and re-walk just the parent folder for tree freshness; full re-walk otherwise.
- Cron cadence in `site/kbx-ui/runtime-services-cron.mjs` may call the KB-only refresh at a low frequency (e.g. every 5 minutes) so `daysSinceVerified` does not drift; the cron must call the L3 trigger, not the route handler in-process.

## Forbidden On Request Path

- Reading any `.md` file directly from a route handler outside the snapshot store.
- Running `kbx doctor`, `kbx rules`, `kbx status`, `kbx chaos`, or `git` to answer `/api/kb/*`.
- Computing `daysSinceVerified` at request time against `Date.now()` — must use snapshot `generatedAt` to stay deterministic across the same render.

## Mutation Contracts (Out Of Scope For First UI Slice)

Listed here only to prevent the UI slice from inventing them later.

- `POST /api/kb/verify` `{ path }` — re-runs verification on one doc, updates `last_verified` + `last_verified_commit`. L3 work.
- `POST /api/kb/status` `{ path, status }` — flips `status` frontmatter via deterministic writer.

UI slice 1 may render the buttons but should leave them disabled until mutation endpoints exist.

## Definition Of Done For This Contract

The contract is satisfied only when:

- `/api/kb/tree`, `/api/kb/doc`, `/api/kb/impact` exist and are served from the snapshot store
- `POST /api/kb/refresh` exists as an L3 trigger and correctly invalidates `kb.tree` + `kb.docs` cache
- no KB endpoint runs `kbx`/`git`/`doctor` on the request path
- the KB page in `site/uiv2` reads only through `useKbTree`/`useKbDoc`/`useKbImpact`
- `kbx-ui-module-architecture-map.md` is updated with the KB slice and these endpoints
- `runtime-control-plane-architecture.md` audit section either lists no new mixed-layer cases or records the resolution

## Audit log

### Slice A shipped (2026-05-18)

- `src/lib/kb-content.mjs` added: pure L4 lib for frontmatter parse, markdown→HTML render, heading extraction, recursive tree walk. Ported verbatim from the slice-3 mock generator so on-disk parity is preserved.
- `site/kbx-ui/server.mjs` adds `createKbStore({ repoRoot })` that owns:
  - eager tree walk on first read or refresh, covering 5 candidate roots (`knowledge-base`, `notes`, `svfactory`, `test`, `.github`)
  - lazy-cached per-doc parse — first hit parses and stores; subsequent hits return `fromCache: true` until the next refresh
  - path-traversal rejection: paths must resolve inside `repoRoot` and end in `.md` / `.html`
- Four read endpoints registered, snapshot-backed, no CLI/git/doctor invocation on the request path:
  - `GET /api/kb/tree`
  - `GET /api/kb/roots`
  - `GET /api/kb/doc?path=`
  - `GET /api/kb/impact?path=`
- `POST /api/kb/refresh` added as an L3 trigger; also fired by `/api/system-snapshot/refresh` so KB stays in sync with the wider snapshot fingerprint.
- UI hooks `useKbTree`, `useKbDoc`, `useKbRootCandidates`, `useRefreshKb` swapped to `apiGet` / `apiPost`. Old mock imports (`kbDocsGenerated`, `kbRootCandidates` from the generated file) are no longer referenced.
- Verified live: tree returns 5 roots / 233 docs in `knowledge-base`; first doc hit reports `fromCache: false`, second hit `fromCache: true`; path traversal `../../etc/passwd` returns 404.

### Open follow-ups (Slice B and beyond)

- mtime-based dirty check on tree walk (frontmatter re-parse only when file mtime changed).
- Scoped refresh for `POST /api/kb/refresh { path }` (currently always full re-walk).
- `POST /api/kb/roots` / `DELETE /api/kb/roots/:path` with L5 persistence at `site/kbx-ui/.runtime-state/kb-roots.json`.
- Move active-roots from UI `localStorage` to that L5 file so two tabs converge.

## Cross-Refs

- `svfactory/runtime-control-plane-architecture.md` — layer rules this contract follows
- `notes/kbx-ui-builder-index.md` — add this note to the index
- `knowledge-base/15-governance/metadata-schema.md` — frontmatter shape this contract mirrors
- `knowledge-base/15-governance/document-taxonomy.md` — type/status enums used in tree badges
- `knowledge-base/.kb/impact.json` — source for `/api/kb/impact`
