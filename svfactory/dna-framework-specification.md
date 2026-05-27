# DNA Framework Specification

**Status:** PHASE 7 FOUNDATION DESIGN (Pre-boundary lock; not yet official architecture truth)  
**Date:** 2026-05-25  
**Version:** 1.0 (Draft)  
**Author:** William Duong (@williamduong)  

---

## Executive Summary

**DNA** (Domain-specific Non-code Archetype) is the new distribution model for KBX that replaces the simple template folder system. In the current interpretation, each DNA is a **declarative contract package** for a specific organizational type. Runtime, compiler, graph adapters, and UI consume that contract.

A DNA contains:
- **Ontology Definition** (semantic model: what entities and relationships matter in this domain)
- **Graph Seed / Storage Profile** (seed data, graph mappings, storage adapters)
- **Governance Layer** (policies, validation gates, flow contracts)
- **Compiler Inputs** (the declarative material used to generate or configure downstream runtime)
- **Release Metadata** (how the DNA is versioned, distributed, and traced)

**Phase 7 Mission:** Build KBX as a **framework factory** where:
1. **SVFactory core** = compiler/orchestrator/graph/runtime infrastructure
2. **Each DNA** = specific declarative package for a specific org type
3. **Community** = can research, design, fork, and contribute new DNAs

### Worldview Layers

This document assumes three different layers of "seeing the world":

1. **SVFactory worldview** — the world of system generation and validation:
   - `DNA`
   - ontology contract
   - rule
   - gate
   - pipeline
   - evidence
   - compiler
   - variant
   - release contract
2. **DNA worldview** — the world of one specific domain or industry:
   - SaaS, legal, research, manufacturing, internal KBX, etc.
3. **KBX instance worldview** — one concrete downstream project:
   - inherits DNA, then becomes unique through real user data, docs, code, graph state, and history

Design rule:

- SVFactory core must remain neutral across domains.
- Domain-specific worldview belongs in DNA packages.
- Project-specific truth belongs in downstream KBX instances.

### Boundary Note (important)

This document is intentionally **pre-boundary-lock**:

- The live dual-graph runtime is already strong enough to host DNA roadmap content.
- The live graph and ontology do **not** yet treat `DNA`, `Gate`, and `Pipeline` as first-class semantic primitives.
- Therefore, this spec should currently be read as a **design direction**, not as proof that DNA already owns CLI/agent/UI runtime structure.

Short-term interpretation:

- `DNA` is a declarative contract first.
- `Gate` and `Pipeline` remain runtime/operator contracts first.
- Promotion of those concepts into first-class graph or ontology primitives happens only after a separate boundary decision.

### Direction Checkpoint

This spec is on the right track if we keep the following interpretation stable:

- `SVFactory core` owns compiler, orchestrator, graph adapters, runtime services, and release flow.
- A `DNA package` owns domain contract material: ontology, governance defaults, graph/storage profile, bindings, and release metadata.
- `dna/kbx` is the reference contract for KBX itself, not a dump of the full current engine.
- `dna/kbx-saas` is the first serious pilot DNA because it gives a concrete product-workflow testbed.
- `Gate` and `Pipeline` should be visible in runtime/UI now, but promoted into graph primitives only when their cross-domain semantics are proven.

---

## Part 1: DNA Framework (Foundation)

### 1.1 What is a DNA?

A DNA is a **domain contract for generating or configuring a knowledge management system** for a specific organizational context. It is not just code. It is a **thinking framework** encoded as:

| Component | Purpose | Example (SaaS) |
|-----------|---------|---|
| **Ontology** | Define entities + relationships | Feature → Code → Decision → Goal |
| **Graph Mapping / Seed** | Storage-facing seed and graph shape | "SaaS founder makes decisions → affects code → affects product" |
| **Rules** | Validation, gates, constraints | "Every decision must link to 1+ principles" |
| **Pipes** | Flow contracts and handoff patterns | Feedback → Learning → Decision → Action |
| **Gates** | Quality/safety checkpoints | Doctor validation before release |

