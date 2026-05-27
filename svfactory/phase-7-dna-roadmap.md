# Phase 7: DNA Framework Implementation Roadmap

> Historical roadmap note (2026-05-27):
> This document is preserved as phase-planning history, but parts of Phase 7.1
> are now superseded by the neutral-boundary direction locked in:
> - `svfactory/dna-framework-specification.md`
> - `knowledge-base/intents/_backlog/v3-0-dna-graph-ontology-boundary.md`
>
> Do not treat this file as the current source of truth for package boundaries.
> In particular, the older "move current engine into `dna/kbx/src/*`" direction
> is no longer the preferred architecture. The current direction is:
> - `SVFactory core` stays neutral
> - `dna/kbx` is a reference DNA contract + assets package
> - downstream KBX instances are produced through compiler/materializer flow

**Status:** Historical / superseded in parts (2026-05-27)  
**Version Target:** v3.0  
**Duration:** 9-12 weeks (Phase 7.0 → 7.3)  
**Strategic Goal:** Build factory that generates KBX variants for multi-domain use

---

## Overview

Phase 7 transforms KBX from a single template into a **DNA Framework Factory** where:
- Each DNA = pre-configured knowledge management system for specific org type
- Each DNA = separate npm package with own ontology, governance, implementation
- Team can initialize project with `npm install kbx-saas && kbx-saas --init`
- Community can research, design, and contribute new DNAs

**Phases:**
- **Phase 7.0** (Week 1-2): DNA Framework specification + KBX General DNA design
- **Phase 7.1** (Week 3-4): KBX General DNA implementation (refactor current KBX)
- **Phase 7.2** (Week 5-8): KBX-SaaS DNA design + implementation (primary deliverable)
- **Phase 7.3** (Week 9+): Testing, documentation, community release

---

## Phase 7.0: Foundation (Week 1-2)

### ✅ Completed

**Deliverable:** `svfactory/dna-framework-specification.md`
- [x] DNA concept definition (Part 1)
- [x] KBX General DNA spec (Part 2)
- [x] KBX-SaaS DNA spec (Part 3)
- [x] Distribution & roadmap (Part 4)
- [x] Design principles (Part 5)

**Updates completed:**
- [x] `svfactory/focus.md` — Phase status updated
- [x] `svfactory/agent.md` — DNA strategic goals clarified

### Next: User Review & Adjustment

**User tasks:**
1. Read `dna-framework-specification.md`
2. Provide feedback on:
   - DNA concept (is it right?)
   - KBX General DNA (migration plan makes sense?)
   - KBX-SaaS DNA (ontology + governance rules correct?)
3. Approve before moving to Phase 7.1

---

## Phase 7.1: KBX General DNA (Week 3-4)

### Goals

Original goal in this draft: refactor the current KBX codebase into `dna/kbx/`
while maintaining backward compatibility.

Current interpretation:
- Keep `SVFactory core` in neutral compiler/schema/runtime-adapter modules.
- Extract `dna/kbx` as reference DNA contracts, bindings, graph profile, and templates.
- Do not relocate the whole current engine into `dna/kbx/src/*` as the primary target shape.

### Deliverables

```
dna/kbx/
├── docs/
│   ├── concept.md              (What is KBX)
│   ├── ontology.md             (KBX entity model with examples)
│   ├── governance-framework.md (Rules, gates, pipes)
│   ├── agent-contracts.md      (How agents operate in KBX)
│   └── research-foundation.md  (Why this design)
│
├── graphdb/
│   ├── schema.json             (Collections, edges, indexes)
│   ├── entities.json           (Pre-seeded KBX example entities)
│   ├── governance-rules.json   (Default gates, policies)
│   └── ontology.json           (Entity types, relationships)
│
├── src/
│   ├── cli/                    (Refactored CLI: src/commands/ → here)
│   ├── agents/                 (Refactored agent logic)
│   ├── ui/                     (Refactored: site/kbx-ui/ → here)
│   ├── ui-react/               (Refactored: site/uiv2/ → here)
│   └── lib/                    (Shared logic)
│
├── package.json                (npm kbx — same package, new location)
├── README.md                   (KBX General DNA guide)
└── MIGRATION.md                (How to move current code here)
```

### Tasks

**Week 3 (Structure & Documentation):**
- [ ] Create directory structure `dna/kbx/`
- [ ] Write `docs/concept.md` (what is KBX)
- [ ] Write `docs/ontology.md` (entity model)
- [ ] Write `docs/governance-framework.md` (rules, gates)
- [ ] Write `docs/agent-contracts.md` (agent behavior)
- [ ] Write `docs/research-foundation.md` (design rationale)

