# KBX UI Redesign Strategy

## Status

This is the **final architecture and technical direction** for the KBX UI rebuild.

It replaces earlier exploratory notes as the primary decision document for the new UI.

## Final Decision

Build `kbx-ui` as a **custom domain-first operator control plane**, not as a CRUD admin app and not on top of React-admin or Refine.

The chosen approach is:

```txt
React + TypeScript + Vite
React Router
TanStack Query
Zod
React Hook Form
TanStack Table
Tailwind CSS
shadcn/ui + Radix primitives
Apache ECharts
React Flow
Sigma.js later, only if a true graph explorer is needed
```

## Product Positioning

KBX UI is:

- an internal localhost tool
- an operational control plane for KB workspaces
- a domain-specific operator console

It is **not**:

- a generic CRUD admin panel
- a marketing site
- a documentation site with a few actions bolted on

## Primary User

Primary persona: `KB Operator`

This user needs:

- clarity
- traceability
- fast diagnosis
- safe actions
- predictable workflows

This user values:

- strong status signals
- clear next action
- clean information grouping
- confidence before mutation

Secondary persona: `Maintainer / Architect`

This user needs:

- rule and contract visibility
- graph and system visibility
- roadmap / maturity context
- architecture truth rather than UI theater

Tertiary persona: `AI-Assisted Editor`

This is an authoring constraint.

The codebase must remain understandable to AI and humans without requiring whole-app rereads.

## Why Not React-admin Or Refine

Do not use `React-admin` as the foundation.

Reason:

- it optimizes for resource CRUD abstractions
- KBX UI is not primarily a resource CRUD product
- the app would become an unstable hybrid of admin conventions and custom operator logic

Do not use `Refine` as the foundation.

Reason:

- it fits internal tools better than React-admin, but still pulls the app toward a resource-first mental model
- most of the important KBX screens are domain-specific workspaces, not generic resources
- using it shallowly adds abstraction without enough return

## Locked Technology Decisions

### Framework

- `React + TypeScript + Vite`

Reason:

- current repo direction already fits this stack
- the app is internal and localhost-first
- no SSR/SEO requirement justifies Next.js complexity
- keeps frontend/backend boundaries explicit around the Express bridge

### Routing

- `React Router`

Reason:

- mature nested routing
- clear domain page boundaries
- supports deep-linking for operators

### Server State

- `TanStack Query`

Reason:

- correct fit for runtime-backed surfaces
- supports caching, invalidation, mutation lifecycle, and refetch after operator actions

### Runtime Contracts

- `Zod`

Reason:

- runtime validation at the frontend boundary
- protects against drift between bridge responses and UI code

### Forms

- `React Hook Form`
- `Zod resolver`

### Tables

- `TanStack Table`

### UI Layer

- `Tailwind CSS`
- `shadcn/ui` as source-owned component layer
- `Radix` as low-level primitive layer when needed

Decision note:

- do not treat `shadcn/ui` as a framework
- treat it as a repo-owned component source baseline built on top of Radix + Tailwind
- the KBX design system still belongs to the repo, not to shadcn itself

### Visualization

- `Apache ECharts` for charts and analytical views
- `React Flow` for process/workflow/lifecycle diagrams
- `Sigma.js` later only when a large graph explorer is truly needed

## Information Architecture

Primary global navigation is **top navigation**.

Secondary navigation appears only inside pages that need it.

## Shell Mode

The rebuilt shell must feel like a **compact IDE-like operator tool**, not a broad website or airy dashboard.

Required shell characteristics:

- full-height application frame
- dense working layout
- compact header / command bar
- top tab strip as global navigation
- local rail only as secondary workspace navigation
- optional right-side context or inspector panel
- bottom status bar for runtime and workspace signals

Avoid these shell traits:

- centered marketing-style page containers
- oversized hero-style header treatment
- large decorative footer
- oversized card rhythm that makes the app feel like a website first and a tool second
- wide-open spacing that reduces information density

