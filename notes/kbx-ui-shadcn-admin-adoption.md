# KBX UI Shadcn Admin Adoption

## Purpose

This document defines how `satnaing/shadcn-admin` may be used for the KBX UI rebuild.

It is a donor UI reference, not the application foundation.

## Why It Is Relevant

The donor is useful because it already provides:

- Vite
- shadcn/ui
- dense dashboard-friendly panel language
- topbar and shell styling ideas
- sidebar and rail primitives
- command menu patterns
- polished table, card, and spacing language

These are valuable for KBX UI because the rebuild needs:

- a stronger shell
- clearer operator-console layout
- better card and panel hierarchy
- a faster route to polished frontend primitives

## Allowed Adoption Surface

Adopt selectively from `shadcn-admin`:

- shell ideas
- topbar styling
- command menu patterns
- card and panel language
- table spacing and page rhythm
- sidebar or rail primitives only as secondary navigation surfaces

## Forbidden Adoption Surface

Do not adopt directly:

- TanStack Router-based route architecture
- sidebar-first global navigation assumptions
- auth-specific demo structures
- state ownership model
- demo-page business semantics

## Compatibility Rules

- KBX UI keeps top navigation as the primary global navigation surface
- React Router remains the routing contract
- TanStack Query remains the server-state contract
- copied donor pieces must be adapted to KBX page and module boundaries

## Adoption Rule

Use `shadcn-admin` as a shell and visual donor.

Do not use it as the architect of the KBX UI application.