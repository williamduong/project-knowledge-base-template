# Gate Module Plan

> Status: proposed implementation plan
> Scope: make `gate` a first-class operator/runtime concept alongside `rules` and `pipeline`
> Created: 2026-05-17
> Companion: `svfactory/gate-impact-map.md`

---

## Why This Exists

Current repo state already has gate-like behavior, but it is split across several surfaces:

- `site/kbx-ui/bridge-gates.mjs`
- `src/commands/status.js`
- `src/commands/release.js`
- `src/commands/doctor.js`
- `src/commands/maintain.js`
- rule metadata and chaos thresholds

That makes gates real in behavior, but not yet first-class in architecture, UI, or storage.

The goal of this plan is to promote `gate` from a hidden cross-cutting concern into a clearly modeled module.

---

## Target Model

The architecture should distinguish three concepts:

- `Rules`: atomic validations and policy checks
- `Gates`: operator-facing go / warn / block decisions assembled from rules and diagnostics
- `Pipelines`: step-based execution flows that are allowed, delayed, or blocked by gates

Desired mental model:

```text
Rules -> Gates -> Pipeline
         |
         +-> Runtime UI / Status / Maintain / Release decisions
```

---

## Design Principles

1. `gate` must be a first-class runtime concept, not just a comment or helper.
2. `rules` stay atomic; `gates` aggregate and explain operator decisions.
3. `pipeline` stays execution-oriented; it should not own gate semantics.
4. Gate evaluation must be deterministic and machine-readable.
5. UI should be able to show:
   - gate state
   - why it passed/blocked
   - which rules/evidence contributed
6. Snapshot architecture must treat gates as collector-backed state, not render-time computation.

---

## Proposed Concept Contract

### Rule

- smallest deterministic validation unit
- examples:
  - frontmatter field validity
  - intent metadata completeness
  - code/document binding requirements

### Gate

- operator/runtime decision object
- examples:
  - `release-ready`
  - `evidence-sufficient`
  - `chaos-within-threshold`
  - `single-owner-intent`
  - `maintain-safe-to-proceed`

### Pipeline

- ordered action sequence
- examples:
  - release pipeline
  - maintain pipeline
  - UI bootstrap pipeline

---

## Proposed Gate Schema

Minimum gate record shape:

```json
{
  "id": "G-RELEASE-READY",
  "title": "Release Ready",
  "scope": "release",
  "stage": "preflight",
  "policy": "block",
  "status": "pass",
  "summary": "All release preconditions satisfied",
  "dependsOnRules": ["KBX-V001", "KBX-I003"],
  "dependsOnSignals": ["doctor", "chaos", "status", "rules"],
  "evidence": [],
  "updatedAt": "2026-05-17T00:00:00.000Z"
}
```

Recommended enums:

- `scope`: `runtime`, `release`, `maintain`, `intent`, `workspace`, `governance`
- `stage`: `preflight`, `readiness`, `execution`, `postcheck`
- `policy`: `block`, `warn`, `advisory`
- `status`: `pass`, `warn`, `block`, `pending`, `error`

---

## Current State Audit

Existing gate-like sources already present:

1. `site/kbx-ui/bridge-gates.mjs`
2. `src/commands/status.js`
3. `src/commands/release.js`
4. `src/commands/maintain.js`
5. `src/commands/doctor.js`
6. `src/lib/rules/catalog.js`
7. chaos estimate / reconstruction trigger logic

Current gaps:

1. No single gate schema shared across runtime/CLI/UI
2. No dedicated gate storage or snapshot block
3. No dedicated UI section/module for gates
4. No explicit docs lane parallel to rules/pipeline
5. No unified CLI surface like `kbx gates ...`
6. No regression tests specifically for gate contract boundaries

---

## Target Deliverables

### D1. Documentation

- add `gate` as first-class concept in architecture docs
- add visual diagram: `Rules -> Gates -> Pipeline`
- define how gates relate to snapshot architecture

### D2. Runtime Contract

- create a machine-readable gate schema
- add gate state block to system snapshot
- define gate collector ownership

### D3. CLI Surface

- add `kbx gates list`
- add `kbx gates show <id>`
- optionally add `kbx gates check [--scope <scope>]`

### D4. UI Surface

- add `Operational Gates` module to `/system`
- show per-gate:
  - status
  - policy
  - summary
  - evidence count
  - updated time

### D5. Storage

- snapshot-backed gate state in runtime store
- later optionally persist historical gate runs if needed

### D6. Tests

- schema tests
- CLI tests
- snapshot contract tests
- UI selector tests
- architecture regression tests ensuring render path does not compute gates live

---

## Detailed Execution Plan

## Phase 1. Clarify The Concept In Docs

Goal:
- make gate visible in architecture before code refactor expands it

Tasks:
- update `svfactory/runtime-control-plane-architecture.md`
- add a dedicated gate subsection
- add a three-lane diagram:
  - Rules lane
  - Gates lane
  - Pipeline lane
- define relationship:
  - rules feed gates
  - gates constrain pipelines
  - snapshot exposes gate results

Definition of done:
- architecture docs explicitly name `gate` as first-class
- diagrams and terminology stop treating gate as hidden logic

---

## Phase 2. Normalize Gate Contract

Goal:
- define one gate shape used everywhere