### 1.2 DNA vs Traditional Template

**Traditional Template (Current KBX v2.x):**
```
template/
├── .github/
├── knowledge-base/
├── src/
├── site/
└── package.json
```
- Generic structure
- User must customize everything
- No pre-built thinking framework
- High onboarding friction

**DNA Contract (Phase 7+):**
```
dna/
└── kbx-saas/
    ├── docs/                    (Thinking framework explained)
    ├── spec/                    (Canonical DNA contract)
    │   ├── dna.json
    │   ├── ontology.json
    │   └── governance.json
    ├── graph/                   (Seed data + storage mapping)
    │   ├── schema.json
    │   ├── entities.json
    │   └── graph-profile.json
    ├── bindings/                (Optional runtime/UI/compiler adapters)
    │   ├── compiler/
    │   └── ui/
    ├── package.json
    └── README.md
```
- Pre-configured for SaaS teams
- Ontology designed by research
- Governance rules baked in
- Runtime generated or configured from the contract
- Low friction to start, high consistency

### 1.3 Why Each DNA is Separate npm Package

**Rationale:**
- **Open Source Sustainability**: Community can fork, customize, evolve DNAs independently
- **Maintenance Isolation**: Update `kbx-saas` without affecting `kbx-enterprise`
- **Research Integrity**: Each DNA has own documentation trail (research → design → rules → implementation)
- **Version Independence**: `kbx-saas@1.0` can stay stable while `kbx-enterprise@2.0` evolves

**Example Flow:**
```
Maintainer wants to build SaaS:
  svfactory dna init --from kbx-saas --target my-product
  → Validates DNA contract
  → Applies storage profile + graph seed
  → Generates/configures downstream runtime

Maintainer wants to build Enterprise:
  svfactory dna init --from kbx-enterprise --target my-corp
  → Uses a different ontology + governance package
  → Reuses the same factory/compiler core
```

---

## Part 2: KBX General DNA (Phase 7 Migration)

### 2.1 Purpose

**KBX General DNA** (`dna/kbx`) is the **reference DNA** for the KBX project itself. It serves two purposes:

1. **Dogfooding**: KBX team uses `dna/kbx` to manage the KBX project
2. **Reference baseline**: Future DNAs can compare against it, fork from it, or selectively reuse parts of it

### 2.2 KBX General DNA Structure

```
dna/kbx/
├── docs/
│   ├── concept.md                    (What KBX is, vision)
│   ├── ontology.md                   (KBX entity model)
│   ├── governance-framework.md        (KBX decision/principle model)
│   ├── agent-contracts.md             (How agents work in KBX context)
│   └── research-foundation.md         (Why this design)
│
├── spec/
│   ├── dna.json                      (Canonical DNA contract)
│   ├── ontology.json                 (Entity types, relationships)
│   ├── governance.json               (Rules, gates, pipes)
│   └── release.json                  (Versioning + metadata)
│
├── graph/
│   ├── schema.json                   (Collections, edges, indexes)
│   ├── initial-entities.json         (Pre-seeded KBX entities)
│   └── storage-profile.json          (Backend adapter assumptions)
│
├── bindings/
│   ├── compiler/                     (How SVFactory consumes this DNA)
│   ├── runtime/                      (Optional runtime-specific overlays)
│   └── ui/                           (Optional UI presets or mock surfaces)
│
├── examples/                         (Reference generated outputs / sample contexts)
├── package.json                      (DNA package metadata)
├── README.md
└── MIGRATION.md                      (Guide: extract current KBX semantics → dna/kbx)
```

### 2.3 KBX General DNA Ontology

**Core Entities** (adapted from current KBX):
```
KBX Context
├── Intent              (What are we building, why)
├── Goal                (How we organize work)
├── Decision            (Key choices, trade-offs)
├── Principle           (Values, non-negotiables)
├── Lesson              (What we learned, why it matters)
├── Document            (Knowledge artifacts)
├── Code Symbol         (Functions, classes, types)
└── Agent               (Who/what executes tasks)
```

