# UIV2 Task Playbook

## Purpose

This playbook tells the UI-focused agent how to execute different kinds of frontend work for `site/uiv2`.

## Universal Rules

- implement in `site/uiv2` unless the task explicitly targets legacy UI
- prefer small vertical slices
- validate the touched slice immediately after the first substantive edit
- update `site/uiv2/docs/` when the task changes architecture or build direction
- preserve capabilities, not legacy layout

## Task Type: Foundation

Use for:

- Vite app setup
- provider stack
- router root
- query client
- design token baseline

Execution pattern:

1. establish the smallest app shell that supports the next real slice
2. keep providers explicit and close to the app root
3. avoid placeholder abstractions without a consumer

## Task Type: Layout And Navigation

Use for:

- app shell
- top navigation
- page frames
- responsive layout
- local sidebars inside domains

Execution pattern:

1. define route ownership first
2. map global navigation to the top shell
3. add local sidebars only when a domain needs secondary navigation

## Task Type: Domain Slice

Use for:

- `Home`
- `Intents`
- `Knowledge Base`
- `Rules`
- `Graph`
- `Search`
- `System`

Execution pattern:

1. define the route shape
2. define the data/query boundary
3. define adapters and view model shape
4. build page composition
5. run the narrowest validation available

## Task Type: Data Contract

Use for:

- client API modules
- Zod schemas
- contract adapters
- mutation invalidation rules

Execution pattern:

1. identify the real bridge/runtime contract
2. define parse and normalize logic in one place
3. expose typed results to pages and components
4. keep invalidation explicit after mutations

## Task Type: Shared UI System

Use for:

- buttons
- cards
- status badges
- tables
- form fields
- panels

Execution pattern:

1. keep shared components presentation-oriented
2. keep business rules in domain hooks or domain modules
3. compose from Tailwind + shadcn/ui + Radix rather than inventing a second design system

## Task Type: Parity / Migration

Use for:

- checking whether UIV2 still supports an old flow
- mapping legacy tab behavior into new domains
- validating mutation coverage

Execution pattern:

1. read `legacy-runtime-summary.md`
2. inspect legacy code only for unresolved behavior
3. port the capability into the new domain model without copying the old layout

## Task Type: Hardening

Use for:

- type errors
- broken routing
- stale query invalidation
- incorrect state ownership
- visual regressions in touched slices

Execution pattern:

1. identify the narrowest failing surface
2. fix the ownership or contract issue first
3. rerun the same focused validation before expanding scope

## Task Type: Review

Use for:

- architecture drift checks
- donor adoption review
- route/state ownership review
- post-slice review before expanding scope
- regression-oriented code review

Execution pattern:

1. read the architecture and donor policy before judging code shape
2. list findings first, not summaries
3. prioritize route ownership, direct fetch usage, monolithic composition, and invalid donor imports
4. call out missing validation or testing gaps separately from confirmed defects

Use `/uiv2-review` when the user explicitly wants a review pass rather than immediate implementation.

## Default Validation Order

1. the narrowest slice-specific behavior check
2. a focused test for the touched module when available
3. a narrow typecheck or build check for `site/uiv2`
4. full-app build only when narrower checks do not exist

## Done Criteria

A UIV2 task is done when:

- the slice works in the intended route/domain boundary
- direct page-level `fetch` calls were not introduced
- state ownership remains clean
- docs were updated if architecture changed
- at least one focused validation step was completed when available