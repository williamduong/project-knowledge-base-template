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
- Phase 1 bootstrap evidence exists: Option B localhost shell scaffolded at `site/kbx-ui/`; bridge endpoint `/api/version` successfully executes `kbx --version` and returns `2.7.0-beta.2`.
- Phase 1.5 bridge hardening evidence exists: `/api/status` returns parsed `kbx status --json`, and `/api/phase2-bridge` evaluates deterministic gate policy (`hard-fail/warn/info`) from runtime command outputs.
- Proof state artifact is published at `notes/roadmap/kbagent-phase1-proof-state.md`.

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
- Lock Option B (localhost webapp) as the Phase 1 shell and produce deterministic bootstrap output through a CLI-backed bridge.

Entry gate:
- Phase 0 alignment complete.

Exit gate:
- Option B selected with written evidence table and rationale.
- Minimal executable proof exists: webapp bridge can execute `kbx --version` and render output.
- Interaction boundary is explicit: Copilot Chat with agent KBAgent may propose actions, but web/chat mutations are applied only through CLI-backed paths.

Observed evidence:
- `npm --prefix ./site/kbx-ui run build` passed.
- `npm --prefix ./site/kbx-ui run test` passed (`12/12` pass): 6 success-path contracts + 6 fail-path robustness tests.
- `GET http://localhost:4174/api/version` returned `{ ok: true, stdout: "2.7.0-beta.2" }`.
- `GET http://localhost:4174/api/status` returned parseable JSON payload from `kbx status --json`.
- `GET http://localhost:4174/api/phase2-bridge` returned gate summary with explicit severity mapping and block/warn evaluation.
- `GET http://localhost:4174/api/rules` returned `ok=true`, `parsed.count=19` from `kbx rules list --json`.
- `GET http://localhost:4174/api/intents` returned `ok=true`, `parsed.count=63` from `kbx intent list --all --json`.
- `GET http://localhost:4174/api/system` returns `ok=true` with summary; errors return `ok=false` + `error` field (no source leak).
- `GET http://localhost:4174/api/documents` returns `ok=true` with summary; errors return `ok=false` + `error` field (no source leak).

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

Exit gate (SATISFIED):
- All primary tabs render real runtime data from CLI-backed endpoints.
- Payload contracts are hardened: summary-only, no source field exposure.
- All fail-path tests passing (command errors, malformed input, timeouts).
- Error handling contract implemented (HTTP 500 with error message on fail).

Completion evidence:
- 6 endpoints live: `/api/rules`, `/api/intents`, `/api/phase2-bridge`, `/api/workspace`, `/api/system`, `/api/documents`.
- 12/12 tests pass (3 gate logic + 6 endpoint success-path + 3 fail-path tests).
- Summary contracts: workspace (activeIntentCount, hasWorkingTreeChanges), system (pass/warn/error/info counts), documents (entityCount, relationCount, topIssues).

### Phase 4 - Interactive UI Delivery

Goal:
- Deliver intent mutations and operator flows through UI controls.

Entry gate (READY):
- Read-only shell stable and hardened: 6 endpoints, 12/12 tests, no source-leak.
- Error handling contract fully implemented (HTTP 500 with error message).
- UI refresh patterns and panel rendering stable for all read-only views.

Design gate (Phase 4 prep):
- Mutation endpoint contract: `/api/intents/create`, `/api/intents/update` with JSON request validation.
- Pre-apply review panel: diff preview + conflict warnings + deterministic trace display.
- Intent lifecycle actions: start, apply, close, retro with command audit trail.

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

## Immediate Next Session Checklist (Phase 4 Prep)

1. Design mutation endpoint contract for intent create/update (request schema + validation gates).
2. Implement `/api/intents/create` and `/api/intents/update` with `kbx intent` CLI delegation.
3. Add pre-apply review panel to UI (diff preview + warnings + trace).
4. Add mutation path test cases (validation fail, conflict detection, success trace).
5. Keep roadmap evidence synchronized and aligned with active intent chain.