**Core Relationships**:
```
Intent implements→ Goal
Goal decides_for← Decision
Decision follows/aligns→ Principle
Code Symbol applies← Principle
Lesson documents→ Decision
Document describes→ Goal
Agent executes→ Action
```

**Boundary note for KBX General DNA:**
- `DNA` itself is not yet a first-class graph node in the live system.
- `Gate` and `Pipeline` are currently modeled more accurately as runtime contracts than as graph primitives.
- Therefore `dna/kbx` should first capture the **contract and seed material**, not absorb all current engine code.

### 2.4 KBX General Governance Rules

**Who decides?**
- Strategic (vision, north star): Founder/Lead
- Tactical (features, priorities): Team consensus (agent-mediated)
- Implementation (code, design): Individual contributors + reviews

**Gates (validation checkpoints):**
```
Before merging code:
  ☑ Code compiles
  ☑ Tests pass
  ☑ Related decisions documented
  ☑ Principles not violated

Before releasing version:
  ☑ Doctor command passes (no unexpected orphaned nodes, broken edges)
  ☑ Impact analysis complete (code → decision → goal)
  ☑ Changelog updated
  ☑ Governance consistent
```

**Pipes (data flows):**
```
1. User story → Intent (what we're building)
2. Intent → Goal decomposition (how to organize)
3. Goal → Decisions (what we need to decide)
4. Decision → Principles (what values guide us)
5. Principles → Code rules (what code patterns are allowed)
6. Code execution → Lessons (what we learned)
7. Lessons → Future Decisions (improve next cycle)
```

### 2.5 Migration Plan: Current KBX → dna/kbx

**Migration principle:**
- Do **not** bulk-move the entire current `src/` and `site/` trees into `dna/kbx`.
- Keep the factory/engine/runtime core separate.
- Extract the declarative DNA contract from the current KBX system first.

**Phase 7 Week 1-2: Contract Extraction**
- [ ] Create `dna/kbx/` directory structure
- [ ] Extract ontology + governance + graph seed into `dna/kbx/spec/` and `dna/kbx/graph/`
- [ ] Create `package.json` scoped to `dna/kbx`
- [ ] Write `MIGRATION.md` explaining contract-vs-engine split

**Phase 7 Week 2-3: Graph/Storage Profile**
- [ ] Extract KBX schema → `dna/kbx/graph/schema.json`
- [ ] Create default entities (KBX itself as example)
- [ ] Define governance rules in JSON
- [ ] Define storage profile with backend adapter assumptions, not a hard-coded DB commitment
- [ ] Document ontology

**Phase 7 Week 3-4: Documentation**
- [ ] Write `concept.md` (what is KBX)
- [ ] Write `ontology.md` (entity model with examples)
- [ ] Write `governance-framework.md` (rules, gates, pipes)
- [ ] Write `research-foundation.md` (why this design)

**Phase 7 Week 4+: Compiler Integration**
- [ ] Update factory/compiler to consume `dna/kbx/spec/*`
- [ ] Generate or configure runtime from the DNA contract
- [ ] Keep backward compat for current KBX usage while the contract boundary stabilizes
- [ ] Old `template/` becomes deprecated (reference only)

---

## Part 3: KBX-SaaS DNA (Phase 7 Implementation)

### 3.1 Purpose

**KBX-SaaS DNA** is the first user-facing DNA, designed for **teams building SaaS products**. It encodes best practices for:
- Product vision → Feature decisions
- Feature decisions → Code architecture
- Code changes → Product impact analysis
- Feedback loops → Learning → Next iteration

### 3.2 KBX-SaaS DNA Structure

