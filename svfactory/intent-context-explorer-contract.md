# Intent Context Explorer Contract

**Date:** 2026-05-27  
**Status:** Design checkpoint before backend implementation  
**Purpose:** Define the canonical data contract for a graph-native `Intent` explorer so backend work can replace projection-heavy frontend logic instead of reinforcing it.

---

## 1. Why This Exists

The current `Intent` graph is useful, but it is still built from UI projections:

- milestone buckets are inferred from `intent.id`
- release lines are grouped from milestone buckets
- task rows are parsed from markdown
- graph nodes are assembled in the frontend from multiple read models

That is good enough for a transitional graph-first UI, but not good enough for a graph-native explorer.

The next step must be:

- click an entity
- query its graph context
- return graph-shaped data directly from the backend
- let the UI render that result without re-inventing structure

---

## 2. Current Source-Of-Truth Review

### 2.1 Intent

Current canonical source:

- filesystem-backed intent workspace and frontmatter
- surfaced through `/api/intents`
- detail surfaced through `/api/intents/:id/detail`

Relevant code:

- `src/contracts/intents.contract.js`
- `site/kbx-ui/server.mjs`

Current shape includes:

- `id`
- `title`
- `lifecycle`
- `goalText`
- `focusCurrent`
- `focusNextAction`
- `chaosEstimate`
- parsed `tasks`

### 2.2 Goal

Current canonical source:

- `goals-state.db`
- mirrored to `svfactory/goals.state.json`
- seeded into Knowledge Graph governance collections

Relevant code:

- `src/lib/goals-state.js`
- `src/contracts/goals.contract.js`
- `site/kbx-ui/server.mjs`

Current goal system is already structured by:

- `system`
- `milestone`
- `intent`
- `task`

### 2.3 Milestone

Current truth:

- not first-class
- derived from `deriveVersionBucket(intent.id)`
- represented as `entity_level = milestone` only inside goal ownership

This means milestone currently exists in two partial ways:

- derived UI grouping
- goal ownership namespace

### 2.4 Release Line / Release Version

Current truth:

- not first-class
- derived from milestone buckets in UI
- official backlog pack has a curated `release_lines` list, but this is not yet a live canonical runtime entity

Relevant code:

- `site/uiv2/src/app/hooks/kbx/intent-workspace-model.ts`
- `svfactory/official-backlog.seed.json`

### 2.5 Task

Current truth:

- not first-class
- parsed from `intent.md` and `plan.md`
- task goal ownership is synthesized using `buildTaskGoalOwnerId()`

This makes task useful for visualization, but still a projection entity rather than a canonical runtime object.

---

## 3. Current Structural Gaps

### 3.1 Intent is not graph-native yet

The Knowledge Graph intent extractor exists, but active operator surfaces still read intents from files and derived detail rather than graph neighborhood queries.

### 3.2 Milestone and Release are mostly derived, not declared

`Milestone` and `ReleaseLine` currently behave like grouping conventions, not stable entities with their own identity and relations.

### 3.3 The frontend is still the graph assembler

The current alignment model constructs graph nodes and edges in the browser from:

- intents list
- goals tree
- milestone projections
- release line projections
- selected detail
- snapshot metadata

That assembly logic must move behind a backend contract.

---

## 4. Canonical Entity Model For Context Explorer

This section defines what the backend should treat as canonical now, what is tolerated as derived, and what must become first-class later.

### 4.1 Canonical now

- `Intent`
- `Goal`
- `System root`
- `Focus / active intent session metadata`

### 4.2 Canonical enough for v1 backend queries

- `Milestone`
  - canonical as a stable bucket id such as `v2-10`, `v3-0`, `legacy`
  - sourced from goal ownership + official backlog release metadata
- `ReleaseLine`
  - canonical enough as curated pack metadata for now
  - should no longer be inferred only in the frontend

### 4.3 Still derived in v1

- `Task`
  - derived from intent markdown parsing
  - allowed in context explorer response
  - must be marked `source_kind = derived-task`

### 4.4 Promote later

- `Task` as first-class graph/runtime entity
- `ReleaseVersion` as first-class graph entity
- explicit graph edges for intent lifecycle and flow execution

---

## 5. Required Relationship Vocabulary

The context explorer should stop thinking in terms of "children" only.

It should use explicit relation kinds:

- `contains`
  - workspace -> milestone
  - milestone -> intent
  - intent -> task
- `belongs_to_release`
  - milestone -> release-line
- `tracks_goal`
  - entity -> goal
- `sub_goal_of`
  - goal -> parent goal
- `focuses_on`
  - session/focus context -> intent
- `derived_from`
  - derived task -> intent source document
- `projects_to`
  - optional transitional relation for registry intent not linked into goal tree

The backend may still calculate these from mixed sources in v1, but the response contract must expose them as graph relations rather than UI hints.

---

## 6. Context Explorer Response Contract

Proposed endpoint:

- `GET /api/intents/context?id=:entityId&depth=1&mode=alignment`

### 6.1 Request parameters

- `id`
  - required
  - entity id or typed entity ref
- `kind`
  - optional
  - one of: `workspace`, `release-line`, `milestone`, `intent`, `task`, `goal`
  - if omitted, backend may infer from known registries
- `depth`
  - optional, default `1`
  - integer `0..3`
- `mode`
  - optional
  - `alignment`
  - `focus`
  - `full`
- `include_tasks`
  - optional boolean, default `true`
- `include_unlinked`
  - optional boolean, default `true`

### 6.2 Response shape

