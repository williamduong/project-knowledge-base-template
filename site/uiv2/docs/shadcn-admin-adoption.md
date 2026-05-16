# Shadcn Admin Adoption Strategy

## Status

`satnaing/shadcn-admin` is approved as a donor UI reference for `site/uiv2`.

It is not approved as the application foundation.

## Why It Fits KBX UI

`shadcn-admin` is a good donor because it already provides:

- Vite
- shadcn/ui
- dark and light mode
- dense dashboard-friendly visual language
- sidebar and app shell primitives
- command menu patterns
- cards, panels, and page spacing that are closer to operator-console needs than generic landing-page kits

This matches KBX UI's needs well:

- operator console layout
- many evidence panels and cards
- dense workspace UI
- dashboard plus reader plus workflow surfaces

## What We Should Adopt

Adopt selectively from `shadcn-admin`:

- app shell composition ideas
- topbar patterns
- sidebar and rail primitives
- command menu interaction patterns
- card and panel language
- dropdown, settings, and user menu styling
- table spacing and page rhythm

## What We Should Not Adopt

Do not adopt these as-is:

- TanStack Router integration
- sidebar-first global navigation assumption
- app-wide route structure
- app state model
- auth-specific surface like Clerk unless explicitly needed later
- any business semantics embedded in its demo pages

## Key Compatibility Findings

### 1. Routing mismatch

`shadcn-admin` uses TanStack Router.

`site/uiv2` is locked to React Router.

Implication:

- copy layout and component patterns
- do not port route architecture directly
- rewrite navigation bindings to React Router

### 2. Navigation mismatch

`shadcn-admin` is optimized around a sidebar shell.

KBX UI keeps top navigation as the primary global navigation.

Implication:

- keep top nav as the global contract
- use sidebar or rail only as a secondary workspace surface inside domains that benefit from it

### 3. Component customization risk

The repo documents that some `shadcn/ui` components are customized.

Implication:

- do not assume all copied components are stock shadcn/ui
- compare customized files carefully before adopting them
- prefer importing only the parts with clear value for KBX UI

### 4. Query compatibility is acceptable

The repo uses TanStack Query, which is aligned with the KBX UI architecture.

Implication:

- query-adjacent patterns are easier to reuse conceptually
- router-bound patterns are not directly reusable

## Recommended Adoption Strategy

### Phase A: Use It As Visual Donor, Not Base Template

Do not fork the repo.

Do not transplant its full app tree.

Instead:

1. inspect the shell pieces we want
2. port only selected shell and UI primitives into `site/uiv2`
3. adapt them to React Router and KBX domain boundaries

### Phase B: Start With Shell Layer Only

First port candidates:

- topbar/header styling
- command menu
- sidebar/rail primitive adapted to secondary navigation use
- card and panel spacing system
- page container spacing and section rhythm

### Phase C: Rebuild KBX Domains Inside That Shell

After the shell is stable:

- implement `Intents`
- then `Knowledge Base`
- then `Rules` and `Search`
- then `Home` and `System`

## Concrete Porting Guidance

### Good candidates for near-direct adaptation

- command menu structure built on `cmdk`
- sidebar primitives
- layout spacing system
- topbar actions and dropdown styling
- status card composition patterns

### Must be rewritten around KBX contracts

- route bindings
- nav link generation
- page loaders/query hooks
- domain page composition
- any page using demo data or admin-resource assumptions

## Recommended Rule For Sidebar Adoption

Use the donor sidebar as one of these only:

- domain-local workspace navigation
- collapsible left rail inside a domain workspace
- contextual secondary navigation

Do not use it as the app's primary global navigation.

## Recommended Rule For Command Search

This is one of the highest-value imports.

Use the command UI pattern from `shadcn-admin`, but bind it to KBX routes and KBX actions.

Examples of valid command targets:

- open intent by ID
- jump to knowledge-base document route
- open rules domain page
- jump to system diagnostics page

## License And Compliance Note

`satnaing/shadcn-admin` is MIT licensed.

That makes selective reuse practical, but if source code is copied or adapted in substantial portions, preserve the required MIT attribution and license notice in the appropriate project documentation or vendored-license location.

## Final Decision

Use `shadcn-admin` as a **donor design system and shell reference**.

Do not use it as a starter template or architectural base for `site/uiv2`.