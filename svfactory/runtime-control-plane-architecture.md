# Runtime Control Plane Architecture

> Status: active working architecture for local operator runtime
> Scope: `site/kbx-ui` bridge + `site/uiv2` operator shell + snapshot contracts
> Last updated: 2026-05-17

---

## Purpose

This document locks the runtime architecture for KBX local operator surfaces so future changes do not reintroduce mixed-layer request paths.

The key rule is:

> Read APIs must read snapshot state.
> Refresh/mutation APIs may trigger collectors.
> Diagnostics and CLI execution must not run inside normal render-time request paths.

---

## Layer Model

### L1. UI Presentation Layer

Files:
- `site/uiv2/src/app/**`

Responsibilities:
- Render shell, pages, cards, tables, footer
- Read TanStack Query data only
- Never call `fetch` directly from page components
- Never infer runtime truth from markdown or ad-hoc heuristics

Allowed dependencies:
- `useSystemSnapshot()`
- focused mutation hooks like `useRefreshSystemSnapshot()`
- pure formatters/selectors

Forbidden:
- direct CLI assumptions
- direct git/runtime calls
- page-local orchestration logic

### L2. Read API Layer

Files:
- `site/kbx-ui/server.mjs` read endpoints

Responsibilities:
- Serve cached snapshot payloads
- Expose stable API contracts for UI
- Translate snapshot state into response shapes

Allowed dependencies:
- in-memory snapshot cache
- machine-readable state files / sqlite projections

Forbidden:
- running `git`, `doctor`, `rules lint`, `status`, `chaos`, or intent enrichment during normal read requests

### L3. Collector / Refresh Layer

Files:
- snapshot collector logic in `site/kbx-ui/server.mjs`
- `site/kbx-ui/runtime-services-cron.mjs`

Responsibilities:
- Refresh runtime snapshot on explicit operator action or controlled cadence
- Serialize collection work
- Update cache/store used by L2

Allowed dependencies:
- deterministic CLI commands
- runtime registry checks
- background cadence logic

Forbidden:
- UI rendering concerns
- page-specific shaping logic

### L4. Deterministic Runtime Layer

Files:
- `src/commands/**`
- `src/lib/git.js`
- `src/lib/pipeline.js`
- rules/doctor/status/chaos helpers

Responsibilities:
- Run CLI checks
- Evaluate governance/runtime state deterministically
- Produce machine-readable outputs

Forbidden:
- UI composition
- route-level HTTP knowledge

### L5. State / Storage Layer

Files:
- `svfactory/focus.state.json`
- `svfactory/focus-state.db`
- `knowledge-base/.kb/state.json`
- `knowledge-base/.kb/impact.json`
- runtime state files under `site/kbx-ui`

Responsibilities:
- Persist focus/runtime/cache state
- Provide machine-readable state for bridge and CLI

Forbidden:
- presentation logic
- orchestration logic

---

## Flow Diagram

```text
┌──────────────────────────────────────────────────────────────┐
│ L1 UI Presentation                                          │
│ site/uiv2 pages, footer, hooks                              │
│ reads: useSystemSnapshot()                                  │
└───────────────┬──────────────────────────────────────────────┘
                │ GET /api/system-snapshot
                ▼
┌──────────────────────────────────────────────────────────────┐
│ L2 Read API                                                 │
│ site/kbx-ui/server.mjs read endpoints                       │
│ returns cached snapshot only                                │
└───────────────┬──────────────────────────────────────────────┘
                │ POST /api/system-snapshot/refresh
                ▼
┌──────────────────────────────────────────────────────────────┐
│ L3 Collector / Refresh                                      │
│ snapshot collector + runtime cron                           │
│ may invoke deterministic commands on controlled paths       │
└───────────────┬──────────────────────────────────────────────┘
                │ CLI / deterministic libs
                ▼
┌──────────────────────────────────────────────────────────────┐
│ L4 Deterministic Runtime                                    │
│ status / rules / chaos / doctor / git helpers               │
└───────────────┬──────────────────────────────────────────────┘
                │ reads / writes
                ▼
┌──────────────────────────────────────────────────────────────┐
│ L5 State / Storage                                          │
│ focus.state.json, sqlite, .kb state, runtime cache files    │
└──────────────────────────────────────────────────────────────┘
```

---

## Architecture Rules

1. L1 may depend on L2, never on L3-L5 directly.
2. L2 may read L5 and cached L3 output, but must not execute L4 work during normal read requests.
3. L3 may call L4 and update L5.
4. L4 must stay deterministic and UI-agnostic.
5. Any new endpoint must declare whether it is:
   - read snapshot
   - refresh collector
   - mutation
6. If an endpoint needs git/doctor/rules/chaos to answer, it is not a pure read endpoint and must not be used by footer/Home/System default render flow.

---

## Audit Report

Current mixed-layer remediation cases still requiring follow-up: `7`

### Case 1. `/api/status` still mixes read API with live chaos command

- Current shape: read endpoint still executes `kbx chaos --json --no-save`
- Correct layer: move to collector-produced snapshot field or a dedicated diagnostics refresh path

### Case 2. `/api/rules` still runs `kbx rules list --json` live

- Current shape: direct deterministic command inside request path
- Correct layer: serve from cached rules snapshot or mark as diagnostics-only API

### Case 3. `/api/workspace` still executes `kbx status --bridge-read`

- Current shape: lighter than before but still collector work inside request
- Correct layer: serve workspace block from cached system snapshot

### Case 4. `/api/session-context` still executes `kbx status --bridge-read`

- Current shape: same issue as workspace
- Correct layer: serve session block from cached system snapshot

### Case 5. `/api/intents/:id/detail` still allows git-enriched detail on request path

- Current shape: `includeGit: true` for detail endpoint
- Correct layer: split into pure detail vs optional evidence enrichment endpoint

### Case 6. `/api/phase2-bridge` is diagnostics-by-request

- Current shape: executes status + doctor + chaos directly
- Correct layer: diagnostics collector or explicit operator diagnostic action only

### Case 7. Collector and read API still live in one module

- Current shape: `site/kbx-ui/server.mjs` hosts both snapshot serving and collection/orchestration logic
- Correct layer: extract collector into dedicated module so the read API cannot accidentally regain side effects

---

## Safe Default For Future Work

When adding any new UI signal:

1. Add it to L5 state if it needs persistence
2. Add collection logic to L3 if it needs runtime computation
3. Add it to `/api/system-snapshot`
4. Read it in L1 via `useSystemSnapshot`
5. Do not create a new direct render-time endpoint unless it is truly static

---

## Definition Of Done For This Architecture

The architecture is considered clean only when:

- footer, Home, and System default render paths trigger no CLI/git/doctor/rules/chaos execution
- all default read endpoints are snapshot-backed
- diagnostics run only on explicit refresh or controlled background collection
- UI can explain staleness through snapshot metadata instead of recomputing truth on load
