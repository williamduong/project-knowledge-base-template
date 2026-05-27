# SVFactory Graph Domain Boundary

**Date:** 2026-05-27  
**Status:** Locked architectural boundary  
**Purpose:** Separate planning, execution, and code reasoning so graph design does not collapse multiple mental modes into one noisy map.

---

## 1. Decision

SVFactory should not force all operator reasoning into a single mixed graph.

The architecture is now split into **three graph domains**:

1. `Planning Graph`
2. `Execution Graph`
3. `Code Graph`

These may share one graph engine in the near term, but they must remain **logically distinct domains** with explicit bridge rules.

---

## 2. Planning Graph

### 2.1 Purpose

This graph is for:

- planning
- backlog shaping
- alignment
- release planning
- followability
- impact review at the work-management level

It is the graph that represents **concrete work actually being tracked**.

### 2.2 Canonical node families

- `SystemGoal`
- `Goal`
- `SubGoal`
- `Milestone`
- `ReleaseLine` or `ReleaseVersion`
- `ConcreteIntent`
- `Task`
- optionally `Decision`

### 2.3 What does not belong here

The planning graph should **not** contain concrete execution machinery such as:

- concrete rules
- concrete gates
- concrete flows
- concrete pipelines
- concrete tool runs
- runtime execution traces

If any of those concepts appear here at all, they must appear only as:

- abstract references
- abstract classifications
- interface-level links

Examples:

- `ConcreteIntent classified_as AbstractIntentType`
- `Milestone requires FlowFamily`
- `ReleaseLine governed_by RuleFamily`

### 2.4 Key rule

The planning graph is about **what we intend to accomplish**, not **how the factory executes it step by step**.

---

## 3. Execution Graph

### 3.1 Purpose

This graph is for:

- process execution
- operator/runtime action design
- gates and flow contracts
- tool orchestration
- evidence and release control

It represents **how SVFactory acts**.

### 3.2 Canonical node families

- `AbstractIntentType`
- `FlowFamily`
- `PipelineType`
- `GateType`
- `RuleFamily`
- `ToolType`
- `RunType`
- `EvidenceType`
- `ArtifactType`
- `ReleaseOperation`

### 3.3 What does not belong here

The execution graph should **not** contain:

- concrete planning intents
- backlog items
- concrete intent records such as `v2-10-code-graph`
- planning task rows as first-class execution nodes

If a planning concern must appear here, it should appear only through an abstract interface such as:

- `AbstractIntentType`
- `WorkClass`
- `OperationArchetype`

### 3.4 Key rule

The execution graph is about **how the factory works**, not **which exact backlog item is currently being tracked**.

---

## 4. Code Graph

### 4.1 Purpose

This graph is for:

- code structure
- symbols
- imports
- calls
- dependencies
- implementation impact
- code evidence

### 4.2 Canonical node families

- `File`
- `Module`
- `Symbol`
- `Import`
- `Call`
- `Test`
- `CodeArtifact`

### 4.3 Key rule

The code graph is about **implementation logic**, not planning workflow and not execution contract modeling.

---

## 5. Concrete Intent vs Abstract Intent Type

This distinction is mandatory.

### 5.1 Concrete Intent

Examples:

- `v2-10-code-graph`
- `v3-0-dna-graph-ontology-boundary`

Properties:

- specific
- time-bound
- backlog-managed
- user/operator-facing

Home:

- `Planning Graph`

### 5.2 Abstract Intent Type

Examples:

- `FoundationRefactor`
- `ReleaseDNA`
- `StabilizeRuntime`
- `GenerateVariant`

Properties:

- reusable
- many concrete intents can map to one abstract type
- used to connect planning to execution

Home:

- `Execution Graph`

### 5.3 Bridge rule

Valid bridge:

- `ConcreteIntent classified_as AbstractIntentType`

Invalid bridge:

- `ConcreteIntent directly_owns Flow`
- `ConcreteIntent directly_owns Pipeline`
- `ConcreteIntent directly_owns GateSet`

Reason:

- one execution family may serve many concrete intents
- execution should not be cloned per intent record

---

## 6. Bridge Rules Between Graphs

The three graphs may connect, but only through narrow bridge edges.

### 6.1 Planning -> Execution

Allowed examples:

- `ConcreteIntent classified_as AbstractIntentType`
- `ReleaseLine requires FlowFamily`
- `Milestone governed_by RuleFamily`

Not allowed:

- embedding full pipeline steps into planning nodes
- embedding execution traces into planning graph views by default

### 6.2 Planning -> Code

Allowed examples:

- `ConcreteIntent impacts CodeArea`
- `Goal linked_to Symbol`
- `Task evidenced_by CodeArtifact`

### 6.3 Execution -> Code

Allowed examples:

- `ToolType acts_on Symbol`
- `GateType validates CodeArtifact`
- `FlowFamily emits ArtifactType`

---

## 7. UI Consequences

### 7.1 Intent workspace

`Intent` should read primarily from the `Planning Graph`.

It may show:

- goals
- milestones
- releases
- concrete intents
- tasks

It should not become a mixed execution-map by default.

### 7.2 Flow workspace

`Flow` should read primarily from the `Execution Graph`.

It may show:

- abstract intent types
- flow families
- pipeline types
- gates
- tools
- evidence and run contracts

It should not embed concrete planning intents as execution nodes.

### 7.3 Code workspace

`Code` should read primarily from the `Code Graph`.

### 7.4 Cross-workspace traceability

Cross-graph traces are allowed, but should be treated as:

- focused bridges
- overlays
- drill-down links

not as a single giant mixed graph canvas.

---

## 8. Near-Term Implementation Plan

### 8.1 Planning Graph

Continue improving:

- `Intent -> Goal -> Milestone -> ReleaseLine`
- task projection
- alignment and traceability UI

### 8.2 Execution Graph

Do **not** attach concrete intents here.

Start with:

- `AbstractIntentType`
- `FlowFamily`
- `GateType`
- `ToolType`
- `RuleFamily`

### 8.3 Code Graph

Keep current direction and continue exposing code-logic surfaces through `Code`.

### 8.4 Storage

Short term:

- one engine is acceptable
- three logical graph domains

Long term:

- physical separation can be decided later if scale or isolation requires it

---

## 9. Final Boundary Statement

- `Planning Graph` owns concrete work.
- `Execution Graph` owns abstract action contracts.
- `Code Graph` owns implementation logic.
- Concrete intents do not live inside the execution graph.
- Rules / flows / pipelines do not belong in the planning graph except as abstract references.

