---
slug: v2-10-kbx-ui-draft-to-backlog-and-runtime-task-contract
title: "Draft-first intent flow + KBX UI runtime task contract"
description: "Close the gap between draft/backlog/active lifecycle expectations and current implementation, while finishing the intent UI shell with a canonical task contract across CLI, bridge, and frontend."
lifecycle: backlog
created_at: 2026-05-14T07:40:07.103Z
goal: "Establish a canonical draft -> backlog -> active progression and a task-state contract that the CLI, bridge, and UI all share."
focus:
  current: "Define the real lifecycle boundary for draft, backlog, and active; stop the UI from inventing task semantics that the CLI does not own yet."
  last_updated: 2026-05-14
  next_action: "Specify overview fields required for draft promotion, then define task runtime/evidence vocabulary before extending the UI any further."
decision_summary: "Current UI create flow jumped directly into active intent workspaces and current task labels are UI heuristics rather than canonical KBX task states. This intent exists to make the lifecycle and task contract explicit before more product surface is added."
architecture_position:
  wave: v2.10
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-10-kbx-ui-draft-to-backlog-and-runtime-task-contract

## Summary

This intent covers the end-to-end completion path for the KBX intent control plane so the product story matches the actual platform contract, not just a UI prototype.

## Problem

- Current `Create intent` behavior in the localhost UI did not respect a draft-first flow and could jump directly into an active intent workspace.
- Task labels such as `running`, `partial`, `reviewed`, and `major-gap` are currently mixed from markdown evidence and UI heuristics rather than coming from a canonical CLI/runtime task contract.
- The current layout shell is useful for inspection, but the transition rules between draft, backlog, active, approval, apply, and task progression are not yet formally aligned across CLI, bridge, and frontend.

## Scope

### 1. Draft-first lifecycle contract

- Define whether `draft` is a dedicated pre-backlog lane or whether the current `intent draft` command is the canonical draft artifact.
- Define the minimum overview fields required before promotion from draft to backlog.
- Define the conditions required before activation from backlog to active.

### 2. Runtime task contract

- Define task source-of-truth shape for CLI, bridge, and UI.
- Separate task `runtime_state` from task `evidence_tags` so labels like `partial` and `major-gap` are no longer treated as the same type of state as `running` or `blocked`.
- Define how default user-created tasks are seeded and how they begin in `draft` state.

### 3. Localhost UI completion

- Complete the intent layout shell with compact tasks, section grouping, session-first detail view, and action placement that reflects real lifecycle semantics.
- Replace heuristic-only wording where it can be confused with CLI-native behavior.

### 4. Backend and bridge alignment

- Ensure bridge mutation endpoints proxy only real CLI commands.
- Add or revise backend surfaces only after the lifecycle and task contract are explicit.
- Validate pipeline behavior for task/source registration so future automation does not depend on UI-only labels.

## Activation trigger

- Activate this intent only after the draft/backlog progression rule is agreed and the canonical overview fields for promotion are explicit.
- Activation requires goal alignment plus a concrete plan for CLI, bridge, and UI changes in one slice.

