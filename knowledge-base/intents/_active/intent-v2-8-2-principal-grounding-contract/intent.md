---
id: intent-v2-8-2-principal-grounding-contract
mode: full
lifecycle: active
created_at: 2026-05-12T07:55:23.898Z
focus:
  current: "Review 9 sections of kbagent-complete-doc.html against source code"
  last_updated: 2026-05-12
  next_action: "Complete all 9 verification tasks, document gaps, then refactor UI using HTML design as base"
change_type: governance
change_scope: ["knowledge-base/", "site/kbx-ui/src/", "bin/kbx.js"]
impact_signals: []
decision_summary: "Establish single source of truth: kbagent-complete-doc.html is the contract. All implementation must match documented architecture before UI refactor. Prevents divergence and ensures design-code alignment."
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
**Status:**🔄 In progress (verification phase)

## Summary

Document-first verification workflow:
1. Read kbagent-complete-doc.html (9 sections)
2. Check each section against source code (bridge server, React component, KB docs)
3. Document findings: ✅ (matches), ⚠️ (partial), ❌ (missing/wrong)
4. Create checklist of required fixes before UI refactor
5. Establish truth: HTML document IS the contract

**Why:** User detected UI diverged from design. Dangerous to code without confirming what's actually implemented vs what's planned. This prevents more wasted work.

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
- [ ] **Section 7: Rules (D+O)** — domain + operational rules
- [ ] **Section 8: Master rules** — AX (immutable) + P (process)
- [ ] **Section 9: Foundation** — setup template, editable form

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

## Staged Files

> None yet — this is pure verification. Once checklist complete, we'll stage actual UI refactor code.

---

**Next:** Run verification tasks one by one, document all findings in notes.

