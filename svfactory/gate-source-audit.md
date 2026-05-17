# Gate Source Audit

> Status: active audit
> Scope: identify mixed or conflicting `gate` meanings across code, runtime, CLI, and governance docs
> Audited: 2026-05-18
> Related:
> - `svfactory/gate-module-plan.md`
> - `svfactory/gate-impact-map.md`
> - `svfactory/runtime-control-plane-architecture.md`

---

## Purpose

This audit answers one narrow question:

> Where is `gate` currently defined, implied, or referenced in ways that can mislead implementers?

The goal is not to redesign the gate module here.
The goal is to mark the mixed sources so future implementation can normalize them intentionally.

---

## Audit Method

Two passes were used:

1. Code/runtime pass
   - searched `src/`, `site/kbx-ui/`, `site/uiv2/`
   - focused on gate computation, gate display, gate command surfaces, and blocking logic

2. Governance/process pass
   - searched `svfactory/`, `knowledge-base/`, `template/`
   - focused on policy gates, human gates, intent start gates, and workflow language

---

## Summary

Mixed-source findings: `8`

- `2` critical
- `4` high
- `2` medium

Current conclusion:

- the repo does **not** have one single gate system today
- the repo has **multiple gate families**
- several docs and rules refer to gate surfaces that do not currently exist in live CLI code

---

## Gate Families Found

### F1. Operator Snapshot Gates

Source:
- [site/kbx-ui/bridge-gates.mjs](/d:/Source/template/project-knowledge-base-template/site/kbx-ui/bridge-gates.mjs:1)
- [site/kbx-ui/server.mjs](/d:/Source/template/project-knowledge-base-template/site/kbx-ui/server.mjs:1531)

Meaning:
- workspace-global
- operator-facing
- snapshot-backed
- currently shown in `System > Gates`

Examples:
- `G-DETERMINISTIC-PLACEMENT`
- `G-EVIDENCE-SUFFICIENCY`
- `G-INTENT-UNIQUENESS`
- `G-CHAOS-ESTIMATE`
- `G-THREE-LAYER-TRACE`

Status:
- real runtime code
- currently the only first-class gate surface exposed via UI/API

### F2. Observation Gates

Source:
- [src/lib/observation.js](/d:/Source/template/project-knowledge-base-template/src/lib/observation.js:450)
- [src/commands/status.js](/d:/Source/template/project-knowledge-base-template/src/commands/status.js:305)

Meaning:
- analytical signal gates
- used for debt/entropy/lesson/version-scope assessment
- feed reconstruction decisions

Examples:
- debt gate
- entropy gate
- lesson contradiction gate
- version scope gate

Status:
- real runtime code
- not normalized into the same shape as operator snapshot gates

### F3. Intent-Local Human Gates

Source:
- [svfactory/process.md](/d:/Source/template/project-knowledge-base-template/svfactory/process.md:290)
- [svfactory/principles.md](/d:/Source/template/project-knowledge-base-template/svfactory/principles.md:150)
- [template/12-ai-skills/agent-operating-manual.md](/d:/Source/template/project-knowledge-base-template/template/12-ai-skills/agent-operating-manual.md:398)

Meaning:
- per-intent blocking tasks
- actor handoff records
- stored in `gates.md` inside an intent workspace

Examples:
- `HG-001`
- `HG-002`

Status:
- strongly documented
- not currently present as a live CLI/runtime surface in `src/commands/gates.js`

### F4. Implicit Procedural Gates

Source:
- [src/commands/maintain.js](/d:/Source/template/project-knowledge-base-template/src/commands/maintain.js:1)
- [src/commands/release.js](/d:/Source/template/project-knowledge-base-template/src/commands/release.js:1)
- [src/commands/help.js](/d:/Source/template/project-knowledge-base-template/src/commands/help.js:66)

Meaning:
- workflow preconditions or blockers
- not modeled as explicit gate records

Examples:
- `doc:gate`
- release pre-check
- maintain strict doctor step

Status:
- real runtime behavior
- not represented as normalized gate objects

---

## Findings

### GSA-001. Docs promise a `kbx gates` CLI surface that does not exist

Severity: critical

Evidence:
- [template/12-ai-skills/agent-operating-manual.md](/d:/Source/template/project-knowledge-base-template/template/12-ai-skills/agent-operating-manual.md:456)
- [svfactory/process.md](/d:/Source/template/project-knowledge-base-template/svfactory/process.md:331)
- [src/cli.js](/d:/Source/template/project-knowledge-base-template/src/cli.js:1)

Observed state:
- docs reference `kb gates list`, `kb gates done`, `kb gates skip`, `kb gates add`
- `src/cli.js` has no `gates` command registration
- `src/commands/gates.js` does not exist

Impact:
- maintainers may assume human-gate automation is live when it is not
- rules/docs currently overstate available runtime capabilities

### GSA-002. Rules catalog references nonexistent gate commands

Severity: critical

Evidence:
- [src/lib/rules/catalog.js](/d:/Source/template/project-knowledge-base-template/src/lib/rules/catalog.js:180)

