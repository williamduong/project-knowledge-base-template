# UIV2 Legacy Runtime Summary

## Purpose

This file summarizes what the legacy localhost UI already does.

Use it when rebuilding capabilities into `site/uiv2`.

## Legacy Shell Role

The current `site/kbx-ui` shell acts as:

- an observability surface for the workspace
- an operator console for intent-related actions
- a document reader and KB browser
- a lightweight search surface

## Legacy Top-Level Areas

- `Overview`
- `Workspace`
- `Documents`
- `Search KB`

## Operator-Critical Capabilities To Preserve

- workspace status visibility
- focus and checkpoint visibility
- intents list and intent detail visibility
- create, update, approve, preview, and apply intent mutations
- document tree browsing and document reading
- rule and runtime diagnostics visibility
- cross-surface search
- refresh/invalidation after mutations

## Legacy To Future Mapping

- `Overview` -> `Home`, `Rules`, `Graph`, `System`
- `Workspace` -> `Intents`
- `Documents` -> `Knowledge Base`
- `Search KB` -> `Search`

## Interpretation Rule

Treat the legacy shell as:

- a capability inventory
- a migration reference
- a runtime evidence source

Do not treat it as:

- the final navigation model
- the final layout system
- the final architecture boundary model