---
title: Link and Ownership Policy
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-04-28
last_verified: 2026-04-28
tags:
  - governance
  - ownership
  - links
---

# Link and Ownership Policy

## Owner Assignment

- owner is the responsible team for accuracy, not original author.
- use stable team slugs: frontend, backend, product, architecture, security, operations, quality, knowledge-management.
- multi-domain docs should be owned by team controlling runtime behavior.

## Link Rules

- all KB links must be relative.
- avoid absolute machine paths.
- update incoming and outgoing links on rename/move.
- keep related section symmetric when practical.

## Add / Edit / Delete Rules

- Add: create from templates and register in intent index.
- Edit: update metadata and evidence in same commit.
- Delete: add deprecation stub first, remove after one review cycle.

## Verification Downgrade Policy

If source changes and doc is not rechecked immediately:

- set verification to unverified
- create review task
- keep last_verified unchanged until real recheck
