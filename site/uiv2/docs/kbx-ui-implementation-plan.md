# KBX UI Implementation Plan

## Purpose

This file defines the default phased implementation order for rebuilding KBX UI in `site/uiv2`.

Use it when planning or executing actual build work.

## Planning Principles

- build in small vertical slices
- establish architecture by working software, not by broad scaffolding alone
- validate each slice before opening the next one
- preserve legacy capabilities only where they matter operationally

## Phase 1: App Foundation

Goal:

- create the `site/uiv2` application shell and provider stack

Scope:

- Vite app bootstrap
- React + TypeScript setup
- router root
- query client provider
- base layout shell
- design token baseline
- donor shell review from `shadcn-admin` for topbar, rail, spacing, and panel language

Exit criteria:

- app boots locally
- top navigation shell exists
- route placeholders exist for the canonical domains
- no page-level direct `fetch` is introduced
- any imported donor shell code is adapted to React Router and KBX navigation rules

## Phase 2: Shared Infrastructure

Goal:

- establish reusable foundations used by real domain slices

Scope:

- API client boundary
- Zod parsing layer
- query key strategy
- basic UI primitives
- route layout primitives
- extracted or adapted shell components from `shadcn-admin` only where they improve implementation speed without importing router architecture

Exit criteria:

- one shared API surface exists
- one shared status/feedback primitive exists
- route composition is stable enough for the first domain slice

## Phase 3: Intents Domain First Slice

Goal:

- ship the first production-quality vertical slice in the highest-value domain

Why first:

- the legacy shell's most operationally important workflow is intent visibility and mutation

Scope:

- intents list route
- intent detail route
- core detail summary
- mutation actions with explicit invalidation

Exit criteria:

- operator can navigate to a specific intent by route
- operator can inspect core intent information
- at least one mutation flow is implemented cleanly through the new boundary model

## Phase 4: Knowledge Base Domain

Goal:

- rebuild document browsing and reading as a proper domain workspace

Scope:

- document tree route model
- document reader
- metadata/context sidebar
- table of contents or equivalent navigation aid

Exit criteria:

- operator can open documents by route
- document content and supporting metadata render cleanly

## Phase 5: Rules And Search Domains

Goal:

- surface rules and cross-surface retrieval through dedicated pages

Scope:

- rules overview
- domain-specific rules view
- search query/results page

Exit criteria:

- rules no longer live as incidental content in unrelated pages
- search has a stable route and typed contract

## Phase 6: Home And System Consolidation

Goal:

- build the high-level operator cockpit after core domains are stable

Scope:

- workspace summary
- alerts/signals
- runtime/system status
- condensed cross-domain status cards

Exit criteria:

- home reflects real domain data rather than mock summary cards
- system page exposes runtime/diagnostic surfaces intentionally

## Phase 7: Graph Placeholder And Future Readiness

Goal:

- add graph presence without overbuilding graph architecture too early

Scope:

- placeholder graph route
- metrics or topology summary only if backed by real contract

Exit criteria:

- graph route exists without forcing premature Sigma.js or heavy graph state design

## Default Build Order

1. foundation shell
2. shared data/UI infrastructure
3. intents slice
4. knowledge base slice
5. rules + search
6. home + system
7. graph placeholder

## Slice Rule

For each slice:

1. define route model
2. define contract boundary
3. define adapter/view model
4. implement UI composition
5. validate the slice
6. update docs if the implementation changed architecture assumptions

## Deferred Work

Do not front-load these unless a concrete slice requires them:

- large graph explorer
- speculative plugin system
- broad theme engine
- cross-domain state framework beyond current need
- complex animation system