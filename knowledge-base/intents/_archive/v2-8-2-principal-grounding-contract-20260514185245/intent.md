---
id: v2-8-2-principal-grounding-contract
mode: full
lifecycle: closed
created_at: "2026-05-12T07:55:23.898Z"
focus:
  current: "Convert the 9-section verification into a sequential runtime-vs-target-state execution order"
  last_updated: 2026-05-12
  next_action: "Use the final verdict to split immediate UI refactor scope from future-state onboarding/pipeline/rules work"
change_type: governance
type: governance
strategic_mode: Investigation
urgency: Scheduled
change_scope: "[\\"knowledge-base/\\", \\"site/kbx-ui/src/\\", \\"bin/kbx.js\\"]"
impact_signals: []
decision_summary: "The 9-section review is complete. Sections 1-4 and parts of 7 are usable as runtime-truth inputs for the next UI refactor slice; Sections 5, 6, 8, and 9 remain target-state architecture and must not be presented as implemented behavior."
review_after: null
schema_version: 2.7.0-beta.2
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
architecture_position:
  wave: v2.8.2
retro_completed: true
retro_completed_at: "2026-05-14T18:50:55.531Z"
retro_note: "Review locked; residual implementation moved to version-scoped backlog intents."
close_type: completed
closed_at: "2026-05-14T18:51:35.101Z"
release_ref: null
completion_note: null
drop_reason: null
---

# Intent: Phase 4 UI — Document verification & source alignment

**Goal:** Verify kbagent-complete-doc.html (9 sections) against source code before refactoring giao diện.  
**Owner:** SVFactory (maintainer gate)  
**Scope:** Documentation audit + source code validation  
**Status:** ✅ Verification complete; ready for scope split

## Final Verdict

The 9-section review is complete. The roadmap document remains the design contract, but the runtime truth is materially narrower than the HTML suggests.

Immediate conclusion:
1. Use Sections 1-4 as the base for near-term UI refactor, but only against the currently implemented file-based KB, bridge, and CLI surfaces.
2. Use Section 7 only in read-only/runtime-engine terms; do not expose SaaS rule content as implemented.
3. Treat Sections 5, 6, 8, and 9 as target-state architecture until command/runtime parity exists.

## Ordered Execution View

### Step 1 — Safe To Use Now
- **Section 1: Blueprint** — review locked; use as high-level runtime framing.
- **Section 2: User flows** — review locked; use actual CLI lifecycle as runtime truth and track residual UX/runtime gaps separately.
- **Section 3: Components** — review locked; use only runtime-evidenced components and track residual component drift separately.
- **Section 4: Data architecture** — review locked; target the current mini graph + file store and track architecture migration separately.
- **Section 7: Rules (D+O)** — usable only for runtime rule-engine visibility; not for SaaS/domain-rule authoring claims.

### Step 2 — Hold As Target-State
- **Section 5: Default data** — review locked; current generic template reality accepted; residual seed-data work tracked separately.
- **Section 6: Pipelines** — review locked; current command surface accepted as runtime truth; residual pipeline parity tracked separately.
- **Section 8: Master rules** — review locked; current runtime-rule boundary accepted; residual AX/P enforcement work tracked separately.
- **Section 9: Foundation** — review locked; current init/template reality accepted; residual onboarding generator work tracked separately.

### Step 3 — Gaps Fix Order (Dependency Chain)

**Full gap execution order — sequential, one intent per phase. UI must wait until all phases complete.**

---

### Phase A — Foundation: Init Interview + Seed Generators
**Source:** Section 9  
**Severity:** ❌ major gap  
**Blocks:** All phases below — every KB instance must bootstrap correctly from init  
**Depends on:** Nothing (this is the gating function for everything else)

Gaps to fix:
- `kbx init` performs template copy only; no interview pipeline collects project identity, infra stack, goals, rules
- `src/commands/init.js → runInit()` never calls any prompt/input flow
- No `seed-goals.json` or `seed-rules.json` generated from user input
- `knowledge-base/00-start-here/system-map.md` remains generic placeholder post-init
- `kbx init --retrofit` option is entirely absent

Work:
- Implement interactive interview in `runInit()`: project name, team, stack, infra, initial goals (x3), initial rules (x3)
- Generate `.kb/graph/seed-goals.json` and `.kb/graph/seed-rules.json` from interview answers
- Populate `knowledge-base/00-start-here/system-map.md` with actual answers, not placeholder text
- Add `--retrofit` flag that skips template copy and runs interview on existing repo
- Add `--preset=saas` shortcut that pre-fills SaaS-defaults and skips generic questions

---

