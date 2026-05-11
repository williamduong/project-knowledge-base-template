---
title: SVFactory Architecture Overview
type: architecture
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-11
related:
  - 05-foundation-principles.md
  - 02-rules-matrix.md
  - ../../svfactory/CONSTITUTION.md
  - ../../svfactory/foundation.md
tags:
  - svfactory
  - architecture
  - legislative
---

# SVFactory Architecture Overview

## Canonical Role

SVFactory is the legislative layer. It defines what is allowed, what is blocked, and how governance is evaluated. It does not execute business workflows.

## Layer Model

1. Governance Core:
   - policy and schema contracts
   - deterministic gate definitions
   - canonical primitive model
2. Deterministic Runtime Surface:
   - CLI gates (`kbx init`, `kbx doctor`, `kbx chaos`)
   - stable exit-code semantics
3. Storage Abstraction:
   - backend-independent entity semantics
   - markdown/git, graph, relational backends as interchangeable implementations

## Constitutional Constraints

- Axiom 1: Separation of powers
- Axiom 2: Domain agnosticism
- Axiom 3: Deterministic block
- Axiom 4: Checkpoint-driven audit
- Axiom 5: End-user invisibility

These axioms override lower-level documentation when conflict exists.

## SVFactory vs KBAgent

- SVFactory decides policy validity.
- KBAgent coordinates execution and operator behavior.
- KBAgent must stop on deterministic SVFactory block signals.

## Current-State Note

This repository currently carries mixed maturity artifacts (v2.3.x through v2.7.0-beta.2 lineage). Treat this document as architectural intent; verify runtime claims against CLI behavior and latest governance files.