**Week 4 (Refactoring & GraphDB):**
- [ ] Historical draft item: Move `src/commands/` → `dna/kbx/src/cli/` (superseded by neutral core split)
- [ ] Historical draft item: Move `src/graph-db/` → `dna/kbx/src/lib/` (superseded by neutral core split)
- [ ] Historical draft item: Move `site/kbx-ui/` → `dna/kbx/src/ui/` (superseded by workspace/UI boundary review)
- [ ] Historical draft item: Move `site/uiv2/` → `dna/kbx/src/ui-react/` (superseded by workspace/UI boundary review)
- [ ] Extract GraphDB schema → `dna/kbx/graph/schema.json`
- [ ] Create pre-seeded entities/profile → `dna/kbx/graph/entities.json`, `dna/kbx/graph/graph-profile.json`
- [ ] Define governance assets in DNA contract/bindings instead of `graphdb/governance-rules.json`
- [ ] Keep package/runtime migration separate from DNA extraction
- [ ] Test compiler/materializer flow against `dna/kbx/spec/*`

### Success Criteria

- `dna/kbx` captures the KBX reference worldview without becoming the permanent home of the whole current engine
- Documentation explains KBX ontology + governance
- Graph assets capture the KBX reference worldview and storage profile
- SVFactory compiler/materializer can consume `dna/kbx/spec/*`
- Any backward-compatibility plan is handled explicitly, not by collapsing SVFactory into KBX

---

## Phase 7.2: KBX-SaaS DNA (Week 5-8)

### Goals

Build the first user-facing DNA for SaaS teams. Use KBX itself as dogfooding (manage KBX product using kbx-saas).

### Deliverables

```
dna/kbx-saas/
├── docs/
│   ├── concept.md              (What is SaaS DNA)
│   ├── ontology.md             (SaaS entity model)
│   ├── governance-framework.md (SaaS rules, gates, pipes)
│   ├── agent-contracts.md      (How agents help SaaS teams)
│   ├── research-foundation.md  (SaaS best practices research)
│   ├── setup-guide.md          (How to use kbx-saas)
│   └── examples.md             (Real SaaS scenarios)
│
├── graphdb/
│   ├── schema.json             (SaaS-specific collections/edges)
│   ├── entities.json           (Pre-seeded SaaS entities)
│   ├── governance-rules.json   (SaaS gates, policies)
│   └── ontology.json           (SaaS entity model)
│
├── src/
│   ├── cli/
│   │   ├── feature.js          (Manage features)
│   │   ├── decision.js         (Record decisions)
│   │   ├── metric.js           (Track metrics)
│   │   └── impact.js           (Analyze impact)
│   ├── agents/
│   │   ├── feature-agent.js
│   │   ├── decision-agent.js
│   │   ├── metric-agent.js
│   │   └── impact-agent.js
│   ├── ui/
│   └── lib/
│       └── shared.js           (Reuse KBX General logic)
│
├── package.json                (npm kbx-saas)
├── README.md
└── EXAMPLES.md                 (Scenario walkthroughs)
```

### Tasks

**Week 5-6 (Design & Documentation):**
- [ ] Research SaaS best practices (product management, decision frameworks)
- [ ] Write `docs/concept.md` (SaaS DNA vision)
- [ ] Write `docs/ontology.md` (Vision → Feature → Decision → Code → Metric)
- [ ] Write `docs/governance-framework.md` (SaaS gates, pipes)
- [ ] Write `docs/agent-contracts.md` (Feature agent, decision agent, impact agent)
- [ ] Write `docs/research-foundation.md` (why this design)
- [ ] Create GraphDB template for SaaS

**Week 7-8 (Implementation):**
- [ ] Implement CLI: `kbx-saas feature add`, `kbx-saas decision record`, etc.
- [ ] Implement agents: Feature agent (chat-driven feature discovery)
- [ ] Implement agents: Decision agent (guidance on decisions)
- [ ] Implement agents: Impact agent (code → metric analysis)
- [ ] Create UI components for SaaS workflows
- [ ] Dogfood: Use kbx-saas to manage KBX product development
- [ ] Package as npm `kbx-saas`
- [ ] Write setup guide + examples
- [ ] Test: `npm install kbx-saas && kbx-saas --init my-product` works end-to-end

### SaaS DNA Ontology (Reference)

**Core Entities:**
```
Vision                (long-term north star)
├── Feature          (user-visible capability)
│   └── User Story   (who, what, why)
├── Metric           (measurement of success)
└── Principle        (values guiding decisions)

Feature → Decision (should we ship this?)
Decision → Code Architecture
Code Architecture → Code Symbol
Code Symbol applies ← Principle
Feature ships → Metric measurement
Metric → Lesson (what did we learn?)
Lesson → Future Feature/Decision
```

**Core Agent Workflows:**

