---
slug: v2-7-1-flow-and-gates-ui-planning
title: "Flow workspace UI planning for pipelines and gates"
description: "Define and stage a dedicated UIV2 Flow workspace that visualizes pipeline-like and gate-like structures across the repository without collapsing them into Rules."
lifecycle: backlog
created_at: 2026-05-19T16:03:17.329Z
focus:
  current: "Backlog planning only. Source grep and IA definition are complete enough to preserve as an intent, but no active implementation should begin until current active intents are reconciled and a UI execution window is chosen."
  last_updated: 2026-05-19
  next_action: "When activated, scaffold the top-level Flow workspace in site/uiv2, wire mock or derived data from the current runtime snapshot, and defer backend normalization until the UI shell proves the operator model."
goal_text: "Create a standalone Flow workspace in UIV2 that makes pipelines, gates, and their relationships directly legible across the source tree, while keeping Rules as policy registry rather than the main host for execution-flow visualization."
schema_version: 2.7.0-beta.1
---

# Backlog Intent: v2-7-1-flow-and-gates-ui-planning

## Summary

The current UIV2 shell has strong early work for `Intent`, `Knowledge Base`, `Rules`, and `System`, but there is no dedicated operator surface for execution flow. Pipeline-like and gate-like logic is spread across multiple source families:

- release pipeline runtime and YAML templates
- intent-local human gates
- bridge/operator-global gates
- observation and pipeline-specific gate taxonomy
- source docs and plans describing phase gates, exit gates, and confirm steps

During this conversation we re-scanned the repository and confirmed that:

1. `Rules` should remain the policy and evidence registry.
2. `Gate` is too important to stay hidden as a side panel inside `Rules`.
3. `Gate` also should not become a separate top-level workspace yet because it is only one major branch of a bigger execution-flow model.
4. The right mental model is a new top-level workspace: `Flow`.

This backlog intent preserves the UI plan and task breakdown for that workspace so the team can activate it later without losing the analysis done in this conversation.

Activation trigger:

- Existing active intents are reconciled and a safe execution window is available for new UIV2 shell work.
- Owner chooses to start the UI-first `Flow` workspace before backend normalization.
- Current branch and intent registry are aligned enough that a new execution intent can be opened cleanly.

## Problem Statement

The repository already contains multiple execution and decision surfaces, but operators cannot see them in one place.

Current pain:

- `Rules` explains policy, but not end-to-end execution flow.
- `System` shows runtime health, but not the shape of pipelines and gates across the repo.
- Source-level flow artifacts are discoverable only by grep or by already knowing where to look.
- There is no visual answer to: "What blocks promotion?", "Which flows need confirmation?", or "How do rules influence gates and gates influence runtime steps?"

Without a dedicated UI surface, flow knowledge stays hidden in docs, YAML, CLI commands, and bridge adapters.

## Goal

Define and later ship a dedicated `Flow` workspace in `site/uiv2` that:

1. Visualizes all major pipeline-like structures the source currently exposes.
2. Visualizes all major gate families the source currently exposes.
3. Separates `Rules` from `Flow` cleanly in the user mental model.
4. Uses graph visualization where it adds value, while preserving dense card/table reading surfaces.
5. Ships UI-first with mocked or derived data, then grows into a normalized backend contract later.

## Source Findings Preserved

### Pipeline-like source surfaces

- `src/lib/pipeline.js`
- `src/commands/release.js`
- `.kb/release-pipeline.yaml`
- `template/16-release-pipelines/*.yaml`
- `template/15-governance/release-pipeline-policy.md`
- `notes/*` and `svfactory/process.md` references to phase breakdowns, confirm steps, and exit gates

### Gate-like source surfaces

- `src/lib/gates/index.js`
- `src/commands/gates.js`
- `site/kbx-ui/bridge-gates.mjs`
- `site/kbx-ui/server.mjs` snapshot `gates` block
- `svfactory/runtime-control-plane-architecture.md` gate taxonomy
- `src/lib/observation.js` observation gate references
- `svfactory/process.md` human-gate, chaos gate, branch gate, downstream acceptance gate patterns

### Related but distinct policy surfaces

- `src/lib/rules/*`
- `src/lib/rules/rules.yaml`
- `site/uiv2/src/app/pages/RuntimeServicesPage.tsx`

Conclusion preserved from grep:

- `Rules` is an upstream policy and evidence source.
- `Flow` is the operator workspace for execution and decision topology.
- `Gate` is a first-class subdomain inside `Flow`.

## Proposed Information Architecture

Add a new top-level shell tab:

- `Flow`

Inside `Flow`, add five subviews:

1. `Overview`
2. `Pipelines`
3. `Gates`
4. `Map`
5. `Registry`

### 1. Overview

Purpose:

- one-screen operator summary of all flow-bearing artifacts
- fastest answer to "where is current execution pressure?"

Primary UI blocks:

- pipeline count
- gate family count
- blocked gate count
- confirm-step count
- pipeline-specific risk summary
- next-action card

### 2. Pipelines

Purpose:

- read structured runtime flow from release-pipeline and related template examples

Primary UI blocks:

- pipeline selector
- step table
- step detail drawer
- chips for `confirm`, `fail_on_nonzero`, `when`, output interpolation

### 3. Gates

Purpose:

- group all gate families in one surface

Primary UI blocks:

- taxonomy group switcher
- gate cards or rows
- status summary bar
- source policy and source signal references
- blocking detail and recovery hints

Expected gate families:

- `operator-global`
- `intent-local`
- `observation`
- `pipeline-specific`

### 4. Map

Purpose:

- visualize relationships between rules, gates, pipelines, and runtime commands

Primary UI blocks:

- `React Flow` canvas
- node inspector
- legend
- mobile fallback toggle

Expected graph edges:

- rule pack -> rule
- rule -> gate
- gate -> pipeline step
- pipeline step -> command
- gate -> evidence source

### 5. Registry

Purpose:

- searchable flat index of all detected flow-like artifacts

Primary UI blocks:

- dense table
- source type filters
- owner/path metadata
- artifact classification labels

## UI Direction

- Preserve the visual language already established by `Intent`, `Knowledge Base`, and `Rules`.
- Use `React Flow` for relationship mapping only, not for every primary reading task.
- Prefer compact operator-density cards and tables over decorative panels.
- Keep a clean mobile fallback: the graph should never be the only readable representation.
- Reuse the same shell status language, pill system, panel styling, and section toolbar patterns.

## Data Strategy For The First UI Pass

UI-first, backend later.

Use what already exists now:

- `homeSummary.pipeline`
- `gates`
- `rulesSummary`
- static or source-derived adapter data for missing flow artifacts

Do not block the first pass on a dedicated backend domain contract.

Later backend target:

- add `flowSummary` to `/api/system-snapshot`
- normalize pipeline, gate, and relationship payloads into one contract

## Scope

### In scope for later activation

1. Add a new shell tab and route for `Flow`.
2. Create a dedicated page component for the `Flow` workspace.
3. Build all five UI subviews with mock or derived data.
4. Reuse existing snapshot hooks where possible.
5. Use `React Flow` for the `Map` subview.
6. Add helper adapters to shape current snapshot data into `Flow` view models.
7. Add lightweight source metadata for pipeline and gate registry rows.

### Out of scope for this backlog item

1. Full backend normalization of all flow-bearing artifacts.
2. New persistent storage schema for flow topology.
3. Converting every source workflow in docs into live executable runtime objects.
4. Editing pipelines or gates from the UI.
5. Reworking `Rules` workspace beyond adding a navigational relationship to `Flow`.

## Task Breakdown

### Task Group A — Source contract and IA lock

#### T1. Freeze Flow taxonomy

Objective:
- lock vocabulary for `Flow`, `Pipeline`, `Gate`, `Map`, `Registry`

Deliverables:
- one canonical taxonomy section in the future execution intent plan
- explicit note that `Rules != Flow`

Definition of done:
- terms are stable enough that page copy and component naming can use them without churn

#### T2. Preserve source classification

Objective:
- retain the grep findings as structured implementation input

Deliverables:
- grouped source lists for pipeline-like artifacts
- grouped source lists for gate-like artifacts
- grouped source lists for related policy artifacts

Definition of done:
- future implementer can build adapters without re-grepping the repo from zero

### Task Group B — Shell and route work

#### T3. Add top-level `Flow` tab

Objective:
- expose `Flow` beside `Rules`

Deliverables:
- tab metadata update
- icon choice and route wiring

Definition of done:
- shell shows `Flow` as a first-class workspace, not a hidden nested panel

#### T4. Create `FlowPage`

