# KBX UI V0 Guardrails

## Purpose

This file defines how V0 or any UI code-generation assistant may be used for `site/uiv2`.

The rule is simple:

V0 may help generate UI content inside the architecture.

V0 must not define the architecture.

## Allowed Uses

- generate presentational component ideas
- propose card, table, panel, or dashboard layouts
- generate static shell markup for a known route
- speed up styling of a pre-decided page structure

## Forbidden Uses

- choosing the application architecture
- choosing state ownership
- inventing route structure without the local docs
- creating a generic admin foundation for the app
- introducing direct page-level network access
- inventing APIs or contracts not verified from the bridge/runtime

## Mandatory Inputs Before Using V0

Before asking V0 to generate anything, provide:

- the target route or domain
- the architecture constraints from `architecture.md`
- the relevant task pattern from `task-playbook.md`
- the exact UI slice you want generated
- the statement that global navigation is top nav and route ownership belongs to the URL

## Required Prompt Shape For V0

Every V0 prompt for this project should include constraints equivalent to:

- build for `site/uiv2`
- do not redesign global architecture
- do not add direct `fetch` inside page components
- do not introduce a left-sidebar global navigation model
- use the locked stack already chosen by the repo
- preserve capability, not legacy layout

## Review Rule

All V0 output must be reviewed as if it were an untrusted draft.

Review checklist:

- did it violate route ownership
- did it add page-level data fetching
- did it couple domains incorrectly
- did it add speculative abstractions
- did it drift from the locked navigation model
- did it produce generic admin UI instead of operator UI

## Adoption Rule

Never paste V0 output directly as the final architecture slice.

Instead:

1. extract the useful presentational structure
2. adapt it into the repo's route and contract model
3. remove any fake data wiring
4. validate the slice normally

## Red Flags

Reject or heavily rewrite V0 output if it:

- produces a monolithic page container with everything in one file
- introduces resource CRUD terminology as the app's main structure
- defaults to generic dashboard/admin tropes with no KB operator logic
- invents stores for route identity
- collapses multiple domains into one catch-all workspace page

## Short Rule

V0 is a layout accelerator.

It is not the architect for `site/uiv2`.

The same rule applies to `shadcn-admin`.

It is an approved donor UI source, not the application architect.