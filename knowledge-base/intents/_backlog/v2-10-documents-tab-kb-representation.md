---
slug: v2-10-documents-tab-kb-representation
title: "Documents tab as runtime representation of the KBAgent knowledge base"
description: "Refactor the localhost Documents tab so, in SVFactory mode, it becomes a truthful runtime view over the full KBAgent knowledge-base folder rather than a narrow issue/snapshot panel."
lifecycle: backlog
created_at: 2026-05-15T00:00:00.000Z
goal: "Make the Documents tab reflect the real structure, health, and document inventory of `knowledge-base/` for KBAgent while preserving the SVFactory self-host boundary."
focus:
  current: "Define what the Documents tab must represent when SVFactory is inspecting the downstream KBAgent knowledge-base as a living runtime surface rather than a static checklist."
  last_updated: 2026-05-15
  next_action: "Specify the canonical document inventory/query model, then map the Documents tab to folder-level truth, verification metadata, and navigation slices."
decision_summary: "The current Documents tab is too thin for the role it needs to play. It should represent the whole KBAgent knowledge-base folder as structured runtime truth, especially when SVFactory is auditing or steering downstream evolution."
architecture_position:
  wave: v2.10
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-10-documents-tab-kb-representation

## Summary

This intent upgrades the localhost Documents tab from a limited summary panel into a real operating view of the KBAgent knowledge base.

When the operator is SVFactory, the tab should expose the downstream KBAgent `knowledge-base/` as a structured document surface: folders, document roles, verification posture, change hotspots, and navigation anchors. It should not behave like a generic file browser, but it also should not hide most of the knowledge base behind a few synthetic counters.

## Problem

- The current Documents tab is useful for a small document-health snapshot, but it is not yet the runtime embodiment of the KBAgent knowledge base.
- There is no canonical query layer that summarizes the full `knowledge-base/` folder for UI consumption.
- The UI does not yet separate self-host SVFactory perspective from downstream KBAgent document representation clearly enough.
- Operators cannot scan the KB by tier, document class, verification state, or drift priority from one coherent surface.

## Desired outcome

The Documents tab should answer these runtime questions directly:

1. What exists in the KBAgent `knowledge-base/` right now?
2. Which folders and documents are most operationally important?
3. Which docs are verified, stale, provisional, or structurally missing?
4. How should SVFactory navigate this KB when auditing downstream quality?
5. Which slices belong to KB runtime truth versus maintainer-only SVFactory context?

## Task Plan

- [ ] Define the document query model for the UI: folder groups, document nodes, verification/time-state fields, counts, and navigation links.
- [ ] Inventory what the bridge can already derive from `knowledge-base/` and what must be added as explicit query logic.
- [ ] Separate KBAgent document representation from SVFactory-only maintainer context so the tab does not blur those boundaries.
- [ ] Design the Documents tab layout around KB tiers/folders instead of only issue counts.
- [ ] Add runtime-backed sections for folder inventory, verification posture, priority drift, and key source-of-truth documents.
- [ ] Define the minimum metadata contract each rendered document card/row should expose.
- [ ] Ensure empty or partial folders still render gracefully without pretending completeness.
- [ ] Identify follow-up hooks for future rule-module, goal/milestone, and version-module surfaces without coupling the tab to ontology or graphdb.

## Constraints

- Use the existing `knowledge-base/` folder as the source of truth.
- Do not turn the Documents tab into a raw file explorer.
- Preserve the self-host boundary: SVFactory may inspect downstream KBAgent knowledge, but maintainer-only content must stay distinguishable.
- Avoid premature graph or database dependence; this tab should work from file-backed runtime queries first.

## Activation trigger

- Activate after the current active anchor is narrowed enough that UI/document-surface work can proceed without splitting attention again.
- Prefer activation alongside or immediately after moduleization/query-layer groundwork so the tab can be backed by explicit document queries instead of one-off UI logic.