Visual language rule:

- hierarchy should come primarily from structure, separators, contrast, and state signals
- not from oversized rounded cards and presentation-style whitespace
- prefer lower border radius and tighter spacing so the shell reads as a tool, not a glossy dashboard

Frontend complexity rule:

- keep `App.tsx` thin from the start
- split shell frame, route surfaces, and domain slices into focused modules early
- do not recreate the legacy problem of one orchestration file owning the whole UI

### Final Top-Level Domains

- `Home`
- `Intents`
- `Knowledge Base`
- `Rules`
- `Graph`
- `Search`
- `System`

### Navigation Rule

- global navigation = top nav
- local workspace navigation = page-level sidebars only where needed

Do not use a left sidebar as the global primary navigation model.

## Domain Model

### Home

Purpose:

- executive cockpit
- focus, chaos, alerts, workspace summary, graph health snapshot

### Intents

Purpose:

- intent lifecycle operations
- tasks, workflow, evidence, mutations, operator action surface

### Knowledge Base

Purpose:

- tree navigator
- reader for markdown / HTML KB content
- metadata, issues, supporting context

### Rules

Purpose:

- rule domains, severity, enforcement, and runtime interpretation

### Graph

Purpose:

- graph metrics placeholder in MVP
- first-class graph domain later when backend graph APIs mature

### Search

Purpose:

- cross-surface lookup

### System

Purpose:

- workspace runtime, git, infrastructure, and pipeline diagnostics

## Core Modules Vs Frontend Features

The UI domain pages are **not** the same thing as the core logic modules.

This distinction is mandatory.

Correct rule:

- backend/runtime logic should be split into core modules
- frontend should compose those modules into operator-facing feature workspaces

Examples:

- `Home` is a frontend aggregation surface, not a core module
- `Intents` depends on `Intent`, `Task`, `Pipeline`, and `Rule`
- `Knowledge Base` depends on `Document`, `Search`, `Rule`, and partly `Graph`
- `System` is an operator surface over runtime, repo, workspace context, and alerts

Use `notes/kbx-ui-module-architecture-map.md` as the detailed module-to-feature map and dependency reference.

## Incremental Build Strategy

The rebuild should proceed in **small, source-aligned increments**.

Do not attempt to build all modules at once.

### Step 1: Build The Shell First

Build the reusable application frame before domain work:

- master layout
- compact command/header bar
- top-level tabs / top navigation
- local sidebars / rails where the shell needs them
- right-side inspector/context surface if the shell needs it
- bottom status bar
- shared container, panel, and page spacing primitives

This shell must remain neutral enough to host all later modules.

It must also be completed as a compact operator frame before deeper domain slices continue.

### Step 2: Build Intents First

The first real domain must be `Intents`.

Reason:

- it is the most operationally important surface
- it exercises route identity, mutation flows, task relationships, and rule/pipeline context early

Important constraint:

- `Intent` must first be implemented to match what the current source/runtime already supports
- only after parity is correct should new capability be added
- when new capability is added, frontend and backend must evolve together rather than drift apart

### Step 3: Build Tasks Inside Intent, Not As A Separate First-Class Frontend Entry Point

`Task` should initially be implemented inside the `Intent` workspace.

Order:

1. intent list
2. intent detail
3. task list within intent
4. task detail / expansion within intent
5. task-derived summary blocks only after task flows are stable

### Step 4: Build Small Summary Blocks After The Underlying Detail Exists

Do not start from dashboard summaries.

Correct order:

1. list / inventory view
2. detail view
3. action / mutation flow
4. summary or aggregation block

This rule applies across modules.

### Step 5: Move To Documents In The Same Pattern

For `Knowledge Base / Documents`, build in this order:

1. document list / tree
2. document detail / reader
3. metadata and supporting side panels
4. issues / hot-folder support blocks
5. higher-level summaries only after detail surfaces are trustworthy

### Step 6: Repeat Per Module

