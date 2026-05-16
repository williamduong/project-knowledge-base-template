# KBX UI Localhost Runtime Summary

## Purpose

This document summarizes the current localhost UI runtime at `http://localhost:4173/`.

It is a **runtime snapshot of the legacy UI shell**, not the target architecture for the rebuild.

Use this file for:

- understanding what the current UI already exposes
- preserving operator-critical capabilities during the rebuild
- checking legacy feature parity only where it still matters operationally

Use `notes/kbx-ui-redesign-strategy.md` as the source of truth for the new architecture, stack, and implementation rules.

## Scope Baseline

This runtime summary is derived from the current implementation in:

- `site/kbx-ui/src/App.tsx`
- `site/kbx-ui/src/styles.css`

## Current Product Role

The current localhost UI acts as:

- an observability surface for the workspace
- an operator console for intent-related actions
- a reader for KB documents and metadata
- a lightweight runtime search surface

Its core operating contract is:

- chat proposes actions
- web exposes state and guided controls
- CLI remains the deterministic write path

## Current Top-Level Structure

The current shell exposes four main tabs:

- `Overview`
- `Workspace`
- `Documents`
- `Search KB`

The header also includes:

- workspace identity / project title
- chaos score and level
- refresh button for runtime-backed data

## Operator-Critical Capabilities To Preserve

The rebuild does **not** need to preserve the current layout or exact panel structure.

It **must** preserve these capabilities:

- workspace status visibility
- current focus and checkpoint visibility
- intents list and intent detail visibility
- critical intent mutations: create, update, approve, preview, apply
- document tree browsing and document reading
- rule and runtime diagnostics visibility
- cross-surface search
- clear refresh/invalidation after mutations

## Current Tab Summary

### Overview

Current role:

- executive cockpit for workspace health, focus, rules, chaos, and runtime surfaces

Current notable sections:

- checkpoint / focus
- milestones
- goals and criteria
- intent overview
- git repositories
- rule landscape
- signals and alerts
- chaos score
- knowledge graph overview
- pipeline principles
- infrastructure / runtime surfaces

### Workspace

Current role:

- main intent operations workspace

Current notable capabilities:

- intents list
- create draft intent
- selected intent detail
- lifecycle lane
- action grid for mutations and lifecycle movement
- task board
- edit metadata view

### Documents

Current role:

- KB browsing and reading workspace

Current notable capabilities:

- tree navigator
- document reader
- metadata sidebar
- table of contents
- hot folders
- document issues
- rules summary

### Search KB

Current role:

- lightweight search across runtime-backed surfaces

Current notable capabilities:

- text search input
- grouped search results
- result cards with type/subtitle information

## Current Runtime Characteristics

The current shell is functionally useful but structurally costly.

Current weaknesses:

- one large orchestration file controls too much behavior
- visual hierarchy is weak
- page concerns are mixed together
- action and evidence surfaces are not separated cleanly
- customization is difficult because the UI does not expose a stable internal framework

## Canonical Rebuild Interpretation

The current localhost UI should be treated as:

- a legacy runtime shell to learn from
- a capability inventory
- a migration source

It should **not** be treated as:

- the final information architecture
- the final visual system
- the final component boundary model
- the final route/navigation model

## What The Rebuild Should Keep Vs Replace

Keep:

- operator-critical capabilities
- runtime-backed observability
- deterministic write-path contract
- intent workflow importance
- document workspace importance

Replace:

- monolithic page orchestration
- current tab naming and information mixing where needed
- uneven panel weighting
- ad hoc layout logic
- weak extension/customization seams

## Current Runtime To Future Domain Mapping

Current shell area to future target domain:

- `Overview` -> `Home`, `Rules`, `Graph`, `System`
- `Workspace` -> `Intents`
- `Documents` -> `Knowledge Base`
- `Search KB` -> `Search`

## Final Note

This file exists to preserve runtime understanding during the rebuild.

It is intentionally descriptive, not normative.

For final decisions, implementation rules, stack choices, layout strategy, state ownership, and guardrails, use `notes/kbx-ui-redesign-strategy.md`.