---
id: v2-10-code-graph
title: "Code Graph Phase 0 — ArangoDB schema + connection layer (no ingestion)"
mode: full
lifecycle: active
status: open
created_at: 2026-05-23T05:56:28.246Z
focus:
  current: "Phase 0 — implementing ArangoDB schema constants + client + collection initializer + CLI stub"
  last_updated: 2026-05-23
  next_action: "Phase 1: AST ingestion (treesitter/babel) for IMPORTS, DEFINES, EXPORTS, CALLS, INHERITS"
goal_text: "Build structural Code Graph foundation: define node/edge schema, wire ArangoDB connection, provide CLI to init/verify schema — no ingestion in this phase."
change_type: feature
change_scope:
  - src/graph-db/ (new)
  - src/commands/code-graph.js (new)
  - bin/kbx.js (register command)
  - package.json (arangojs dependency)
  - test/graph-db/ (new)
impact_signals:
  - introduces: "src/graph-db/code/ — Code Graph schema, client, collections initializer"
  - introduces: "kbx code-graph init | status | help CLI"
  - introduces: "ArangoDB as server-backed graph DB backend (opt-in, requires running ArangoDB instance)"
  - defers: "AST ingestion (Phase 1), git ingestion (Phase 2), query layer (Phase 3)"
decision_summary: "Phase 0 only: define schema constants (node/edge types + collection names), ArangoDB connection wrapper via arangojs, idempotent ensureSchema() to create collections + indexes, and minimal CLI (init creates schema, status checks connection). No data ingestion. Backend: ArangoDB named graph 'code_graph'. Config via env vars KBX_ARANGODB_URL / KBX_ARANGODB_DB / KBX_ARANGODB_USER / KBX_ARANGODB_PASS."
close_condition: "kbx code-graph init connects to ArangoDB, creates all collections + indexes, kbx code-graph status reports OK. Tests pass."
chaos_estimate:
  current_score: 58.8
  current_level: unstable
  estimated_delta: +4
  projected_score: 62.8
  projected_level: unstable
  warning: "Phase 0 scope only. New files but no ingestion logic — contained blast radius."
review_after: null
schema_version: 2.7.0-beta.1
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-10-code-graph — Code Graph Phase 0

## Summary

Build the structural foundation for the Code Graph in ArangoDB.
Phase 0 ships: schema definitions, connection layer, collection initializer, and a minimal CLI.
No data ingestion in this phase — ingestion (AST + git) is Phase 1+.

## Node types

| Collection | Label | Key attrs |
|---|---|---|
| `cg_files` | File | `path`, `language`, `size`, `last_modified` |
| `cg_symbols` | Symbol | `name`, `kind` (function\|class\|variable\|type), `file`, `line` |
| `cg_commits` | Commit | `hash`, `message`, `author`, `timestamp`, `branch` |
| `cg_hunks` | Hunk | `file_path`, `lines_added`, `lines_removed` |

## Edge types (document collections in ArangoDB)

| Collection | Type | From → To |
|---|---|---|
| `cg_imports` | IMPORTS | File → File |
| `cg_defines` | DEFINES | File → Symbol |
| `cg_exports` | EXPORTS | File → Symbol |
| `cg_calls` | CALLS | Symbol → Symbol |
| `cg_inherits` | INHERITS | Symbol → Symbol |
| `cg_changed_in` | CHANGED_IN | File → Commit |
| `cg_contains_hunk` | CONTAINS_HUNK | Commit → Hunk |

## Named graph

ArangoDB named graph: `code_graph`
- Vertex collections: `cg_files`, `cg_symbols`, `cg_commits`, `cg_hunks`
- Edge collections: all `cg_*` edge collections above

## Config (env vars)

| Var | Default | Description |
|---|---|---|
| `KBX_ARANGODB_URL` | `http://localhost:8529` | ArangoDB server URL |
| `KBX_ARANGODB_DB` | `kbx_code_graph` | Database name |
| `KBX_ARANGODB_USER` | `root` | Username |
| `KBX_ARANGODB_PASS` | `` | Password |

## Plan

### Phase 0 — Schema + connection (THIS INTENT)
- `src/graph-db/code/schema.js` — constants: collection names, node kinds, edge types, named graph def
- `src/graph-db/code/client.js` — ArangoDB connection singleton via arangojs
- `src/graph-db/code/collections.js` — `ensureSchema(db)`: idempotent create collections + indexes + named graph
- `src/graph-db/code/index.js` — public API
- `src/graph-db/index.js` — top-level re-export
- `src/commands/code-graph.js` — CLI: `init`, `status`, `help`
- `test/graph-db/code-graph-schema.test.js` — unit tests (schema constants, no live DB)

### Phase 1 — AST ingestion (deferred)
treesitter/babel → IMPORTS, DEFINES, EXPORTS, CALLS, INHERITS edges

### Phase 2 — Git ingestion (deferred)
git log → CHANGED_IN, CONTAINS_HUNK edges

### Phase 3 — Query layer (deferred)
AQL query helpers for impact analysis

## Staged Files

(none yet — implementation in progress)