```
User: "We're losing signup users. Let's redesign the flow."

Feature Agent responds:
  - Recognizes pain point → feature idea
  - Creates Feature in GraphDB
  - Suggests how it relates to Principles
  - Outputs: Feature spec + linked User Stories

---

User: "Let's build this. What's the plan?"

Decision Agent responds:
  - Recognizes feature → decision needed
  - Asks: success metrics? architecture constraints?
  - Proposes options (frontend vs backend change?)
  - Links to Principles (which aligns with "simple"?)
  - Outputs: Decision record + implementation plan

---

User: "We shipped. Signups up 15%."

Impact Agent responds:
  - Records metric improvement
  - Analyzes what code changes caused it
  - Links: Decision → Code → Metric
  - Extracts: Lesson ("Simple forms work")
  - Outputs: Impact report + recommendations
```

### Success Criteria

- SaaS ontology designed from research (not guessing)
- Agents help founders through Feature → Decision → Code flow
- Impact analysis traces code changes → metrics
- Dogfooding successful: KBX team uses kbx-saas for product development
- `npm install kbx-saas && kbx-saas --init my-product` works end-to-end
- Setup guide + 3+ example scenarios documented
- No regressions: `npm install kbx` still works

---

## Phase 7.3: Testing, Community Release (Week 9+)

### Goals

Validate SaaS DNA works for real teams, release to npm, prepare for Enterprise/Solo DNAs.

### Tasks

- [ ] Record video tutorials (3-5 SaaS scenarios)
- [ ] Create integration tests for kbx-saas workflows
- [ ] Test with 2-3 external SaaS teams (beta)
- [ ] Gather feedback, iterate
- [ ] Publish `kbx-saas@1.0` to npm
- [ ] Publish video tutorials (YouTube/blog)
- [ ] Create DNS documentation for community contributors
- [ ] Plan Enterprise DNA (v3.1)
- [ ] Plan Solo Founder DNA (v3.2)

### Success Criteria

- `npm install kbx-saas` works for new users
- Video tutorials demonstrate real workflows
- Community can fork/customize SaaS DNA
- Foundation laid for future DNAs

---

## Deliverables Timeline

| Week | Deliverable | Status |
|------|---|---|
| 1-2 | DNA Framework Specification | ✅ DONE |
| 1-2 | Update focus.md, agent.md | ✅ DONE |
| 3-4 | KBX General DNA (refactor current KBX) | ⏳ NEXT |
| 5-6 | SaaS DNA design + docs | ⏳ NEXT |
| 7-8 | SaaS DNA implementation | ⏳ NEXT |
| 9+ | Testing, release, community | ⏳ NEXT |

---

## Decision: npm Package Strategy

**Decision:** Each DNA is separate npm package.

**Why:**
- Open source: community can fork/evolve independently
- Maintenance: update `kbx-saas` without affecting `kbx-enterprise`
- Research integrity: each DNA documents its foundation

**Packages:**
```
@williamduong/kbx          (core — shared by all DNAs)
@williamduong/kbx-core     (CLI + GraphDB engine — shared)
@williamduong/kbx-ui       (UI components — shared)

@williamduong/kbx          (General DNA)
@williamduong/kbx-saas     (SaaS DNA — Phase 7.2)
@williamduong/kbx-enterprise (Enterprise DNA — Phase 8, future)
@williamduong/kbx-solo    (Solo Founder DNA — Phase 8, future)
```

**Or simpler (start with this):**
```
kbx                  (General DNA)
kbx-saas             (SaaS DNA)
kbx-enterprise       (Enterprise DNA, future)
kbx-solo-founder     (Solo Founder DNA, future)
```

---

## Notes for Implementation

1. **Backward Compatibility:** When moving code to dna/kbx/, ensure npm package still works as before. Users doing `npm install kbx` should see no breaking changes.

2. **Shared Code:** All DNAs reuse core GraphDB logic + CLI framework from KBX General. Create `dna/kbx/src/lib/shared.js` or similar for reuse.

3. **Ontology as JSON:** Store ontology in GraphDB template (JSON format) so:
   - Human-readable + version-controlled
   - Auto-seeded when user runs `--init`
   - Easy for agents to query

4. **Governance Rules:** Store rules (gates, pipes) as JSON in GraphDB too, not hardcoded. Agents read rules from graph to guide user.

5. **Video Tutorials:** Record real SaaS founder workflows to show value. Examples:
   - "How to track product features"
   - "How to link code changes to product impact"
   - "How to run retrospectives using lessons"

---

## Open Questions for User Review

1. **npm naming:** Use `@williamduong/kbx` scope or just `kbx`, `kbx-saas`?
2. **SaaS DNA research:** Should I research specific methodologies (Lean Canvas, Shape Up, OKR) or design organically?
3. **Agents as plugins:** Should agents be configurable, or baked into each DNA?
4. **Community contribution:** How to make it easy for community to create new DNAs?

---

**Next:** Await user review of dna-framework-specification.md, then begin Phase 7.1 (KBX General DNA refactoring).
