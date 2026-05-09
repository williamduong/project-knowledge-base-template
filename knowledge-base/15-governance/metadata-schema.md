---
title: Metadata Schema
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-09
last_verified: 2026-05-01
tags:
  - governance
  - metadata
---

# Metadata Schema

## Boundary and Naming Reference

Use one canonical boundary and naming vocabulary across governance docs. Operational anchor:
- `../12-ai-skills/agent-operating-manual.md` (section: Boundary and Naming Contract)

Required term usage in governance text:
- `kbx CLI` = deterministic command/runtime surface
- `KBAgent` = agent prompt/runtime role
- `KBX` = ecosystem/package/template
- `SVFactory` / `sfact` = meta-factory/governance layer

Scope guard:
- Prefer the claim "governed KB/agent software instances".
- Do not generalize to "all software instances" without explicit non-KB evidence.

## Required Frontmatter

```yaml
---
title: <string>
type: <orientation|concept|architecture|reference|implementation|decision|guide|operations|test-strategy|governance>
status: <active|draft|deprecated|archived>
owner: <team-slug>
time_state: <current|to_be|mixed|historical|timeless>
verification: <code-verified|design-only|unverified|self-referential>
last_updated: <YYYY-MM-DD>
last_verified: <YYYY-MM-DD>
last_verified_commit: <git-sha>     # optional, paired with last_verified (v1.4+)
source_of_truth: <path-or-null>
related_strong:                      # optional (v1.4+) — dependencies; impact engine TRAVERSES
  - <relative-doc-path>
related_weak:                        # optional (v1.4+) — mentions only; impact engine DOES NOT traverse
  - <relative-doc-path>
related:                             # legacy (≤ v1.3) — read as alias of related_weak; not auto-rewritten
  - <relative-doc-path>
released_in: <vX.Y.Z>               # optional (v1.5+) — release catalog reference for this doc
extraction_sources:                  # optional (v2.2+) — source files this doc was extracted from
  - path: <relative-source-path>
    hash: <sha1-12chars>
    extracted_at: <YYYY-MM-DD>
tags:
  - <tag>
---
```

## Field Rules

- source_of_truth is mandatory when verification is code-verified.
- last_verified only changes when claims are re-checked against source.
- last_verified_commit (v1.4+) records the git SHA at which the doc was last verified; `kb verify` populates both fields together. Doctor warns if `last_verified` is set but `last_verified_commit` is missing.
- related_strong vs related_weak: see `15-governance/related-semantic.md`. The impact engine traverses ONLY related_strong. The legacy `related:` field is read as an alias of `related_weak:` to preserve backward compatibility; v1.4 does not rewrite frontmatter on upgrade.
- A path appearing in both related_strong and related_weak is a conflict; doctor warns and the strong edge wins for traversal.
- released_in (v1.5+) is optional and advisory; use it when a document is first released in a specific catalog version.
- use mixed only when current and target must coexist in one document.
- keep owner as stable role/team slug, not person name.

## Validation Checklist

- required fields present
- enums valid
- date format valid
- links are relative and resolvable
- time_state aligns with body sections
- if last_verified present, last_verified_commit also present (v1.4+ doctor rule)
- no path appears in both related_strong and related_weak (v1.4+ doctor rule)
- if released_in is present, value follows release version format (for example v1.5.0)
- extraction_sources (v2.2+) is optional; set when a doc is generated or updated from source code via `kb extract`. Each entry has `path` (relative to workspace root), `hash` (sha1 first 12 chars), and `extracted_at` (YYYY-MM-DD). Doctor warns if hash differs from current file hash (stale signal).
