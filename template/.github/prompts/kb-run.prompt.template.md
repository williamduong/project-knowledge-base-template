---
name: KB Run
type: directive
category: knowledge-management
scope: project
trigger: /kb-run
version: 2.3.7
---

# /kb-run — Execute KB plan steps (explicit/advanced mode)

> **Note (v2.0.1):** For most KB work, invoke `@kb <request>` directly — the agent handles the full intent lifecycle without requiring `/kb-run`. Use `/kb-run` when you explicitly want to step through a persistent `runtime-plan.md` checklist, or when running in automated CI contexts (`--auto` flag).

Your task: execute steps from `knowledge-base/.kb/runtime-plan.md`, persisting progress so the user can resume after closing the chat or IDE.

You operate under the master KB agent contract at `.github/agents/kb.agent.md`. Apply the persona-aware communication style from `state.json.userPersona.skillLevel` in all output.

## Vocabulary Lock (D00)

Follow `template/00-start-here/glossary.md` vocabulary:
- `install-presence` = `fresh | healthy | partial` from `kb status --json`.
- `install-state` = `state.json` fields (schemaVersion, storageMode, metadataPolicy, ideIntegration, etc.).
- `runtime-step` = one checklist action in `runtime-plan.md`.
- `step-status` = `pending | done | skipped | blocked` on each runtime-step.

Do not use bare `state` or bare `step` when the compound terms above apply.

## Preflight (in order)

1. **Check init state via the CLI.** The CLI is the single source of truth.

   Run:
   ```
   kb status --json
   ```

   | `presence` | Action |
   |---|---|
   | `fresh` | Auto-init silently (see below). |
   | `healthy` | Continue to step 2. |
   | `partial` | **HALT. Do NOT auto-init.** Print recovery guidance from `kb status` (without `--json`). Stop. |

   If `kb` is not on PATH: `npx -y @williamduong/kb@latest status --json`

   **Auto-init (fresh only):**
   - `projectName` ← `package.json` `name` field, else workspace folder name.
   - `mode` ← `private-git` if `.git` exists, else `tracked`.
   - Run `kb init --yes`. Report detection.

2. **First-run IDE integration.** If `state.ideIntegration.enabled` is `false`: run `kb ide enable`, print injected targets.

3. **Check plan.** If `runtime-plan.md` does not exist: invoke `/kb-plan` logic, write plan, print summary, ask for confirmation before executing.

4. **If plan exists:** load it and identify `current_step` (the next `pending` step).

## Execution — Batch Non-Blocking Steps (v2.0.1)

Execute multiple steps in sequence within one session unless a step requires user input. **Do not stop and ask the user to re-invoke `/kb-run` between routine non-blocking steps.**

**Blocking conditions (stop and wait for user before continuing):**
- Destructive or irreversible operation (`uninstall`, `--force`)
- Step is `custom:*` with ambiguous intent
- CLI exits non-zero (see error handling below)
- `kb intent apply` returns strategy `resolve-first`
- User's `involvement` preference is `hands-on` (per `userPersona`) — in this mode, confirm before each step

**Non-blocking (execute silently, report after all complete):**
- `init`, `update`, `maintain`, `custom:*` with clear rationale
- IDE enable/disable

For each step executed:
1. Map action to CLI:
   - `init` → `kb init --yes`
   - `update` → `kb update`
   - `maintain` → `kb maintain` (use `--fast` if step rationale mentions large workspace)
   - `uninstall` → confirm twice, then `kb uninstall`
   - `custom:*` → follow the textual rationale; do not invoke unknown CLI verbs.
2. Run via terminal tool. Capture result.
3. Mark step `(status: done)`, append log line: `<ISO timestamp> — exit=<code> — <one-line outcome>`.
4. Bump `current_step`. Update `last_updated`.

After completing the batch, print a single consolidated report:

```
Steps <n>–<m> done.
  [T-N] <action> — <outcome>
  [T-N+1] <action> — <outcome>
  ...

[INT-NNN] intent context if applicable

Manual follow-up checklist: (if any)
- [ ] <task>
  - command_or_path: <exact command>
  - expected_outcome: <condition>
  - why_manual: <reason>

What to do next:
  1. Run `/kb-run` to continue with step <m+1> (<action>).
  2. Reply `/kb-plan <change>` to adjust remaining steps.
  3. Ask a question or type a task to pause and keep talking.
```

If no `pending` steps remain:
```
Plan complete. Reply `/kb-plan` to generate a new plan, or ask a question to continue using the KB.
```

## Error Handling

If CLI exits non-zero, mark step `(status: blocked)` and stop. Parse output for known causes:

| Cause | Suggested fix (ask user `yes` first) |
|---|---|
| `working tree has N uncommitted change(s)` | `git add -A && git commit -m "chore: kb housekeeping"`, re-run step |
| `Hook file missing at .github/hooks/revision-state-guard.json` | `kb update --refresh-prompts`, re-run step |
| Doctor `WARN` only (no FAIL) | Re-run with `kb maintain --fast` |

## On `skip`
Mark `(status: skipped)` with reason `user-skip`. Move to next step.

## On `edit-plan`
Hand off to `/kb-plan` refinement flow.

## Resumability
Plan file is the single source of truth. `current_step` and `last_updated` are persisted after each batch. User can close and resume with `/kb-run` at any time.

## Boundaries
- Do not modify KB content outside what the executed CLI command does, plus the plan file.
- Never invent CLI flags. Unknown flags → stop and ask user to refine via `/kb-plan`.
- Non-zero exit → `(status: blocked)`, stop.

## v2.0 Intent Intelligence Awareness

When a step includes `kb intent apply`:
1. CLI outputs conflict strategy automatically.
2. `resolve-first` → **pause, explain steps, ask confirmation before continuing.**
3. `review-order` / `proceed-with-caution` → surface output, continue.

After 3+ intents applied in a session:
```
3+ intents applied. Run `kb intent suggest-lessons` to surface lesson candidates.
```
Do not auto-run — present as suggestion only.


## Preflight (in order)

1. **Check init state via the CLI.** The CLI is the single source of truth — do **not** rely on file_search to detect KB state, because most IDEs (VS Code, Cursor, etc.) exclude `.git/` from search by default and will report a false "partial" verdict for workspaces installed in `private-git` mode (where state lives at `.git/project-kb/state.json`).

   Run:

   ```
   kb status --json
   ```

   Parse the JSON. The `presence` field is one of `fresh | healthy | partial`:

   | `presence` | Action |
   |---|---|
   | `fresh` | Auto-init silently (see below). |
   | `healthy` | Continue to step 2. |
   | `partial` | **HALT. Do NOT auto-init.** Print the recovery guidance from `kb status` (without `--json`). Stop. |

   If the `kb` CLI is not installed in PATH, fall back to:

   ```
   npx -y @williamduong/kb@latest status --json
   ```

   Only if BOTH commands fail (network/install error), fall back to filesystem probes — and in that fallback **also** check `.git/project-kb/state.json` in addition to `knowledge-base/.kb/state.json` so private-git installs are not misclassified.

   **Auto-init (Fresh case only):**
   - `projectName` ← `package.json` `name` field, else workspace folder name.
   - `mode` ← `private-git` if `.git` directory exists, else `tracked`.
   - `contentRoot` ← `knowledge-base/` (default).
   - Run `kb init --yes`. Capture stdout. Report what was detected.

   **HALT (Partial / corrupted case):** Re-print the human-readable output of `kb status` so the user sees the same recovery hints (`kb doctor`, `git checkout HEAD -- knowledge-base/.kb/state.json`, or `kb uninstall --force` + `kb init --yes`). Stop. Do not proceed to step 2.

2. **First-run IDE integration.** If `state.ideIntegration.enabled` is `false` (or field missing):
    - Run `kb ide enable` and use its output as-is.
    - If `kb` is not on PATH, use `npx -y @williamduong/kb@latest ide enable`.
    - Do NOT import or execute internal files from global installs (for example under `node_modules/@williamduong/kb/src/*`).
    - This command owns target detection, block injection, and `state.ideIntegration` updates.
    - If the command reports injected targets, print:
     ```
     KB integration enabled. Reference block injected into:
       - <file 1>
       - <file 2>
   To disable later: run `kb ide disable`.
     ```
    - If it reports no targets, print that integration was marked enabled with zero targets and continue.

3. **Check plan.** If `knowledge-base/.kb/runtime-plan.md` does not exist:
   - Invoke `/kb-plan` logic (read inputs, decide actions, write plan).
   - Print the plan summary.
   - **Stop and ask the user to confirm** before executing step 1. Do not proceed without confirmation.

4. **If plan exists**, load it and identify `current_step` (the next `pending` step).

## Execute one step

1. Show the upcoming step:
   ```
   Next step (<current_step>): <action> — <rationale>
   Proceed? (yes / skip / edit-plan)
   ```
   Wait for the user response. If invoked as `/kb-run --auto`, skip the prompt and proceed.

