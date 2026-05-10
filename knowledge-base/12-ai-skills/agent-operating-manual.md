---
title: Agent Operating Manual
type: guide
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-10
last_verified: 2026-05-10
related:
  - ../15-governance/self-evolution-doctrine.md
  - ../00-start-here/terminology-guard.md
  - ./agent-operating-manual-core.md
  - ./agent-operating-manual-appendix.md
tags:
  - ai-agent
  - copilot
  - workflow
---

# Agent Operating Manual

> **Tiered Structure (v2.8+):** This manual is split into **core** (deterministic flows + required markers) and **appendix** (optional reference material). 
> - **[Core](./agent-operating-manual-core.md)** — Default load (required for all agents)
> - **[Appendix](./agent-operating-manual-appendix.md)** — Optional reference (detailed flows, onboarding, metrics)

## Quick Start

**For all agents:** Read [Agent Operating Manual — Core](./agent-operating-manual-core.md) first. This contains:
- Required markers and deterministic workflows
- Minimal Agent Workflow (13 core steps)
- Session-Start Intent Chooser (deterministic)
- NL Intent Trigger Mapping (deterministic)
- Governance Rules contract
- Intent Start Gates (pre-work validation)
- SV Factory Gate vs Agent Soft-First (Axiom 1 enforcement)

**For detailed flows (optional):** See [Agent Operating Manual — Appendix](./agent-operating-manual-appendix.md):
- Register-First Rule For File Creation
- Prompting Rules For Agents
- Ontology Validation (v2.6)
- Zero-to-Intent Onboarding Flow (step-by-step fresh setup)
- Session Continuity and Resume Blocks
- Cognitive Drift Signals (metrics and detection)
- Large-Intent Branch Gate (soft gates)
- Human-Gate Protocol (external actor management)
- Doctrine Alignment (versioned capabilities v1.7-v2.0)
- Project-Scoped KB Agent (init projection paths)
- Multi-Project Workspace Rules (v2.5+)

---

## Document Structure

This manual is optimized for token efficiency by splitting content into two tiers:

| Section | Location | Token Cost | Load By Default |
|---|---|---|---|
| **Core deterministic flows + markers** | [Core](./agent-operating-manual-core.md) | ~6-7k tokens | ✓ Yes — always |
| **Reference material + optional flows** | [Appendix](./agent-operating-manual-appendix.md) | ~4-5k tokens | ⊘ No — on demand |

**Total:** ~10-12k tokens (was 23k in unified file)  
**Reduction:** ~50% token savings by loading core only

### When to reference the appendix

- Agents working on KB first time → read Zero-to-Intent Onboarding Flow
- Agents managing external dependencies → read Human-Gate Protocol
- Agents on multi-project workspaces → read Multi-Project Workspace Rules
- Agents building knowledge graphs → read Ontology Validation
- Agents closing sessions → read Session Continuity



