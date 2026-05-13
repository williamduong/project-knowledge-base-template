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
- **Session-start intent chooser** — Start each session with intent selection
  - Run `kbx intent list` to see active intents
  - Lock exactly one `session_intent_id` for the conversation
- **Deterministic NL intent-trigger mapping** — Map user intent-lifecycle phrases to CLI commands
  - `kbx intent status` for intent inspection phrases
  - `kbx intent create` for intent creation phrases
  - `kbx intent close` for intent closure phrases
- Governance Rules contract
- Intent Start Gates (pre-work validation)
- **SV Factory gate tier (deterministic)** — MUST stop immediately when deterministic gate checks fail

For detailed flows (optional): See [Agent Operating Manual — Appendix](./agent-operating-manual-appendix.md):
- Register-First Rule For File Creation
- Prompting Rules For Agents
- Ontology Validation (v2.6)
- Zero-to-Intent Onboarding Flow (step-by-step fresh setup)
- Session Continuity and Resume Blocks
- Cognitive Drift Signals (metrics and detection)
- Large-Intent Branch Gate (soft gates)
- Human-Gate Protocol (external actor management)
- **Doctrine Alignment** (versioned capabilities v1.7-v2.0)
- Project-Scoped KB Agent (init projection paths)
- Multi-Project Workspace Rules (v2.5+)

---

## Three-Layer Vibe Flow (SVFactory + KBAgent)

Canonical boundary statement:
- SVFactory is the meta-factory that defines governance contracts, templates, workflows, schemas, prompts, and deterministic gates.
- KBAgent is a downstream agent family instantiated from that contract to help users operate and evolve a reference-accurate knowledge base.
- kbx CLI is the deterministic enforcement bridge between SVFactory and KBAgent.

Claim scope guard:
- Default claim scope is governed KB/agent software instances.
- Do not generalize from governed KB/agent software instances to all software instances without explicit non-KB evidence.

When users interact in natural language, execution follows this layered flow:

1. **Layer 1: Intake & Normalize**
   - Convert user phrasing into explicit CLI actions.
   - Classify which tasks are deterministic-runtime vs AI-assist.

2. **Layer 2: Deterministic Runtime**
   - Execute CLI actions first.
   - Use runtime output as canonical truth.
   - On runtime failure, report and stop; no AI-only workaround for deterministic gates.

3. **Layer 3: AI Completion**
   - Complete residual work after CLI (placeholder fill, summaries, wording).
   - AI must not invent runtime outcomes.

See [Agent Operating Manual — Core](./agent-operating-manual-core.md) for full details on this layered interaction model.

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