### Phase B — Rule Taxonomy: AX Collision Fix + P-Rule Enforcement
**Source:** Section 8  
**Severity:** ❌ major gap  
**Blocks:** Phase C (pipeline gate semantics depend on correct rule IDs), Phase G (SaaS rules must not collide)  
**Depends on:** Phase A complete (foundation stores rule definitions correctly after init)

Gaps to fix:
- **AX ID collision**: Source `KBX-AX003/AX004/AX005` in `contract-alignment.js` are governance verification rules (check doc markers); but doc AX003/AX004/AX005 are behavioral axioms (deterministic gate, single write point, human approval) — same IDs, different semantics
- Doc AX001 (separation of powers), AX002 (domain agnosticism), AX006 (evidence on every node), AX007 (goals never auto-close) → zero corresponding enforcement rules in source
- No `KBX-P` domain exists in registry (`registry.js` defines M/V/I/GB/AX/PR/WF/KA only)
- `KBX-PR` (Principle Alignment domain) exists but is unrelated to the documented P-rule namespace
- Doc P001 (one active intent per branch, marked `verified`) → `activateBacklogIntent()` in `src/lib/intent.js` does NOT check for existing active intents before activation
- Doc P003 (goal alignment before activation, marked `verified`) → no goal-align check anywhere in `runActivate` path
- Doc P006 (retro mandatory before archive, marked `verified`) → `retro_completed` field not checked in archive flow
- Doc P007 (release gate chaos ≤ 50), P009 (NL patch normalize) → both marked `planned`, neither implemented

Work:
- Rename source governance verification rules: `KBX-AX003/AX004/AX005` → `KBX-GV001/GV002/GV003` (add GV domain to registry)
- Register `KBX-P` domain in `registry.js`
- Implement P001 guard in `activateBacklogIntent()`: reject activation if another active intent exists on current branch
- Implement P003 guard: check at least one goal linked before activation is allowed
- Implement P006 guard: block archive unless `retro_completed: true` is set on intent frontmatter
- Implement AX001/AX002/AX006/AX007 as new enforcement rules in appropriate rule module
- Add P007 gate in release flow: block release if chaos score > 50
- P009 can remain `planned` (NLP scope, defer)

---

### Phase C — Pipeline: CLI Command Parity
**Source:** Section 6  
**Severity:** ❌ major gap  
**Blocks:** Phase D (seed bundle init preset needs `--retrofit` and gate commands to work), Phase E (Retro writer is part of pipeline)  
**Depends on:** Phase B complete (gate semantics and P-rule guards must be in place before pipeline can enforce them)

