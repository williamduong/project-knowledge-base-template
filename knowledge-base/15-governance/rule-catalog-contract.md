---
title: Rule Catalog Contract
type: governance
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-10
related:
  - metadata-schema.md
  - verification-policy.md
  - git-binding-policy.md
  - ../12-ai-skills/agent-operating-manual.md
tags:
  - rules
  - deterministic
  - governance
---

# Rule Catalog Contract

Defines deterministic contract requirements for governance rule entries.

## Required Rule Fields

Every rule entry must include:
- id
- title
- description
- severity
- owner_layer
- enforceability
- runtime_status
- since_version
- source_doc
- check

## Allowed Enums

- severity: error, warn, info
- owner_layer: svfactory, kbagent, shared
- enforceability: auto, semi, human
- runtime_status: implemented, planned

## Deterministic Validation Gates

Rules registration must fail on:
1. duplicate rule IDs
2. missing required fields
3. invalid enum values
4. missing source_doc path in workspace

## Namespace Mapping (Phase C.2)

- AX namespace: constitutional deterministic-alignment checks
- PR namespace: principles deterministic-alignment checks
- WF namespace: workflow deterministic-alignment checks
- KA namespace: KBAgent contract deterministic-alignment checks

This document is the canonical source_doc for alignment rules:
- KBX-AX003
- KBX-AX004
- KBX-AX005
- KBX-PR025
- KBX-PR026
- KBX-WF008
- KBX-WF011
- KBX-KA103
- KBX-KA104

## Lane Artifact Acceptance Gate (v2.8)

Rule `KBX-AX005` is a deterministic acceptance gate for v2.8 rule-catalog hardening.

When active intent `v2-8-v2-8-svfactory-rule-catalog-hardening` exists, the following artifacts must exist and be valid:
1. `knowledge-base/.kb/graph-ingest/rules.json`
2. `knowledge-base/.kb/graph-ingest/intents.json`
3. `knowledge-base/.kb/graph-ingest/source.json`

Validation contract:
- Each file must be valid JSON.
- `format` must equal `graph-ingest-v1`.
- `lane` must match file lane (`rules`, `intents`, `source`).

## Session Hook Contract

Core hook slots expected by rule alignment checks:
1. Pre-start hook: deterministic CLI-first checks run before free-form reasoning.
2. Pre-end hook: session-end hygiene (checkpoint/commit trace or explicit unresolved state report).