```
dna/kbx-saas/
├── docs/
│   ├── concept.md                    (What SaaS DNA is)
│   ├── ontology.md                   (SaaS-specific entities)
│   ├── governance-framework.md        (SaaS decision model)
│   ├── agent-contracts.md             (How agents help SaaS teams)
│   ├── research-foundation.md         (Why SaaS thinks this way)
│   └── setup-guide.md                 (How to use kbx-saas)
│
├── spec/
│   ├── dna.json                      (Canonical DNA contract)
│   ├── ontology.json                 (SaaS entity model)
│   └── governance.json               (Rules, gates, pipes)
│
├── graph/
│   ├── schema.json                   (Collections, edges)
│   ├── entities.json                 (Pre-seeded: Product, Feature, Decision, etc.)
│   └── storage-profile.json          (Backend adapter assumptions)
│
├── bindings/
│   ├── compiler/                     (How this DNA is compiled/configured)
│   ├── agents/                       (Optional SaaS-specific agent presets)
│   └── ui/                           (Optional SaaS-specific UI overlays)
│
├── package.json                      (npm kbx-saas)
├── README.md
└── EXAMPLES.md                       (Real SaaS scenarios)
```

### 3.3 SaaS DNA Ontology

**Core Entities** (SaaS-specific):
```
SaaS Product
├── Vision                (Long-term north star)
├── Feature               (Shipped, planned, researching)
├── User Story            (Who, what, why)
├── Product Decision      (Ship vs delay, pivot vs persist)
├── Code Architecture     (Monolith, microservices, etc.)
├── Code Symbol           (Functions, APIs, database schema)
├── Principle             (Product principles: "fast", "simple", "reliable")
├── Metric                (North star metric, success criteria)
└── Lesson                (What users taught us)
```

**Core Relationships (SaaS workflow)**:
```
Vision → Feature
Feature ← User Story
User Story → Decision
Decision → Principle (what values guide this decision?)
Decision → Code Architecture (what tech choices?)
Code Symbol applies← Principle (code must respect values)
Feature executes→ Code Symbol
Code change → Metric impact
Metric → Lesson
Lesson → Future Feature/Decision (iterate)
```

### 3.4 SaaS DNA Governance Rules

**Who decides?**
- **Vision/Strategy**: Founder + core team (weekly sync)
- **Feature Priority**: Product + Engineering (agent-mediated)
- **Architecture**: Engineering + Ops (consensus)
- **Code**: Individual contributors + peer review

**Interpretation note:**
- These are **SaaS-default governance policies**, not universal SVFactory law.
- The universal layer should remain small; SaaS-specific cadence and approval style live in the DNA package.

**Gates (SaaS-specific)**:
```
Before shipping feature:
  ☑ Feature aligns with vision/principles
  ☑ User feedback documented (why ship this?)
  ☑ Code architecture discussed
  ☑ Impact on north star metric estimated
  ☑ Rollback plan exists

Before merging code:
  ☑ Feature decision documented (why this code?)
  ☑ Principles not violated
  ☑ Tests pass
  ☑ Code review approved

Before each sprint:
  ☑ Features prioritized by impact/effort
  ☑ Decisions recorded (why this sprint plan?)
  ☑ Metrics baseline measured
```

**Pipes (SaaS data flow)**:
```
1. User Feedback → Insight
2. Insight + Metrics → Feature Idea
3. Feature Idea → User Story
4. User Story → Decision Point
5. Decision → Architecture choices
6. Architecture → Code
7. Code → Shipped Feature
8. Shipped → Metrics collected
9. Metrics → Learn (impact analysis)
10. Learn → Feed into next cycle
```

### 3.5 Agent Integration (Chat-Driven)

**Agent Capabilities** (how founder interacts):

```
Founder: "We've been losing users at signup. I want to redesign the flow."

Agent (Feature Agent) responds:
  ✓ Recognizes: user pain → feature idea
  ✓ Asks: "What's the current dropout rate?"
  ✓ Creates: Feature entity through the runtime/graph contract
  ✓ Suggests: "This affects Principle 'simple signup'"
  ✓ Proposes: User stories to explore
  ✓ Outputs: Feature spec + graph updates

---

Founder: "Let's implement this redesign. What's the plan?"

Agent (Decision Agent) responds:
  ✓ Recognizes: feature → decision needed
  ✓ Asks: "What's the success metric?"
  ✓ Proposes: Architecture options (frontend only vs API change?)
  ✓ Links: To principles (which approach respects "simple"?)
  ✓ Creates: Decision record through the runtime contract
  ✓ Outputs: Implementation plan

---

Founder: "We shipped. User signups up 15%."

Agent (Impact Agent) responds:
  ✓ Records: Metric impact
  ✓ Analyzes: What code changes caused this?
  ✓ Links: Decision → Code → Metric
  ✓ Extracts: Lesson ("Simple forms work better")
  ✓ Proposes: How to apply lesson elsewhere
  ✓ Outputs: Impact report + future recommendations
```