Gaps to fix:
- `kbx intent align` — not in `src/commands/intent.js` subcommands
- `kbx intent approve` — not in `src/commands/intent.js` (bridge calls it but CLI doesn't expose it)
- `kbx intent stage` — not in CLI (doc uses `stage` transition; runtime uses `apply` + close/archive, not 1:1)
- `kbx gate` — no dedicated command; doc defines it as deterministic bundle: `doc:gate + ontology:validate + tests`
- `kbx intent retro` — no public CLI command; retro as explicit lifecycle step does not exist
- `kbx impact` is not auto-called as hard pre-apply gate (doc says `impact:check` runs before every apply)
- `kbx init --retrofit` — absent (also in Phase A, but pipeline contract depends on it too)
- P4 release gate: `kbx gate --release` with chaos threshold check not implemented; `:Release`/`:INCLUDED_IN` graph edges not written by release flow
- Bridge mutation calls `intent update`, `intent approve`, `intent apply-preview` — these routes exist in bridge but the CLI subcommands they proxy are not confirmed in `src/commands/intent.js`

Work:
- Add `kbx intent align`, `approve`, `stage` subcommands to `src/commands/intent.js`
- Implement `kbx gate` command: runs `doc:gate`, `ontology:validate`, test suite in sequence; exits non-zero if any fail
- Implement `kbx intent retro` subcommand: prompts for retro notes, sets `retro_completed: true` on intent frontmatter, writes retro record
- Wire `kbx impact` as mandatory pre-apply check in `runApply()`: reject apply if impact check fails
- Add `kbx gate --release` flag: runs standard gate + chaos score check (block if > 50)
- Verify/fix bridge proxy routes (`intent update`, `approve`, `apply-preview`) against actual CLI subcommand surface
- Coordinate with Phase A to add `--retrofit` as shared init option

---

### Phase D — Seed Bundle: SaaS Defaults + Preset
**Source:** Section 5  
**Severity:** ❌ major gap  
**Blocks:** Phase G (SaaS domain rules need their seed goals/intents as fixtures), Phase H UI (goal/intent overview depends on populated seed data)  
**Depends on:** Phase A (init pipeline must exist to receive preset flag), Phase B (rule IDs must be normalized before writing seed rule IDs), Phase C (pipeline commands must exist to process seed intents)

Gaps to fix:
- No SaaS seed goals (`GOAL-001..004`) shipped in template
- No SaaS seed intents (`INT-SAAS-001`, `INT-SAAS-002`) shipped in template
- No SaaS default rule IDs in template (doc claims specific KBX-S/B/T/D/O IDs as defaults)
- Template ships generic `unverified`/`design-only` placeholders, not populated SaaS objects
- `kbx init --retrofit` + scan-based starter-intent suggestion not implemented

Work:
- Author `template/seed/saas/goals.json`: GOAL-001 (ops visibility), GOAL-002 (change safety), GOAL-003 (onboarding), GOAL-004 (tech debt)
- Author `template/seed/saas/intents.json`: INT-SAAS-001 (init intent), INT-SAAS-002 (first retro intent)
- Author `template/seed/saas/rules.json`: KBX-S001/S002/S003, KBX-B001/B002, KBX-T001 (stubs referencing Phase G for full implementation)
- Wire `kbx init --preset=saas` to copy seed bundle into `.kb/graph/` on init
- Implement starter-intent suggestion in `--retrofit` path: scan repo, suggest INT-SAAS-001 if no active intent found

---

### Phase E — Data Architecture: Graph Tier 2, Retro Writer, Evidence Metadata
**Source:** Sections 1, 3, 4  
**Severity:** ⚠️ partial (engine exists, architecture is behind)  
**Blocks:** Phase G (SaaS rules KBX-O003/O004 need `:Code.fan_in` and `:IMPLEMENTS` edges), Phase H UI (graph view needs real node types)  
**Depends on:** Phase C complete (Retro writer is part of pipeline; needs `kbx intent retro` to exist first)

Gaps to fix:
- Current graph (`src/lib/graph.js`) is mini file-based model with 3 entity kinds: `doc`, `intent`, `release-entry`; doc expects Kuzu Tier 2 with 8 node types and 8 edge types
- Missing node types: `:Goal`, `:Rule`, `:Code`, `:Signal`, `:Release`, `:Lesson` (only `:KBDoc` and `:Intent` partially present)
- Missing edge types: `:IMPLEMENTS`, `:INCLUDED_IN`, `:TRIGGERED_BY`, `:CLOSES`, `:LESSONS_FROM`, `:ALIGNED_TO`
- Evidence metadata contract (`source`, `confidence`, `timestamp`, `linked_intent_id`, `version`, `repo_origin`) not uniformly applied to graph nodes/edges
- Retro as exclusive graph writer (`retro:write`) has no explicit runtime module; no separation from CLI lifecycle commands
- `chaos-history.ndjson` expected by doc; runtime uses `chaos-history.md` (Markdown append, not NDJSON)
- No confirmed `checkpoints.json` store (checkpoint events flow through focus/state, no standalone file)
- Goals engine, signal bus, infra adapter, LLM adapter — not implemented as dedicated runtime modules

Work (pragmatic scope, not full Kuzu migration):
- Extend `src/lib/graph.js` node schema to include `:Goal`, `:Rule`, `:Code`, `:Lesson`, `:Signal`, `:Release` node kinds
- Extend edge schema with `:IMPLEMENTS`, `:ALIGNED_TO`, `:CLOSES`, `:INCLUDED_IN`, `:TRIGGERED_BY`, `:LESSONS_FROM`
- Add `evidence` metadata block (source, confidence, timestamp, linked_intent_id, version) to node/edge write contracts
- Implement `retro:write` as explicit graph write step inside `kbx intent retro` (Phase C): writes `:Lesson` node + `:LESSONS_FROM` edge
- Migrate `chaos-history.md` append to `chaos-history.ndjson` NDJSON format; write migration script for existing `.md` entries
- Add `checkpoints.json` as checkpoint event store; wire `kbx intent checkpoint` to append to it
- Goal engine, signal bus, LLM adapter: stub modules with no-op implementations to establish module boundary; mark `status: planned`

---

### Phase F — CLI Surface: Bridge Command Mismatch + Impact Hard Gate
**Source:** Section 2  
**Severity:** ⚠️ partial  
**Blocks:** Phase H UI (bridge must proxy real commands or UI shows phantom behavior)  
**Depends on:** Phase C complete (bridge proxies must point to real CLI subcommands added in Phase C), Phase E (graph nodes must exist so impact check can evaluate them)

Gaps to fix:
- Bridge calls `intent update`, `intent approve`, `intent apply-preview` but these are not confirmed as CLI subcommands in `src/commands/intent.js`
- `kbx intent apply` does not enforce `impact:check` as hard pre-apply gate (implemented in Phase C as well, but bridge proxy behavior must be verified)
- Documented F3 operator UX (dashboard prompt-copy + Copilot handoff) not implemented in localhost UI
- Flow wording: doc uses `stage` transition; CLI uses `apply + close/archive`; bridge may be using doc-semantics while CLI uses runtime-semantics
- `kbx init --retrofit` (also in Phase A/C, but bridge must expose it too)

Work:
- Audit all bridge proxy calls in `site/kbx-ui/server.mjs` against actual CLI subcommands (post Phase C additions)
- Fix or remove any bridge routes that proxy non-existent CLI commands
- Verify `apply-preview` route correctly calls a dry-run path; implement dry-run if absent
- Add bridge route for `kbx gate` (added in Phase C)
- Add bridge route for `kbx intent retro` (added in Phase C)
- F3 Copilot handoff UX: implement prompt-copy button in dashboard that formats current intent state as a Copilot prompt block

---

### Phase G — SaaS Domain Rules: KBX-S/B/T/D/O Content Layer
**Source:** Section 7  
**Severity:** ⚠️ partial (engine works; SaaS rule content entirely absent)  
**Blocks:** Phase H UI (rule compliance view needs real SaaS rules to display)  
**Depends on:** Phase B (rule ID namespace must be clean), Phase D (seed goals/intents that rules reference must exist), Phase E (KBX-O003/O004 require `:Code.fan_in` and `:IMPLEMENTS` graph tracking)

Gaps to fix:
- All 9 SaaS domain rules (KBX-S001..S003, KBX-B001..B002, KBX-T001, KBX-D001..D002) exist only in HTML doc with status `planned`/`draft`; no runtime module
- KBX-O001 (lesson→rule promotion after 3× pattern): needs retro:write pipeline + rule lifecycle (draft→active→retired); neither exists
- KBX-O002 (chaos spike → suggest fix intent): partial — `buildMaintainIntentProposal` exists in `maintain.js` but fires on debt/entropy index, not single-dimension spike > 8 as documented
- KBX-O003 (fan_in > 30 → structural review intent): requires `:Code.fan_in` graph node attribute; not in current graph
- KBX-O004 (stale SOT doc → review intent): requires `:IMPLEMENTS` edge age tracking; not in current graph

Work:
- Register KBX-S domain in `registry.js`; register KBX-B, KBX-T, KBX-D domains
- Implement `src/lib/rules/saas-domain.js` rule module with KBX-S001/S002/S003, KBX-B001/B002, KBX-T001, KBX-D001/D002 as stub rules with correct IDs and metadata; mark `status: draft`
- Fix KBX-O002 trigger condition: change from debt/entropy index to single-dimension spike detection (delta > 8 between last two `chaos-history.ndjson` snapshots)
- Implement KBX-O001 promotion trigger: after 3 lessons with same `pattern_id` tag in `chaos-history.ndjson`, auto-propose rule draft via `kbx intent create --type=rule-promotion`
- Implement KBX-O003: add `fan_in` tracking to `:Code` node in graph (Phase E dependency); write rule that checks threshold
- Implement KBX-O004: add edge age tracking for `:IMPLEMENTS`; write rule that detects stale SOT docs

---

### Phase H — UI Refactor (Unblock After All Phases Complete)
**Source:** Sections 1–4, 7 (runtime-safe parts)  
**Severity:** N/A — this is the consuming layer  
**Blocks:** Nothing (final deliverable)  
**Depends on:** Phases A–G complete (all data, commands, rules, and bridge routes must be real before UI consumes them)

Work:
- Replace all placeholder/prototype UI sections with views backed by real bridge endpoints
- Goals view: backed by `.kb/graph/seed-goals.json` + goal nodes in graph
- Intent lifecycle view: backed by real `intent align/approve/stage/retro` subcommands (Phase C)
- Rule compliance view: backed by runtime rule engine with KBX-GV + KBX-P + KBX-S/B/T/D/O domains (Phases B + G)
- Graph explorer view: backed by extended node/edge schema (Phase E)
- Foundation/onboarding page: remove HTML prototype; replace with `kbx init` interview output preview
- Chaos history view: backed by `chaos-history.ndjson` (Phase E migration)
- Retro view: backed by `kbx intent retro` command + `:Lesson` graph nodes (Phases C + E)
- F3 Copilot handoff: prompt-copy button backed by bridge route (Phase F)

## Plan

See `plan.md` for full details.

## Impact

See `impact.md` for full details.

## Verification Checklist

- [x] **Section 1: Blueprint** — review locked; runtime framing accepted for current UI scope; residual work moved to backlog intent `t001-blueprint-runtime-closure`
- [x] **Section 2: User flows** — review locked; CLI lifecycle accepted as runtime truth; residual UX/runtime gaps moved to backlog intent `v2-8-2-t002-user-flows-runtime-closure`
- [x] **Section 3: Components** — review locked; runtime-evidenced component surface accepted; residual component drift moved to backlog intent `v2-8-2-t003-components-runtime-closure`
- [x] **Section 4: Data architecture** — review locked; current mini graph/file-store model accepted for UI scope; residual architecture migration moved to backlog intent `v2-8-2-t004-data-architecture-runtime-closure`
- [x] **Section 5: Default data** — review locked; current generic template reality accepted; residual seed-data work moved to backlog intent `v2-8-2-t005-default-data-runtime-closure`
- [x] **Section 6: Pipelines** — review locked; current command surface accepted as runtime truth; residual pipeline parity work moved to backlog intent `v2-8-2-t006-pipelines-runtime-closure`
- [x] **Section 7: Rules (D+O)** — review locked; runtime rule engine accepted as current truth; residual SaaS-domain rule work moved to backlog intent `v2-8-2-t007-rules-runtime-closure`
- [x] **Section 8: Master rules** — review locked; current runtime-rule boundary accepted; residual AX/P enforcement work moved to backlog intent `v2-8-2-t008-master-rules-runtime-closure`
- [x] **Section 9: Foundation** — review locked; current init/template reality accepted; residual onboarding generator work moved to backlog intent `v2-8-2-t009-foundation-runtime-closure`
- [x] **Section 10: Platform completion frame** — review locked; shell-completion direction accepted; residual contract/wiring work moved to backlog intent `v2-8-2-t010-platform-completion-frame-closure`

## Section Review Log

### Section 1 — Blueprint (⚠️ partial)

**Matched evidence (✅):**
- Human-gated write path is explicit in interaction model (`writePath: CLI is the only deterministic mutation path`).
- Deterministic gate behavior is implemented in bridge (`ok: result.code === 0`) and phase-2 gate policy (`G-DETERMINISTIC-PLACEMENT`, `G-EVIDENCE-SUFFICIENCY`).
- UI mutation actions are user-triggered via explicit buttons/handlers (`onCreateIntent`, `onUpdateIntent`, `onApproveIntent`, `onApplyIntent`) — no autonomous loop.

**Gaps vs document (⚠️):**
- Layer 0 Goals is not represented in localhost bridge/UI yet (no goals endpoint in `site/kbx-ui/server.mjs`).
- Unified Graph in current code is still mini file-based graph extraction (`src/lib/graph.js`) and does not match the documented Kuzu unified graph layer.
- "Single graph write point at Retro" cannot be fully confirmed in current implementation because explicit retro writer path is not exposed in bridge/UI yet.

**Decision:**
- Treat Section 1 review as closed for this intent: runtime framing is accepted for the current localhost/UI slice, and residual implementation work is tracked in backlog intent `t001-blueprint-runtime-closure`.
- Before UI redesign implementation, keep Section 1 gaps as explicit constraints for Section 3/4 verification.

### Section 2 — User flows (⚠️ partial)

**Matched evidence (✅):**
- Intent lifecycle primitives exist in CLI: `create`, `draft`, `activate`, `apply`, `close`, `archive`, `checkpoint`.
- Backlog/active/closed/archived scopes are represented in intent storage and list/status reporting.
- Maintain loop command exists (`kbx maintain`) and checkpoint support exists (`kbx intent checkpoint`).
- Offboarding command exists (`kbx uninstall`).

**Gaps vs document (⚠️/❌):**
- Documented F3 pattern includes explicit dashboard prompt-copy/copilot handoff UX steps; current localhost UI does not implement that full operator flow.
- Documented F8 (`kbx init --retrofit`) is not available in current init command options.
- Documented flow wording uses `stage` transition, while current CLI lifecycle uses `apply` + explicit `close`/`archive`; flow semantics are adjacent but not 1:1.
- Mutation bridge currently calls `intent update` / `intent approve` / `intent apply-preview`, which are not present in the main CLI intent subcommand surface shown by `src/commands/intent.js`.

**Decision:**
- Treat Section 2 review as closed for this intent: actual CLI lifecycle is the runtime truth for the localhost/UI slice, and the remaining UX/runtime gaps are tracked in backlog intent `v2-8-2-t002-user-flows-runtime-closure`.
- For UI refactor gate: keep F3 prompt-handoff, F8 retrofit flow, and bridge mutation parity as explicit follow-up implementation work rather than leaving the review checklist in a permanent partial state.

### Section 3 — Components (⚠️ partial)

**Matched evidence (✅):**
- Presentation component exists as localhost Dashboard UI in `site/kbx-ui/src/App.tsx` and bridge API in `site/kbx-ui/server.mjs`.
- CLI component family exists: `kbx intent`, `kbx chaos`, `kbx maintain`, `kbx graph` via command modules under `src/commands/`.
- Intent engine + checkpoint behavior exist in `src/commands/intent.js` and `src/lib/intent*.js`.
- Rule engine exists (`src/lib/rule-engine.js`) with deterministic rule registration/execution.
- Storage tier 1 (KB file store) clearly exists (16-tier docs + intents folders under `knowledge-base/`).
- Export adapter capability exists in graph/export command surface (`src/commands/graph.js`, `src/lib/graph.js`).

**Gaps vs document (⚠️/❌):**
- Components docs themselves are placeholders (`verification: design-only` / `unverified`) and are not yet reconciled with implementation (`knowledge-base/03-architecture/components.md`, `knowledge-base/04-frontend/components-overview.md`).
- "Unified Graph (Kuzu)" is not reflected in current runtime implementation; active graph layer in source is mini file-based graph with limited kinds/types (`src/lib/graph.js`).
- "Retro engine is ONLY writer" cannot be proven from the current public bridge/CLI surface; no explicit retro writer module is exposed in current verification slice.
- Goal engine, signal bus, infra adapter, and LLM adapter are either not explicit as dedicated runtime modules or only partially represented by adjacent commands/docs.
- Source scanner features in doc (AST complexity/circular deps/secrets) are only partially evidenced by current command surface; not confirmed as a complete dedicated adapter module in this slice.

**Decision:**
- Treat Section 3 review as closed for this intent: only runtime-evidenced component surfaces are accepted for the localhost/UI slice, and the remaining component drift is tracked in backlog intent `v2-8-2-t003-components-runtime-closure`.
- Keep the component-gap list as implementation follow-up instead of leaving the review task in a permanent partial state.

### Section 4 — Data architecture (⚠️ partial)

**Matched evidence (✅):**
- Tier 1 file-store model is present: KB docs/intents with state roots in tracked/private-git modes and apply-record persistence.
- Tier 3 history persistence exists for chaos snapshots (append model), but implemented as `chaos-history.md`.
- Release catalog persistence exists via `.kb/catalog.json` and is consumed by graph/release flows.
- Ontology contract schema exists in runtime (`nodes`, `edges`) with validators in `src/lib/ontology.js`.

**Gaps vs document (⚠️/❌):**
- Document expects Tier 2 Kuzu unified graph + 8 node types + 8 edge types; current runtime graph in `src/lib/graph.js` is mini model with 3 entity kinds (`doc`, `intent`, `release-entry`) and limited relation types.
- Document expects `chaos-history.ndjson`, `checkpoints.json`, `release-catalog.json`; current implementation uses `chaos-history.md`, `.kb/catalog.json`, and checkpoint events via focus/checkpoint flow (no dedicated `checkpoints.json` store confirmed in this slice).
- Evidence metadata contract in document (`source`, `confidence`, `timestamp`, `linked_intent_id`, `version`, `repo_origin`) is not uniformly present on all runtime graph nodes/edges in current mini graph export.
- Full node set in document (`:Goal`, `:Intent`, `:Rule`, `:KBDoc`, `:Code`, `:Signal`, `:Release`, `:Lesson`) is not represented 1:1 in active graph implementation.

**Decision:**
- Treat Section 4 review as closed for this intent: the current mini graph + file-store model is accepted as the runtime truth for localhost/UI work, and the remaining architecture drift is tracked in backlog intent `v2-8-2-t004-data-architecture-runtime-closure`.
- Keep architecture migration as explicit follow-up work instead of leaving the review task in a permanent partial state.

### Section 5 — Default data (❌ major gap)

**Matched evidence (✅):**
- Template scaffold copy flow is implemented (`copyTemplateContent` in init pipeline), so deterministic default KB structure is shipped.
- Template includes baseline orientation/index/meta scaffolding (system map, intent index, strategic backlog, intent meta indexes).
- Runtime can auto-enrich some operational data over time (e.g., chaos history append flow, apply records, release catalog usage).

**Gaps vs document (❌):**
- Document claims SaaS-specific seeded defaults (4 goals `GOAL-001..004`, starter intents `INT-SAAS-001/002`, default SaaS rule IDs), but these concrete seeds are not found in shipped `template/` content.
- Document timeline references `kbx init --retrofit` and explicit default enrichment artifacts not currently present as a realized init option + seed bundle in this source slice.
- Document states fixed/customizable split for concrete SaaS data objects, while template currently ships mostly generic placeholders (`verification: unverified/design-only`) instead of populated SaaS defaults.

**Decision:**
- Treat Section 5 review as closed for this intent: the current generic template reality is accepted as runtime truth for localhost/UI work, and the remaining seed-data gap is tracked in backlog intent `v2-8-2-t005-default-data-runtime-closure`.
- Block UI claims about seeded SaaS defaults until the child follow-up work is implemented instead of leaving the review task in a permanent major-gap state.

### Section 6 — Pipelines (❌ major gap)

**Matched evidence (✅):**
- CLI command surface includes core families that map to major flow areas: `init`, `intent`, `maintain`, `release`, `chaos`, `graph`, `impact`, `ontology`, `apply`.
- `kbx intent` supports practical lifecycle operations (`create`, `draft`, `activate`, `apply`, `close`, `archive`, `checkpoint`) with active/backlog/closed/archive folders.
- `kbx maintain` includes deterministic maintenance loop pieces (`sync`, optional `doc:gate`, `test`, `doctor`, observation gates, optional fix-intent proposal/creation).
- `kbx release` includes pipeline-style execution (`plan`/`run`/`init-pipeline`) and release catalog handling.
- Sub-pipeline primitives exist in some form: `ontology validate`, `impact` command, `chaos` command, update workflow command family.

**Gaps vs document (❌):**
- Documented P1 contract requires explicit commands/states not present in current intent surface: `kbx intent align`, `kbx intent approve`, `kbx intent stage`, `kbx gate`, `kbx intent retro`.
- Document says `impact:check` auto-runs before every apply; current `kbx intent apply` implementation does not enforce/auto-call `kbx impact` as a hard pre-apply gate.
- Document defines gate step as deterministic bundle (`doc:gate + ontology:validate + tests`) via `kbx gate`; current repo has no dedicated `kbx gate` command.
- Document defines retro as only graph writer (`retro:write`) and lifecycle bridge to ontology `COMMITTED`; no explicit public `retro` command path is implemented in current surface.
- P3 onboarding in doc includes `init --retrofit`, interview/scan branching, seeded goals/rules, and starter-intent suggestions; current init pipeline does not expose this full contract.
- P4 release in doc requires explicit release-gate semantics (`kbx gate --release`, chaos threshold) and graph write edges (`:Release`, `:INCLUDED_IN`) as hard pipeline steps; current release implementation is pipeline-capable but not 1:1 with this declared contract.

**Decision:**
- Treat Section 6 review as closed for this intent: the current command surface is accepted as runtime truth for localhost/UI work, and the remaining pipeline parity drift is tracked in backlog intent `v2-8-2-t006-pipelines-runtime-closure`.
- Keep roadmap pipeline parity as explicit follow-up implementation work instead of leaving the review task in a permanent major-gap state.

### Section 7 — Rules D+O (⚠️ partial — engine exists, SaaS content absent)

**Matched evidence (✅):**
- Rule engine infrastructure is implemented and functional: `src/lib/rule-engine.js` with `registerRules`, `loadRules`, `runRules`, `runRule`.
- Five built-in KB-maintenance rule modules are registered: `metadata`, `verification`, `intent`, `git-binding`, `contract-alignment`.
- Rule ID format (`KBX-<DOMAIN><NUMBER>`) and registry contract (`registry.js`) are operational, supporting domains M/V/I/GB/AX/PR/WF/KA.
- KBX-O002 (chaos spike → auto-suggest fix intent) is marked `implemented` in document and is partially present: `buildMaintainIntentProposal` in `src/commands/maintain.js` proposes fix intents when debt/entropy gates trigger.

**Gaps vs document (⚠️/❌):**
- All 9 SaaS domain rules documented in Section 7 (KBX-S001..S003, KBX-B001..B002, KBX-T001, KBX-D001..D002) are **not implemented** in any rule module file — they exist only in the HTML doc with status `planned`/`draft`.
- Implemented rule domains (M/V/I/GB/AX/PR/WF/KA) serve KB maintenance checks, not SaaS application domain enforcement described in Section 7.
- KBX-O002 in implementation is debt/entropy index–driven, not a direct single-chaos-dimension-spike detector as documented (">8 points between snapshots").
- KBX-O001 (lesson→rule promotion after 3× pattern) requires retro:write pipeline and rule lifecycle (draft→active→retired); neither is fully implemented.
- KBX-O003 (fan_in > 30 → structural review intent) and KBX-O004 (stale SOT doc → review intent) require graph tracking of `:Code.fan_in` and `:IMPLEMENTS` age — neither is confirmed in current runtime.

**Decision:**
- Treat Section 7 review as closed for this intent: the runtime rule engine is accepted as the current truth for the localhost/UI slice, and the remaining SaaS-domain rule content/enforcement work is tracked in backlog intent `v2-8-2-t007-rules-runtime-closure`.
- Rule engine remains safe to expose in UI read-only mode; domain-rule authoring/enforcement moves to explicit follow-up implementation work.

### Section 8 — Master Rules AX + P (❌ major gap — AX ID collision, P rules unenforced)

**Matched evidence (✅):**
- Source has 3 implemented AX-prefixed rules: `KBX-AX003`, `KBX-AX004`, `KBX-AX005` in `src/lib/rules/contract-alignment.js`. These are enforcement rules that verify governance markers exist in contract docs.
- Source AX003 (deterministic block contract check) conceptually links to doc AX003 (deterministic gate principle).
- `kbx intent activate` exists; `kbx intent archive` exists; `kbx intent status` and `kbx intent list` all exist in CLI.
- `src/commands/impact.js` implements impact check; `kbx doctor` checks doc coverage — loosely aligning with doc P004, P005, P008.

**Gaps vs document (❌):**
- **AX ID collision**: Source `KBX-AX003/AX004/AX005` describe doc-alignment verification rules; doc's `KBX-AX003/AX004/AX005` describe behavioral axioms (deterministic gate, single graph write, human approval). Same IDs, different semantics.
- Doc AX001 (separation of powers), AX002 (domain agnosticism), AX006 (evidence on every node), AX007 (goals never auto-close) → no corresponding runtime enforcement rules in source.
- **P rules namespace missing entirely**: No `KBX-P` domain exists in rule engine (registry and rule modules). Source has `KBX-PR` (Principle Alignment) which is a different domain.
- Doc P001 (one active intent per branch, `verified`) → `activateBacklogIntent` in `src/lib/intent.js` does NOT check existing active intents before activation — no enforcement guard.
- Doc P003 (goal alignment before activation, `verified`) → no goal-align check in `activateBacklogIntent` or `runActivate`.
- Doc P006 (retro mandatory before archive, `verified`) → `retro_completed` field not checked in archive flow (no match found in search).
- Doc P007 (release gate chaos ≤ 50, `planned`) → not implemented.
- Doc P009 (NL patch normalize, `planned`) → not implemented.

**Decision:**
- Treat Section 8 review as closed for this intent: the current runtime-rule boundary is accepted as truth for localhost/UI work, and the remaining AX/P enforcement drift is tracked in backlog intent `v2-8-2-t008-master-rules-runtime-closure`.
- Keep AX/P normalization and enforcement as explicit follow-up implementation work; UI must continue to show only what the runtime engine actually enforces.

### Section 9 — Foundation (❌ major gap — form/generator not implemented in runtime)

**Matched evidence (✅):**
- Runtime has `kbx init`, and the command does create KB state plus scaffold content by copying the shipped `template/` tree into the target content root.
- Foundation artifacts exist only as generic placeholders after init, for example `knowledge-base/00-start-here/system-map.md` is present in the template and gets copied during initialization.
- The HTML roadmap page does contain a working in-browser prototype for editing foundation fields and generating copyable outputs (`system-map.md`, goals JSON, rules JSON) via `livePreview()` and copy helpers.

**Gaps vs document (❌):**
- `kbx init` does **not** run the documented onboarding interview that asks for project identity, infra, stack, goals, and rules to generate populated foundation files.
- Source `runInit` in `src/commands/init.js` performs template copy + state/bootstrap/index steps; it does not generate `seed-goals.json` or `seed-rules.json` from user input.
- The shipped `knowledge-base/00-start-here/system-map.md` remains a generic placeholder template, not a populated output derived from onboarding answers.
- No runtime files were found at the documented destinations for generated foundation seeds such as `.kb/graph/seed-goals.json` and `.kb/graph/seed-rules.json`.
- The Section 9 behavior currently lives only inside the HTML/JS document prototype, not in CLI/runtime code or the localhost UI bridge.

**Decision:**
- Treat Section 9 review as closed for this intent: the current init/template reality is accepted as runtime truth for localhost/UI work, and the remaining onboarding-generator gap is tracked in backlog intent `v2-8-2-t009-foundation-runtime-closure`.
- Keep the interview/generator flow as explicit follow-up implementation work instead of leaving the review task in a permanent major-gap state.

## Staged Files

> None yet — this is pure verification. Once checklist complete, we'll stage actual UI refactor code.

---

**Next:** Run verification tasks one by one, document all findings in notes.

### Section 10 — Platform completion frame (review locked)

**Intent:**
- Finish the current shell so intent creation starts in draft form, task creation can default to draft, and task state registration is defined from source-of-truth instead of inferred ad hoc in the UI.

**Open work:**
- Define the canonical task contract shared by CLI, bridge, and frontend.
- Define which overview fields are required before draft promotion and before backlog activation.
- Complete the remaining shell/backend wiring so the localhost UI reflects the real KB Agent platform story end-to-end.

**Decision:**
- Treat Section 10 review as closed for this intent: the shell-completion direction is accepted, and the remaining contract/wiring work is tracked in backlog intent `v2-8-2-t010-platform-completion-frame-closure`.
- Keep the implementation work explicit in backlog rather than leaving the review task open inside the parent verification intent.

