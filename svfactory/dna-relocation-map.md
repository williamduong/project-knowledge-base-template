# DNA Relocation Map

**Date:** 2026-05-27  
**Purpose:** Review map for extracting KBX-specific material out of the outer SVFactory layer.  
**Principle:** The outside of the system should read as `SVFactory`, not as disguised legacy `KBX`.

---

## 1. Boundary Rule

Use three buckets only:

1. `SVFactory core`
   - neutral factory layer
   - rules / graph / system / flow primitives
   - compiler / validator / adapter / contract logic
2. `dna/kbx`
   - KBX reference worldview
   - KBX-specific ontology, governance defaults, graph profile, bindings, templates, UI semantics
3. `dna/tmp`
   - quarantine zone for mixed-boundary or unresolved legacy assets
   - temporary holding area only, not a second monolith

If a file or module smells like:
- `Intent / Goal / Decision / Principle / Lesson` as a KBX worldview,
- current KBX release/runtime assumptions,
- KBX document/tree/project semantics,
- KBX UI semantics,

then it should not remain in the outermost SVFactory layer.

---

## 2. Current Bucket Decisions

## 2.1 Keep In `SVFactory core`

These are the best current candidates for the neutral outer layer:

### Compiler / DNA contracts

- `src/lib/dna/contract-schema.js`
- `src/lib/dna/ontology-contract.js`
- `src/lib/dna/governance-primitives.js`
- `src/lib/dna/compiler/load-dna.js`
- `src/lib/dna/compiler/validate-dna.js`
- `src/lib/dna/compiler/compile-dna.js`

Reason:
- they define contract, validation, normalization, and compiler flow
- they are already written in declarative-neutral terms

### SVFactory governance docs and operating contract

- `svfactory/CONSTITUTION.md`
- `svfactory/agent.md`
- `svfactory/foundation.md`
- `svfactory/process.md`
- `svfactory/knowledge.md`
- `svfactory/focus.md`
- `svfactory/dna-framework-specification.md`
- `svfactory/dna-review-checkpoint.md`

Reason:
- these define the outer worldview of the factory

### Core direction candidates that should stay outside DNA after cleanup

- `src/lib/rules/*`
- `src/lib/gates/index.js`
- `src/lib/pipeline.js`
- `src/graph-db/code/*`
- `src/graph-db/bridge.js`
- `src/graph-db/db.js`

Reason:
- these are good candidates for universal rule/graph/flow primitives
- but some still need normalization before they are truly neutral

Status:
- keep in core
- review for universalization, not relocation to `dna/kbx`

---

## 2.2 Move Toward `dna/kbx`

These are strong KBX-worldview candidates and should be extracted out of the outer layer.

### Reference DNA assets already started

- `dna/kbx/spec/*`
- `dna/kbx/graph/*`
- `dna/kbx/bindings/*`
- `dna/kbx/templates/*`

Reason:
- this is already the correct home for KBX-specific worldview assets

### KBX ontology / worldview / state semantics

Move by extraction target:

- KBX ontology worldview
- KBX terminology
- KBX state guards
- KBX runtime profile

Current sources:

- `src/lib/ontology.js`
- `src/commands/ontology.js`
- `template/13-knowledge-graph/*`
- `knowledge-base/13-knowledge-graph/*`

Target:

- `dna/kbx/spec/ontology.json`
- `dna/kbx/spec/governance.json`
- `dna/kbx/bindings/terminology.js`
- `dna/kbx/bindings/state-guards.js`
- `dna/kbx/bindings/runtime-profile.js`

### KBX graph worldview

Current sources:

- `src/graph-db/knowledge/schema.js`
- `src/graph-db/knowledge/api-*`
- `src/graph-db/knowledge/extractors/*`
- `src/graph-db/knowledge/transformers/*`

Target direction:

- DNA-specific schema/profile/seed metadata -> `dna/kbx/graph/*`
- any generic graph adapter logic stays in core

Interpretation:
- current knowledge graph model is mostly KBX reference worldview, not universal SVFactory truth

### KBX downstream content templates

Current sources:

- `template/*`
- `knowledge-base/*`

Target direction:

- DNA-specific downstream templates -> `dna/kbx/templates/*`
- keep only factory-facing documentation outside

Interpretation:
- the 16-tier KB layout is a strong KBX downstream shape
- it should not be mistaken as the universal outer shell of SVFactory

### KBX operator / project UI semantics

Current sources:

