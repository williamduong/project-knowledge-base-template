---
slug: v2-10-domain-moduleization-foundation
title: "Domain moduleization foundation before ontology and graphdb"
description: "Define the canonical module boundaries, storage policy, and pipeline contracts for intent, task, rule, goal, milestone, version, and system-profile domains before expanding into ontology or graph-backed execution."
lifecycle: backlog
priority: "2.5"
blocks: null
created_at: 2026-05-15T00:00:00.000Z
goal: "Move KBX from feature-centric runtime logic toward domain-centric modules with explicit models, repositories, services, and pipeline boundaries while keeping file-backed storage as the current source of truth."
focus:
  current: "Prepare a clean refactor foundation so intent, task, rule, and planning domains stop leaking semantics across CLI, bridge, and UI."
  last_updated: 2026-05-15
  next_action: "Lock the domain inventory, define the shared module contract, and sequence intent-first extraction before touching ontology or graphdb again."
decision_summary: "Current runtime logic is still concentrated in feature-heavy command/lib files. Before adding more complex graph or ontology surfaces, KBX should standardize domain modules, state machines, storage adapters, and overview-facing module metadata."
architecture_position:
  wave: v2.10
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-10-domain-moduleization-foundation

## Summary

This intent exists to define the modular runtime foundation for KBX before more complex storage or graph layers are introduced.

The current system already has useful deterministic behavior, but key logic is still spread across command files, lib files, bridge snapshots, and UI heuristics. That is acceptable for evolution up to a point, but it becomes risky once rules, goals, milestones, ontology, and graph projections all start interacting.

## Why now

- Intent lifecycle logic was just tightened, which exposed that orchestration rules, storage moves, and state transitions are still mixed across CLI and lib layers.
- The localhost UI can now surface runtime truth, but it still does not have a canonical module registry or domain overview contract.
- Future work on rules, goals, milestones, version planning, and system profiles will become harder to reason about if they continue to copy the current intent pattern without a cleaner module boundary.
- Ontology and graphdb should consume stable domain contracts, not become the place where unclear runtime semantics get hidden.

## Target outcome

Produce an implementation-ready refactor blueprint that standardizes how KBX modules are structured and how they expose runtime truth to CLI, bridge, and UI.

## Proposed module set

1. Intent
2. Task
3. Rule
4. Goal
5. Milestone
6. Version
7. System profile

## Constraints

- File/folder storage remains the current source of truth.
- Database or graph layers may be added later only as projection/query layers, not as the first place where business logic is centralized.
- CLI and bridge must consume the same application services rather than re-implementing lifecycle logic separately.

## Task Plan

- [ ] Inventory current runtime ownership for intent, task, rule, goal, milestone, version, and system-profile concepts across `src/commands`, `src/lib`, bridge endpoints, and localhost UI.
- [ ] Define the canonical module contract shared by all major domains: `model`, `repository`, `service`, `policy`, and `overview summary`.
- [ ] Specify the intent state machine and pipeline boundaries explicitly: transition logic vs storage mutation vs pipeline orchestration.
- [ ] Define the task contract separately from markdown/UI heuristics, including runtime state, evidence tags, and source registration.
- [ ] Define how rules attach to domains without embedding rule-engine concerns directly into intent/task services.
- [ ] Define planning-domain boundaries for goal, milestone, and version so they stop living as ad hoc frontmatter-only concepts.
- [ ] Define the system-profile module for runtime environment, repo surface, adapters, and IDE/deployment metadata.
- [ ] Propose the module registry schema that the localhost Overview can render directly as runtime truth.
- [ ] Produce a migration sequence that starts with `intent` extraction, keeps CLI backward compatible, and avoids premature graph/db coupling.

## Activation trigger

- Activate after the current roadmap/observability anchor is narrowed to one active execution path.
- Activation should happen before any major ontology or graphdb expansion that would depend on these same domain boundaries.

## Out of scope

- Implementing graphdb storage itself.
- Final ontology schema design.
- Large UI redesign beyond adding runtime-backed module visibility.

