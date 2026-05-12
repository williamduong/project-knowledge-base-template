---
id: intent-v2-8-2-principal-grounding-contract
mode: full
lifecycle: active
created_at: 2026-05-12T07:55:23.898Z
focus:
  current: "Convert the 9-section verification into a sequential runtime-vs-target-state execution order"
  last_updated: 2026-05-12
  next_action: "Use the final verdict to split immediate UI refactor scope from future-state onboarding/pipeline/rules work"
change_type: governance
change_scope: ["knowledge-base/", "site/kbx-ui/src/", "bin/kbx.js"]
impact_signals: []
decision_summary: "The 9-section review is complete. Sections 1-4 and parts of 7 are usable as runtime-truth inputs for the next UI refactor slice; Sections 5, 6, 8, and 9 remain target-state architecture and must not be presented as implemented behavior."
review_after: null
schema_version: 2.7.0-beta.2
# v1.8+ reserve fields:
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
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
- **Section 1: Blueprint** — partial but usable as high-level runtime framing.
- **Section 2: User flows** — partial but usable if UI follows actual CLI lifecycle, not the HTML lifecycle wording.
- **Section 3: Components** — partial but usable for surfaces already evidenced in bridge/UI/CLI.
- **Section 4: Data architecture** — partial but usable only if the UI targets the current mini graph + file store, not Kuzu.
- **Section 7: Rules (D+O)** — usable only for runtime rule-engine visibility; not for SaaS/domain-rule authoring claims.

### Step 2 — Hold As Target-State
- **Section 5: Default data** — no shipped SaaS seed bundle.
- **Section 6: Pipelines** — documented pipeline contract is ahead of the real command surface.
- **Section 8: Master rules** — AX/P document semantics are not enforced 1:1 in runtime; some IDs collide with different meanings.
- **Section 9: Foundation** — onboarding form/generator exists only as HTML prototype, not as real `kbx init` runtime behavior.

### Step 3 — Gaps Fix Order (Dependency Chain)

**Phase A: UI Refactor (immediate)**
1. Refactor UI around current runtime truth: intents, status, chaos, doctor, existing mutations, and current bridge responses.
2. Keep roadmap-only features visually separated as "planned" or remove them from operator-facing flows for now.

**Phase B: Gaps Fix (sequential, one per intent)**
1. **Gap 1 → Section 9: Foundation** (onboarding form generator)
   - Blocker: All subsequent KB instances must bootstrap correctly
   - Dependency: None (gating function)
   - Work: Implement real `kbx init` interview pipeline → generate seed-goals.json, seed-rules.json, system-map.md

2. **Gap 2 → Section 8: Master Rules** (AX collision, P-rule enforcement)
   - Blocker: Governance framework must be consistent before exposing rule system
   - Dependency: Section 9 complete (foundation in place to store rule definitions)
   - Work: Rename governance verification rules (KBX-GV001-003), implement P001-P009 guards

3. **Gap 3 → Section 6: Pipelines** (CLI parity)
   - Blocker: Command surface must match declared pipeline contract
   - Dependency: Section 8 complete (rules available to gate pipeline stages)
   - Work: Fill command gaps (mutation.js, gate.js, hazard.js) to match P1/P2/P3/P4 contract

4. **Gap 4 → Section 5: Default Data** (SaaS seed bundle)
   - Blocker: Content layer depends on all infrastructure stable
   - Dependency: Sections 9, 8, 6 complete
   - Work: Package SaaS-specific seed data → bundle into `kbx init --preset=saas`

**Phase C: Then UI Parity** (after all gaps fixed)
- Re-audit UI coverage against new runtime surfaces
- Expose newly stable features in operator flows

## Plan

See `plan.md` for full details.

## Impact

See `impact.md` for full details.

## Verification Checklist

- [x] **Section 1: Blueprint** — reviewed (⚠️ partial)
- [x] **Section 2: User flows** — reviewed (⚠️ partial)
- [x] **Section 3: Components** — reviewed (⚠️ partial)
- [x] **Section 4: Data architecture** — reviewed (⚠️ partial)
- [x] **Section 5: Default data** — reviewed (❌ major gap)
- [x] **Section 6: Pipelines** — reviewed (❌ major gap)
- [x] **Section 7: Rules (D+O)** — reviewed (⚠️ partial — engine exists, content absent)
- [x] **Section 8: Master rules** — reviewed (❌ major gap — AX ID collision, P rules unenforced)
- [x] **Section 9: Foundation** — reviewed (❌ major gap — form/generator not implemented in runtime)

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
- Treat Section 1 as reviewed with partial alignment.
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
- Treat Section 2 as reviewed with partial alignment.
- For UI refactor gate: use actual CLI lifecycle as runtime truth, and flag F8/F3 UX gaps as separate implementation backlog items.

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
- Treat Section 3 as reviewed with partial alignment.
- Use this component-gap list as hard input for Section 4/6 verification and for later UI refactor scoping (only build UI for components with runtime evidence first).

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
- Treat Section 4 as reviewed with partial alignment.
- Lock this as a major architecture drift item: UI work must target currently implemented data model first, then optionally phase migration toward the documented data architecture.

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
- Treat Section 5 as a major documentation-vs-implementation gap.
- Block any UI feature that assumes seeded SaaS goals/intents/rules until either:
  1. Seed data is implemented in template/init pipeline, or
  2. Document is downgraded/rewritten to reflect current generic template reality.

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
- Treat Section 6 as major documentation-vs-implementation drift.
- For downstream UI/review work, use current command surface as runtime truth and treat roadmap pipeline page as target-state architecture until command parity is implemented.

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
- Treat Section 7 as partial alignment: framework/engine is real, but the documented SaaS domain content layer is not yet in source code.
- Rule engine is safe to expose in UI read-only mode (list registered rules, show violations); SaaS domain rule authoring/enforcement is a separate implementation scope.

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
- ❌ Major gap: the document's AX/P behavioral rules are architectural principles documented as `verified`, but actual CLI enforcement for most of them is absent or partial.
- Source AX rules serve a different purpose (contract-doc alignment verification, not behavioral axioms) — naming convergence with document IDs is misleading and should be flagged for v2.9 normalization.
- Before UI exposes "rule compliance" view, enforce boundary: show only which rules exist in runtime engine; do not imply AX001..AX007 or P001..P009 are all enforced by CLI.

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
- Treat Section 9 as a major documentation-vs-implementation gap.
- For UI refactor and onboarding scope, treat the Foundation page as target-state product design, not current runtime truth.
- If this onboarding flow is needed, it should be implemented as a real `kbx init` interview/generator pipeline rather than inferred from the HTML prototype.

## Staged Files

> None yet — this is pure verification. Once checklist complete, we'll stage actual UI refactor code.

---

**Next:** Run verification tasks one by one, document all findings in notes.

