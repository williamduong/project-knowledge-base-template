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

### Slice B shipped (2026-05-18)

- L5 state: `site/kbx-ui/.runtime-state/kb-roots.json` carries `{ activeRoots: string[], updatedAt }`. Atomic write via temp file + `fs.renameSync`. Gitignored.
- L4 additions in `src/lib/kb-content.mjs`:
  - `hasAllowedFiles(absDir)` bounded scan that stops on first allowed file
  - `validateCandidateRoot(repoRoot, requested)` rejects empty path / traversal (via `realpathSync` + relative check) / non-directory / directory without allowed files
  - `discoverCandidateRoots(repoRoot, defaults)` returns top-level project folders containing `.md` or `.html`, merged with the seed defaults
- L3: `createKbStore` now hydrates active-roots from L5 on first ensure (falls back to `defaultActive` candidates when the file is missing). Every mutation writes through. Tree refresh after each mutation reflects the new set immediately.
- L2 mutations:
  - `POST /api/kb/roots` with `{ path }` validates, persists, refreshes, returns `{ ok, activeRoots, rootCandidates }`. Validation failures return `400`.
  - `DELETE /api/kb/roots/:path` (wildcard) removes and persists. Idempotent.
- L1: `useKbRoots`, `useAddKbRoot`, `useRemoveKbRoot` hooks. localStorage in `KnowledgeBasePage.tsx` removed. `AddFolderDialog` gains a free-form path input and surfaces server validation errors inline.
- Verified live: POST `notes` flips `kbStore.activeRoots` to `[knowledge-base, notes]` and persists. POST `../etc` returns 400. POST `src/cli.js` returns 400 (`path is not a directory`). DELETE `notes` reduces the set and the on-disk file matches. DELETE of an inactive path returns `alreadyInactive: true`.

### Slice C-1 shipped (2026-05-18)

DB is now the source of truth for KB tree/doc/roots. Filesystem is the
import source; drift detection + sync ops live in slice C-2+.

- L5 swap: removed `site/kbx-ui/.runtime-state/kb-roots.json`. State now in
  `svfactory/kb-index.db` (SQLite via `node:sqlite`, gitignored). Schema
  `kb_meta` / `kb_roots` / `kb_files` defined in `src/lib/kb-db.js`. One-time
  migration in `createKbStore` reads any leftover legacy json and seeds the
  table, then renames the json to `*.migrated`.
- L4: `src/lib/kb-db.js` (new) wraps `DatabaseSync` per the focus-state
  pattern. Exposes prepared statements for roots and files plus aggregate
  stats. `src/lib/kb-content.mjs` keeps the filesystem helpers used during
  import.
- L3: `createKbStore` rewritten. `getTree()` reads `kb_files` rows under
  active roots and assembles a nested tree in JS (post-order folds for
  docCount + stalest). First call per root triggers a one-time inline
  import (~300 ms for knowledge-base / 233 docs). Subsequent reads ~15 ms.
  Mutations (`addRoot` / `removeRoot`) just write `kb_roots` rows; the next
  tree read lazily imports if the new root has no rows yet.
- L2: response shapes for `/api/kb/tree`, `/api/kb/roots`, `/api/kb/doc`
  are unchanged so the UI contract is preserved. New endpoint:
  - `GET /api/kb/browse?path=&maxDepth=3` — drill-down picker. Returns
    immediate child directories that have ≥1 `.md`/`.html` anywhere in the
    next `maxDepth` levels. Each child carries `isRoot` + `active` flags
    so the dialog can label "đang active" vs "Add" vs "Re-enable".
  - `POST /api/kb/refresh { path? }` now invokes `kbStore.refresh('manual', path)`
    which re-imports the named root (or all active roots if omitted).
- L1: new `useKbBrowse(path)` hook; `AddFolderDialog` rewritten as a
  breadcrumb drill-down picker over the project. The flat free-form text
  input is gone — folder selection now happens by clicking through real
  paths.
- Cleanup: deleted `site/uiv2/src/app/mock/kb-data.generated.ts` (20k
  lines of static mock) and `scripts/gen-kb-mock.mjs`. No mock fallback —
  the UI requires the live `/api/kb/*` endpoints.

Measured live (warm, fresh DB):

| op | latency |
|---|---|
| GET /api/kb/tree (first call, triggers knowledge-base import) | ~365 ms |
| GET /api/kb/tree (warm read) | ~15 ms |
| GET /api/kb/doc | ~5 ms |
| POST /api/kb/roots (deferred import) | ~20 ms |
| GET /api/kb/tree after add (triggers notes import) | ~130 ms |
| GET /api/kb/browse?path=knowledge-base | ~10 ms |

### Slice C-2 shipped (2026-05-18)

Drift = DB intent vs disk reality. Read-only display in this slice; sync
actions land in C-3.

- L4 `src/lib/kb-content.mjs` adds `computeFileHash(absPath)` and
  `computeFileHashFromBuffer(buf)` — SHA-1 over file bytes. `parseDocFromDisk`
  now returns `contentHash` alongside `summary` + `doc` so import naturally
  captures it.
- L3 `createKbStore.detectDrift(rootPath?)` walks disk under each active root,
  collects per-file `{hash, mtime, size}`, fetches matching kb_files rows
  (now SELECTing `content_hash`, `mtime_ms`, `size`), and emits one entry
  per mismatch with state `'disk-only' | 'db-only' | 'content-diff'`.
  Lazy backfill: legacy rows with null `content_hash` get hashed once from
  disk and the row updated, so the next check is fast and clean.
