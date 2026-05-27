# KBX General DNA — Concept

**Status:** Phase 7.1 Foundation Document (v3.0)  
**Date:** 2026-05-27  
**Audience:** Maintainers, contributors, downstream DNA implementers

---

## What is KBX?

KBX (Knowledge Base eXtension) is a **reference DNA** — a pre-configured, research-based knowledge management system designed to manage **the evolution and structure of software projects**.

KBX General DNA answers: *How does a team understand and evolve their own codebase, decisions, and principles over time?*

---

## KBX as a DNA

In SVFactory terms, a **DNA** is:
- A **declarative contract** (not a code monolith)
- A **worldview** — how entities relate, what governance applies, what patterns matter
- A **template** — pre-seeded graph structure, ontology, and rules
- A **reference implementation** — bindings for KBX-specific terminology and behavior

**KBX General DNA specifies:**

1. **Ontology** — What entities exist (Goal, Decision, Principle, Lesson, Code Symbol, etc.)
2. **Governance** — How entities transition, what gates must pass, what evidence is required
3. **Terminology** — Canonical names, aliases, domain mappings (e.g., Intent, Team, etc.)
4. **Graph Profile** — Pre-seeded entities, relationships, indexes for KBX reference worldview

This is in contrast to **SVFactory core**, which remains **neutral** — providing compilation, schema validation, and runtime infrastructure without imposing a specific domain worldview.

---

## KBX Worldview: Five Core Primitives

KBX General DNA organizes thinking around **5 core primitives**:

### 1. **Goal**
- *What we're trying to achieve*
- Hierarchical: Goals → Sub-Goals → Specific Targets
- Lifecycle: `Active` → `Achieved` / `Archived`
- Example: "Migrate to TypeScript for type safety"

### 2. **Decision**
- *How we chose to solve a problem*
- Links: Goal (why?), Principles (what values guided us?), Code (what did we build?)
- Lifecycle: `Proposed` → `Approved` → `Implemented` → `Reflected`
- Example: "Use Zod for schema validation instead of JSON Schema"

### 3. **Principle**
- *Values that guide decisions*
- Examples: "Prefer explicit over implicit", "Fail fast on invalid input"
- Applies to: Code symbols (functions, classes), Decisions (can this decision violate this principle?)
- Lifecycle: `Active` → `Archival` (can principles change? rarely, but yes)

### 4. **Lesson**
- *What we learned from past decisions*
- Links: Decision (what happened), Outcome (what did we observe?), Future Decisions (how does this inform us?)
- Lifecycle: `Recorded` → `Applied` → `Evolved`
- Example: "Strict validation prevented 80% of runtime bugs"

### 5. **Code Symbol**
- *Functions, classes, types that implement decisions*
- Links: Decision (what decision does this implement?), Principles (what principles does this uphold?)
- Lifecycle: `Defined` → `Updated` → `Deprecated`
- Example: `validateInput(value)` implements "Fail fast" principle

---

## KBX Workflow: Decision → Code → Metric

**How decisions flow into code and measurable impact:**

```
Goal (Vision)
  ↓
Decision (How to achieve)
  ↓
Code Symbol (What we built)
  ↓
Execution (In production)
  ↓
Lesson (What we learned)
  ↓
Next Decision (Based on learning)
```

**Real scenario:**

1. **Goal:** "Reduce auth failures for new users"
2. **Decision:** "Implement proactive email validation at signup"
3. **Code:** Function `validateEmailAsync()` + UI field `<SignupEmail />`
4. **Execution:** 10k users sign up, validation catches 150 malformed emails
5. **Lesson:** "Email validation caught errors faster than post-signup failure"
6. **Next Decision:** "Extend validation to phone numbers"

---

## Why KBX Matters to SVFactory

KBX is the **first reference DNA** for a software management domain. It demonstrates:

- ✅ How to structure ontology for a specific domain (software teams)
- ✅ How governance rules encode domain-specific constraints (decision transitions, code review gates)
- ✅ How terminology (KBX-specific canonical names) lives in DNA layer, not core
- ✅ How pre-seeded graph templates accelerate downstream instances

**For v3.0 Phase 7.2**, this enables:
- KBX-SaaS DNA (same primitives, SaaS-optimized governance and ontology)
- KBX-Enterprise DNA (matrix orgs, cross-team constraints)
- KBX-Solo DNA (simplified for solo founders)

All share the same **core principle** (Goal → Decision → Code → Lesson) but differ in governance, terminology, and graph structure.

---

## Scope of KBX General DNA (Phase 7.1)

This phase extracts what already works in KBX into the DNA contract model:

### ✅ Included

- **Ontology:** Goal, Decision, Principle, Lesson, Code Symbol entities + relationships
- **Terminology Registry:** KBX canonical names (Intent, Team, Principle, etc.) + aliases
- **Governance Rules:** Intent state machine, evidence gates, cross-repo authorization
- **Graph Template:** Pre-seeded KBX reference entities, relationships, indexes
- **Bindings:** KBX-specific validators, state machine logic

### ❌ Not Included (Out of Scope)

- **Code Migration:** No code is moved to `dna/kbx/src/*` — CLI/UI/agents stay in SVFactory core
- **New Features:** Phase 7.1 = extraction + documentation, not innovation
- **Release Packaging:** npm `@williamduong/kbx` still includes all code; dna/kbx is contract layer
- **SaaS-specific features:** Those go in Phase 7.2 (kbx-saas DNA)

---

## File Structure

```
dna/kbx/
├── docs/
│   ├── concept.md (this file)
│   ├── ontology.md (entity definitions)
│   ├── governance-framework.md (rules, gates, transitions)
│   ├── agent-contracts.md (agent behavioral expectations)
│   └── research-foundation.md (why this design?)
│
├── spec/
│   ├── dna.json (DNA package contract)
│   ├── ontology.json (entity/edge/property schema)
│   ├── governance.json (rules, gates, pipelines)
│   └── release.json (npm release contract)
│
├── graph/
│   ├── schema.json (ArangoDB collections, indexes)
│   ├── entities.json (pre-seeded KBX reference entities)
│   ├── ontology.json (duplicate of spec/ontology.json for clarity)
│   └── graph-profile.json (ArangoDB graph definition)
│
├── bindings/
│   ├── legacy-terminology.js (KBX terminology registry)
│   ├── legacy-governance.js (KBX state machine + mutation guards)
│   ├── terminology.js (lightweight terminology helpers)
│   └── state-guards.js (intent lifecycle guards)
│
└── README.md (Phase 7.1 summary + quick start)
```

---

## Boundary: KBX DNA vs SVFactory Core

| Aspect | KBX DNA | SVFactory Core |
|--------|---------|---|
| **Worldview** | "How teams evolve code decisions" | Neutral compilation + schema framework |
| **Ontology** | Goals, Decisions, Principles, Lessons, Code Symbols | Generic entity/edge/property model |
| **Terminology** | Intent, Principle, Team, (KBX-specific) | (None — neutral, no domain bias) |
| **Governance** | Intent 5-state machine, cross-repo gates | Generic rule/gate/pipeline primitives |
| **Code Behavior** | Intent validators, state machine logic | (None — data-only, no execution) |

**Golden Rule:** SVFactory core never assumes "team", "decision", "principle". DNA does.

---

## Next Steps

- **Ontology Document** (concept.md → ontology.md): Define each entity, relationship, lifecycle
- **Governance Framework** (concept.md → governance-framework.md): Detail state machines, gates, evidence
- **Agent Contracts** (concept.md → agent-contracts.md): How agents observe/modify KBX graph
- **Research Foundation** (concept.md → research-foundation.md): Academic + industry sources for KBX worldview

---

**Context:** Part of Phase 7.1 (KBX General DNA extraction). This document establishes the concept foundation before technical specifications.