### 3.6 SaaS DNA Example: KBX Itself

**How KBX team uses SaaS DNA** (dogfooding):

```
Vision: "Make knowledge management accessible to every developer"

Features (next quarter):
  - DNA framework (this one!)
  - Agent-driven feature discovery
  - Cross-domain impact analysis

User Story (example):
  "As a SaaS founder,
   I want to see which code changes affect my north star metric,
   so I can understand impact of technical decisions."

Decision:
  Should we build Impact Analysis or improve DNA onboarding first?
  → Decision: Impact Analysis (aligns with vision)
  → Principle: "Make non-obvious things visible"

Code Architecture:
  Graph traversal: Decision → Code Symbol → Metrics
  
Code Symbols:
  getImpactChain(symbol_id)
  getMetricCorrelation(symbol_id)

Principle (enforced):
  "Every code change must be traceable to a decision"

Shipped Feature:
  `kbx graph impact --symbol get-user-profile` shows:
  - Which decisions led to this function
  - Which metrics it affects
  - Which principles it enforces

Lesson:
  "Developers want to understand impact before coding"
  → Leads to next feature: "Impact preview" before merge
```

---

## Part 4: Distribution & Phase 7 Roadmap

### 4.1 npm Package Strategy

**Proposed direction (subject to naming lock):**

```
@williamduong/svfactory              (Core compiler/orchestrator/runtime tooling)
├── @williamduong/svfactory-ui       (Shared maintainer/operator UI pieces)
└── specific DNAs:
    ├── @williamduong/dna-kbx        (Reference DNA — for KBX itself)
    ├── @williamduong/dna-kbx-saas   (SaaS DNA — pilot)
    ├── @williamduong/dna-enterprise (Enterprise DNA — future)
    └── @williamduong/dna-solo-founder (Solo Founder DNA — future)
```

Notes:
- Avoid using the same package name for both core engine and a specific DNA.
- The exact naming can still change, but the separation of **factory core** vs **DNA packages** should remain.

### 4.2 Phase 7 Implementation Tracks

The implementation should move by **capability tracks**, not by vague weekly buckets.

**Phase 7A — Boundary Lock + Contract Schema**
- [ ] Freeze the short-term boundary: DNA declarative-first, Gate/Pipeline runtime-first
- [ ] Define `dna.json`, `ontology.json`, `governance.json`, and `release.json` minimal schemas
- [ ] Define validation rules for required DNA fields and versioning
- [ ] Document what is universal core vs what stays DNA-specific

### 4.2.1 Minimal Contract Design

Before implementation, the first stable contract should be intentionally small.

**`dna.json`**

Purpose:
- identity of the DNA package
- compatibility and composition metadata

Minimal fields:

```json
{
  "dna_id": "kbx",
  "name": "KBX Reference DNA",
  "version": "0.1.0",
  "kind": "reference",
  "extends": null,
  "description": "Reference DNA extracted from legacy KBX semantics.",
  "ontology_ref": "./ontology.json",
  "governance_ref": "./governance.json",
  "release_ref": "./release.json"
}
```

Rules:
- `dna_id`, `name`, `version`, and refs are required
- `extends` is optional and allows future DNA inheritance/composition
- no runtime-specific user data belongs here

**`ontology.json`**

Purpose:
- define the worldview of one DNA
- declare entity types, edge types, and optional glossary/aliases

Minimal fields:

```json
{
  "version": "0.1.0",
  "entities": {
    "Intent": {
      "description": "A declared unit of intended change or focus.",
      "properties": {
        "id": { "type": "string", "required": true }
      }
    }
  },
  "edges": {
    "IMPLEMENTS": {
      "from": ["Intent"],
      "to": ["Goal"],
      "properties": {}
    }
  },
  "glossary": []
}
```

Rules:
- `entities` and `edges` are required, even if small
- this file describes domain worldview, not runtime mutation policy
- aliases/glossary are optional and DNA-specific

**`governance.json`**

Purpose:
- declare rules, gates, pipelines, and evidence expectations for one DNA

Minimal fields:

```json
{
  "version": "0.1.0",
  "rules": [
    {
      "id": "decision-must-link-principle",
      "subject": "Decision",
      "require": ["Principle"],
      "severity": "error"
    }
  ],
  "gates": [
    {
      "id": "pre-release-doctor",
      "stage": "pre-release",
      "requires": ["doctor-pass"],
      "block_on_fail": true
    }
  ],
  "pipelines": [
    {
      "id": "default-change-flow",
      "steps": ["intent", "decision", "implementation", "lesson"]
    }
  ],
  "evidence_policy": {
    "required_for": ["release", "high-risk-change"]
  }
}
```

Rules:
- this file owns DNA-specific governance defaults
- `rules`, `gates`, and `pipelines` should be declarative, not executable code
- execution logic belongs to SVFactory core

**`release.json`**

Purpose:
- declare packaging, compatibility, and release-level metadata

Minimal fields:

```json
{
  "version": "0.1.0",
  "package_name": "@williamduong/dna-kbx",
  "display_name": "KBX Reference DNA",
  "compatibility": {
    "svfactory": "^3.0.0"
  },
  "artifacts": [],
  "notes": "Initial reference DNA release."
}
```

Rules:
- this file should stay release-oriented
- no ontology or governance duplication belongs here
- compatibility must target SVFactory core, not one downstream project instance

**Phase 7B — `dna/kbx` Reference Contract Extraction**
- [ ] Create `dna/kbx/` scaffold
- [ ] Extract current KBX ontology into `dna/kbx/spec/ontology.json`
- [ ] Extract governance defaults into `dna/kbx/spec/governance.json`
- [ ] Extract graph/storage assumptions into `dna/kbx/graph/*`
- [ ] Write `MIGRATION.md` explaining contract-vs-engine separation
- [ ] Freeze legacy mixed-boundary modules (for example `src/lib/ontology.js`) and stop extending them during extraction

**Phase 7C — Factory Compiler + Init Flow**
- [ ] Add factory command surface for DNA discovery (`list`, `show`, `validate`)
- [ ] Add initialization path that consumes a DNA contract instead of a raw template copy
- [ ] Add compiler step that produces configured runtime/project outputs from DNA spec
- [ ] Add materialization step that generates a KBX-shaped downstream instance from validated DNA
- [ ] Keep backward compatibility while old template flow is still alive

**Phase 7D — `dna/kbx-saas` Pilot DNA**
- [ ] Research and write SaaS-specific ontology
- [ ] Encode SaaS governance defaults, gates, and pipes
- [ ] Define SaaS bindings for compiler/runtime/agents
- [ ] Create example scenarios proving Feature → Decision → Code → Metric flow

**Phase 7E — Operator UI for DNA / Flow**
- [ ] Add `Flow` workspace for pipelines, gates, map, and registry views
- [ ] Add `DNA` surfaces for package summary, ontology, governance, and release metadata
- [ ] Start with mock/derived data, then switch to runtime-backed data
- [ ] Use graph/map views only where relationships matter; keep registry/detail views table/card-first

**Phase 7F — Graph / Ontology Promotion Decision**
- [ ] Decide whether `DNA`, `Gate`, and `Pipeline` become first-class graph entities in v3.0
- [ ] If yes, design graph schema extension and ontology artifact changes
- [ ] If no, keep them as compiler/runtime contracts and avoid premature graph migration
- [ ] Record the decision in backlog/architecture artifacts before broad implementation expands