Each module should follow the same progression:

1. list or entry surface
2. detail surface
3. actions and state transitions
4. summary or overview surfaces
5. aggregation into `Home` only after module contracts are stable

This means `Home` should be built later as a composition layer over already-proven modules, not as the first implementation target.

## Scan-Before-Build Rule

Before building any module, the agent must scan the current system for that module first.

That scan should identify:

- current source-backed behaviors
- current API or bridge endpoints
- current runtime limitations
- whether the module is cleanly separated or still mixed with others
- what parity must be preserved before extension work starts

If a module is still mixed together in backend/runtime code, that is a refactor signal.

Frontend design must not hide backend module confusion.

## State Ownership Rules

These rules are strict.

### Route State

Owner:

- URL / React Router

Examples:

- `intentId` from `/intents/:id`
- `docPath` from `/kb/*`
- `ruleDomain` from `/rules/:domain`

### Server State

Owner:

- TanStack Query

Examples:

- intents
- rules
- documents
- status
- system
- workspace
- session context

### UI State

Owner:

- Zustand

Examples:

- panel collapsed state
- filter state
- view mode
- inspector open state
- reader mode
- nav collapsed state

### Derived Views

Owner:

- hooks / view-models

Examples:

- filtered lists
- dashboard metrics
- grouped rule summaries
- graph placeholder metrics

### Hard Rule

Never duplicate entity identity across:

- route params
- query cache
- Zustand

Examples:

- if URL owns `intentId`, do not store `selectedIntentId` in Zustand
- if URL owns `docPath`, do not store `selectedPath` in Zustand

## Route Strategy

### Intents

Use a split-view route model:

- `/intents`
- `/intents/:id`

Both routes render the same `IntentsPage`.

Rules:

- left = intent list / filters / create action
- right = selected intent detail
- URL param is the source of truth for selection

### Knowledge Base

Use a path-based route model:

- `/kb`
- `/kb/*`

Rules:

- URL splat captures document path
- document tree selection follows the URL
- page-level UI store only keeps presentation state, never document identity

### Rules

Use a domain filter route model:

- `/rules`
- `/rules/:domain`

Rules:

- route param drives current domain focus
- rules page may still show all domains when no param exists

## Canonical App Structure

```txt
src/
  app/
    App.tsx
    providers.tsx
    routes.tsx
    layout/
      AppShell.tsx
      TopNav.tsx
      PageLayout.tsx

  domains/
    home/
      HomePage.tsx
      components/
      api/
      hooks/
        useHomeViewModel.ts
    intents/
      IntentsPage.tsx
      components/
      api/
      hooks/
      store.ts
    knowledge-base/
      KBPage.tsx
      components/
      api/
      hooks/
      store.ts
    rules/
      RulesPage.tsx
      components/
      api/
      hooks/
      store.ts
    graph/
      GraphPage.tsx
      api/
      hooks/
    search/
      SearchPage.tsx
      api/
      hooks/
    system/
      SystemPage.tsx
      components/
      api/
      hooks/

  shared/
    api/
      client.ts
      endpoints.ts
      query-keys.ts
    ui/
      StatusBadge.tsx
      StatCard.tsx
      Panel.tsx
      DataTable.tsx
      EmptyState.tsx
      LoadingState.tsx
      ErrorState.tsx
    hooks/
      useRefreshAll.ts
    lib/
      utils.ts
      cn.ts

  styles/
    globals.css
    tokens.css

  types/
    api.ts
    status.ts
```

Naming rule:

- use `knowledge-base` consistently as the domain folder name
- route path may still be `/kb`

## Backend Contract Approach

Source of truth:

- the current Express bridge runtime

Frontend rule:

- no page component may call `fetch` directly
- only shared API client and domain API modules may talk to endpoints

### Current Canonical Endpoint Direction