- L2 `GET /api/kb/drift?root=` returns `{ summary, entries }`. Heavy-ish
  endpoint (~250 ms for 320 docs across 5 roots) — kept out of any auto
  polling.
- L1 `useKbDrift(enabled)` is `enabled`-gated so the call only fires when
  the DriftPanel opens. New `DriftPanel` dialog groups entries by state
  with first-8-char hash badges. New "Drift…" button in HealthBar opens
  the panel.

Verified live for all three states: created a disk file → `disk-only` row;
deleted a DB-known file → `db-only`; appended bytes to a doc → `content-diff`.

### Slice C-3 shipped (2026-05-18)

Per-row drift resolution. UI can now repair drift either direction.

- L4 `parseDocFromDisk` now returns `rawText` along with `summary`/`doc`/
  `contentHash`. Import in `createKbStore` persists `body = rawText` so the
  DB carries enough state to recreate the file from scratch (the missing
  piece in C-1 where `body` was null).
- L3 `kbStore.syncImport(path)` / `syncRestore(path)` (and `syncMany(op, paths[])`)
  classify the path's current state on the spot via `classifyOne()` —
  prevents a stale UI from misfiring an action.
  - `syncImport` ("accept disk → DB"):
    - `disk-only` → parse disk, INSERT row
    - `content-diff` → parse disk, UPSERT row
    - `db-only` → DELETE row
  - `syncRestore` ("restore disk ← DB"):
    - `disk-only` → DELETE file on disk
    - `content-diff` → write DB body over disk
    - `db-only` → re-create file from DB body
  - Both fail with a clean error if `body` is null in DB (legacy slice-C-1
    rows). The fix is one `POST /api/kb/refresh` to repopulate.
- L2 `POST /api/kb/sync/import` and `POST /api/kb/sync/restore` accept
  `{ path }` or `{ paths: [] }`. Mixed-success returns 207 with per-path
  results.
- L1 `useKbSync('import' | 'restore')` mutation hook. `DriftPanel` now
  shows per-row action buttons (label changes by state, e.g. "Del DB" for
  db-only on the import side, "Del disk" for disk-only on the restore
  side) plus bulk "Accept all → DB" / "Restore all ← DB" buttons.
  Every action goes through a sticky confirmation footer before firing.

Verified live: induced all three drift states → applied corresponding
sync action → drift returns to `total: 0`. Restore of a `db-only` file
recreated the deleted markdown byte-for-byte from DB body.

### Slice C-4 shipped (2026-05-18)

DB-first edit flow with optimistic concurrency.

- L4 adds `parseDocFromText(rawText, relPath)` — same shape as
  `parseDocFromDisk` but takes the body as a string instead of reading
  from disk. Both share `_parseInner` so frontmatter parsing, markdown
  rendering, heading extraction, and hash computation stay identical
  between the read and write paths.
- L3 `kbStore.updateDoc({ path, body, expectedHash })`:
  1. Validates path is inside workspace and ends in .md/.html
  2. Optional conflict check: if `expectedHash` is given and the file on
     disk has a different hash, return `{ ok: false, conflict: true,
     diskHash }`. UI surfaces this as 409 and prompts the user.
  3. Parses the new body, UPSERTs the kb_files row (DB-first — intent
     persisted before disk).
  4. Atomic disk write (tmp + rename). If the write fails, the response
     carries `diskWritten: false` + `diskError`; DB stays ahead and
     drift detection surfaces the mismatch.
- L2 `PUT /api/kb/doc` (`express.json({ limit: '4mb' })`). 409 on
  conflict, 400 on validation, 200 with `{ contentHash, diskWritten,
  diskError, title, indexedAt }` on success.
- L1 `useUpdateKbDoc()` mutation invalidates `kb/doc/:path`, tree, and
  drift on success. KnowledgeBasePage reader now has an "Edit" button
  next to the right-rail toggle that swaps the rendered HTML for a
  monospace `<textarea>` over the raw markdown body. Save sends
  `expectedHash = doc.contentHash`. Conflict and disk-failure surface
  inline as warning banners. Switching documents cancels the edit.

`/api/kb/doc` GET response now includes `body` and `contentHash` so the
editor can prefill content without a second fetch.

Verified live: PUT with correct hash → 200 + diskWritten:true + drift
returns to 0. PUT with stale expectedHash → 409 with the current
diskHash. Disk content matches the saved body byte-for-byte.

### Open follow-ups (beyond Slice C-4)

- mtime-based dirty check on tree walk (frontmatter re-parse only when file mtime changed).
- Scoped refresh for `POST /api/kb/refresh { path }` (currently always full re-walk).
- Concurrent-writer protection beyond atomic rename (no file lock yet; acceptable for single-process kbx-ui server).

## Cross-Refs

- `svfactory/runtime-control-plane-architecture.md` — layer rules this contract follows
- `notes/kbx-ui-builder-index.md` — add this note to the index
- `knowledge-base/15-governance/metadata-schema.md` — frontmatter shape this contract mirrors
- `knowledge-base/15-governance/document-taxonomy.md` — type/status enums used in tree badges
- `knowledge-base/.kb/impact.json` — source for `/api/kb/impact`