Observed state:
- rule metadata mentions `kbx gates add` and `kbx gates list`
- those commands are not implemented in CLI

Impact:
- rule-to-tool mapping is currently inaccurate
- downstream automation could point users to dead commands

### GSA-003. `gate` means different things in bridge runtime vs observation runtime

Severity: high

Evidence:
- [site/kbx-ui/bridge-gates.mjs](/d:/Source/template/project-knowledge-base-template/site/kbx-ui/bridge-gates.mjs:1)
- [src/lib/observation.js](/d:/Source/template/project-knowledge-base-template/src/lib/observation.js:450)

Observed state:
- bridge gates are operator/global readiness checks
- observation gates are analytical quality/reconstruction checks
- both use the word `gate`, but not the same contract or audience

Impact:
- high risk of leaking raw observation gates into UI/API as if they were operator gates

### GSA-004. Human-gate workflow is documented, but intent runtime does not visibly enforce it

Severity: high

Evidence:
- [svfactory/process.md](/d:/Source/template/project-knowledge-base-template/svfactory/process.md:347)
- [src/commands/intent.js](/d:/Source/template/project-knowledge-base-template/src/commands/intent.js:1)

Observed state:
- docs say `kbx intent apply` should block on pending gates / `--skip-gates`
- current intent command parser and CLI source do not expose a visible `--skip-gates` path
- no live `gates.md` command surface is present

Impact:
- docs/runtime drift around close/apply behavior

### GSA-005. `doc:gate` uses the gate name but is a package script convention, not a first-class gate module

Severity: high

Evidence:
- [src/commands/maintain.js](/d:/Source/template/project-knowledge-base-template/src/commands/maintain.js:49)
- [src/commands/help.js](/d:/Source/template/project-knowledge-base-template/src/commands/help.js:66)

Observed state:
- `doc:gate` is a script name convention in package scripts
- it is not part of the gate snapshot, gate schema, or gate registry

Impact:
- easy naming collision with future first-class gate model
- maintain/release language can appear more unified than it really is

### GSA-006. Release and maintain have gate-like preconditions but no shared gate records

Severity: high

Evidence:
- [src/commands/release.js](/d:/Source/template/project-knowledge-base-template/src/commands/release.js:1)
- [src/commands/maintain.js](/d:/Source/template/project-knowledge-base-template/src/commands/maintain.js:1)

Observed state:
- both commands contain readiness or blocking logic
- neither reports via normalized gate items

Impact:
- users may believe `System > Gates` reflects release/maintain gating, but it currently does not

### GSA-007. Global operator gates and intent-local gates are still conflated in language

Severity: medium

Evidence:
- [svfactory/foundation.md](/d:/Source/template/project-knowledge-base-template/svfactory/foundation.md:244)
- [svfactory/process.md](/d:/Source/template/project-knowledge-base-template/svfactory/process.md:290)
- [site/kbx-ui/bridge-gates.mjs](/d:/Source/template/project-knowledge-base-template/site/kbx-ui/bridge-gates.mjs:1)

Observed state:
- docs use `gate` for both workspace-global policy blockers and per-intent actor handoff records
- runtime UI currently shows only the global operator family

Impact:
- without explicit `gate_type` or `scope`, users can misread the UI as "all gates"

### GSA-008. UI gate module currently covers only one gate family

Severity: medium

Evidence:
- [site/uiv2/src/app/pages/RuntimeServicesPage.tsx](/d:/Source/template/project-knowledge-base-template/site/uiv2/src/app/pages/RuntimeServicesPage.tsx:1)
- [site/kbx-ui/server.mjs](/d:/Source/template/project-knowledge-base-template/site/kbx-ui/server.mjs:1531)

Observed state:
- UI consumes `snapshot.gates`
- `snapshot.gates` is currently populated only from `bridge-gates.mjs`

Impact:
- UI is correct for the current family
- UI is incomplete if interpreted as a total gate registry

---

## Cases That Are Not Bugs

These are intentional separations, not failures:

- observation gates are allowed to stay separate from operator gates, but need adaptation
- human/intent gates are allowed to stay intent-local, but must not be implied as global UI gates
- `doc:gate` may remain a script name, but should not masquerade as the canonical gate registry

---

## Recommended Normalization Order

1. Define `gate_type` and `scope`
   - minimum split:
   - `operator-global`
   - `observation`
   - `intent-local`
   - `pipeline-specific`

2. Correct rule/tool references
   - remove or mark provisional references to nonexistent `kbx gates` commands

3. Add a dedicated gate registry contract
   - source policy
   - source signals
   - scope
   - audience

4. Decide whether human-gate CLI becomes real or docs are downgraded

5. Only after that, expand UI beyond current operator-global gates

---

## Audit Verdict

The codebase currently has a **real operator gate surface**, but it does **not** yet have a unified gate system.

The largest source-mixing risks are:

- docs promising gate commands that do not exist
- multiple gate families sharing one word without explicit taxonomy
- maintain/release preconditions behaving like gates without entering the same registry