Tasks:
- create `src/lib/gates/` folder
- add `src/lib/gates/schema.js`
- add `src/lib/gates/catalog.js`
- convert `bridge-gates.mjs` output to the shared shape

Suggested module split:
- `schema.js`
- `catalog.js`
- `evaluate.js`
- `format.js`

Definition of done:
- all gate producers return one normalized structure
- no route or command invents its own gate payload shape

---

## Phase 3. Add Gate Snapshot Block

Goal:
- gates become part of cached runtime truth

Tasks:
- extend `site/kbx-ui/system-snapshot-store.mjs` / collector path
- add `snapshot.gates`
- split gate collection from read rendering
- collector computes gates from status/doctor/rules/chaos/evidence outputs

Suggested snapshot shape:

```json
{
  "gates": {
    "ok": true,
    "summary": {
      "pass": 3,
      "warn": 1,
      "block": 0,
      "pending": 0
    },
    "items": []
  }
}
```

Definition of done:
- `/system` and other read surfaces can show gates without running gate logic on request

---

## Phase 4. Add CLI Surface

Goal:
- operators can inspect gates directly outside UI

Tasks:
- add `src/commands/gates.js`
- wire into `src/cli.js`
- help text update

Suggested commands:
- `kbx gates list [--json]`
- `kbx gates show <id> [--json]`
- `kbx gates check [--scope <scope>] [--json]`

Definition of done:
- operator can read gate decisions without opening UI

---

## Phase 5. UI Moduleization

Goal:
- gates become visible as a dedicated UI module

Tasks:
- add `Operational Gates` card/section to `/system`
- optionally add compact summary pill to shell/home
- sort by severity and policy
- show evidence/reason text

UI requirements:
- no new direct fetch fan-out
- use system snapshot only
- visually distinct from rules and runtime services

Definition of done:
- user can distinguish:
  - `rules` violations
  - `gate` decisions
  - `pipeline` availability

---

## Phase 6. Connect Gates To Pipelines

Goal:
- pipeline and maintain/release flows speak the same gate language

Tasks:
- release pre-check should map to explicit gate results
- maintain summary should map to explicit gate results
- status output should include gate summary block
- pipeline preview may show gate prerequisites before steps

Definition of done:
- `maintain`, `status`, `release`, and `/system` all report the same gate identities and statuses

---

## Phase 7. Add Regression Tests

Goal:
- prevent gate logic from becoming invisible or drifting again

Tasks:
- unit tests for parse/evaluate/schema
- snapshot tests for `gates` block
- CLI tests for `kbx gates`
- UI tests/selectors for gate rendering
- architecture regression:
  - read path must not execute gate evaluation live

Definition of done:
- changing gate shape or moving logic back into read path breaks tests immediately

---

## Recommended File Changes

### Documentation

- `svfactory/runtime-control-plane-architecture.md`
- `svfactory/README.md`
- optionally `svfactory/foundation.md`

### Runtime / CLI

- `src/lib/gates/schema.js`
- `src/lib/gates/catalog.js`
- `src/lib/gates/evaluate.js`
- `src/commands/gates.js`
- `src/cli.js`
- `src/commands/status.js`
- `src/commands/maintain.js`
- `src/commands/release.js`

### Bridge / UI

- `site/kbx-ui/system-snapshot-store.mjs`
- `site/kbx-ui/server.mjs`
- `site/uiv2/src/app/hooks/useSystemSnapshot.ts`
- `site/uiv2/src/app/pages/System*.tsx` or equivalent surface

### Tests

- `test/lib/gates*.test.js`
- `test/commands/gates.test.js`
- `site/kbx-ui/test/*gate*.test.mjs`

---

## Risks And Tradeoffs

### Risk 1. Gate duplicates rules

Mitigation:
- gates aggregate; rules stay atomic

### Risk 2. Gate duplicates doctor/status

Mitigation:
- doctor/status remain signal producers
- gates are decision outputs derived from those signals

### Risk 3. UI becomes noisy

Mitigation:
- show summarized gate groups by default
- expand only when user drills in

### Risk 4. Too many gate types too early

Mitigation:
- start with current real cases only:
  - release
  - maintain
  - evidence
  - chaos
  - intent uniqueness

---

## Suggested Rollout Order

Recommended implementation order:

1. Phase 1 docs
2. Phase 2 contract
3. Phase 3 snapshot block
4. Phase 4 CLI surface
5. Phase 5 UI module
6. Phase 6 pipeline integration
7. Phase 7 regression tests

If time is limited, minimum viable slice:

1. document gate as first-class
2. normalize bridge gate payload
3. add `snapshot.gates`
4. render `Operational Gates` in `/system`

---

## Acceptance Criteria

This work is complete when:

- `gate` appears as a named concept in docs, UI, snapshot, and CLI
- rules/gates/pipeline are clearly separated in both architecture and implementation
- `/system` can explain blocking conditions without recomputing them on load
- maintain/release/status all use the same gate vocabulary
- tests fail if gate logic drifts back into request-time read paths

---

## Immediate Next Step

If executed next, start with:

1. update architecture docs to add `gate` lane
2. extract current gate payload shape from `site/kbx-ui/bridge-gates.mjs`
3. define shared `gate` schema in `src/lib/gates/`
4. add `gates` block to the system snapshot
