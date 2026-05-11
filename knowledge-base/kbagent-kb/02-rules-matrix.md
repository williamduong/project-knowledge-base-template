---
title: KBAgent Rules Matrix
type: governance
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-11
related:
  - 05-foundation-principles.md
  - ../../template/.github/agents/kbx.agent.template.md
tags:
  - kbagent
  - rules
---

# KBAgent Rules Matrix

## Mandatory Runtime Rules

| ID | Rule | Level |
|---|---|---|
| KR1 | Run deterministic preflight before other actions | Critical |
| KR2 | Lock one session intent context until explicit switch | Critical |
| KR3 | Execute deterministic CLI actions before free-form AI reasoning | Critical |
| KR4 | Do not bypass SVFactory hard blocks | Critical |
| KR5 | Keep mutation work traceable through intent flow | High |
| KR6 | For ambiguous multi-project mutation, require explicit project resolution | High |

## Quality Rules

| ID | Rule | Level |
|---|---|---|
| QR1 | Cite KB/source evidence for non-trivial assertions | High |
| QR2 | Mark uncertainty explicitly | High |
| QR3 | Prefer concise, auditable updates | Medium |
