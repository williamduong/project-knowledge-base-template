---
id: v3-0-dna-graph-ontology-boundary
title: "DNA Graph + Ontology Boundary Definition"
mode: full
lifecycle: backlog
status: proposed
created_at: 2026-05-26T16:15:00+07:00
focus:
  current: "Architectural follow-up from live DNA review on dual-graph runtime"
  last_updated: 2026-05-26
  next_action: "Decide whether DNA, Gate, and Pipeline become first-class graph/ontology primitives in v3.0 or remain declarative compiler inputs first."
goal_text: "Define the canonical graph and ontology boundary for DNA so Phase 7 can ship without conflicting with the live dual-graph runtime, runtime gates, or current ontology artifact."
change_type: architecture
change_scope:
  - svfactory/dna-framework-specification.md
  - src/graph-db/knowledge/schema.js
  - src/lib/ontology.js
  - site/kbx-ui/api-graph.mjs
  - site/uiv2/src/app/hooks/
  - site/uiv2/src/app/pages/
impact_signals:
  - clarifies: "Whether DNA is a first-class graph entity or a declarative artifact consumed by compiler/runtime"
  - clarifies: "Whether Gate and Pipeline are ontology primitives or runtime contracts first"
  - affects: "Knowledge Graph schema, ontology artifact, bridge APIs, and Flow/DNA UI surfaces"
decision_summary: "Live runtime review shows the graph is ready to host DNA roadmap goals, but not yet ready to treat DNA, Gate, and Pipeline as first-class semantic objects. This follow-up intent exists to lock that boundary before DNA becomes official architecture."
close_condition: "A signed-off boundary model exists for DNA, Gate, Pipeline, compiler output, and graph impact; the DNA spec is updated accordingly; follow-on implementation tasks are split cleanly by graph, ontology, runtime, and UI."
review_after: null
schema_version: 2.7.0-beta.1
---

# Intent: v3-0-dna-graph-ontology-boundary

## Why this exists

During live review with ArangoDB + bridge + `uiv2` running, the repository proved three things:

1. The dual-graph stack is real and useful enough to ground DNA planning.
2. DNA already exists as roadmap/governance content in goals, but not as a first-class graph object.
3. Gate and Pipeline currently lean toward runtime/operator surfaces more than canonical ontology primitives.

This means the DNA direction is promising, but the boundary must be locked before the spec is treated as official architecture.

## Verified runtime facts

- Code Graph is active and queryable: symbol ingestion succeeded with tens of thousands of symbols.
- Knowledge Graph is active and queryable: goals, principles, decisions, and lessons are live.
- Principle-to-code linking is active: live coverage is present through `kg_applies_to`.
- DNA-related roadmap goals are present in the graph, but no `kg_dna`, `kg_gate`, or `kg_pipeline` primitives exist yet.
- Current ontology build still exposes `Gate` only indirectly via `Policy` aliases and does not model DNA/Gene/Pipeline/Compilation as first-class entities.

## Core questions to settle

1. Is `DNA` a first-class Knowledge Graph node in v3.0, or a declarative artifact/package consumed by compiler/runtime first?
2. Are `Gate` and `Pipeline` ontology primitives in v3.0, or runtime contracts promoted into graph later?
3. What is the canonical relationship between:
   - DNA spec
   - ontology artifact
   - graph schema
   - compiler output
   - runtime services
4. Which DNA concepts must be universal primitives versus domain-specific extensions?

## Recommended direction

Short-term recommendation:

- Treat `DNA` as a declarative contract first.
- Keep compiler/runtime as the executors of that contract.
- Promote `Gate` and `Pipeline` into graph primitives only once their semantics are stable across domains.

This keeps Phase 7 moving without forcing an overly large graph migration before the abstraction is proven.

## Candidate primitives

Potential first-class graph/ontology additions once the boundary is approved:

- `DNA`
- `GeneGroup`
- `Gate`
- `Pipeline`
- `Compilation`
- `Variant`
- `RuntimeProfile`

Potential relationship candidates:

- `DNA DEFINES Gate`
- `DNA DEFINES Pipeline`
- `DNA EXTENDS DNA`
- `DNA COMPILES_TO Variant`
- `Pipeline USES Gate`
- `Variant RUNS_WITH RuntimeProfile`

## Follow-up tasks

1. Rewrite the DNA spec so it explicitly states whether it is pre- or post-boundary-amendment.
2. Draft a canonical graph extension proposal for DNA/Gate/Pipeline.
3. Draft ontology changes needed if these concepts become primitives.
4. Split implementation work into:
   - graph schema
   - ontology artifact
   - compiler/runtime
   - UI/Flow/DNA pages
5. Decide whether package distribution mirrors graph primitives or remains compiler-oriented only.

## Non-goals

- Do not implement DNA compiler/runtime here.
- Do not commit a full graph migration here.
- Do not collapse runtime gate snapshots and graph governance into one model before the boundary is approved.