```txt
GET    /api/version
GET    /api/status
GET    /api/rules
GET    /api/intents
GET    /api/intents/:id/detail
GET    /api/workspace
GET    /api/system
GET    /api/documents
GET    /api/documents?path=...
GET    /api/session-context
GET    /api/search?q=...

POST   /api/intents/create
PATCH  /api/intents/:id
POST   /api/intents/:id/approve
GET    /api/intents/:id/apply-preview
POST   /api/intents/:id/apply
```

If runtime response shapes drift from desired UI view-models:

- adapt in domain mappers
- do not spread bridge shape assumptions into page components
- prefer reusing the current bridge contract over changing backend behavior from KBX UI slices
- if a UI need cannot be satisfied cleanly from the existing bridge, record a backend refactor requirement for SVFactory rather than hiding it inside frontend logic

## UI System Decision

### Visual Direction

- dark operator console
- structured analytical density
- strong semantic status language
- visible distinction between context, action, and evidence

### Design Tokens

Keep tokens in CSS variables.

Minimum token groups:

- background
- border
- text
- semantic status
- spacing
- radius
- typography
- chart palette later

Typography baseline:

- `IBM Plex Sans`
- `JetBrains Mono`

### Shared Primitives

The rebuild must establish shared primitives early:

- `StatusBadge`
- `StatCard`
- `Panel`
- `DataTable`
- `LoadingState`
- `EmptyState`
- `ErrorState`
- `Button`
- `ProgressBar`

## View-Model Policy

Derived or aggregated data must be isolated in hooks.

Examples:

- `useHomeViewModel`
- `useRulesViewModel`
- `useGraphDerivedData`

Pages should stay orchestration-focused.

Do not put heavy aggregation logic directly inside page components.

## Extension Strategy

Full widget registry and manifest-driven composition are **future phases**, not MVP foundation.

However, the rebuild must leave explicit seams from day one.

### Required Extension Seams

- page slots
- composable panels
- domain-owned configs
- shared primitives with variants and semantic status
- view-model hooks for derived surfaces

### Page Slot Model

Each page layout should expose stable regions such as:

- `page.header`
- `page.summary`
- `page.primary`
- `page.sidebar`
- `page.supporting`

Do not hardwire every page into a one-off layout.

## Implementation Guardrails

These rules are mandatory for the rebuild.

### Architecture Guardrails

1. Do not use React-admin as a foundation.
2. Do not use Refine as a foundation.
3. Do not use Next.js as the default rebuild path.
4. Do not treat `shadcn/ui` as the architecture.
5. Do not recreate a monolithic `App.tsx` orchestration blob.

### Code Boundary Guardrails

1. No page component may call `fetch` directly.
2. No domain may depend on another domain's page/component layer.
3. Cross-domain reuse must go through shared hooks, shared API modules, shared UI primitives, or typed adapters.
4. Entity selection must come from route params where route identity exists.
5. Zustand must hold ephemeral UI state only.
6. Mutation invalidation must live in domain mutation hooks, not in page components.

### Layout Guardrails

1. Global navigation is top-level only.
2. Sidebars are page-level only.
3. Do not mix action-heavy blocks with evidence-heavy blocks in one panel.
4. Do not give every panel equal visual weight.
5. Keep a clear order of `context -> action -> evidence`.

### AI / Maintainability Guardrails

1. Keep domain boundaries explicit.
2. Use stable naming conventions.
3. Keep source-owned components in the repo.
4. Prefer extraction over giant page files.
5. If a behavior is domain-specific, keep it in the domain, not in `shared/`.
6. If a domain needs custom composition, use slots and panels rather than one-off page hacks.

### V0 / Codegen Guardrails

1. Do not use V0 to define app architecture.
2. Use V0 only to compose content inside fixed shell/layout boundaries.
3. Lock the app shell, routing model, and shared primitives first.
4. Treat V0 output as draft implementation, never as source of truth.
5. Review any generated code for boundary violations before merging.

## MVP Scope

The MVP rebuild must replace the current UI for core operator use.

Required MVP capabilities:

- workspace status visibility
- current focus visibility
- intents list and detail
- create / update / approve / preview / apply intent mutations
- document browsing and reading
- rules/runtime diagnostics
- search
- refresh / invalidation after mutation

### MVP Domain Priority

Priority order:

1. foundation
2. shared platform
3. data contract validation
4. home + system
5. intents
6. knowledge base
7. rules + search
8. graph placeholder

## Deferred Decisions

These are deferred, not rejected:

- chart-heavy analytical expansion
- graph canvas explorer
- widget registry
- manifest-driven customization
- realtime updates
- command palette

## Final Principle

KBX UI must be built as a:

`domain-first operator control plane with source-owned UI components, typed runtime adapters, explicit route/state ownership, and stable layout seams.`

It must **not** be modeled as a generic CRUD admin framework.

## Usage Of This Document

Use this document when:

- making architecture decisions
- reviewing V0 / AI-generated code
- deciding whether a new abstraction belongs in the codebase
- checking if a proposed feature fits the chosen rebuild model

Do not use the legacy localhost summary as the architecture source of truth.

- grouping
- alignment
- repeated layout patterns
- shared tokens

Not from stacking too many unrelated cards.

## Recommended Component Architecture

The frontend should be reorganized around domain features, not around one large app shell.

### Recommended Folder Structure

```text
site/kbx-ui/src/
  app/
    AppShell.tsx
    routes.tsx
    providers/
    layout/
  domains/
    home/
      components/
      pages/
      hooks/
      api/
      models/
    intents/
      components/
      pages/
      hooks/
      api/
      models/
      schema/
    knowledge-base/
      components/
      pages/
      hooks/
      api/
      models/
    graph/
      components/
      pages/
      hooks/
      api/
      models/
    rules/
      components/
      pages/
      hooks/
      api/
      models/
    search/
      components/
      pages/
      hooks/
      api/
      models/
    system/
      components/
      pages/
      hooks/
      api/
      models/
  ui/
    primitives/
    composites/
    charts/
    data-grid/
  platform/
    http/
    query/
    config/
    feature-flags/
  custom/
    manifests/
    widgets/
    themes/
```

### Why This Matters

This structure gives:

- clean domain boundaries
- easier code search for AI
- easier onboarding for humans
- clearer ownership per feature
- better compatibility with future plugin/customization work

## Recommended State And Data Model Strategy

Current problem:

- page loads are gathered centrally in one component
- runtime state and mutation state are too tightly coupled to view rendering

Recommended direction:

- use domain query hooks
- use typed API clients per domain
- use normalized view-model mappers
- keep mutation state close to the feature that owns it

### Recommended Data Flow

```text
backend endpoint
-> domain api client
-> zod schema parse
-> domain model mapper
-> feature hook
-> page/container
-> presentational component
```

This is important for SVFactory and KBX because backend contracts will continue evolving.

If mapping is centralized through domain adapters, frontend refactors stay cheaper.

## Recommended Tech Stack

The current stack is already close to a good base.

Do not replace everything.

Use a structured upgrade path.

### Recommended Frontend Core

- `React`
- `TypeScript`
- `Vite`

Keep these.

They are already aligned with fast iteration and local operator tooling.

### Recommended Additions

#### Routing

- `React Router`

Why:

- enables clear page boundaries
- supports deep-linkable views for intents, docs, graph nodes, and rule domains
- helps AI reason about entrypoints

#### Data Fetching

- `@tanstack/react-query`

Why:

- separates server state from view state
- improves refresh behavior
- enables cache invalidation after mutations
- maps well to backend domain endpoints

#### Runtime Validation

- `zod`

Why:

- gives explicit frontend contracts
- protects against drift while backend grows
- lets AI see schema boundaries clearly

#### Tables And Heavy Data Views

- `TanStack Table`

Why:

- fits rules, issues, graph lists, documents, and intent registries
- composable and not too opinionated

#### Forms

