# KBAgent Roadmap Execution Plan (Intent-First)

## Scope

This document converts the UI roadmap narrative into a deterministic execution track anchored to active intent lifecycle.

Anchor intent:
- `v2-10-v2-10-kbagent-roadmap-gap-p0-alignment` (active)

Primary objective:
- Apply P0 gap corrections (naming, lifecycle labeling, principles/rules separation) before opening multi-week UI implementation.
## Current State

- Roadmap content exists in `notes/roadmap/kbagent-roadmap.html`.
- High-level phases are clear (P0-P5) but implementation coupling to runtime gates is still implicit.
- Single active intent (P0): `v2-10-v2-10-kbagent-roadmap-gap-p0-alignment`. P1/P2/v11 backlog intents are queued with `depends_on` chain.
- Phase 0 closeout in progress: CLI naming normalization is complete, and roadmap wording now distinguishes workflow lifecycle vs ontology lifecycle plus Principles vs runtime rules. Remaining work is to keep the other roadmap artifacts consistent.

## Target State

- Each roadmap phase has deterministic entry and exit gates.
- Each gate maps to one or more existing `kbx` command surfaces.
- Progress reporting can be updated from runtime evidence, not narrative-only updates.

## Command Mapping Baseline

Phase readiness checks:
- `node ./bin/kbx.js intent status <id> --json`
- `node ./bin/kbx.js status --json`
- `node ./bin/kbx.js doctor --json`

Observation and risk checks:
- `node ./bin/kbx.js chaos --json`
- `node ./bin/kbx.js chaos --estimate`
- `node ./bin/kbx.js maintain --json --suggest-intent`

Planning and traceability checks:
- `node ./bin/kbx.js intent list --all --json`
- `node ./bin/kbx.js graph export lane --json`
- `node ./bin/kbx.js rules list --json`

## Phase Execution Track

### Phase 0 - Alignment and Boundary Lock

Goal:
- Normalize naming, lifecycle references, and principles/rules separation in roadmap artifacts.

Entry gate:
- ✓ Active anchor intent metadata is complete (focus, next_action, decision_summary) — satisfied.

Exit gate:
- ✓ All `kb` CLI command references in `src/commands/*.js` updated to `kbx` (233 replacements).
- ✓ Lifecycle references are domain-explicit: workflow lifecycle (folder-based) vs ontology lifecycle (DRAFT/PROPOSED/VERIFIED/EXECUTED/COMMITTED).
- ✓ Principles (P0-P25 in svfactory/principles.md) and runtime rule families (KBX-AX/P in kbagent-complete-doc.html) are documented as distinct layers.

### Phase 1 - Shell Decision and Bootstrap

Goal:
- Lock UI shell decision and produce deterministic bootstrap output.

Entry gate:
- Phase 0 alignment complete.

Exit gate:
- One shell selected with rationale.
- Minimal executable proof exists (CLI bridge hello path).

### Phase 2 - CLI Bridge Implementation

Goal:
- Provide typed bridge from UI runtime to `kbx` command surfaces.

Entry gate:
- Shell decision fixed.

Exit gate:
- Core command wrappers implemented with stable JSON parse/error handling.
- Wrapper tests pass for command success and fail paths.

### Phase 3 - Read-Only UI Delivery

Goal:
- Show real data across workspace/system/documents/rules tabs.

Entry gate:
- Phase 2 bridge available and tested.

Exit gate:
- All primary tabs render real runtime data.
- File changes in KB are reflected via refresh/watch behavior.

### Phase 4 - Interactive UI Delivery

Goal:
- Deliver intent mutations and operator flows through UI controls.

Entry gate:
- Read-only shell stable.

Exit gate:
- Create/update/apply/retro flows can be completed from UI.
- Mutation paths include pre-apply review and deterministic command trace.

### Phase 5 - Hardening and Release

Goal:
- Improve operator experience and publishable quality.

Entry gate:
- Interactive feature set functionally complete.

Exit gate:
- Error UX, keyboard paths, and packaging channel are verified.
- Release note entry is prepared with explicit runtime evidence links.

## Immediate Next Session Checklist

1. Reconcile `svfactory/focus.md` with current branch reality and active roadmap priority.
2. Prepare a small update pass for `notes/roadmap/kbagent-roadmap.html` to add deterministic command-gate references.
3. Create a phase-by-phase evidence table template for runtime verification.
4. Keep all roadmap updates attached to `v2-9-kbagent-observability-graph` until Phase 1 gate is passed.
