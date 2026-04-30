---
name: KB Run
type: directive
category: knowledge-management
scope: project
trigger: /kb-run
version: 1.1.0
---

# /kb-run — Execute the next step of the KB runtime plan

Your task: execute one step at a time from `knowledge-base/.kb/runtime-plan.md`, persisting progress so the user can resume after closing the chat or IDE.

You operate under the master `@kb` agent contract at `.github/agents/kb.agent.md`.

## Preflight (in order)

1. **Check init state.** Probe the workspace for KB artifacts:

   - `A` = `knowledge-base/.kb/state.json` exists AND parses as valid JSON with a `schemaVersion` field.
   - `B` = `knowledge-base/` directory exists (any contents).
   - `C` = `.github/agents/kb.agent.md` exists.
   - `D` = `.github/prompts/kb-plan.prompt.md` or `kb-run.prompt.md` exists.

   Decide based on the combination:

   | Case | Condition | Action |
   |------|-----------|--------|
   | Fresh | `!A && !B && !C && !D` | Auto-init silently (see below). |
   | Healthy | `A` is true | Continue to step 2. |
   | **Partial / corrupted** | `!A` BUT any of `B`, `C`, `D` is true | **HALT. Do NOT auto-init.** |

   **Auto-init (Fresh case only):**
   - `projectName` ← `package.json` `name` field, else workspace folder name.
   - `mode` ← `private-git` if `.git` directory exists, else `tracked`.
   - `contentRoot` ← `knowledge-base/` (default).
   - Run `kb init --yes`. Capture stdout. Report what was detected.

   **HALT message (Partial / corrupted case):**

   ```
   KB state appears partial or corrupted.

   Detected artifacts:
     - knowledge-base/        : <yes|no>
     - .github/agents/kb.agent.md : <yes|no>
     - .github/prompts/kb-*.prompt.md : <yes|no>
     - knowledge-base/.kb/state.json : <missing|invalid JSON|missing schemaVersion>

   I will NOT auto-run `kb init` because that would overwrite existing KB
   content and lose your context.

   Please troubleshoot first:
     1. `kb doctor`               # diagnose environment
     2. `kb status`               # check what state can be read
     3. Restore `state.json` from git if it was deleted by accident:
        `git checkout HEAD -- knowledge-base/.kb/state.json`
     4. If you intentionally want a clean install, run:
        `kb uninstall --force`  then  `kb init --yes`

   Re-run `/kb-run` after the state is healthy.
   ```

   Stop. Do not proceed to step 2.

2. **First-run IDE integration.** If `state.ideIntegration.enabled` is `false` (or field missing) AND this is the first `/kb-run` invocation in this workspace:
   - Detect IDE targets via `src/lib/ide-detect.js` (`selectInjectionTargets`).
   - For each target, call `injectBlock` to write a one-line KB-MANAGED reference to `.github/agents/kb.agent.md`.
   - Update `state.ideIntegration` to `{ enabled: true, targets: [{ file, injectedAt: <ISO> }, ...] }`.
   - Print:
     ```
     KB integration enabled. Reference block injected into:
       - <file 1>
       - <file 2>
     To disable later: type `@kb disable ide-integration`.
     ```

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

4. Print a short report:
   ```
   Step <n> done. Next: step <n+1> (<action>) — run /kb-run again to continue.
   ```

5. Stop. Do not chain to the next step automatically (unless `--auto` was passed; then loop until next pending step requires user input or none remain).

## On `skip`

- Mark the step `(status: skipped)` with reason `user-skip`.
- Bump `current_step` and print the new next step.

## On `edit-plan`

- Hand off to `/kb-plan` refinement flow.

## Resumability

- The plan file is the single source of truth. After every step, `current_step` and `last_updated` are persisted. The user can close everything and run `/kb-run` later to resume from the same point.
- If the user manually edits the plan file between runs, respect their edits. Re-derive `current_step` from the first `pending` step if frontmatter is stale.

## Toggles

- `@kb disable ide-integration` → call `removeBlock` for every entry in `state.ideIntegration.targets`, set `state.ideIntegration.enabled = false`, clear `targets`.
- `@kb enable ide-integration` → re-run preflight step 2.

## Boundaries

- Do not run more than one step per `/kb-run` call (unless `--auto`).
- Do not modify the KB outside what the executed CLI command does, plus the plan file and (during preflight) IDE rule files.
- Never invent CLI flags. If a step requires an unknown flag, stop and ask the user to refine the plan via `/kb-plan`.
- If any CLI command exits non-zero, mark the step `(status: blocked)` with the exit code and stop. Do not bump `current_step`.
