# Legacy Ontology Extraction Notes

**Date:** 2026-05-27  
**Asset:** `dna/tmp/legacy-ontology.js`  
**Original path:** `src/lib/ontology.js`

---

## Why This File Was Moved

The previous `src/lib/ontology.js` implementation mixed together:

- generic contract tooling,
- KBX/SaaS worldview semantics,
- terminology registry,
- governance/state-guard behavior,
- backward-compat validation surfaces.

That made the outer layer of the repository read like legacy KBX rather than neutral SVFactory.

`src/lib/ontology.js` now remains only as a compatibility shim.

---

## Source Documents Consulted Before Extraction

The extraction decision was checked against these ontology/graph references:

- `template/13-knowledge-graph/ontology-contract.md`
- `template/13-knowledge-graph/terminology-registry.md`
- `knowledge-base/13-knowledge-graph/README.md`
- `knowledge-base/13-knowledge-graph/v2.6-ontology.md`
- `knowledge-base/13-knowledge-graph/v2.6-glossary.md`
- `knowledge-base/intents/_closed/released/v2-6-kb-ontology-foundation/plan.md`
- `knowledge-base/intents/_closed/released/v2-6-kb-ontology-foundation/constraints-summary-for-review.md`

These documents matter because the legacy file was never just code; it was also carrying the old ontology worldview and design assumptions from the v2.6 ontology foundation line.

---

## Likely Final Destinations

### Move toward `SVFactory core`

Only the genuinely neutral parts should survive in core form:

- contract schema toolkit
- generic entity/edge/property validators
- generic governance primitive definitions

Most of that work has already started under:

- `src/lib/dna/contract-schema.js`
- `src/lib/dna/ontology-contract.js`
- `src/lib/dna/governance-primitives.js`

### Move toward `dna/kbx`

The KBX-worldview parts should be extracted toward:

- `dna/kbx/spec/ontology.json`
- `dna/kbx/spec/governance.json`
- `dna/kbx/bindings/terminology.js`
- `dna/kbx/bindings/state-guards.js`
- `dna/kbx/bindings/runtime-profile.js`

---

## What Still Blocks Final Placement

- current commands and tests still import `src/lib/ontology.js`
- the legacy file still bundles multiple concepts in one module
- some semantics are clearly KBX-specific, but some helper logic still needs neutralization before a final split

---

## Extraction Rule From Now On

Do not expand `dna/tmp/legacy-ontology.js`.

Any new ontology-related work must go into one of:

1. `src/lib/dna/*` for neutral SVFactory primitives
2. `dna/kbx/*` for KBX reference worldview assets

