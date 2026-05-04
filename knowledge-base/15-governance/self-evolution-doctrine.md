---
title: Self Evolution Doctrine
type: governance
status: active
owner: knowledge-management
time_state: target
verification: design-only
last_updated: 2026-05-02
last_verified: 2026-05-02
related:
  - review-cadence.md
  - verification-policy.md
  - ../12-ai-skills/agent-operating-manual.md
tags:
  - governance
  - doctrine
  - evolution
  - loops
---

# Self Evolution Doctrine

## 1. Purpose

Define one shared doctrine for how the KB evolves from intent evidence to supervised decisions and advanced reasoning, while preserving human oversight.

## 2. Relationship To Existing Governance

This doctrine extends, and does not replace, existing governance workflows:

- `review-cadence.md` remains the source for the doc maintenance loop.
- `verification-policy.md` remains the source for verification states and downgrade/upgrade rules.
- This doctrine adds versioned evolution loops that operate on intent evidence, metrics, and graph projections.

## 3. Versioned Capability Roles

| Version | Role | Responsibility |
|---|---|---|
| v1.7 | Recorder | Capture intent evidence, archive artifacts, and lesson candidates. |
| v1.8 | Observer | Measure debt and entropy, compare thresholds, and emit supervised decisions. |
| v1.9 | Graph Builder | Normalize relations and IDs, and generate graph-ready projection artifacts. |
| v2.0 | Reasoner | Produce higher-order recommendations from evidence, metrics, lessons, and graph context. |

## 4. Loop Taxonomy

### 4.1 Doc Maintenance Loop

Source: `review-cadence.md` Standard Execution Loop.

Purpose: keep documentation aligned with implementation drift and verification status.

### 4.2 Evidence Loop (v1.7)

1. Capture intent.
2. Stage proposed changes.
3. Apply or cancel with explicit decision.
4. Archive evidence and lesson candidates.

Purpose: produce deterministic, queryable change evidence.

### 4.3 Supervision Loop (v1.8)

1. Measure debt and entropy.
2. Compare to thresholds.
3. Emit warnings, decisions, and follow-up actions.
4. Re-measure after action.

Purpose: prevent unbounded quality drift and force explicit trade-off decisions.

### 4.4 Graph Loop (v1.9)

1. Project entities and relations from repository state.
2. Validate consistency (IDs, edges, relation types).
3. Export reproducible graph artifacts.

Purpose: provide deterministic graph context without changing source-of-truth ownership.

### 4.5 Reasoning Loop (v2.0)

1. Gather context from evidence, metrics, decisions, and graph projections.
2. Propose conflict handling and adaptation actions.
3. Present rationale and references.
4. Require human approval at protected boundaries.

Purpose: improve decision quality while retaining governance controls.

## 5. Decision Boundaries

- Agent can suggest: scores, warnings, lessons, and conflict resolution options.
- Agent can modify automatically: non-destructive projection artifacts, index reports, and candidate files.
- Human approval is required for: intent apply transitions, reconstruction starts, enforcement-level gate changes, and critical policy edits.

## 6. Doctrine Compatibility Rules

- Keep backward-compatible data contracts unless a major version explicitly migrates them.
- Keep timeline retention policy for v1.7 through v2.0: no deletion, no compression, no server-backed migration.
- Keep `.kb/catalog.json` compatibility filename while user-facing term stays release ledger.
- When loops conflict, governance policy takes precedence over automation convenience.

## 7. Adoption Rule

Starting from roadmap planning after v1.6, all version plans from v1.7 to v2.0 must explicitly reference this doctrine and declare which loop role they implement.