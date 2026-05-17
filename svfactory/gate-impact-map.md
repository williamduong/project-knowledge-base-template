# Gate Impact Map

> Status: planning companion
> Scope: file-by-file impact map for making `gate` a first-class module
> Last updated: 2026-05-17
> Related: `svfactory/gate-module-plan.md`

---

## Purpose

This note turns the gate plan into a concrete execution backlog.

It answers:

- which files must change
- which files should align later
- which files are optional or documentation-only
- where layer leakage would happen if the rollout is done incorrectly

---

## Executive Summary

Current blast radius: `18` identified cases

- `9` `must-change`
- `6` `should-change`
- `3` `optional`

Primary architecture rule:

> Gate evaluation belongs to deterministic runtime or collector paths.
> Gate display belongs to snapshot-backed read paths.
> Gate semantics must not be reinvented independently by UI, bridge, and CLI.

---

## Must-Change Cases

These are the files that define or expose gate behavior today and therefore must be normalized if `gate` becomes first-class.

### M1. [site/kbx-ui/bridge-gates.mjs](/d:/Source/template/project-knowledge-base-template/site/kbx-ui/bridge-gates.mjs:1)

- Current role: ad-hoc phase2 gate policy and evaluation
- Problem: local payload shape (`gate`, `severity`, `command`, `ok`, `detail`) is not the future shared contract
- Required change:
  - rebase onto shared gate schema
  - stop being the implicit source of truth for gate identity naming
  - act as bridge adapter or migrate logic into `src/lib/gates/`

### M2. [site/kbx-ui/system-snapshot-store.mjs](/d:/Source/template/project-knowledge-base-template/site/kbx-ui/system-snapshot-store.mjs:1)

- Current role: cached runtime snapshot builder
- Problem: gate block is not yet a first-class snapshot contract
- Required change:
  - add `snapshot.gates`
  - include `summary`, `items`, `updatedAt`, and source metadata
  - ensure gates are collector-owned, not read-time computed

### M3. [site/kbx-ui/server.mjs](/d:/Source/template/project-knowledge-base-template/site/kbx-ui/server.mjs:1)

- Current role: read/refresh API surface
- Problem: route-level shaping still treats gates as a specialized bridge concern
- Required change:
  - expose gate snapshot in a stable API block
  - remove route-specific gate payload invention
  - keep read routes pure and snapshot-backed

### M4. [src/commands/status.js](/d:/Source/template/project-knowledge-base-template/src/commands/status.js:1)

- Current role: exposes observation gate rollup via `runAllGates(...)`
- Problem: gate semantics here are partially separate from bridge/UI gate vocabulary
- Required change:
  - emit gate summary in the shared gate language
  - distinguish observation gates from operator gates, but keep one record shape
  - avoid creating another incompatible gate payload

### M5. [src/commands/maintain.js](/d:/Source/template/project-knowledge-base-template/src/commands/maintain.js:1)

- Current role: pipeline-like execution with implicit preconditions
- Problem: maintain readiness is not represented as explicit gate records
- Required change:
  - map maintain readiness into named gates
  - surface pass/warn/block in machine-readable form
  - align `maintain --fast` and full mode with gate reporting

### M6. [src/commands/release.js](/d:/Source/template/project-knowledge-base-template/src/commands/release.js:1)

- Current role: release prechecks and execution flow
- Problem: release gating exists behaviorally but not as a unified contract
- Required change:
  - externalize release preconditions into gate records
  - make release pipeline consume gate results instead of embedding ad-hoc checks

### M7. [src/lib/observation.js](/d:/Source/template/project-knowledge-base-template/src/lib/observation.js:450)

- Current role: observation gate engine and reconstruction triggers
- Problem: already uses the word `gate`, but with a different domain meaning and shape
- Required change:
  - explicitly classify these as `observation gates` or `signal-derived gates`
  - normalize output adapter to shared schema
  - preserve reconstruction logic without leaking raw internal shape

### M8. [src/lib/rules/catalog.js](/d:/Source/template/project-knowledge-base-template/src/lib/rules/catalog.js:1)

- Current role: atomic rules and rule metadata
- Problem: several rules already imply gate workflows, but no formal rule-to-gate mapping exists
- Required change:
  - add optional gate metadata or dependency mapping
  - keep rules atomic and avoid embedding aggregated gate decisions here

### M9. [src/cli.js](/d:/Source/template/project-knowledge-base-template/src/cli.js:1)

