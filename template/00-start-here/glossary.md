---
title: Glossary
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-04
last_verified: 2026-05-04
related:
	- terminology-guard.md
	- ../15-governance/numbering-system.md
	- ../15-governance/metadata-schema.md
tags:
	- glossary
	- terminology
	- intent
	- governance
---

# D00 - Glossary Contract

Status: FINAL

Purpose: canonical vocabulary contract for the KB system.
All downstream documents must reference this file and must not redefine core terms ad hoc.

Reading rules:
- Section A is Runtime Canonical. Agents may use these terms for current behavior.
- Section B is Planned Vocabulary. Agents must not use these terms as if they are already implemented.

## Section A - Runtime Canonical

### A1. Intent Core

Term: intent
- Traceable unit of work in KB lifecycle operations.
- Any KB/source mutation must be associated with an intent trace.
- Read-only operations are not mutations and do not require intent creation.
- ID format: `INT-{seq}` per numbering policy.

Term: intent-mode
- Runtime values: `quick`, `full`.
- `quick` is lower ceremony and single-focus.
- `full` is multi-file or cross-tier with explicit plan/impact stubs.

Term: change-type
- Runtime intent metadata field that classifies intent purpose.
- Canonical runtime default is `docs`.
- Other observed types in usage/docs include: `feature`, `fix`, `refactor`, `incident`, `exploration`, `bootstrap`.
- Contract note: runtime stores `change_type`; "intent-type" is a conceptual alias unless a separate runtime field is introduced.

Term: change-scope
- Runtime metadata scope list (`change_scope`).
- Describes affected KB domains/files, not organization-wide blast scope.

Term: inline-record
- Policy term replacing vague "trivial exception" wording.
- Current status: policy-level behavior only; dedicated runtime object/API is planned.
- Allowed only when all conditions hold:
	- one file changed
	- non-behavioral change
	- one-line reason is recorded
	- no external review dependency

Term: maintenance-ongoing
- Persistent default intent context created during onboarding transition.
- Used as the fallback context when no specific active intent is resumed.

Term: retroactive-extract
- Runtime capability to package ad hoc commit-range KB changes into archived intent artifacts.

### A2. Intent Status

Term: intent-status
- Runtime metadata value in `intent.md` currently persists as `open` during active workspace state.
- Command outcomes like `created`, `applied`, and `cancelled` are operation results, not persisted lifecycle state machine values.

### A3. Flow and Execution

Term: staged-files
- Files staged under `proposed-changes/` before apply.

Term: proposed-changes
- Staging tree inside an intent workspace containing candidate KB file writes.

Term: apply-record
- Immutable record written before archive move; includes `intent_id`, `mode`, `change_type`, applied files, and decision fields.

Term: apply-strategy
- Conflict-resolution strategy output.
- Runtime values: `proceed`, `proceed-with-caution`, `review-order`, `resolve-first`.

Term: decision-summary
- Intent decision rationale carried in metadata and reflected in apply outputs.

Term: ai-decision-context
- Archive-side transparency artifact for conflict strategy evidence.

Term: review-after
- Review scheduling field in intent metadata.

### A4. Impact and Conflict

Term: mutation
- Any write/change to KB or source.
- Read-only operations are explicitly excluded.

Term: impact-signals
- Signals used to reason about potential blast effects (paths, domains, graph neighbors).

Term: conflict-signals
- Runtime overlap signal families:
	- exact-file-overlap
	- same-directory-overlap
	- same-domain-overlap
	- graph-neighbor-overlap

Term: conflict-summary
- Structured conflict output attached to apply decision context.

Term: drift
- Mismatch between documentation state and code/reality state.

Term: transitive-impact
- Recursive impact propagation over strong relations (`related_strong`) and bindings.

Term: blast-radius
- Count of directly and transitively impacted KB docs for a change context.

### A5. Chaos and Entropy

Term: entropy
- Conceptual disorder/uncertainty condition in KB quality.
- Not a single command output metric.

Term: chaos-score
- Computed numeric coefficient (0-100) from observation signals.

Term: chaos-delta
- Difference in chaos-score between two points/intent outcomes.

Term: risk-band
- Estimated directional risk category: `safe`, `watch`, `spike`.

Term: chaos-context-signals
- Context features influencing chaos computation (impact verdict signals, graph cycles, stale intents, release freshness, doc quality).

Term: formula-version
- Runtime chaos output field name is `formula_version`.
- Contract note: do not rename this field to a non-runtime alias in current behavior docs.

### A6. Gate and Verification

Term: gate-results
- Governance gate output families:
	- debt
	- entropy
	- lesson-contradiction
	- version-scope

Term: overall-status
- Aggregate gate result status across gate families.

Term: reconstruction-triggers
- Trigger block reporting whether reconstruction criteria are activated.

Term: baseline
- Git reference anchor used for diff/impact windows.

