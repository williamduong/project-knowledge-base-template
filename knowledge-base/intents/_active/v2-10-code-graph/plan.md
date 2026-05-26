---
intent_id: v2-10-code-graph
type: intent-plan
---

# Plan

## Goal

Stabilize the live dual-graph runtime after Phase 6 so the graph-backed operator shell and DNA review work can rely on correct stats, coverage, and symbol queries.

## Files Touched

- `site/kbx-ui/api-graph.mjs` — modify route ordering so static graph routes (`stats`, `domains`, `coverage`) are not shadowed by `/:id`; normalize symbol filter parsing.
- `src/graph-db/code/api-symbols.js` — modify symbol list query builder to use valid `arangojs` AQL composition and restore `/api/graph/symbols*` endpoints.
- `src/graph-db/knowledge/monitor.js` — modify collection count normalization so monitor totals and density render as numbers instead of object-string concatenation.
- `src/graph-db/transformers/gap-analysis.js` — modify Phase 6 gap analysis to read live `kg_applies_to` coverage and fix orphaned document AQL.

## Runtime Findings

- Graph API route ordering regressed: `/goals/stats`, `/decisions/stats`, `/principles/domains`, `/principles/coverage`, and `/symbols/stats` could be swallowed by `/:id` routes.
- Symbols API returned `500` because `aql.append` was used against the imported `aql` helper, which does not expose that method in the current runtime.
- Monitor totals were numerically incorrect because `db.collection(...).count()` returned count objects that were added without normalization.
- Gap analysis still reported all principles as unlinked even after Phase 6 created `kg_applies_to` edges; orphaned-document AQL also used invalid variable names.

## Acceptance Criteria

- `GET /api/graph/goals/stats` returns `200` with numeric totals.
- `GET /api/graph/decisions/stats` returns `200` with numeric totals.
- `GET /api/graph/principles/domains` and `GET /api/graph/principles/coverage` return `200`.
- `GET /api/graph/symbols` and `GET /api/graph/symbols/stats` return `200` without AQL builder failures.
- `kbx knowledge-graph monitor --json` reports numeric entity and edge totals.
- `kbx knowledge-graph gap-analysis --json` reports live principle-to-code coverage instead of treating all principles as unlinked.
