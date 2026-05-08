# SV Factory — Project-Specific Overrides

> This file documents how this maintainer workspace overrides the generic KB Agent defaults.
> It is the source of truth for what makes SV Factory's governance choices different from what ships to users.
>
> Layer: C (maintainer-only). NOT shipped via npm `files` whitelist.

---

## Intent ID Format (overrides generic default)

**Generic default:** kebab-case, user-defined naming convention.  
**SV Factory choice:** `vX-Y-Z-slug` version-prefixed format.

Examples: `v2-4-intent-governance`, `v2-5-cli-first-intent-orchestration`

Rationale: SV Factory manages a versioned npm package. Tying intent IDs to version numbers makes it trivial to trace which intents shipped in which release without consulting git log.

---

## Wave Field (overrides generic default)

**Generic default:** Free string. Projects use sprint names, quarters, version tags, or any grouping label.  
**SV Factory choice:** Wave = target release version. Examples: `v2.4`, `v2.5`, `v3.0`.

Rationale: SV Factory roadmap is organized by semantic version. Using version-prefixed wave values aligns intent grouping with release milestones.

---

## Impact Signal Tag System (D1-D56)

**Generic default:** Free tags in `impact_signals[]`. No centralized registry required.  
**SV Factory choice:** Structured tag system based on KB-internal decision log entries D1-D56.

- `D1`–`D19`: initial template decisions (up to v2.3)
- `D20`+: v2.4+ schema migration decisions
- `large-intent-branch-confirmed`, `cross-module`, `breaking-change` — semantic tags used by `kb chaos` and cleanup

These tags are internal governance signals. Downstream users should define their own signals based on their own project's decision vocabulary.

---

## Architecture Model (6-Layer)

**Generic default:** KB Agent does not prescribe a specific architecture tier model for users' projects.  
**SV Factory choice:** 6-layer architecture applied to the KB template itself:

- L1: Static content (Markdown docs)
- L2: CLI / tooling layer (`src/commands/`, `bin/`)
- L3: Template governance layer (`template/`)
- L4: Agent orchestration layer (`template/.github/agents/`, prompts)
- L5: Validation/CI layer (tests, doctor, release scripts)
- L6: Agent self-knowledge layer (`kb-root/`)

This model is specific to maintaining a documentation template package. It does NOT ship as a user-facing concept.

---

## Branch Naming

**Generic default:** `intent/<id>`.  
**SV Factory choice:** `intent/vX-Y-<slug>` matching the intent ID format.

---

## Release Reference

**Generic default:** Any canonical release reference (version tag, PR link, milestone).  
**SV Factory choice:** npm semver tag published to `@williamduong/sfact` on npm.

---

## Stale Threshold

**Generic default:** 14 days.  
**SV Factory choice:** 14 days (same — no override).

---

## CLI Command Specifications (v2.5+)

> Technical specs for commands introduced in v2.5.
> Layer assignment for each command is canonical in `foundation.md § CLI Command Layer Classification`.
> These specs are the contract for Phase 2 implementation.

---

### SV Factory-side commands (deterministic)

#### `kb init --project-id=<id>`

**Layer:** SV Factory — Init/Compile checkpoint  
**Status:** Specified (not yet implemented)

| Field | Value |
|---|---|
| Input | `--project-id=<string>` (required). Alphanumeric + hyphen only. Max 64 chars. |
| Side effect | Writes `project_id` field into `.kb/state.json` at `context.contentRoot`. |
| Exit 0 | `project_id` written successfully. JSON stdout: `{"ok":true,"project_id":"<id>"}` |
| Exit 1 | `project_id` already set AND `--force` not provided. JSON stdout: `{"ok":false,"error":"project_id_already_set","current":"<id>"}` |
| Exit 1 | Invalid `project_id` format. JSON stdout: `{"ok":false,"error":"invalid_project_id_format"}` |
| No LLM | SV Factory does not guess or suggest a valid ID. Block and report only. |

