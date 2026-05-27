# DNA Review Checkpoint

**Date:** 2026-05-27  
**Status:** Active architecture review checkpoint  
**Purpose:** Capture the minimum shared context needed to review SVFactory DNA direction without reloading the whole chat history.

---

## 1. Boundary Now Locked

The current architecture direction is:

- `SVFactory` is the neutral factory core.
- `SVFactory` sees the world through system-generation primitives:
  - DNA
  - ontology contract
  - rule
  - gate
  - pipeline
  - evidence
  - compiler
  - variant
  - release contract
- `DNA` packages carry domain-specific worldview.
- `KBX` is not SVFactory core.
- Legacy KBX should be interpreted as:
  - reference DNA
  - downstream form
  - historical implementation source to extract from

See:
- `svfactory/dna-framework-specification.md`
- `knowledge-base/intents/_backlog/v3-0-dna-graph-ontology-boundary.md`

---

## 2. What Is Ready For Review Now

### 2.1 SVFactory DNA Compiler Spine

The design-first compiler path now exists and runs against `dna/kbx/spec/*`:

- `src/lib/dna/contract-schema.js`
- `src/lib/dna/ontology-contract.js`
- `src/lib/dna/governance-primitives.js`
- `src/lib/dna/compiler/load-dna.js`
- `src/lib/dna/compiler/validate-dna.js`
- `src/lib/dna/compiler/compile-dna.js`
- `src/lib/dna/compiler/materialize-kbx.js`

This is enough to review:

- whether SVFactory core primitives are neutral enough
- whether `dna/kbx` is shaped like a reference DNA instead of an engine dump
- whether the compiler/materializer path is the right backbone for v3

### 2.2 `dna/kbx` Reference Asset Shape

The reference DNA now includes:

- `spec/`
- `graph/`
- `bindings/`
- `templates/`

This is enough to review:

- how KBX worldview should live inside a DNA package
- how graph/storage assumptions should be represented
- how templates/bindings should relate to downstream generation

### 2.3 UI Direction

The UI is ready for architectural review, but not feature-complete DNA review:

- `site/uiv2` already has the shell and workspace structure
- `R&D Prototype` already includes `reactflow`
- `Rules`, `Graph`, and `System` surfaces already exist
- `svfactory/uiv2-information-architecture.md` now captures the goal-aligned shell rewrite direction

This is enough to review:

- where `Flow` should live in the operator shell
- what belongs in `Rules` vs `Flow` vs later `DNA`
- whether React Flow should remain a relationship/map surface only
- whether `Graph` should remain a top-level tab or become a cross-workspace lens

---

## 3. What Is Still Not Clean

### 3.1 Legacy Ontology Boundary

`src/lib/ontology.js` is still a mixed-boundary legacy module.

It still combines:

- generic contract tooling
- KBX/SaaS worldview
- governance/state guard behavior
- terminology registry

It is now explicitly frozen as legacy and should not be expanded further.

### 3.2 Package / Runtime Identity

The published runtime/package line is still:

- `@williamduong/kbx`

This means distribution and package-boundary review is still pending.

### 3.3 Knowledge Graph Canonical Model

The current Knowledge Graph remains governance-first and does not yet promote:

- `DNA`
- `Gate`
- `Pipeline`

to first-class graph primitives.

That is acceptable only if the current policy remains:

- declarative DNA first
- graph promotion later after real usage pressure

### 3.4 Legacy Roadmaps and Notes

Some older roadmap material still carries pre-boundary assumptions.

`svfactory/phase-7-dna-roadmap.md` has now been marked as partially superseded, but older scattered references may still exist elsewhere.

---

## 4. Review Questions To Use Next

### UI

- Should `Flow` become a top-level workspace now?
- Should `DNA` remain behind the scenes until Flow stabilizes?
- Which DNA concepts deserve table/card views vs graph/map views?

### Ontology

- Which concepts are true SVFactory core primitives?
- Which concepts belong only in `dna/kbx`?
- Which runtime guards should stay declarative vs executable?

### GraphDB

- Should `DNA`, `Gate`, and `Pipeline` become graph primitives in v3.0 or later?
- What must remain adapter-driven instead of Arango-specific?

### Mixing Cleanup

- What should be extracted first from `src/lib/ontology.js`?
- Which KBX-specific runtime modules must never be copied into SVFactory core?

---

## 5. Recommended Immediate Next Review Sequence

1. Review `site/uiv2` IA for `Rules` / `Flow` / future `DNA`.
2. Review `src/lib/dna/*` as the intended neutral SVFactory core.
3. Review `dna/kbx/*` as the first reference DNA package.
4. Review `src/lib/ontology.js` only as legacy extraction input, not as target architecture.

For the UI review baseline, use:

- `svfactory/uiv2-information-architecture.md`
- `svfactory/intent-context-explorer-contract.md`
