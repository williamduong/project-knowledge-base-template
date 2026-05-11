---
title: KBAgent Features List
type: reference
status: active
owner: knowledge-management
time_state: mixed
verification: design-only
last_updated: 2026-05-11
related:
  - 00-architecture-overview.md
  - ../../template/.github/agents/kbx.agent.template.md
tags:
  - kbagent
  - features
---

# KBAgent Features List

| Capability | Current State | Target State | Source |
|---|---|---|---|
| Intent-first session workflow | Active | Stable | `kbx.agent.template.md` |
| Mandatory preflight (`status`, `doctor`, intent chooser) | Active | Stable | `kbx.agent.template.md` |
| Deterministic NL trigger mapping to CLI actions | Active | Stable | `kbx.agent.template.md` |
| Three-layer vibe execution | Active | Stable | `kbx.agent.template.md` |
| Persona-aware communication contract | Active | Stable | `kbx.agent.template.md` |
| Runtime plan execution (`/kbx-run`) | Active | Stable | `kbx-run.prompt.template.md` |

## Scope Guard

KBAgent can orchestrate and enrich execution, but it cannot redefine constitutional rules.
