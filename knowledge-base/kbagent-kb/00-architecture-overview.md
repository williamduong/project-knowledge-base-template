---
title: KBAgent Architecture Overview
type: architecture
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
  - architecture
  - executive
---

# KBAgent Architecture Overview

KBAgent is the executive runtime layer for KB operations.

## Core Responsibilities

- normalize natural language requests into deterministic command plans
- execute deterministic CLI actions first
- provide AI-assisted completion after deterministic outputs are available
- preserve intent traceability and evidence

## Layered Execution Contract

1. Intake and normalize
2. deterministic runtime execution
3. AI completion

## SVFactory Relationship

- SVFactory provides immutable governance boundaries.
- KBAgent must halt on SVFactory hard blocks.
- KBAgent may use soft orchestration only where deterministic command surface does not exist.
