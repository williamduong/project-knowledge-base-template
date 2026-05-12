---
intent_id: intent-v2-8-2-principal-grounding-contract
type: intent-plan
---

# Plan — Document Verification & Source Alignment

## Goal

Verify that source code (bridge server, React UI, knowledge-base) correctly implements the 9 sections of kbagent-complete-doc.html. Document all gaps, mismatches, or missing implementations. Create a checklist before UI refactor begins.

**Prevents:** Repeating previous mistake where UI was built from scratch and diverged from design.  
**Ensures:** Design document IS the contract; implementation is measured against it.

## Phases

### Phase 1: Section 1-3 Review (Blueprint, Flows, Components)
**Scope:** Architecture layers, user flows, component breakdown  
**Verification tasks:**
- [ ] **Section 1 - Blueprint:** Check bridge/server implements 3-layer model (Goals → Main loop → Graph)
- [ ] Verify 4 principles: not self-evolving, single writer, domain-agnostic, deterministic gate
- [ ] **Section 2 - User flows:** Confirm intent lifecycle (backlog→active→staged→archived) matches App.tsx state
- [ ] Check F3 (Execute) 5-step pattern, F7+F8 onboarding flows
- [ ] **Section 3 - Components:** Verify 24 components exist in codebase, read-only constraint enforced
- [ ] Check Signal bus, Storage tiers, External adapters

### Phase 2: Section 4-6 Review (Data, Default data, Pipelines)
**Scope:** Data model, seed config, pipeline orchestration  
**Verification tasks:**
- [ ] **Section 4 - Data architecture:** Verify 3-tier storage (files, Kuzu graph, append-only) in code
- [ ] Check 8 node types (:Goal, :Intent, :Rule, :KBDoc, :Code, :Signal, :Release, :Lesson)
- [ ] Verify 8 edge types (:ADVANCES, :SERVES, :IMPLEMENTS, :AFFECTS, :DEPENDS_ON, :BREAKS/:FIXES, :GOVERNS, :INCLUDED_IN)
- [ ] Confirm evidence metadata on every node/edge
- [ ] **Section 5 - Default data:** Check sample_data/ for seed goals, rules, fixtures
- [ ] Verify fixed vs customizable config
- [ ] **Section 6 - Pipelines:** Confirm 4 main + 6 sub pipelines implemented in server.mjs
- [ ] Check P1 (Goal align), P2 (Apply), P3 (Stage), P4 (Release)

### Phase 3: Section 7-9 Review (Rules, Master rules, Foundation)
**Scope:** Rules architecture, governance, setup templates  
**Verification tasks:**
- [ ] **Section 7 - Rules (D+O):** Check rules storage/versioning, domain vs operational split
- [ ] **Section 8 - Master rules:** Verify AX (constitutional) vs P (process) separation
- [ ] Check CONSTITUTION.md alignment with AX rules
- [ ] **Section 9 - Foundation:** Verify setup template generates system-map.md, seed-goals.json, seed-rules.json
- [ ] Check `kbx init` command flow

## Files Touched

This is **verification-only** phase — no files staged yet.  
After verification completes, will stage:
- `site/kbx-ui/src/App.tsx` — refactored to use HTML design as base
- `site/kbx-ui/src/styles.css` — replaced with design system CSS
- `site/kbx-ui/index.html` — refactored to match design structure

## Acceptance Criteria

✅ Intent is DONE when:
1. All 9 sections reviewed against source
2. Checklist has ✅ (matches), ⚠️ (partial), or ❌ (missing)
3. Findings documented in session notes
4. Decision made: which sections need fixes before UI refactor
5. List of blockers identified (if any)

### Success = All sections verified, no major blockers