- Current role: CLI command registry
- Problem: no explicit gate command surface yet
- Required change:
  - wire `kbx gates ...`
  - reserve gate terminology as first-class CLI language

---

## Should-Change Cases

These should change to make the architecture coherent end-to-end, but they can follow after the contract exists.

### S1. [src/commands/help.js](/d:/Source/template/project-knowledge-base-template/src/commands/help.js:1)

- Should explain `gates` as distinct from `rules` and `pipeline`

### S2. [site/uiv2/src/app/hooks/useSystemSnapshot.ts](/d:/Source/template/project-knowledge-base-template/site/uiv2/src/app/hooks/useSystemSnapshot.ts:1)

- Should expose selector helpers for gate summary/items
- Should avoid per-page ad-hoc gate interpretation

### S3. [site/uiv2/src/app/pages/RuntimeServicesPage.tsx](/d:/Source/template/project-knowledge-base-template/site/uiv2/src/app/pages/RuntimeServicesPage.tsx:1)

- Should stay focused on services, not absorb gate UI accidentally
- Might need cross-links to system gates, but should not render gate decision logic itself

### S4. System shell and operator pages under [site/uiv2/src/app/](/d:/Source/template/project-knowledge-base-template/site/uiv2/src/app/)

- Should add a dedicated `Operational Gates` module
- Should visually separate:
  - rules
  - gates
  - pipelines

### S5. [svfactory/runtime-control-plane-architecture.md](/d:/Source/template/project-knowledge-base-template/svfactory/runtime-control-plane-architecture.md:1)

- Should add a gate lane diagram and contract wording once implementation starts

### S6. [svfactory/README.md](/d:/Source/template/project-knowledge-base-template/svfactory/README.md:1)

- Should reference gate contract docs and rollout status for maintainers

---

## Optional Cases

These are useful but not required for the first clean rollout.

### O1. Historical gate persistence

- Candidate area: `svfactory/focus-state.db` or another runtime store
- Value: trend analysis, postmortems, and operator audit trail

### O2. Intent-local human gate convergence

- Candidate sources:
  - [svfactory/process.md](/d:/Source/template/project-knowledge-base-template/svfactory/process.md:290)
  - [svfactory/principles.md](/d:/Source/template/project-knowledge-base-template/svfactory/principles.md:150)
- Value: unify human approval gates with runtime/operator gates later

### O3. Gate-aware prototype or search surfaces

- Candidate page: [site/uiv2/src/app/pages/PrototypePage.tsx](/d:/Source/template/project-knowledge-base-template/site/uiv2/src/app/pages/PrototypePage.tsx:1)
- Value: can demo the concept, but should not lead the contract

---

## Layer Risk Checklist

These are the architectural failure modes to avoid during rollout.

### R1. UI computes gates

- Bad sign: page component infers gate states from raw status/rules/doctor fields
- Fix: only consume normalized gate items from snapshot

### R2. Read API evaluates gates on request

- Bad sign: `server.mjs` recomputes gate logic inside GET handlers
- Fix: collector computes; read routes only return cached gate state

### R3. Rules become gate containers

- Bad sign: aggregated block/pass decisions are stored directly in rules catalog
- Fix: rules may annotate dependencies, but not own aggregated outcomes

### R4. Pipelines own decision semantics

- Bad sign: `maintain`/`release` each invent their own block/warn taxonomy
- Fix: pipelines consume gate results and remain execution-oriented

### R5. Observation gates leak as user-facing operator gates without adaptation

- Bad sign: `runAllGates()` raw payload becomes API/UI contract
- Fix: adapt observation outputs into shared gate record shape

---

## Recommended Rollout Order

1. `M1`, `M7`, `M8`: define shared gate schema and normalize producers
2. `M2`, `M3`: add gate snapshot block and stable API exposure
3. `M4`, `M5`, `M6`, `M9`: align CLI/runtime surfaces
4. `S1`, `S2`, `S4`, `S5`, `S6`: update docs and UI moduleization
5. `O1`, `O2`, `O3`: optional convergence and future polish

---

## Acceptance Checklist

The gate module rollout is architecturally complete when:

- every gate producer emits one shared shape
- snapshot contains a first-class `gates` block
- `/system` reads gates without recomputation
- `status`, `maintain`, and `release` report the same gate identities
- CLI exposes `kbx gates ...`
- rules, gates, and pipeline remain distinct in both code and docs