Objective:
- establish the new workspace host component

Deliverables:
- page shell
- toolbar copy
- local sub-tab state
- placeholder-safe loading states

Definition of done:
- route renders a coherent workspace shell even before all subviews are populated

### Task Group C — View models and data adapters

#### T5. Build `Flow` view-model adapter layer

Objective:
- translate current snapshot blocks into UI-ready models

Deliverables:
- pipeline summary adapter
- gates summary adapter
- flow registry rows
- map node/edge builders

Definition of done:
- UI components do not read raw snapshot structures directly

#### T6. Add mock fallbacks for missing backend data

Objective:
- make UI-first development independent from backend normalization

Deliverables:
- fallback datasets
- empty-state copy
- mixed mode: real where available, mock where missing

Definition of done:
- page remains usable even when only partial runtime data is present

### Task Group D — Workspace views

#### T7. Build `Overview`

Objective:
- give operators one-screen pressure summary

Deliverables:
- health bar
- KPI cards
- next-action panel
- recent source/artifact summary

Definition of done:
- Overview answers what exists, what is blocked, and what needs attention

#### T8. Build `Pipelines`

Objective:
- make release pipeline and step topology readable

Deliverables:
- pipeline header
- step grid or table
- step inspector
- chips for confirm and fail behavior

Definition of done:
- operator can inspect sequence and risk of steps without opening YAML

#### T9. Build `Gates`

Objective:
- make gate families directly inspectable

Deliverables:
- grouped gate panels
- family filters
- status summary
- source/evidence ribbons

Definition of done:
- operator can distinguish blocked vs warning vs informational gates and where they come from

#### T10. Build `Map`

Objective:
- add graph reasoning surface where linear lists are not enough

Deliverables:
- `React Flow` canvas
- legend
- inspector
- mobile-safe fallback

Definition of done:
- operator can visually trace rule -> gate -> pipeline relationships

#### T11. Build `Registry`

Objective:
- create one searchable source inventory

Deliverables:
- flat table
- filters by artifact family
- path/source ownership display

Definition of done:
- operator can answer "where in source does this flow artifact live?"

### Task Group E — UX polish and verification

#### T12. Align visual language with existing workspaces

Objective:
- ensure `Flow` feels native inside current UIV2

Deliverables:
- panel reuse
- status pill reuse
- toolbar alignment
- responsive checks

Definition of done:
- new workspace does not look like an isolated prototype

#### T13. Playtest and browser verification

Objective:
- validate actual interaction before backend work begins

Deliverables:
- route smoke test
- desktop and mobile sanity check
- graph fallback verification

Definition of done:
- `Flow` can be demoed as a stable UI-first contract

## Suggested Execution Order

1. T1-T2
2. T3-T4
3. T5-T6
4. T7-T11
5. T12-T13

## Acceptance Criteria

1. A top-level `Flow` workspace exists in UIV2 design planning.
2. `Gate` is modeled as a dedicated subview inside `Flow`, not buried under `Rules`.
3. All current gate families found in source are accounted for in the UI model.
4. Release pipeline step structure is accounted for in the UI model.
5. `Map` is explicitly planned to use `React Flow`, but the page still has non-graph reading surfaces.
6. The backlog intent preserves enough detail that implementation can begin later without redoing the architecture work from scratch.

## Risks

- The source currently mixes live runtime gates with doc-defined gates; future adapters may expose fuzzy boundaries.
- Backend contracts are still uneven; some `Flow` views will need hybrid mock/real data initially.
- If `Rules` evolves at the same time, some relationship wording between `Rules` and `Flow` may need minor adjustment.

## Dependencies

- Depends on no immediate code change today; this is backlog planning only.
- Future activation should consider the branch/intents mismatch already recorded in maintainer focus.
- Future implementation will likely touch:
  - `site/uiv2/src/app/ShellFrame.tsx`
  - `site/uiv2/src/app/shell-data.ts`
  - new `site/uiv2/src/app/pages/FlowPage.tsx`
  - possible new hooks/adapters for snapshot shaping

## Activation Notes

When this backlog item is activated later:

1. Prefer a new execution intent rather than mutating one of the currently active intents.
2. Keep the first implementation pass UI-only.
3. Treat backend normalization as a follow-up intent unless the frontend is blocked by missing data.
4. Verify in browser after significant frontend work rather than relying on code inspection alone.
