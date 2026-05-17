# KBX UI Knowledge Base Page Runtime Contract

## Purpose

This note records the runtime contract expectations for the UIV2 Knowledge Base page (three-pane reader: folder tree, document body, TOC/Meta rail).

It exists so KBX UI Builder can build the KB slice against a stable mock-then-wire contract, without silently expanding the bridge from a UI slice. Anything in this note that does not yet exist in `site/kbx-ui/server.mjs` or the snapshot collector is an **SVFactory follow-up** to be implemented at L3 (collector) and L2 (read API), per `svfactory/runtime-control-plane-architecture.md`.

## Scope

- UI slice: `site/uiv2/src/app/pages/KnowledgeBasePage.tsx` (planned)
- Source of truth on disk: `knowledge-base/**/*.md` + `knowledge-base/.kb/impact.json`
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

Returns the full KB folder tree with per-document metadata sufficient to render badges in the left rail.

Response shape:

```json
{
  "generatedAt": "2026-05-17T08:00:00Z",
  "contentRoot": "knowledge-base",
  "root": {
    "path": "knowledge-base",
    "kind": "folder",
    "title": "Knowledge Base",
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
  }
}
```

Notes:
- `daysSinceVerified` is computed at refresh time, not at request time, against the snapshot's `generatedAt`.
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
    "tree": { /* same shape as /api/kb/tree response.root */ },
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

## Cross-Refs

- `svfactory/runtime-control-plane-architecture.md` — layer rules this contract follows
- `notes/kbx-ui-builder-index.md` — add this note to the index
- `knowledge-base/15-governance/metadata-schema.md` — frontmatter shape this contract mirrors
- `knowledge-base/15-governance/document-taxonomy.md` — type/status enums used in tree badges
- `knowledge-base/.kb/impact.json` — source for `/api/kb/impact`