---

#### `kb doctor --context`

**Layer:** SV Factory — Audit Request checkpoint  
**Status:** Specified (not yet implemented — extends existing `kb doctor`)

| Field | Value |
|---|---|
| Input | `--context` flag on existing `kb doctor` command. |
| Validates | `project_id` present in `.kb/state.json`; value matches `[a-zA-Z0-9-]{1,64}`. |
| Exit 0 | Context valid. JSON stdout: `{"ok":true,"check":"context","project_id":"<id>"}` |
| Exit 1 | `project_id` missing. JSON stdout: `{"ok":false,"check":"context","error":"project_id_missing"}` |
| Exit 1 | `project_id` format invalid. JSON stdout: `{"ok":false,"check":"context","error":"project_id_invalid","value":"<bad_value>"}` |
| No LLM | No suggestion, no auto-fix. Exit code only. |

---

### KBAgent-side commands (orchestration primitives)

#### `kb context show`

**Layer:** KBAgent — Runtime  
**Status:** Specified (not yet implemented)

| Field | Value |
|---|---|
| Input | No arguments. Reads from `.kb/state.json`. |
| Output (found) | JSON stdout: `{"project_id":"<id>","source":".kb/state.json"}` |
| Output (not found) | JSON stdout: `{"project_id":null,"warning":"no_project_context_registered"}` |
| Exit code | Always 0. Missing context = warning, not block (Agent tier — soft). |

---

#### `kb context list`

**Layer:** KBAgent — Runtime  
**Status:** Specified (not yet implemented)

| Field | Value |
|---|---|
| Input | No arguments. |
| Output | JSON stdout: `{"contexts":[{"project_id":"<id>","active":true|false}, ...]}` |
| Output (none) | JSON stdout: `{"contexts":[],"warning":"no_contexts_registered"}` |
| Exit code | Always 0. |

---

#### `kb context set <id>`

**Layer:** KBAgent — Runtime  
**Status:** Specified (not yet implemented)

| Field | Value |
|---|---|
| Input | Positional `<id>` (required). Must match a registered `project_id`. |
| Side effect | Updates `active_project_id` in `.kb/state.json`. |
| Exit 0 | Switch successful. JSON stdout: `{"ok":true,"active_project_id":"<id>"}` |
| Exit 1 | `<id>` not found in registered contexts. JSON stdout: `{"ok":false,"error":"project_id_not_found","requested":"<id>"}` |
| Fallback | If no contexts registered at all: exit 1 with `{"ok":false,"error":"no_contexts_registered"}`. |

---

#### `kb scope <intent-id> --project=<id>`

**Layer:** KBAgent — Runtime  
**Status:** Specified (not yet implemented)

| Field | Value |
|---|---|
| Input | Positional `<intent-id>` (required) + `--project=<id>` (required). |
| Side effect | Writes `project_id` linkage into intent's `intent.md` frontmatter (`project_scope` field). |
| Exit 0 | Scope written. JSON stdout: `{"ok":true,"intent_id":"<id>","project_scope":"<project_id>"}` |
| Exit 1 | Intent not found in `_active/`. JSON stdout: `{"ok":false,"error":"intent_not_found","intent_id":"<id>"}` |
| Exit 1 | `project_id` not registered. JSON stdout: `{"ok":false,"error":"project_id_not_found","project":"<id>"}` |
| Fallback | If `--project` omitted: use `active_project_id` from state if set; else exit 1 with `{"ok":false,"error":"no_active_project_context"}`. |

---

### Common Output Rules (all commands above)

- All output is JSON to stdout. Human-readable rendering is KBAgent/MCP responsibility (Constitutional Axiom 5).
- All errors include an `error` field with a machine-readable snake_case code.
- No command writes to stderr except for unexpected runtime exceptions (Node.js unhandled errors).
- Exit codes: `0` = success or soft warning (Agent-side), `1` = hard block (Root-side) or unrecoverable error (Agent-side).