Term: doc-kb-state
- Runtime document frontmatter state.
- Allowed values: `template`, `autofilled`, `needs-review`, `verified`, `blocked`.

### A7. Disambiguation - State and Status

Do not use bare "state" in new specs. Use explicit compound terms:
- install-presence: `fresh`, `healthy`, `partial`
- install-state: fields in `state.json`
- doc-kb-state: document trust/workflow state
- intent-status: persisted intent metadata status
- install-verdict: status verdict from KB health checks (`clean`, `attention`, `blocked`)
- response-status: response header state (`running`, `paused`, `done`, etc.)
- step-status: runtime-plan step marker (`pending`, `done`, `skipped`, `blocked`)

### A8. Disambiguation - Intent-Phase, Intent-Task, Runtime-Step

Use explicit prefixes:
- intent-phase: hierarchy subdivision in intent planning model
- intent-task: task unit under phase/intent hierarchy
- runtime-step: step entry in slash-mode runtime plan

Do not use unqualified "phase", "task", or "step" in cross-context governance specs.

### A9. Traceability

Term: ADR
- Architecture Decision Record artifact for structured decision capture.

Term: postmortem
- Incident follow-up artifact capturing event, impact, root cause, fix, and prevention.

Term: lesson-candidate
- Runtime output from pattern mining (`suggest-lessons`) for human promotion review.

Term: evidence
- Raw supporting artifacts used to justify decisions and status updates.

### A10. Human Interaction

Term: read / Q&A
- Read-only KB interaction mode.
- Does not create mutation trace requirements.

Term: slash-mode
- Explicit prompt-driven mode via `/kb-plan`, `/kb-run`, `/kb-ask`.
- For mutation work, slash workflows still require intent-governed traceability.

Term: at-kb-mode
- Default conversational mode via `@kb` contract.
- Mutation requests route through intent-first behavior.
- Read requests route through Q&A pipeline.

## Section B - Planned Vocabulary

Planned terms are design targets and must not be treated as currently implemented runtime objects.

### B1. Intent Hierarchy (target: v2.4+)
- parent-intent (planned)
- child-intent (planned)

### B2. Extended Lifecycle Machine (target: v2.3+)
- draft, active, z1-iterating, z1-locked, z2-iterating, z2-locked, deploying, closed
- Note: archive move exists today, but "archived" is currently an archive event/storage outcome, not a formal runtime lifecycle state machine node.

### B3. Intent Scope and Additional Types (target: v2.2+)
- intent-scope (planned organizational scope axis)
- review (planned type)
- compliance (planned type)

### B4. Flow Engine Terms (target: v2.3+)
- zone (planned)
- planner-loop (planned)
- exit-gate (planned)
- replan (planned)
- plan-score (planned)

### B5. Multi-Oracle Impact Layer (target: v2.3+)
- impact-oracle (planned abstraction)
- gitnexus-adapter (planned optional oracle)

### B6. Growth Terms (target: v2.3+)
- growth-seed (planned)
- growth-loop (planned)

### B7. Governance Terms (target: v2.4+)
- stakeholder-map (planned)
- human-touchpoint (planned)
- inline-record runtime object/API (planned implementation detail; policy term already canonical)

## Section C - Deprecated or Renamed Terms

- Deprecated bare term: `trivial` (replace with `inline-record` policy language)
- Deprecated bare term: `state` (replace with compound explicit forms in A7)
- Deprecated bare term: `phase` (use `intent-phase` or `runtime-step` as appropriate)
- Deprecated bare term: `step` in intent hierarchy contexts (use `intent-task`)
- Deprecated bare term: `task` in slash runtime contexts (use `runtime-step`)

## Section D - Resolved Questions Log

Q1. Is "archived" a lifecycle state?
- Resolved: not a formal runtime lifecycle machine state today; it is an archive filesystem event/outcome.

Q2. Does doc-kb-state include blocked?
- Resolved: yes; command-level allowed set includes `blocked`.

Q3. Are change-type and intent-type the same?
- Resolved: runtime field is `change_type`; "intent-type" is currently conceptual alias.

Q4. Is chaos formula version present in output?
- Resolved: yes, as `formula_version`.

Q5. What are install verdict values?
- Resolved: `clean`, `attention`, `blocked`.

Q6. Is one-file boundary enough for inline-record?
- Resolved: no; one-file is required but not sufficient. Non-behavioral and reason trace constraints also required.

Q7. What is intent-phase numbering format?
- Resolved: `PH-n` scoped by plan context per numbering contract.

Q8. Are gate-report terms fully covered?
- Resolved: include gate families plus `overall-status` and `reconstruction-triggers` in canonical vocabulary.

## Metadata

- document_id: D00
- contract_status: FINAL
- runtime_section: A
- planned_section: B
- deprecations_section: C
- resolved_questions_section: D
- canonical_language: English