- `site/uiv2/src/app/pages/IntentsListPage.tsx`
- `site/uiv2/src/app/pages/KnowledgeBasePage.tsx`
- `site/uiv2/src/app/pages/GoalsPage.tsx`
- `site/uiv2/src/app/pages/DecisionsPage.tsx`
- `site/uiv2/src/app/pages/PrinciplesPage.tsx`
- `site/uiv2/src/app/hooks/useIntentDetail.ts`
- `site/uiv2/src/app/hooks/useIntentsList.ts`
- `site/uiv2/src/app/hooks/useKb.ts`
- `site/uiv2/src/app/hooks/useGoalsGraph.ts`
- `site/uiv2/src/app/hooks/useDecisionsGraph.ts`
- `site/uiv2/src/app/hooks/usePrinciplesGraph.ts`
- `site/uiv2/src/app/hooks/useSymbolsGraph.ts`

Target direction:

- extract KBX-specific entity/workspace surfaces into DNA-owned UI semantics or downstream-generated surfaces

Interpretation:
- the outer shell can stay in SVFactory
- the entity-specific worldview pages are closer to KBX than to universal factory core

---

## 2.3 Quarantine In `dna/tmp`

These are mixed or unresolved enough that they should not be trusted as either pure core or clean `dna/kbx` yet.

### Distribution identity and CLI entry surface

- `package.json`
- `bin/kbx.js`
- `src/cli.js`

Reason:
- current public identity is still `@williamduong/kbx`
- this is the most visible place where outer SVFactory and legacy KBX are still collapsed together

### Mixed runtime operator surfaces

- `site/kbx-ui/*`
- `site/uiv2/src/app/pages/RuntimeServicesPage.tsx`
- `site/uiv2/src/app/shell-data.ts`
- `site/uiv2/src/app/ShellFrame.tsx`
- `site/uiv2/src/app/pages/HomePage.tsx`

Reason:
- current routes still mix:
  - Rules
  - System
  - Flow fragments
  - KBX-specific entity navigation
- this should be normalized before deciding what stays in SVFactory shell and what becomes DNA/downstream-specific

### Legacy mixed-boundary knowledge/runtime modules

- `src/lib/ontology.js`
- `src/lib/intent.js`
- `src/lib/focus-state.js`
- `src/lib/goals-state.js`
- `src/lib/kb-analysis.js`
- `src/lib/kb-db.js`
- `src/lib/kb-presence.js`
- `src/lib/impact.js`
- `src/lib/impact-graph.js`
- `src/lib/intent-intelligence.js`
- `src/lib/bindings.js`
- `src/lib/catalog.js`

Reason:
- these likely contain both:
  - generic factory mechanics
  - KBX worldview assumptions
- they need extraction, not blind relocation

### CLI command layer needing split review

- `src/commands/init.js`
- `src/commands/status.js`
- `src/commands/doctor.js`
- `src/commands/intent.js`
- `src/commands/release.js`
- `src/commands/ui.js`
- `src/commands/graph.js`
- `src/commands/knowledge-graph.js`
- `src/commands/rules.js`
- `src/commands/gates.js`
- `src/commands/maintain.js`

Reason:
- some are future SVFactory operator commands
- some are KBX downstream/runtime commands
- some are currently both

Rule:
- until split is clear, quarantine by review label rather than leaving them implicitly as SVFactory truth

---

## 3. Folder-Level Relocation Guidance

## 3.1 `src/graph-db/`

Split by intent:

- `code/` -> likely `SVFactory core`
- `knowledge/` -> mostly `dna/kbx` worldview or `dna/tmp` pending extraction
- bridge/client/db abstractions -> `SVFactory core`

## 3.2 `site/uiv2/`

Split by surface:

- shell, top nav, operator shell patterns -> `SVFactory core`
- `Rules` workspace -> `SVFactory core`
- future `Flow` workspace -> `SVFactory core`
- entity pages for current KBX worldview -> `dna/kbx` or `dna/tmp`

## 3.3 `template/` and `knowledge-base/`

Split by role:

- factory-facing docs/contracts -> remain outer documentation
- downstream project shape/templates -> move toward `dna/kbx/templates/*`

---

## 4. Immediate Extraction Order

Recommended next passes:

1. **UI shell split**
   - separate `Rules`, `Flow`, and `System`
   - reduce mixed runtime page behavior
2. **Ontology extraction**
   - peel KBX worldview out of `src/lib/ontology.js`
   - push target assets into `dna/kbx/spec/*` and `dna/kbx/bindings/*`
3. **Graph worldview extraction**
   - separate generic graph adapter logic from KBX graph model
4. **CLI/runtime identity split**
   - decide which commands are:
     - SVFactory outer shell
     - KBX downstream/runtime
     - temporary `dna/tmp`

---

## 5. Rule For `dna/tmp`

Any asset moved into `dna/tmp` must carry:

- current source path
- likely destination
- why it is unresolved
- what boundary question blocks final placement

`dna/tmp` is a quarantine zone, not a new permanent architecture layer.

