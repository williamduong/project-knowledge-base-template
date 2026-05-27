# UIV2 Information Architecture

**Date:** 2026-05-27  
**Status:** Goal-aligned IA checkpoint  
**Purpose:** Turn the current `site/uiv2` shell into an operator surface that reflects SVFactory's real job: build and release KBX variants from DNA.

---

## 1. What The Current Code Actually Does

Reading `site/uiv2` shows the current shell is still in transition.

### 1.1 Current top-level tabs

From `site/uiv2/src/app/shell-data.ts`:

- `Home`
- `Intents`
- `Knowledge Base`
- `Rules`
- `Graph`
- `Search`
- `System`
- `R&D Prototype`

### 1.2 Current route ownership

From `site/uiv2/src/app/ShellFrame.tsx`:

- `Home`, `Rules`, `System`, `Prototype` currently live under the outer SVFactory shell.
- `Intents`, `Knowledge Base`, `Goals`, `Decisions`, `Principles` are currently KBX-worldview pages.
- `Rules` and `System` still share the same page engine: `RuntimeServicesPage`.
- `Search` is still a route plus overlay, not yet a pure utility surface.

### 1.3 Current mismatch with product goals

The current shell still reflects a transitional admin UI, not the long-term factory workflow:

- `Home` already contains too much real summary logic, even though Home should stay thin for now.
- `Graph` is a top-level tab, but graph is really a substrate/lens, not the primary operator goal.
- `Rules` and `System` are partially entangled.
- `Flow`, `Tools`, and `DNA` still do not exist as first-class workspaces.
- `R&D Prototype` is still in production navigation even though it is only a sandbox.

---

## 2. Goal-Aligned Product Model

The shell should revolve around the real operator concerns of SVFactory.

### 2.1 The main workspaces

These are the primary surfaces the operator actually needs:

0. `Dashboard`
1. `Code`
2. `Intent`
3. `Rules`
4. `Flow`
5. `Tools`
6. `DNA`
7. `System`

### 2.2 Why this is the right backbone

- `Code` exists because SVFactory must govern and reshape code, including code graph state.
- `Intent` exists because all serious work starts from directed intent and traceable impact.
- `Rules` exist because every serious agent needs a harness.
- `Flow` exists because no action should bypass pipelines, processes, or triggers.
- `Tools` exist because agents should use approved execution arms instead of improvising mutations.
- `DNA` exists because DNA is the release-ready bundle of worldview, rules, ontology, flows, tools, templates, and checks.
- `System` exists because runtime/service management is still necessary, but it is not the center of the product story.

---

## 3. External Review Synthesis

An external architecture review reached several conclusions that are worth keeping because they align with the current repo direction.

### 3.1 Keep

- `Code` should become a first-class workspace because Code Graph is already a real foundation, not a side feature.
- `Intent` should become more graph-backed and ontology-aware so impact and followability are native rather than bolted on.
- `Rules` should be treated explicitly as the agent harness.
- `Tools` should become a real governed registry rather than remaining implicit behind commands and ad hoc behavior.
- `DNA` should become a top-level management surface because the long-term product goal is KBX generation from DNA.
- the two-mode interpretation is useful:
  - build SVFactory
  - build downstream KBX
- `Dashboard` should stay thin until real workspaces mature.

### 3.2 Adjust

Some suggestions were useful in spirit but need architectural correction.

- `Gates` should not become a standalone top-level workspace.
  - Gates are first-class, but they only make sense inside `Flow`.
- `Graph` should not remain the primary product center forever.
  - Graph is foundational, but it is better treated as a lens across `Code`, `Intent`, and `DNA`.
- "wait to refactor navigation until much later" is too conservative for the current repository state.
  - The repo already has enough boundary clarity to start incremental shell cleanup now.

### 3.3 Net Result

The strongest reusable insight is:

- make `Code`, `Flow`, `Tools`, and `DNA` visible
- keep `Rules` as harness
- treat `Intent` as graph-backed governance workflow
- reduce `System` back to runtime/operator scope

---

## 4. Graph And Gate Positioning

Two concepts must be repositioned carefully.

### 3.1 Graph is foundational, not the main top-level goal

GraphDB is essential, but it should mostly appear as a lens inside real workspaces:

- `Code` -> code graph, symbols, dependencies, impact
- `Intent` -> intent graph, goal/decision/principle links, impact trails
- `DNA` -> ontology and graph profile used to generate downstream graph behavior

This means `Graph` should stop being treated as a primary product destination.

Recommended interpretation:

- short term: keep the current `Graph` tab only as a compatibility bridge
- target state: absorb graph views into `Code`, `Intent`, and later `DNA`

### 3.2 Gate should not stand alone as a product island

`Gate` is critical, but it does not make sense as an isolated system.

It only has meaning inside:

- a flow
- a pipeline
- a release path
- a validation path
- a scheduled process

Recommended interpretation:

- `Gate` is a first-class concept
- but its home is inside the `Flow` workspace, not as an isolated top-level workspace

---

## 5. Recommended Top Navigation

For the production shell:

- `Dashboard`
- `Code`
- `Intent`
- `Rules`
- `Flow`
- `Tools`
- `DNA`
- `System`

Utilities:

- `Search` -> overlay / command palette only
- `R&D Prototype` -> dev-only route, not primary navigation

---

## 6. Workspace Definitions

### 5.1 Dashboard

For now, keep it intentionally thin.

Recommended behavior:

- do not build a detailed dashboard first
- keep it mostly empty or placeholder-led
- only extract final summary cards into Dashboard after deeper workspaces become trustworthy

This matches the current goal:

- detail first
- dashboard last

### 5.2 Code

This workspace owns code administration and code graph governance.

Recommended local sections:

- `Overview`
- `Files`
- `Symbols`
- `Dependencies`
- `Code Graph`
- `Impact`

This is where code graphdb should live visibly.

### 5.3 Intent

This workspace owns intent administration and graph-backed followability.

Recommended local sections:

- `Queue`
- `Active`
- `Traceability`
- `Impact`
- `Goal / Decision / Principle Links`
- `Intent Graph`

This is where ontology-backed follow paths become operationally useful.

### 5.4 Rules

This workspace owns the harness.

Recommended local sections:

- `Registry`
- `Violations`
- `Packs`
- `Dependencies`
- `Precedence`
- `Coverage`

Core idea:

- Rules are the governing harness that keeps agents from becoming unsafe or theatrical.

### 5.5 Flow

This should become the execution grammar of the factory.

Recommended local sections:

- `Overview`
- `Pipelines`
- `Gates`
- `Triggers`
- `Runs`
- `Map`
- `Registry`

Recommended terminology:

- use `Flow` as the umbrella term
- inside it, keep `Pipeline`, `Gate`, `Trigger`, and `Process` as sub-concepts

This avoids fighting over `pipe` vs `flow` vs `process` at the top level.

### 5.6 Tools

This workspace owns approved action surfaces.

Recommended local sections:

- `Registry`
- `Capabilities`
- `Bindings`
- `Allowed Contexts`
- `Usage Policy`
- `Coverage Against Rules / Flow`

Core idea:

- Tools are the hands of the agent
- they should be governed, discoverable, and mapped to allowed usage patterns

### 5.7 DNA

This workspace owns software-generation packages and readiness.

Recommended local sections:

- `Library`
- `Create Wizard`
- `Ontology`
- `Rules`
- `Flow`
- `Tools`
- `Templates`
- `Checklist`
- `Release`

Core idea:

- a DNA is a release-ready plan for producing a KBX variant
- when release flow runs, SVFactory should be able to load the DNA package resources and publish deterministically

### 5.8 System

This workspace should stay narrow.

Recommended local sections:

- `Services`
- `Cron`
- `Runtime Health`
- `Snapshots`
- `Recovery`

This workspace should not remain the long-term home of:

- rules
- gates
- pipelines
- DNA management

---

## 6. Two Primary Operating Modes

SVFactory really has two large operating modes.

### 6.1 Build SVFactory

In this mode, SVFactory is building itself:

- its own features
- its own compiler spine
- its own UI
- its own release and validation flows

This is the "mother/god" view:

- the system that creates systems

### 6.2 Build KBX

In this mode, SVFactory is building downstream KBX variants:

- create or choose a DNA
- import outside data
- refine ontology, rules, tools, and flow
- test
- release

Recommended UI treatment:

- not separate apps
- a top-shell mode switch or session mode indicator
- workspaces remain shared, but page defaults and CTAs can change by mode

---

## 8. Immediate IA Changes Recommended Before Visual Redesign

1. Remove `R&D Prototype` from primary production navigation.
2. Demote `Search` from top-level route importance into overlay-first utility.
3. Keep `Dashboard` intentionally light until the main workspaces stabilize.
4. Add `Code`, `Flow`, `Tools`, and `DNA` as real operator workspaces.
5. Start moving `Graph` from a primary tab into embedded graph lenses across `Code`, `Intent`, and `DNA`.
6. Keep `Gate` first-class, but house it inside `Flow`.
7. Shrink `System` back to runtime/service management only.

---

## 9. Implication For Current `site/uiv2` Refactor

The current shell split should now evolve like this:

- `site/uiv2/src/app/pages/svfactory/*`
  - should become the long-term home of:
    - Dashboard
    - Code
    - Rules
    - Flow
    - Tools
    - DNA
    - System

- `site/uiv2/src/app/pages/kbx/*`
  - should remain compatibility surfaces for the current KBX reference worldview:
    - Intent
    - Knowledge Base
    - Goals
    - Decisions
    - Principles

Long term, the KBX-worldview pages should be understood as:

- reference DNA-facing surfaces
- or downstream-generated UI semantics

not as the neutral mother-shell of SVFactory.

---

## 10. Decision Summary

The UIV2 shell should no longer be organized around whatever pages happened to exist first.

It should be organized around the real factory jobs:

- govern code
- govern intent
- govern rules
- govern flow
- govern tools
- govern DNA
- operate system runtime

Graph remains foundational, but mostly as a lens inside those workspaces rather than a top-level destination.
