# UIV2 Architecture

## Status

This file is the local architecture source of truth for the `site/uiv2` rebuild.

## Product Shape

Build UIV2 as a **custom domain-first operator control plane**.

Do not build it as a generic CRUD admin application.

## Locked Stack

- React + TypeScript + Vite
- React Router
- TanStack Query
- Zod
- React Hook Form
- TanStack Table
- Tailwind CSS
- shadcn/ui + Radix primitives
- Apache ECharts
- React Flow

`Sigma.js` is deferred until there is a real need for a graph explorer beyond placeholder views.

## UI Donor Policy

The approved donor UI reference for `site/uiv2` is `satnaing/shadcn-admin`.

Adopt from it selectively:

- app shell composition
- topbar styling and spacing language
- sidebar and rail primitives when adapted to KBX navigation rules
- command menu patterns
- card, panel, and table polish

Do not import from it blindly:

- it uses TanStack Router while `site/uiv2` is locked to React Router
- it assumes a built-in sidebar-first dashboard shell, while KBX keeps top navigation as the primary global navigation
- some `shadcn/ui` components are customized in that repo, so updates are not always drop-in safe

## Primary Personas

Primary persona: KB operator.

This user needs:

- clear status
- safe actions
- strong evidence before mutation
- predictable navigation

Secondary persona: maintainer / architect.

This user needs:

- rule visibility
- system visibility
- graph and maturity context
- trustworthy architecture boundaries

## Top-Level Domains

- `Home`
- `Intents`
- `Knowledge Base`
- `Rules`
- `Graph`
- `Search`
- `System`

## Navigation Model

- primary navigation = top navigation
- local navigation = inside domain pages only where needed

Do not make a global left sidebar the main navigation model.

If a sidebar or rail is adopted from `shadcn-admin`, use it as a secondary workspace surface, not as the primary global navigation contract.

## State Ownership

### Route state

Owner: React Router URL state.

Examples:

- selected intent identity
- selected document path
- selected rule domain

### Server state

Owner: TanStack Query.

Examples:

- intents data
- documents data
- rules data
- search results
- system/runtime data

### UI state

Owner: local component state or Zustand only when the state is purely presentational or interaction-local.

Examples:

- panel collapse
- table presentation controls
- temporary dialog visibility

## Data Contract Rule

- no page component may call `fetch` directly
- use typed API modules and Zod parsing at the boundary
- normalize legacy bridge responses in adapters rather than in page components

## Domain Boundary Rule

- shared UI primitives may be reused across domains
- shared API and model utilities may be reused across domains
- a domain page layer must not depend on another domain's page layer

## Rebuild Rule

Preserve operator-critical capabilities from the legacy shell.

Do not preserve the old layout just for parity.

## MVP Interpretation

The first milestone should establish:

- shell + providers
- top navigation
- route model
- one production-quality domain slice
- contract boundary and invalidation discipline

The `Graph` domain may remain placeholder-first in MVP.

## Anti-Patterns

Do not introduce:

- a new monolithic `App.tsx` that owns everything
- page-local ad hoc fetch calls
- duplicated route identity in a global store
- generic admin abstractions as the app foundation
- broad speculative folders without a concrete slice using them