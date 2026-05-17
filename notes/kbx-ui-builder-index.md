# KBX UI Builder Index

## Purpose

This file is the primary documentation index for `KBX UI Builder`.

Use it as the stable read-order contract before planning, building, or reviewing the KBX UI rebuild.

## Current Build State

- `site/uiv2` has been recreated with an early shell and first `Intents` list slice
- the current shell must be corrected toward a compact IDE-like operator frame
- active design work lives in `notes/`
- implementation must follow these notes even when an earlier shell slice already exists

## Mandatory Read Order

1. `notes/kbx-ui-builder-index.md`
2. `notes/kbx-ui-redesign-strategy.md`
3. `notes/kbx-ui-module-architecture-map.md`
4. `notes/kbx-ui-localhost-summary.md`
5. `notes/kbx-ui-shadcn-admin-adoption.md`

## Role Of Each Document

- `kbx-ui-builder-index.md` = read-order and execution contract for the agent
- `kbx-ui-redesign-strategy.md` = final architecture and build strategy
- `kbx-ui-module-architecture-map.md` = core module model, feature map, and dependency graph
- `kbx-ui-localhost-summary.md` = legacy runtime capability inventory and parity baseline
- `kbx-ui-shadcn-admin-adoption.md` = donor UI adoption boundary for shell and visual primitives
- `kbx-ui-footer-runtime-contract.md` = footer runtime contract boundary and SVFactory handoff trigger for backend normalization
- `kbx-ui-kb-page-runtime-contract.md` = Knowledge Base page (three-pane reader) runtime contract: `/api/kb/tree`, `/api/kb/doc`, `/api/kb/impact`, `/api/kb/roots` and snapshot `kb` block
- `kbx-ui-kb-page-svfactory-handoff.md` = explicit SVFactory handoff that implements the KB page contract in two slices (read endpoints + collector, then mutation + L5 active-roots persistence)

## Build Rules Summary

- build shell first
- finish the shell as a compact IDE-like operator frame before deeper domain expansion
- build `Intents` first as the first real domain
- build `Task` inside `Intent` before treating task as a broader surface
- build each module in this order: list, detail, actions, summary, aggregation
- scan the current source/runtime for a module before building that module
- if the backend/runtime still mixes modules together, record that as a refactor requirement instead of hiding it in frontend design
- do not let shell work drift into a wide dashboard or website layout

## Prompt Surface

- `@KBX UI Builder`
- `/uiv2-plan`
- `/uiv2-build`
- `/uiv2-review`
- `/svfactory-runtime-contract` when frontend signal wiring is blocked by backend contract ambiguity

## Legacy Source Inputs

Use these only when the notes are insufficient:

- `site/kbx-ui/src/App.tsx`
- `site/kbx-ui/src/styles.css`
- `site/kbx-ui/server.mjs`

## Footer Runtime Rule

- KBX UI Builder may keep wiring footer signals against existing runtime endpoints.
- If footer data needs backend normalization, DTO cleanup, or architectural refactor, stop expanding UI heuristics and hand off with `notes/kbx-ui-footer-runtime-contract.md` plus `/svfactory-runtime-contract`.

## Working Output Expectation

When implementation resumes, `site/uiv2` should be recreated from scratch using these notes as the source of truth.

Current shell correction target:

- full-height application frame
- compact top command/header bar
- top tab strip as primary navigation
- dense local rail and optional inspector surfaces
- persistent status bar
- no marketing-style footer or centered website container rhythm