### 4.3 Immediate Build Order

To start building without architectural drift, the recommended order is:

1. `Phase 7A` — lock boundary + schemas
2. `Phase 7B` — extract `dna/kbx`
3. `Phase 7C` — make factory consume DNA
4. `Phase 7D` — build `dna/kbx-saas`
5. `Phase 7E` — expose DNA/Flow in UI
6. `Phase 7F` — decide graph promotion after real usage pressure appears

### 4.4 Refactor Shape Before Generation

The ontology/governance refactor should converge on a structure like:

```text
src/lib/dna/
  contract-schema.js
  ontology-contract.js
  governance-primitives.js
  graph-adapter.js
  compiler/
    load-dna.js
    validate-dna.js
    compile-dna.js
    materialize-kbx.js

dna/kbx/
  spec/
    dna.json
    ontology.json
    governance.json
    release.json
  graph/
    schema.json
    entities.json
    graph-profile.json
  bindings/
    terminology.js
    state-guards.js
    runtime-profile.js
  templates/
    knowledge-base/
    documents/
```

Interpretation:

- `src/lib/dna/*` remains neutral SVFactory core.
- `dna/kbx/*` becomes the first reference DNA extracted from legacy KBX semantics.
- Downstream KBX generation should be produced through compiler/materializer flow, not by treating legacy monolith files as permanent core truth.

### 4.5 Success Criteria for Phase 7

**KBX General DNA:**
- [ ] `dna/kbx` captures KBX ontology, governance, graph/storage profile, and release metadata
- [ ] The factory/compiler can consume `dna/kbx` without copying the whole current engine into the DNA package
- [ ] Documentation explains why KBX thinks the way it does

**KBX-SaaS DNA:**
- [ ] First SaaS user can initialize a project from the DNA in <5 min
- [ ] Runtime/compiler can instantiate Feature → Decision → Code flow from the SaaS contract
- [ ] Impact analysis shows code → metric relationships
- [ ] Video tutorials show 3+ real SaaS scenarios

**Phase 7 Completion:**
- [ ] DNA initialization works end-to-end through the chosen factory entry point
- [ ] Founder can manage SaaS through agents + UI
- [ ] Dogfood: KBX team uses `kbx-saas` for own product
- [ ] Community ready to contribute new DNAs

---

## Part 5: Design Principles for DNA Framework

### 5.1 DNA Design Rules

1. **Research-First**: Every DNA starts with documented research (best practices, case studies, expert interviews)
2. **Ontology-First**: Design entities + relationships before code
3. **Governance-Explicit**: All rules, gates, and pipes are documented; only promote them into first-class graph primitives once the boundary is stable
4. **Agent-Native**: Agents are first-class citizens, not afterthought
5. **Chat-Primary**: Interaction model is conversation with agents, UI is secondary
6. **Testable**: Each DNA can be dogfooded by its designers

### 5.2 DNA Maintenance Model

Each DNA has:
- **Research Team** (defines thinking framework)
- **Design Team** (creates ontology + rules)
- **Implementation Team** (codes it)
- **Dogfood Team** (uses it, feeds back)
- **Community** (evolves it, creates variants)

---

## Appendix: Glossary

| Term | Definition |
|------|-----------|
| **DNA** | Domain-specific Non-code Archetype — declarative contract package for a knowledge-management variant |
| **Ontology** | Semantic model (entities, relationships) for a DNA |
| **GraphDB Template** | Graph/storage seed profile used by the runtime or compiler |
| **Governance Rules** | Policies, gates, pipes that define how work flows |
| **Pipe** | Data flow pattern (e.g., Feedback → Learning → Decision) |
| **Gate** | Validation checkpoint (e.g., "Code must not violate principles") |
| **Agent Contract** | Interface for how agents help users within a DNA |
| **Dogfooding** | DNA creators use their own DNA for own projects |

---

**Next Step:** Review this spec, then detailed KBX-SaaS DNA design (research foundation + ontology)
