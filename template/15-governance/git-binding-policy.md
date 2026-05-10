---
title: Git Binding Policy
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-01
last_verified: 2026-05-01
related:
	- verification-policy.md
	- review-cadence.md
	- metadata-schema.md
	- ../00-start-here/repository-revision-state.md
tags:
	- governance
	- git
	- binding
	- impact
	- maintenance
---

# Git Binding Policy

Governs how knowledge-base documents bind to source code paths so that git-driven impact analysis (`kbx scan`, `kbx status`, `kbx doctor`) can detect when docs need re-verification.

## Purpose

When source code changes between two git revisions (`baseline..HEAD`), the agent must know which docs depend on those files. Git binding makes that dependency machine-readable.

## Binding Sources

A doc may declare its binding in one of two places. Frontmatter takes priority over the central index.

### 1. Doc Frontmatter (preferred for per-doc bindings)

Add a `binds_to` array of glob patterns to the doc's YAML frontmatter:

```yaml
---
title: Auth Module
verification: code-verified
source_of_truth:
	- src/auth/
binds_to:
	- src/auth/**
	- src/middleware/auth/**
last_verified: 2026-05-01
last_verified_commit: abc1234
---
```

Patterns follow [`minimatch`](https://github.com/isaacs/minimatch) semantics with options `dot:false, nocase:false, matchBase:false`.

### 2. Central `bindings.json` (preferred for cross-tier or generated bindings)

File path: `<contentRoot>/.kb/bindings.json`. Schema version `1`:

```json
{
	"version": 1,
	"bindings": [
		{
			"doc": "05-backend/auth.md",
			"paths": ["src/auth/**", "src/middleware/auth/**"],
			"source": "manual"
		}
	]
}
```

- `doc`: contentRoot-relative POSIX path to the markdown file
- `paths`: glob patterns (same matcher options as frontmatter)
- `source`: free-form provenance label (`manual`, `bind-suggest`, `migration`, etc.)

The CLI command `kb bind <doc> <path...>` writes/merges entries; `kb bind --list` reads them.

## Priority Rules

When a doc has both frontmatter `binds_to` and a `bindings.json` entry:

1. Frontmatter wins (treated as source of truth for that doc).
2. `bindings.json` entries for the same doc are ignored.
3. `kbx scan` records `binding_source: "frontmatter" | "index"` per impacted doc so reviewers can trace which path matched.

## Glob Best Practices

- **Be specific.** `src/**` matches everything; prefer `src/auth/**` or `src/auth/*.ts`.
- **Bind to directories you actually own.** Over-broad globs cause noisy `attention` verdicts and erode trust in the signal.
- **Use `**` to traverse directories**, `*` for single-segment matches.
- **Forward slashes only.** The matcher normalizes `\` to `/`, but writing forward slashes keeps the source readable on all platforms.
- **Avoid binding to generated files** (build output, lockfiles) — they create false-positive impact.
- **Test new bindings with `kbx scan`** before committing; review the `impacted` list to confirm the patterns capture intent.

## KB Self-Edit Filter

The impact engine partitions every changed file into one of three buckets:

1. **`impacted`**: code change that matches a doc's binding → doc may need re-verification.
2. **`self_edits`**: change inside `<contentRoot>/` itself (the docs folder) → not treated as impact, surfaced separately so reviewers see the KB is being edited.
3. **`unbound_changes`**: code change not under contentRoot and not matching any binding → potential coverage gap.

This filter is enforced unconditionally so that editing docs never triggers impact against themselves.

## Verdict Semantics

`kbx status` (which auto-runs `kbx scan` unless `--no-scan`) emits one of three verdicts:

| Verdict     | Trigger                                                                        | Required action                                                |
|-------------|--------------------------------------------------------------------------------|----------------------------------------------------------------|
| `clean`     | No impacted docs, no unbound changes, no uncommitted KB content.               | Safe to continue work.                                         |
| `attention` | Impacted docs, unbound changes, or uncommitted edits inside `<contentRoot>/`.  | Review impacted docs; bind unbound paths or document the gap.  |
| `blocked`   | Workspace is not a git repo, baseline missing, or KB state corrupt.            | Resolve the blocker before relying on impact data.             |

`kbx status --quiet` prints only the verdict label and exits with code `0` (clean), `1` (attention), or `2` (blocked) — suitable for CI gating.

`kbx doctor` adds a read-only `git-impact-pending` rule that surfaces stale `impact.json` entries; under `--strict`, any pending impact fails the doctor check.

## Workflow

1. After significant code changes land, run `kbx status`. The CLI auto-refreshes `impact.json`.
2. For each entry under `impacted`, open the doc, verify against the linked source, then bump `last_verified` (and `last_verified_commit`).
3. For each `unbound_changes` path that *should* affect a doc, add a binding via `kb bind` or update frontmatter.
4. For paths that intentionally have no doc coverage, document the rationale (e.g., `09-operations/coverage-exceptions.md`) so future audits see the decision.
5. Re-run `kbx status` to confirm `clean` (or an explained `attention`).

## Checkpoint Commit Rule (KBX-GB002)

Intent checkpoint tracking is deterministic and file-backed via `focus.md`.

Rule contract:
- Checkpoint file: `svfactory/focus.md` or `kb-root/focus.md` (first existing path wins).
- Required heading: `## Intent Checkpoints`.
- On checkpoint-trigger events, CLI appends one timestamped checkpoint line and commits the file immediately.

Default trigger events:
1. `kbx intent create`
2. `kbx intent status` (single intent and overview)
3. `kbx intent close`
4. `kbx intent checkpoint` (manual user-triggered checkpoint)

Commit policy:
- Commit occurs on the current branch (no branch restriction).
- Commit scope is limited to the checkpoint file path.
- History source of truth is git log + checkpoint lines in `focus.md`.

AI generation boundary:
- AI may propose checkpoint `note` text only.
- Event detection, file mutation, and git commit are deterministic CLI responsibilities.

## Baseline Coupling

Impact analysis compares `<baseline>..HEAD`. The baseline lives in `<contentRoot>/.kb/state.json` under `sourceRepositoryGitBaseline` (per [`repository-revision-state.md`](../00-start-here/repository-revision-state.md)).

- Updating the baseline (currently a manual `state.json` edit; `kbx baseline` command planned for a later release) advances the comparison window. Do this only after the impacted-doc backlog is reconciled — otherwise you lose audit trail.
- Legacy tool `tools/generate-template-changelog.js` used to advance an internal release anchor; this path is deprecated in v1.5 Phase 2.
- Current `kbx release notes` only generates notes from an explicit range (or inferred previous tag) and does not mutate baseline/state.

## Evidence

- `src/lib/binding-matcher.js` — minimatch wrapper, options
- `src/lib/bindings.js` — read/write schema, frontmatter parser, dedupe rules
- `src/lib/impact.js` — partition + verdict derivation
- `src/commands/scan.js`, `src/commands/status.js`, `src/commands/doctor.js` — surfaces
- `template/00-start-here/repository-revision-state.md` — baseline policy

## Open Questions

- Should `kb bind suggest` heuristics ship in a follow-up minor release (planned for v1.4)?
- Should `kbx maintain` auto-run `kbx scan` as part of its pipeline, or stay opt-in?
- How should impact records age out — purely on next scan, or via a TTL field?
