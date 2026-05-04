---
id: v2-3-3-1-human-gate
mode: full
status: open
created_at: 2026-05-05T02:00:00.000Z
change_type: feature
change_scope:
  - kb-root/principles.md
  - kb-root/process.md
  - template/12-ai-skills/agent-operating-manual.md
  - template/.github/agents/kb.agent.template.md
  - knowledge-base/14-templates/
  - src/commands/gates.js
  - src/lib/gates.js
impact_signals:
  - additive
  - workflow-refinement
  - no-breaking-changes
decision_summary: >
  Introduce human-gate as a structured handoff mechanism inside intent workflow.
  AI drops a typed task record instead of blocking on chat questions.
  Applies to any actor: human, human-role, external-ai, external-system.
review_after: 2026-06-30
lesson_id: null
lifecycle_state: closed
promotion_ready: true
linked_signals: []
promote_decision_ref: null
parent_epic: v2-3-4-vscode-marketplace-epic
ships_as_npm: v2.3.4
note: >
  Internal ID is v2.3.3.1 but npm semver does not support 4-part versions.
  This feature ships as part of npm v2.3.4 alongside v2-3-4 P0 governance work.
chaos_estimate:
  current_score: 67.9
  current_level: unstable
  estimated_delta: +4
  projected_score: 71.9
  projected_level: unstable
---

# Intent: v2-3-3-1-human-gate

## Problem

When AI works inside an intent it encounters tasks that require a different
actor — human, another AI, or an external system. Currently the AI pauses and
asks in chat. This is:

- **Blocking**: AI stops and waits.
- **Unstructured**: the human has no context record, just a chat question.
- **Untraceable**: no way to tell if the task is pending, done, or skipped.

## Solution

Add **human-gate** to the intent workflow.

A human-gate is a typed, self-contained task record that the AI writes into the
intent's `gates.md` file when it encounters work that needs a different actor.
The AI then **continues** with all non-blocked work. The gate holds all context
needed for the actor to pick up the task cold — without reading the chat history
or asking the AI again.

## Core Principles

1. **AI never blocks on a gate.** Write and continue.
2. **Gates are tasks, not questions.** Structure, not prose.
3. **Self-contained.** Actor, action, why, inputs, expected output, blocking steps — everything in one record.
4. **Universal actor model.** Same structure for human / human-role / ai:<name> / external:<system>.
5. **Close condition.** Intent cannot be closed while any gate is `pending` — unless explicitly skipped with a reason.

## Design Decisions (locked)

| ID | Decision |
|---|---|
| D1 | Gates stored in `gates.md` inside the intent folder — not in `intent.md` frontmatter |
| D2 | Gate ID: `HG-NNN` (sequential per intent) |
| D3 | Format: Markdown blocks, `## HG-NNN · <status>` as section header |
| D4 | CLI surface: `kb gates list`, `kb gates done`, `kb gates skip` (code in v2.4.x) |
| D5 | `kb intent apply` blocks if any gate is `pending`; override via `--skip-gates` + reason |
| D6 | AI creates gates via `kb gates add` command or by directly appending to `gates.md` |

## Scope

**Docs / governance (this intent — v2.3.4 ship):**
- `kb-root/principles.md`: P20 human-gate rule
- `kb-root/process.md`: W9 human-gate workflow
- `template/12-ai-skills/agent-operating-manual.md`: Human-Gate Protocol section
- `knowledge-base/14-templates/gates.md.template`: canonical gate schema
- Update `template/.github/agents/kb.agent.template.md`: reference gate behavior

**CLI code (v2.4.x):**
- `src/lib/gates.js`: `appendGate()`, `listGates()`, `markGateDone()`, `markGateSkipped()`, `hasPendingGates()`
- `src/commands/gates.js`: `kb gates list | done | skip | add`
- Integration with `kb intent apply`: block on pending gates

## Acceptance Criteria

1. `gates.md` schema documented in `14-templates/` and `agent-operating-manual.md`.
2. AI behavioral rule in `agent-operating-manual.md`: never ask in chat for gateable tasks.
3. P20 in `principles.md` covers the rule for both KBRoot and KB Agent.
4. W9 in `process.md` gives the step-by-step workflow for creating, updating, and resolving gates.
5. CLI commands listed in agent-operating-manual.md as forward-declared (pending code).
6. `plan.md` in this intent has a clear phase split: P0 docs now / P1 CLI code in v2.4.x.