- `react-hook-form`
- `zod` resolver

Why:

- cleaner mutation forms
- field-level structure and validation
- easier maintainability than ad hoc local state for every form

#### Charts

- `Apache ECharts`

Why:

- strong support for analytical dashboards
- flexible enough for line, bar, scatter, sankey, force graph, radar, heatmap
- good fit for graphDB and observability surfaces

This is the best general dashboard candidate here.

#### Graph Visualization

- `React Flow` for workflow/process graphs
- `Sigma.js` or `vis-network` for actual graph/relationship exploration

Suggested split:

- use `React Flow` for intent pipelines, rule flows, lifecycle lanes, and process maps
- use `Sigma.js` for graphDB node-edge exploration at scale

#### Styling

- `Tailwind CSS` plus a small design token layer

or

- `CSS Modules` plus design tokens if you want stricter locality

Recommendation:

- use `Tailwind CSS` for speed and layout consistency
- keep tokens in CSS variables
- avoid bringing in a massive prebuilt component library as the main system

#### UI Primitives

- `Radix UI`

Why:

- accessible primitives
- good fit for dialogs, tabs, menus, drawers, tooltips, accordions
- lets the product keep its own visual identity

This is preferable to a heavyweight all-in-one design system for this use case.

## Recommended Tech Stack Decision Summary

### Best Fit Stack

```text
React + TypeScript + Vite
React Router
TanStack Query
Zod
React Hook Form
TanStack Table
Radix UI
Tailwind CSS + design tokens
Apache ECharts
React Flow
Sigma.js
```

This stack is a good compromise between:

- maintainability
- extensibility
- type safety
- visualization power
- future customizability

## Mapping To SVFactory And KBX Backend

The frontend should mirror backend domains, not current page names.

### Recommended Backend Domain Mapping

- `session-context`
- `workspace`
- `intents`
- `documents`
- `rules`
- `graph`
- `search`
- `system`
- `mutations`

### Frontend Domain Modules Should Match These Names

This gives you:

- stable language between frontend and backend
- clearer API ownership
- easier code generation later
- easier AI navigation because names match runtime truth

### Suggested Contract Pattern

Each domain should expose:

- `api/queries.ts`
- `api/mutations.ts`
- `models/schema.ts`
- `models/mappers.ts`
- `components/...`
- `pages/...`

That way, backend evolution becomes a mapper/schema concern first, not a page rewrite.

## Customization Strategy

This is the most important architectural piece if the goal is future flexibility.

The UI should not be customized by random component edits.

It needs a framework.

### Recommended Customization Model

Support customization at three layers.

#### Layer 1: Theme Customization

Config-driven only.

Examples:

- colors
- spacing density
- typography mode
- card radius
- chart palette

This should come from a `theme manifest`, not hardcoded CSS edits.

#### Layer 2: Navigation And Layout Customization

Manifest-driven.

Examples:

- enable or disable tabs
- reorder screens
- choose default landing page
- show or hide certain side panels
- choose page density mode

This should come from a `workspace UI manifest`.

#### Layer 3: Widget Customization

Extension-slot driven.

Examples:

- custom dashboard card
- custom graph panel
- custom system diagnostic panel
- custom intent evidence widget

This should come from a formal widget registry.

### Recommended Customization Contracts

```text
custom/
  manifests/
    workspace-ui.manifest.ts
    theme.manifest.ts
    widgets.manifest.ts
  widgets/
    graph-health-widget/
    chaos-trend-widget/
    active-intent-widget/
  themes/
    default-theme.css
    operator-compact.css
```

### Recommended Widget API Shape

Each widget should declare:

- `id`
- `title`
- `domain`
- `supportedSlots`
- `dataDependencies`
- `render()`
- `priority`

This is what will make customization understandable for AI later.

Instead of guessing “where should I inject this?”, the codebase gives explicit slots.

## Recommended Slot-Based Layout System

Define named slots in each page.

Example for `Home`:

- `home.summary.primary`
- `home.summary.secondary`
- `home.alerts`
- `home.graph`
- `home.recent-activity`

Example for `Intents`:

- `intents.list.header`
- `intents.detail.hero`
- `intents.detail.actions`
- `intents.detail.evidence`
- `intents.detail.sidebar`

This is much better than hardcoding everything into static JSX.

## Recommended Visual System

### Token System

Define tokens for:

- color
- spacing
- radius
- typography
- panel elevation
- border emphasis
- semantic status

### Status Colors

Use a stable semantic palette:

- neutral for metadata
- blue for informational runtime context
- green for healthy / completed
- amber for warning / review / partial
- red for blocked / failed / risky

### Typography

Recommended pairing:

- one clean sans-serif for UI
- one mono family for IDs, paths, counters, and operational metadata

The current direction is acceptable, but the hierarchy needs to be stricter.

### Spacing Rule

Adopt one spacing scale only.

For example:

- 4
- 8
- 12
- 16
- 24
- 32
- 40

Do not mix arbitrary padding values across panels.

## Recommended Dashboard And Graph Strategy

The product should explicitly support more than cards and lists.

### Dashboard Media Types To Support

- KPI cards
- trend charts
- stacked bars
- timelines
- sankey flows
- dependency graphs
- force-directed graph canvases
- heatmaps
- tabular drilldown views

### Recommended Graph-First Features For Future

- graph health overview
- node type distribution
- relation type distribution
- unresolved entities
- orphan nodes
- source-to-document-to-intent trace graph
- rule-to-doc-to-runtime dependency view

This is why graph should be a first-class domain now, not a later afterthought.

## Recommended Implementation Phases

### Phase 1: Structural Refactor

Goal:

- split `App.tsx` into domain pages and shared shell

Deliverables:

- routing
- page shell
- query layer
- domain folders
- shared UI primitives

### Phase 2: Design System Foundation

Goal:

- introduce tokens, consistent layout primitives, and unified status language

Deliverables:

- `PageHeader`
- `SummaryBar`
- `Panel`
- `StatCard`
- `DataTable`
- `StatusBadge`
- `EmptyState`
- `ErrorState`

### Phase 3: Information Architecture Upgrade

Goal:

- move from current tabs to domain-aligned navigation

Deliverables:

- `Home`
- `Intents`
- `Knowledge Base`
- `Rules`
- `Search`
- `System`
- placeholder `Graph`

### Phase 4: Visualization Upgrade

Goal:

- add charts and graph surfaces

Deliverables:

- chaos trend chart
- intent throughput chart
- rule domain chart
- graph overview panel

### Phase 5: Customization Framework

Goal:

- support manifest-driven layout and widget extensibility

Deliverables:

- slot registry
- widget manifest
- theme manifest
- page composition manifest

## Design Recommendation In One Sentence

The right redesign is not “make the dashboard prettier”.

It is:

`turn the current localhost UI into a domain-structured operational control plane with explicit extension points, typed contracts, and first-class visualization surfaces.`

## Final Recommendation

If forced to choose the most important decisions, choose these:

1. redesign for the KB operator first
2. align frontend domains with backend domains
3. split the app into feature modules and typed query/mutation layers
4. adopt a slot-based customization model
5. choose chart and graph libraries now, before layout hardens further

## Short Decision Matrix

### If the top priority is maintainability

Choose:

- React Router
- TanStack Query
- Zod
- domain-based folder structure
- Tailwind + Radix + tokens

### If the top priority is graph/dashboard power

Choose:

- Apache ECharts
- Sigma.js
- React Flow

### If the top priority is future customization

Choose:

- manifest-driven nav
- slot-based page composition
- widget registry
- theme tokens

## Suggested Next Artefacts

The next useful documents after this one would be:

1. a page-by-page wireframe spec
2. a frontend module contract spec
3. a widget manifest schema
4. a backend-to-frontend domain map for SVFactory and KBX