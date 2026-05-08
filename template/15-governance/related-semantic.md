---
title: Related Semantic — `related_strong` vs `related_weak`
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-01
last_verified: 2026-05-01
related_strong:
  - metadata-schema.md
related_weak:
  - link-and-ownership-policy.md
tags:
  - governance
  - metadata
  - impact
---

# Related Semantic

## Why split

Phase 0 of the v1.4 impact engine measured ~59% false-positive rate when BFS expanded the legacy single `related:` field to depth 2. The cause: `related:` mixed two distinct semantics — true dependency vs. mere mention. Hub docs (indexes, agent manuals) explode the graph at hop 2.

To make `kbx impact` usable as a deterministic gate, the schema separates the two:

- `related_strong:` — **dependencies the impact engine traverses**.
- `related_weak:` — **mentions/references**, displayed under "Mentions" but never traversed.

The legacy field `related:` is read as an alias of `related_weak:` (zero rewrite on upgrade).

## When to use which

Use `related_strong:` for a target document T when **all three** are true:

1. If T changes, you would almost certainly need to read or edit the linked doc.
2. The link captures a contractual or definitional dependency, not a topical neighbour.
3. You would feel a code review missed something if the linked doc were ignored after a T change.

Use `related_weak:` for everything else:

- Index docs (`INDEX.md`, `00-start-here/*-index.md`).
- Cross-tier orientation (`how-to-use-this-kb.md` from a deep doc).
- Generic guides (`prompting-guide.md` from a non-AI-skills doc).
- Background reading.

If you cannot decide, prefer `related_weak:`. Promotion is cheap; demotion is suspicious.

## Effect on `kbx impact`

| Edge | BFS traverses | Shown in output |
|---|---|---|
| `related_strong` | yes | yes (under depth groups) |
| `related_weak` (incl. legacy `related:`) | no | yes (under "Mentions") |
| `binds_to` (from `bindings.json`) | yes (depth-1 only) | yes |

If a target document has zero `related_strong` neighbours, `kbx impact` prints a hint to consider promoting selected `related_weak:` entries.

## Migration policy (v1.4)

`kbx update` does **not** rewrite frontmatter on upgrade. Doctor surfaces an info-level message when a doc still uses the legacy `related:` field. Promotion is per-doc, manual, and explicit.

The template repo dogfoods this policy in a separate PR after v1.4 ships.

## Conflict resolution

If the same path appears in both `related_strong:` and `related_weak:` of one doc:

- The strong edge wins for traversal.
- `kbx doctor` warns about the conflict so the author can drop the weak duplicate.
