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

## `src/lib/ontology.js` decomposition (working decision)

Current assessment: `src/lib/ontology.js` is **mixed-boundary legacy**. It currently blends:

1. neutral ontology-contract tooling,
2. KBX/SaaS-specific worldview and terminology,
3. governance/runtime mutation logic.

### Keep in SVFactory core

These pieces fit the neutral factory worldview and should survive in a rewritten core module:

- `GlossaryEntrySchema` and `GlossarySchema`
- `PropertySpecSchema`
- `NodeTypeContractSchema`
- `EdgeTypeContractSchema`
- `OntologyContractSchema`
- `validateOntologyContract`
- `evaluateUnknownPropertyRejectionMatrix`
- `createOntologyValidator` (after its registry is updated to neutral schemas only)

Interpretation:

- Core should keep an **ontology contract toolkit**.
- Core should not keep one downstream ontology as if it were universal truth.

### Keep in core only after generic rewrite

These concepts are important to SVFactory, but the current implementation is too KBX/SaaS-shaped:

- `StateTransitionGuards`
- `verifyStateTransition`
- `hasEvidencePath`
- `verifyMutation`
- `ToolCallInterceptor`

Interpretation:

- The ideas belong to factory-level governance.
- The current semantics must be rewritten around neutral primitives such as `MutationProposal`, `Evidence`, `Gate`, `ValidationResult`, and graph adapter abstractions.

### Relocate to `dna/kbx` or another DNA package

These pieces encode a specific worldview and should not remain in neutral core:

- `SaaSNodeDNA` and `SaaSNodeDNA_spec`
- `IntentSchema` and `IntentSchema_spec` in their current form
- `TerminologyRegistryEntry`
- `TerminologyRegistry_data`
- `aliasToCanonical`
- `resolveTerminology`
- `validateTerminology`
- `buildGlossaryLookup`
- `resolveAgainstGovernedGlossary`
- `validateGlossary`
- `auditNaturalLanguageTerms`

Interpretation:

- These define how one specific system names the world.
- They belong in a reference DNA such as `dna/kbx` unless later generalized into neutral primitives.

### Move out of ontology into governance/runtime bindings

These pieces may still belong to SVFactory or a DNA package, but they should not stay inside ontology-contract code:

- `CypherTemplates`
- `checkCrossRepoGrant`
- `validateIntent`
- `validateSaaSNode`

Interpretation:

- They are not ontology declarations.
- They are storage-query, policy, or runtime validation concerns.

### Immediate rule for future work

- Do not extend `src/lib/ontology.js` with more mixed-boundary behavior.
- Any new ontology work must first declare whether it belongs to:
  - `SVFactory core worldview`
  - `DNA worldview`
  - `KBX instance data`

## Proposed refactor file structure

This is the preferred split before building DNA generation features:

```text
src/lib/dna/
  contract-schema.js          # Neutral DNA contract schemas used by SVFactory core
  ontology-contract.js        # Entity/edge/property/glossary toolkit
  governance-primitives.js    # Neutral Rule/Gate/Pipeline/Evidence/Mutation primitives
  graph-adapter.js            # Core adapter interface for graph-backed validation
  compiler/
    load-dna.js               # Read DNA package from disk/npm form
    validate-dna.js           # Deterministic validation against contract schemas
    compile-dna.js            # Produce configured variant/runtime payload
    materialize-kbx.js        # Generate downstream KBX instance structure

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
  MIGRATION.md
```

Interpretation:

- `src/lib/dna/*` is neutral SVFactory core.
- `dna/kbx/*` is the reference DNA worldview extracted from legacy KBX.
- Downstream KBX generation should consume `dna/kbx/*`, not import legacy mixed-boundary modules directly.

## Recommended implementation tracks after boundary lock

1. `Phase 7A` — lock boundary assumptions and define minimal DNA contract schemas.
2. `Phase 7B` — extract `dna/kbx` as reference contract, not engine copy.
3. `Phase 7C` — make SVFactory consume DNA packages through deterministic compiler/init flows.
4. `Phase 7D` — build `dna/kbx-saas` as the first real pilot DNA.
5. `Phase 7E` — expose DNA + Flow in operator UI using registry/detail views plus graph/map surfaces.
6. `Phase 7F` — only then decide whether `DNA`, `Gate`, and `Pipeline` are promoted into first-class graph primitives.

## Refactor-to-generation execution path

The intended path is:

1. **Split legacy ontology**
   - Freeze `src/lib/ontology.js`
   - Extract neutral tooling into `src/lib/dna/ontology-contract.js`
   - Move KBX-specific worldview and guards into `dna/kbx/`
2. **Define neutral DNA contracts**
   - `dna.json`
   - `ontology.json`
   - `governance.json`
   - `release.json`
3. **Build deterministic DNA compiler flow**
   - load DNA
   - validate DNA
   - compile DNA
   - materialize downstream KBX structure
4. **Use `dna/kbx` as first real proof**
   - reference extraction from legacy KBX
   - verify that SVFactory can regenerate a KBX-shaped output from DNA instead of copying monolith assumptions
5. **Only after that, expand to new DNAs**
   - `dna/kbx-saas`
   - other industry DNAs

## Minimal DNA contract set (design-first)

Phase 7A should start with four small declarative files:

1. `dna.json`
   - DNA identity and composition metadata
   - required: `dna_id`, `name`, `version`, refs to ontology/governance/release
   - optional: `extends`, `description`

2. `ontology.json`
   - DNA worldview declaration
   - required: `version`, `entities`, `edges`
   - optional: `glossary`, aliases, descriptions

3. `governance.json`
   - DNA rule/gate/pipeline defaults
   - required: `version`, `rules`, `gates`, `pipelines`
   - optional: `evidence_policy`, severity defaults, stage metadata

4. `release.json`
   - package/release metadata
   - required: `version`, `package_name`, compatibility target for SVFactory
   - optional: `artifacts`, `notes`

Immediate design rule:

- Keep these files declarative.
- Execution belongs to SVFactory core compiler/materializer.
- User/project data must not appear inside these four contracts.

## Non-goals

- Do not implement DNA compiler/runtime here.
- Do not commit a full graph migration here.
- Do not collapse runtime gate snapshots and graph governance into one model before the boundary is approved.
