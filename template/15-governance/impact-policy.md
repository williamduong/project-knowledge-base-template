---
id: impact-policy
title: Impact Policy
type: governance
owner: knowledge-base
status: active
verification: design-only
last_verified: 2026-05-01
last_verified_commit: NOT_AVAILABLE
time_state: current
related_strong:
  - related-semantic.md
related_weak:
  - metadata-schema.md
  - git-binding-policy.md
  - verification-policy.md
---

# Impact Policy

Defines how the KB computes "what is impacted" when source code changes, and the rules contributors and AI agents must follow when interpreting impact output.

Read alongside [related-semantic.md](related-semantic.md) (edge semantics) and [git-binding-policy.md](git-binding-policy.md) (how docs bind to code paths).

---

## 1. Two Layers of Impact

The KB tracks impact in two layers:

| Layer | Source | Stored in | Edge kind |
|---|---|---|---|
| **Direct** | git diff vs `sourceRepositoryGitBaseline` matched against `binds_to` paths | `impacted[]` in `.kb/impact.json` | `binds_to` |
| **Recursive (transitive)** | BFS from each direct-impacted doc via `related_strong` only | `transitive_impacted[]` (when `kbx scan --recursive` is run) | `related_strong` |

`related_weak` and legacy `related:` are **never** traversed. They surface as `Mentions` in `kbx impact` output for human discovery only.

Rationale: Phase 0 prototype on this template repo measured 59% false-positive rate when BFS depth 2 traversed unfiltered `related:` edges. Splitting into strong (dependency) vs weak (mention) eliminates the explosion. See [notes/upgrade-v1.4-phase0-validation.md](../../notes/upgrade-v1.4-phase0-validation.md) for evidence.

---

## 2. Depth Defaults

| Setting | Default | Source | Override |
|---|---|---|---|
| `impact.defaultDepth` | 2 | [src/lib/config.js](../../src/lib/config.js) `DEFAULTS` | `.kb/config.json` → `{ "impact": { "defaultDepth": N } }` |
| `impact.maxDepth` | 5 | same | same key `maxDepth` |

`kbx impact <target> --depth=N` and `kbx scan --recursive --depth=N` both clamp to `impact.maxDepth` and emit a stderr warning if requested depth exceeds the cap.

**When to raise depth:** rarely. Depth 2 covers most "if I change X, what reviewers should re-read" cases. Depths beyond 3 historically reintroduce hub-doc explosion; if a depth-3 result feels useful, prefer promoting more `related_strong` links instead.

---

## 3. When to Use `related_strong`

Promote a link from `related_weak` (or legacy `related:`) to `related_strong` when **all three** are true:

1. **Direct dependency**: editing one doc almost always implies the other needs review.
2. **Bounded fan-out**: the target is not a hub (`INDEX.md`, `*-index.md`, `agent-operating-manual.md`) — promoting a hub re-creates the FP explosion.
3. **Stable**: the relationship is structural, not topical. Topical co-mentions stay weak.

If unsure, leave it weak. `kbx impact` displays weak neighbors as Mentions so reviewers can still discover them; weak just prevents transitive blowup.

---

## 4. Cycles

Cycles in the `related_strong` subgraph are **legal but discouraged**:

- BFS in `findRecursiveImpact` visits each node at its shortest depth, so cycles do not cause infinite traversal.
- `kbx doctor` raises `[WARN] related-strong-cycle` listing up to 3 sample cycles.
- A cycle indicates either (a) genuinely co-equal docs (acceptable; ignore the warning) or (b) one of the edges should be downgraded to `related_weak`.

There is no auto-fix. Resolution is a human decision recorded in the doc's frontmatter.

---

## 5. Reading `impact.json`

Schema (additive — readers MUST ignore unknown fields per [template-versioning-policy.md](template-versioning-policy.md)):

```json
{
  "version": 1,
  "scanned_at": "ISO-8601",
  "baseline": "<sha>",
  "head": "<sha>",
  "storage_mode": "tracked|private-git",
  "impacted": [
    {
      "doc": "path/to/doc.md",
      "last_verified": "YYYY-MM-DD|null",
      "last_verified_commit": "<sha>|null",
      "verification": "code-verified|design-only|unverified|null",
      "binding_source": "frontmatter|sidecar|inline",
      "matched_changes": ["src/file.ts", ...]
    }
  ],
  "self_edits": [{ "status": "M", "path": "knowledge-base/..." }],
  "unbound_changes": ["src/orphan.ts", ...],
  "skipped_reason": "not-a-git-repo|no-baseline|null",

  // Added by `kbx scan --recursive` (v1.4):
  "transitive_impacted": [
    { "doc": "path/to/other.md", "depth": 1, "from": ["path/to/doc.md"] }
  ],
  "transitive_depth": 2
}
```

`transitive_impacted` is **opt-in**: omitted unless `--recursive` was passed. `kbx status` computes it on the fly without writing to disk.

---

## 6. Verification Lifecycle

When a doc appears in `impacted[]`:

1. **Reviewer reads** the matched code changes + the doc.
2. If still accurate: run `kbx verify <doc>`. This bumps `last_verified` to today and stamps `last_verified_commit` with current `HEAD`. The doc's entry is removed from `impact.json` on success.
3. If stale: edit the doc in the same commit that addresses the code change. The next `kbx scan` will recompute against the new baseline.
4. `kbx verify --all` is atomic — if any doc fails to update, no impact entries are cleared.

`last_verified_commit` lets future `kbx scan` runs prove (or refute) that a doc has been reviewed against a specific commit, independent of the global baseline. The `[WARN] last-verified-commit-missing` doctor rule flags docs with `last_verified` set but no commit SHA — typically pre-v1.4 docs.

---

## 7. Adversarial Cases

| Case | Behaviour | Why |
|---|---|---|
| Doc references a non-existent path in `related_strong` | Edge added to graph; node marked `exists: false`. No traversal beyond. | Avoid silent omission — surfaces in future `doctor` rules. |
| Doc references a path that escapes `contentRoot` (`../../foo.md`) | Edge dropped. Logged in graph stats only. | Security: `contentRoot` is the trust boundary. |
| Cycle of length 2 (A↔B both `related_strong`) | Single undirected edge; no cycle reported. | Undirected dedup; not a real cycle. |
| Same target appears in both `related_strong` and `related_weak` of one doc | Strong wins; `conflictPairs++`. WARN doctor rule fires. | D14 conflict resolution. |
| Strong + weak edges between same pair from opposite directions | Strong wins; edge upgraded; `conflictPairs++`. | Same as above — undirected. |

---

## 8. Out of Scope (Deferred)

- **Intent-aware filtering** (only surface impacted docs whose `intent` overlaps the change kind) — v2.0.
- **Co-occurrence heuristic** (`kbx impact suggest related`) — v1.5+.
- **Cross-repo impact** (changes in dependency repos surfacing here) — not planned.

---

## 9. Quick Reference

```bash
# Direct impact only (default)
kbx scan

# Direct + recursive (depth from impact.defaultDepth, default 2)
kbx scan --recursive

# Direct + recursive at custom depth
kbx scan --recursive --depth=3

# Adhoc query (does not write impact.json)
kbx impact path/to/doc.md --depth=2

# Mark one doc verified against current HEAD
kbx verify path/to/doc.md

# Mark all currently-impacted docs verified (atomic)
kbx verify --all
```
