---
intent_id: v2-5-1-deterministic-multi-project-model
type: intent-plan
---

# Plan

## Goal

Lock and implement deterministic project resolution semantics for multi-project workspaces without breaking solo-first onboarding.

Primary contract:
- Mutation commands MUST resolve exactly one `project_id` before any write.
- If resolution is ambiguous, command MUST fail closed.
- Exception: explicit workspace mode operations (`--workspace`) are allowed to mutate workspace-level state.

## Non-Negotiable Policy

1. Mỗi repo luôn có KBX riêng (per-repo primary).
2. Mỗi KB Agent phải namespaced bằng `project_id`.
3. Không ép orchestration folder khi chỉ có một repo.
4. Khi detect nhiều KBX project trong VS Code workspace, fail closed nếu command ambiguous.
5. Expose `kbx workspace promote` to create optional workspace registry/control plane.
6. Workspace control plane là optional, nhưng required cho cross-project graph/orchestration.

## Trade-offs (Locked)

| Axis | Decision | Why |
|---|---|---|
| Solo-first onboarding | Keep per-repo `.kbx/project.yaml` as default source of truth | Zero extra setup for single repo users |
| Multi-repo correctness | Hard fail on ambiguity | Prevent silent writes to wrong project |
| Copilot compatibility | Keep per-repo `AGENTS.md` + `.github/copilot-instructions.md`; derive project namespace from `project_id` | Backward-compatible with existing IDE contract |
| Future orchestration | Optional `.kbx-workspace/` control plane | Enables cross-project graph later without forcing complexity now |

## Proposed Model

### Per-repo artifacts (required)

- `.kbx/project.yaml`
  - Canonical repo identity: `project_id`, `display_name`, `svfactory_root`, optional aliases.
  - Must be unique inside one workspace registry.
- `AGENTS.md`
  - Agent contract includes explicit project namespace reference.
- `.github/copilot-instructions.md`
  - Copilot behavior includes project namespace rule, no cross-project mutation without explicit scope.

### Workspace artifacts (optional)

- `.kbx-workspace/workspace.yaml`
  - Registry of discovered projects (`project_id -> repo_root`).
  - Optional `active_project_id` for workspace defaults.
- `.kbx-workspace/copilot-workspace.md`
  - Workspace-level orchestration hints for multi-project sessions.
- Generated `.code-workspace`
  - Convenience only; not canonical state.

## Deterministic Resolution Algorithm

Resolver input (highest precedence first):
1. `--project <id>` explicit CLI flag.
2. `--workspace` explicit workspace mode (workspace-level mutation commands only).
3. CWD lookup: nearest repo with `.kbx/project.yaml`.
4. Workspace registry lookup (`.kbx-workspace/workspace.yaml`) when command invoked from workspace root.

Resolver output:
- `resolved_project_id` (exactly one), or
- `workspace_mode`, or
- deterministic error.

Deterministic errors:
- `ERR_PROJECT_UNKNOWN` - explicit `--project` not found.
- `ERR_PROJECT_AMBIGUOUS` - multiple candidates and no explicit selector.
- `ERR_PROJECT_DUPLICATE_ID` - duplicate `project_id` found in workspace registry/discovery.
- `ERR_PROJECT_REQUIRED` - mutation command called without resolvable project context.

## Command Guard Contract

### Mutation command gate

Before mutating state:
- Call resolver.
- Proceed only if exactly one `project_id` is resolved, OR command is explicitly workspace-scoped.
- Otherwise exit 1 with deterministic error code.

### Read-only command behavior

- Read-only commands may return multi-project diagnostics without mutation.
- Ambiguity in read-only mode is allowed if output remains non-mutating.

## Command Surface (Proposed)

- `kbx project resolve [--project <id>] [--json]`
  - Deterministic resolution preview for debugging.
- `kbx workspace detect [--json]`
  - Discover candidate projects and detect duplicates/ambiguity.
- `kbx workspace promote [--yes] [--json]`
  - Create `.kbx-workspace/workspace.yaml` from detected per-repo projects.
- `kbx workspace verify [--json]`
  - Drift check between registry and filesystem reality.

## Phases

### v2.5.1 Phase 0 - Contract Lock

- Lock policy text and resolver precedence.
- Lock error code set for deterministic failures.
- Lock mutation gate rule (exactly one project or workspace mode).

Exit criteria:
- Plan and intent metadata reflect final policy.
- Strategic backlog updated: KB-012 = in-progress.

### v2.5.1 Phase 1 - Resolver Library

- Implement `src/lib/project-resolver.js` (pure deterministic resolver).
- Add workspace discovery helpers and duplicate-ID detection.

Exit criteria:
- Resolver returns stable output schema for all branches.

### v2.5.1 Phase 2 - Mutation Guard Integration

- Integrate resolver into mutation commands.
- Enforce fail-closed behavior for ambiguous/unresolved project context.
- Add `--project` and `--workspace` flags where needed.

Exit criteria:
- No mutation path bypasses resolver gate.

### v2.5.1 Phase 3 - Workspace Control Plane

- Add `workspace promote` and `workspace verify` commands.
- Write `.kbx-workspace/workspace.yaml` only when explicitly requested.

Exit criteria:
- Single-repo flow unchanged (no forced workspace folder).
- Multi-project flow has deterministic control plane path.

### v2.5.1 Phase 4 - Tests + Docs

- Implement resolver + command tests.
- Update shipped template docs/contracts for project namespace behavior.

Exit criteria:
- Test matrix passes.
- Copilot-facing docs align with deterministic guard.

## Test Matrix (Required)

1. resolve explicit project
2. reject unknown project
3. resolve by cwd
4. fail ambiguous from workspace root
5. detect multiple projects
6. reject duplicate project_id
7. mutation command fails without project
8. mutation command works with `--project`
9. workspace promote creates registry
10. workspace verify detects drift

## Files Touched

- `knowledge-base/intents/_active/v2-5-1-deterministic-multi-project-model/intent.md` (modified)
- `knowledge-base/intents/_active/v2-5-1-deterministic-multi-project-model/plan.md` (modified)
- `knowledge-base/intents/_active/v2-5-1-deterministic-multi-project-model/impact.md` (modified)
- `knowledge-base/00-start-here/strategic-backlog.md` (modified)
- `svfactory/focus.md` (modified)

Implementation-phase targets (next step):
- `src/lib/project-resolver.js` (new)
- `src/commands/*.js` (modified; mutation guards)
- `test/**` (new/modified)

## Acceptance Criteria

1. All mutation commands enforce: exactly one resolved `project_id` OR explicit workspace mode.
2. Ambiguous multi-project context from workspace root fails closed with deterministic error code.
3. Single-repo onboarding remains frictionless (no forced `.kbx-workspace/`).
4. Duplicate `project_id` is detected and blocked deterministically.
5. `kbx workspace promote` creates workspace registry only on explicit invocation.
6. `kbx workspace verify` reports registry drift deterministically.
7. All 10 required tests pass.