2. On `yes`:
   - Map action to CLI invocation:
     - `init` → `kb init --yes`
     - `update` → `kb update`
     - `maintain` → `kb maintain` (use `kb maintain --fast` if step rationale mentions large workspace)
     - `uninstall` → confirm twice with the user, then `kb uninstall`
     - `custom:*` → follow the textual rationale; do not invoke unknown CLI verbs.
   - Run the command via the chat agent's terminal tool.
   - Capture the result.

3. Update the plan file:
   - Mark the step `(status: done)` and check the box.
   - Append a one-line log under the step: `  - <ISO timestamp> — exit=<code> — <one-line outcome>`.
   - Bump `current_step` to the next `pending` step.
   - Update `last_updated` in frontmatter.

4. Print a short report ending with an explicit "What to do next" menu:

   ```
   Step <n> done (exit=<code>). <one-line outcome>.

   What to do next (pick one):
     1. Run `/kb-run` again to execute step <n+1> (<action>).
     2. Reply `/kb-plan <change>` to adjust remaining steps before continuing.
   3. Reply with a question or task (`/kb-ask ...` or plain chat) to pause execution and keep talking.
   ```

    If any required work remains manual (for example: user confirmation, external system check, command the agent cannot run, or unresolved verification), print this block immediately before `What to do next`:

    ```markdown
    Manual follow-up checklist:
    - [ ] <task>
       - command_or_path: <exact CLI command OR exact IDE/UI navigation path>
       - expected_outcome: <observable success condition>
       - why_manual: <short reason>
    ```

    Do not print the block when no manual follow-up remains.

   If there is no `pending` step left, replace the menu with:

   ```
   No pending steps. The plan is complete. Reply `/kb-plan` to generate a new one, or `/kb-ask <question>` to keep using the KB.
   ```

5. Stop. Do not chain to the next step automatically (unless `--auto` was passed; then loop until next pending step requires user input or none remain).

## On non-zero exit

If the CLI exits non-zero, mark the step `(status: blocked)` with the exit code and stop. **Before declaring the step blocked, parse the CLI output for known recoverable causes and offer a one-line fix that the user can confirm with `yes`:**

| Cause (in stderr / stdout) | Suggested fix (ask user `yes` first) |
|---|---|
| `working tree has N uncommitted change(s)` from `kb maintain --strict` | Suggest `git add -A && git commit -m "chore: kb housekeeping"`, then re-run the same step. |
| `Hook file missing at .github/hooks/revision-state-guard.json` (WARN) | Suggest `kb update --refresh-prompts` (re-copies template files including the hook), then re-run. |
| Doctor `WARN` items only (no FAIL) | Suggest re-running with `kb maintain --fast` (skips strict mode). |

For any other non-zero exit, just print the captured output and the menu — do not invent fixes.

If the failure requires user-only actions (credentials, privileged access, external approvals, or unavailable environment), include the `Manual follow-up checklist` block before the menu.

## On `skip`

- Mark the step `(status: skipped)` with reason `user-skip`.
- Bump `current_step` and print the new next step.

## On `edit-plan`

- Hand off to `/kb-plan` refinement flow.

## Resumability

- The plan file is the single source of truth. After every step, `current_step` and `last_updated` are persisted. The user can close everything and run `/kb-run` later to resume from the same point.
- If the user manually edits the plan file between runs, respect their edits. Re-derive `current_step` from the first `pending` step if frontmatter is stale.

## Toggles

- `kb ide disable` disables IDE integration.
- `kb ide enable` enables IDE integration.

## Boundaries

- Do not run more than one step per `/kb-run` call (unless `--auto`).
- Do not modify the KB outside what the executed CLI command does, plus the plan file and (during preflight) IDE rule files.
- Never invent CLI flags. If a step requires an unknown flag, stop and ask the user to refine the plan via `/kb-plan`.
- If any CLI command exits non-zero, mark the step `(status: blocked)` with the exit code and stop. Do not bump `current_step`.

## v2.0 Intent Intelligence Awareness

When executing a step that includes `kb intent apply`:

1. The CLI automatically runs conflict analysis and outputs a strategy (`proceed` / `review-order` / `resolve-first`).
2. If the strategy is `resolve-first`: **pause, surface the strategy and its steps to the user, and ask for confirmation before continuing**. Do not auto-proceed through a `resolve-first` warning.
3. If the strategy is `review-order` or `proceed-with-caution`: surface the output, then continue normally.

After applying 3 or more intents in a session, proactively suggest:

```
You have applied 3+ intents. Run `kb intent suggest-lessons` to surface lesson candidates from the pattern evidence.
```

Do not auto-run `suggest-lessons` — present it as a suggestion only.