```json
{
  "ok": true,
  "checkedAt": "2026-05-27T10:00:00.000Z",
  "center": {
    "id": "intent:v2-10-code-graph",
    "kind": "intent"
  },
  "query": {
    "id": "v2-10-code-graph",
    "kind": "intent",
    "depth": 1,
    "mode": "alignment",
    "include_tasks": true,
    "include_unlinked": true
  },
  "nodes": [],
  "edges": [],
  "warnings": [],
  "summary": {
    "releaseLines": 1,
    "milestones": 1,
    "intents": 1,
    "tasks": 2,
    "goals": 4,
    "warnings": 1
  },
  "sources": {
    "intent": "filesystem",
    "goals": "goals-state-db+graph-seed",
    "milestones": "goal-ownership+official-pack",
    "releaseLines": "official-pack",
    "tasks": "intent-markdown-derived"
  }
}
```

### 6.3 Node contract

Each node should include:

```json
{
  "id": "intent:v2-10-code-graph",
  "kind": "intent",
  "entityLevel": "intent",
  "entityId": "v2-10-code-graph",
  "label": "Code Graph Phase 0",
  "shortLabel": "v2.10.code.graph",
  "state": "active",
  "focus": true,
  "active": true,
  "selected": true,
  "warning": false,
  "sourceKind": "canonical",
  "metrics": ["2/5 tasks done", "chaos 3"],
  "detail": "Build structural code graph foundation"
}
```

Required fields:

- `id`
- `kind`
- `label`
- `state`
- `sourceKind`
- `metrics`

Optional but recommended:

- `entityLevel`
- `entityId`
- `detail`
- `focus`
- `active`
- `selected`
- `warning`

### 6.4 Edge contract

```json
{
  "id": "milestone:v2-10->intent:v2-10-code-graph:contains",
  "source": "milestone:v2-10",
  "target": "intent:v2-10-code-graph",
  "kind": "contains",
  "emphasis": "focus",
  "sourceKind": "computed"
}
```

Required fields:

- `id`
- `source`
- `target`
- `kind`

Optional:

- `emphasis`
- `sourceKind`

### 6.5 Warning contract

```json
{
  "id": "intent-missing-goal:0",
  "code": "intent-missing-goal",
  "level": "warning",
  "message": "Intent v2-10-code-graph is visible in the registry but not linked into the current goal tree.",
  "nodeIds": ["intent:v2-10-code-graph"]
}
```

Initial warning codes:

- `focus-intent-missing`
- `intent-missing-goal`
- `milestone-missing-coverage`
- `task-missing-goal`
- `task-outside-main`
- `release-without-intents`
- `goal-without-active-intent`

---

## 7. Query Semantics By Mode

### 7.1 `focus`

Return the smallest useful context around the center entity:

- selected intent
- its milestone
- its release line
- its linked goals
- its parsed tasks
- sub-goals directly connected to that intent

### 7.2 `alignment`

Return neighborhood optimized for checking whether work aligns to goals:

- center entity
- sibling intents in the same milestone when relevant
- milestone and release line
- linked goals and sub-goal chain
- warnings for broken or missing links

This should be the default operator mode.

### 7.3 `full`

Return the widest safe context for the chosen depth:

- broader neighborhood
- more siblings
- optional unlinked nodes

This mode is for power users, not the default.

---

## 8. Backend Mapping Rules

### 8.1 Intent -> Milestone

Current rule:

- derived from `intent.id` version bucket

Backend v1 rule:

- keep deriving from version bucket
- but do it in the backend only
- emit milestone as a stable node in the response

### 8.2 Milestone -> ReleaseLine

Current rule:

- frontend derives release lines from milestone buckets

Backend v1 rule:

- read `release_lines` from `svfactory/official-backlog.seed.json`
- match milestone bucket to release line id
- if absent, fallback to same id with `sourceKind = computed`

### 8.3 Intent -> Goal

Current rule:

- `entity_level = intent` goals from goals state / goals tree

Backend v1 rule:

- query canonical goal ownership directly from goal registry sources
- do not reconstruct this in the frontend

### 8.4 Task -> Goal

Current rule:

- parse tasks from markdown
- synthesize task owner id
- query `entity_level = task`

Backend v1 rule:

- keep same behavior for now
- emit `sourceKind = derived-task`
- keep task support optional via `include_tasks`

---

## 9. What The Frontend Should Stop Doing

Once this endpoint exists, the frontend should stop treating these as core responsibilities:

- building milestones from intent ids
- building release lines from milestones
- stitching together context from list + tree + detail + snapshot
- inferring whether an intent is “projected” vs “linked” using ad hoc local joins

Frontend should keep only:

- filters
- view mode controls
- layout strategy
- click / focus / drawer interactions

---

## 10. Recommended Migration Path

### Phase 1

- add the contract and response schemas
- backend still allowed to compute from mixed current sources
- no graphdb-first rewrite yet

### Phase 2

- implement `/api/intents/context`
- return graph-shaped payload directly from backend

### Phase 3

- refactor `intent-alignment-graph-model.ts`
- it becomes a thin consumer/adapter for query result
- remove milestone/release assembly from frontend

### Phase 4

- ingest or project intents into Knowledge Graph
- make `Intent` graph-native enough for neighborhood queries

### Phase 5

- decide whether `Task` and `ReleaseVersion` should become first-class graph entities

---

## 11. Immediate Backend Scope

The first backend implementation should do exactly this:

1. accept a center entity request
2. resolve neighborhood from current canonical and semi-canonical sources
3. return graph-shaped `nodes + edges + warnings + center + summary`
4. leave UI layout and interactions to the client

This is the clean bridge between:

- today’s mixed runtime reality
- tomorrow’s graph-native explorer

