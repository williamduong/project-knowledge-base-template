---
title: How to Use This Knowledge Base Template
type: guide
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: 2026-05-02
last_verified: 2026-05-01
related:
  - ../INDEX.md
  - intent-index.md
  - project-scope-matrix.md
  - ../15-governance/review-cadence.md
tags:
  - guide
  - usage
  - onboarding
---

# How to Use This Knowledge Base Template

## Why This Guide Exists

This file is the human/operator onboarding contract.

- `how-to-use-this-kb.md`: explains decisions, governance rules, and operating model in one place for maintainers and teams.
- `.github/agents/kbx.agent.md` and prompt files: machine-facing execution contract for IDE agents.

They are complementary, not duplicates. Agents can execute without this file, but teams lose a stable, reviewable policy reference if this file is missing.

## Audience Paths

- New engineer: 00 -> 03 -> 05/04 -> 06 -> 07
- Product/BA: 00 -> 01 -> 02 -> 03
- QA: 00 -> 10 -> 08 -> 09
- Operations/SRE: 00 -> 09 -> 08 -> 07
- AI agent: 00 -> 15 -> task-specific folders

## Working Mode

1. Pick project archetype in [project-scope-matrix.md](project-scope-matrix.md)
2. Fill only docs needed for that archetype
3. Keep unneeded docs as placeholders (do not delete immediately)
4. After first release, archive or remove unused modules via governance process

## Three-Layer KB Model (Do Not Mix)

This template ecosystem has three separate layers:

1. Template source layer: `template/` (what is shipped to downstream users)
2. Local maintainer layer: `svfactory/` (internal SV Factory notes, committed in this repo but excluded from npm `files` whitelist)
3. Installed runtime KB layer: `<contentRoot>/...` created by `kbx init` in a target repository

Where `<contentRoot>` resolves to:

- Tracked mode: `knowledge-base/`
- Private-git mode: `.git/project-kb/content/` (with visible mount via `knowledge-base/`)

Runtime commands must operate on `<contentRoot>`, not on `template/`.

## Focus Ownership Model

- Maintainer internal focus (authoring this template repo): `svfactory/focus.md` (committed, not shipped)
- Project runtime focus (downstream repo execution): `<contentRoot>/.kb/runtime-plan.md` + `kbx intent` workspaces

If both exist, runtime focus is the source of truth for project execution status. Local SV Factory focus is only for maintainer coordination.

## Intent-First And Version-Scoped Planning (Mandatory)

From now on, all non-trivial KB planning work must be intent-first and version-scoped.

Required chain:

1. Strategic backlog item with explicit target version (`vX.Y` or `vX.Y.x`)
2. Active owner intent under `<contentRoot>/intents/_active/<version-scope-id>/`
3. Intent `plan.md` and `impact.md`
4. Task-level steps tracked inside the intent plan

Operational rules:

- Do not create new long-term roadmap docs in `notes/`.
- `notes/` stays for historical evidence and short-lived scratch only.
- If a task mutates KB structure or content across multiple files, create or resume an intent first.
- Keep one active owner intent per version scope to avoid planning drift.

## Legacy Intent Schema Maintenance (v2.4)

If a downstream KB was created before the v2.4 intent schema, treat intent maintenance as two separate operations:

1. Advisory cleanup: run `kbx intent cleanup --json` to find missing `focus.current`, `focus.next_action`, `focus.last_updated`, and `architecture_position.wave` fields.
2. Schema migration: run `kbx migrate --to=v2.4.0 --dry-run --json` to preview legacy intent frontmatter rewrites before writing them.

Use cleanup for owner-facing planning gaps. Use migration for legacy schema fields such as `status` or `lifecycle_state` that now need canonical `schema_version`, `legacy_status`, and `legacy_lifecycle_state` handling.

Migration write-path semantics in v2.4:

- Full-write applies to active and closed intents.
- Archive intents remain marker-only (read-only during migrate write).
- Renamed legacy fields (`status`, `lifecycle_state`) are removed after their values are preserved in `legacy_status` and `legacy_lifecycle_state`.

Operational expectation:

- Run cleanup before a release or major maintenance sweep.
- Run migrate before claiming a legacy KB is fully aligned with v2.4 intent governance.
- Treat archive folders as marker-only in v2.4 migration; active and closed intents are the writable path.

## Default Decisions Before Scanning

- Verification strategy default: maximize `code-verified` coverage and execute it in phases.
- Start with the most operationally important `reference` and `implementation` docs, then expand section by section.
- Use `design-only` only for architecture or target-state material that genuinely cannot be verified yet.
- Use `unverified` as a temporary fallback, not as the default operating mode.
- Review queue source of truth default: keep it in [strategic-backlog.md](strategic-backlog.md).
- If an external issue tracker is used later, treat KB as the initial canonical queue and mirror outwards only when automation justifies it.

## Frontend Taxonomy Guard

- `Frontend codebase` means first-party client runtime code in this repository (for example SPA/SSR/mobile UI source).
- `Browser-facing integration surface` means externally exposed UI surfaces that are generated or hosted by backend/runtime components (for example Swagger UI at `/api/docs`, Redoc, GraphQL explorer).
- Swagger UI is treated as backend API documentation surface by default, not evidence that the repository contains a first-party frontend codebase.
- If the project has no first-party frontend codebase, state this explicitly in `00-start-here/current-state.md` and `06-api/api-overview.md`.
- Use `04-frontend/` only for real client codebase architecture or explicit consumer-surface integration docs. Keep backend API docs UI details primarily in `06-api/`.

For canonical terminology and examples, read [terminology-guard.md](terminology-guard.md).

## Fast Retrieval Strategy

- Use [intent-index.md](intent-index.md) for search by document type and task intent.
- Use folder-level README or index files for search by technical area.
- Maintain tags in frontmatter with consistent vocabulary.
- Keep aliases and domain terms in glossary.

## Lifecycle For Add / Edit / Delete

1. Add: apply register-first workflow before creating a file.
2. Register-first workflow:
  - Decide folder strategy: reuse existing folder or create a new folder with explicit rationale.
  - Decide edit vs create: prefer editing an existing file if the scope fits.
  - If creating new file: declare purpose, filename, and target path before writing.
  - Register routing in the same change set (intent-index, code-qa-index, or folder index).
3. Add implementation: create file from [../14-templates/](../14-templates/) and keep frontmatter valid.
4. Edit: update content, last_updated, and verification fields.
5. Delete: replace with stub + redirect first, then remove in next review cycle.
6. Move/Rename: update incoming links and index entries in same change set.

## AI Agent Usage Protocol

1. Read [../15-governance/metadata-schema.md](../15-governance/metadata-schema.md)
2. Read [repository-revision-state.md](repository-revision-state.md) and compare stored git baseline with current `HEAD` before broad maintenance, migration, or upgrade work
3. If the baseline differs from `HEAD`, inspect git log and diff from the stored revision to current state, then run the maintenance loop from governance docs before trusting stale content
4. Respect verification and time_state before quoting facts
5. For code-impact tasks, update docs in same PR when feasible
6. Log assumptions in Open Questions section if evidence is missing
7. Do not ask the user to choose verification mode or queue location unless the repository already has a conflicting standard.
## Getting Started: Initialize and Build Your KB

### Quick Start Flow

Default user workflow is centered on four commands:

- `kbx init`
- `kbx update`
- `kbx maintain`
- `kbx uninstall`

Power-user commands are still available via `kbx help --advanced`.

**Step 1: Initialize KB in your workspace**

> **Two-step bootstrap.** The `@kbx` agent and the `/kbx-plan` + `/kbx-run` chat prompts are **per-project files**. They are written into your repo only by `kbx init`. Until then, your IDE chat does not know about `@kbx`. Order is always: install (or `npx`) the CLI → `kbx init` inside the target repo → chat with `@kbx` / `/kbx-run`.

```bash
# Fastest path: one-liner with npx, no global install
cd <your-repo>
npx @williamduong/kbx@latest init --yes

# OR — global install if you'll use `kb` often
npm install -g @williamduong/kbx@latest
cd <your-repo>
kbx init
# Mode is auto-detected: private-git (if .git exists) or tracked.
# If no git repo exists, kbx init falls back to tracked mode with a warning.
```

After `kbx init` completes, you'll see:
- KB template copied to your repo (in `.git/project-kb/` or `knowledge-base/`)
- `.github/agents/kbx.agent.md` — master KB agent (Q&A oracle, structural guardian)
- `.github/prompts/kbx-plan.prompt.md` — `/kbx-plan` analyzer
- `.github/prompts/kbx-run.prompt.md` — `/kbx-run` step executor (auto-inits if needed)
- Handoff summary printed to terminal

**Step 2: Drive the KB from chat (`/kbx-run`)**

Open Copilot Chat (VS Code, Cursor, Claude, or any agent that resolves `AGENTS.md`) and run:

```
/kbx-plan      Analyze the workspace and write a runtime plan
/kbx-run       Execute the next pending step (auto-inits if state is missing)
```

`/kbx-run` is resumable — close the IDE, come back later, run again to continue from `current_step`.

You can also ask the master agent directly:

```
@kbx What database does this project use?
@kbx What are the main components?
@kbx How do I add an extension/plugin?
@kbx audit metadata
@kbx status
```

The `@kbx` master agent uses the routing table at [code-qa-index.md](code-qa-index.md) to load only the relevant docs before answering, then falls back to bounded source-code search if KB evidence is incomplete.

Reference: [.github/agents/kbx.agent.md](.github/agents/kbx.agent.md) for the full agent contract (3 roles, governance, output format).

**Step 3: Review and continue**

After each step:
- Review the plan file at `.kb/runtime-plan.md`
- Fill in high-priority items (marked P0 in [strategic-backlog.md](strategic-backlog.md))
- Run `/kbx-run` again to continue, or `kbx maintain` from CLI for the same pipeline

### Maintenance: Keep KB in Sync Over Time

Either:

```bash
kbx maintain          # full pipeline (sync + doc:gate + test --all + doctor --strict)
kbx maintain --fast   # quick mode (sample test, non-strict doctor)
```

or chat-driven:

```
/kbx-run              # next step in the plan; if drift detected, plan adds a maintain step
```

### Troubleshooting: partial or corrupted KB state

If `knowledge-base/.kb/state.json` is missing or invalid but other KB artifacts (`knowledge-base/`, `.github/agents/kbx.agent.md`, `.github/prompts/kbx-*.prompt.md`) still exist, `/kbx-run` and `@kbx` will **HALT and refuse to auto-run `kbx init`**. This is intentional — re-running `init` would overwrite your existing KB content.

Recover in this order:

1. `kbx doctor` — diagnose environment.
2. `kbx status` — see what state can still be read.
3. Restore from git if the state file was deleted by accident:
   ```bash
   git checkout HEAD -- knowledge-base/.kb/state.json
   ```
4. Only if you intentionally want a clean reinstall:
   ```bash
   kbx uninstall --force
   kbx init --yes
   ```

After the state is healthy, re-run `/kbx-run`.

### Advanced: CLI Commands for Custom Workflows

If you prefer CLI-driven workflows:

```bash
kbx help                    # show basic commands
kbx help --advanced         # show all advanced commands
kbx maintain                # full maintenance pipeline
kbx maintain --fast         # quicker checks for large projects
kbx bootstrap              # scan code, generate stubs
kbx index                  # build KB summary report
kbx questions --batch 5    # generate intake Q&A
kbx normalize-state        # assign kb_state to unset docs
kbx doctor                 # publish-readiness checks
kbx sync                   # detect KB drift from source
kbx update                 # refresh KB version state
```

### Release Pipeline: Declarative Release Automation (v1.6)

Use `kbx release` to manage structured, auditable release workflows defined as YAML pipelines.

**Quick workflow:**

```bash
# Step 1: Initialize your pipeline (once per project)
kbx release init-pipeline --template=npm-package
# Options: npm-package | docs-only | custom

# Step 2: Preview what the pipeline will do
kbx release plan --from=v1.5.0 --bump=patch

# Step 3: Execute (requires clean kbx status)
kbx release run --from=v1.5.0 --bump=patch

# Dry-run mode (no destructive side-effects)
kbx release run --from=v1.5.0 --bump=patch --dry-run
```

Pipeline YAML lives at `.kb/release-pipeline.yaml` inside your KB content root.

Steps support:
- Shell command execution with output capture: `run: <shell command>`
- Template interpolation: `${{ inputs.bump }}`, `${{ outputs.<step>.version }}`
- Confirm gates: `confirm: true` pauses for user approval before continuing
- Pre-execution rejection of dangerous patterns (`rm -rf /`, `curl | bash`, `git push --force`, etc.)

For starter templates and examples, see [`../16-release-pipelines/`](../16-release-pipelines/).
For governance rules (storage path, security scope, hook behavior), see [`../15-governance/release-pipeline-policy.md`](../15-governance/release-pipeline-policy.md).

### Intent Workflow: Structured KB Changes (v1.7)

Use `kbx intent` to manage KB changes as structured, traceable workspaces. Every meaningful change gets an intent workspace that captures origin, staged files, apply record, and archived evidence for future learning loops.

**Quick workflow:**

```bash
# Create an intent workspace (ID suggested from git branch)
kbx intent create --mode=quick --change-type=docs
# Full mode (adds plan.md + impact.md)
kbx intent create --mode=full --change-type=feature

# Check status of a specific intent or all active intents
kbx intent status <id>
kbx intent status

# List all active intent IDs
kbx intent list

# Apply: write staged files to KB core, archive workspace
kbx intent apply <id> --yes
# Apply then run release pipeline in one command
kbx intent apply <id> --release --yes

# Discard intent (irreversible)
kbx intent cancel <id>
```

**Staged files live at:** `<contentRoot>/intents/_active/<id>/proposed-changes/<relative-from-svfactory>`

Example: to update `template/15-governance/review-cadence.md`, stage the file at  
`proposed-changes/template/15-governance/review-cadence.md` inside the intent workspace.

Mode examples:

- Tracked mode: `knowledge-base/intents/_active/<id>/proposed-changes/...`
- Private-git mode: `.git/project-kb/content/intents/_active/<id>/proposed-changes/...`

**After apply:**
- Staged files are written to the KB content root.
- An `apply-record.json` is written with evidence fields (change_scope, impact_signals, decision_summary).
- The intent workspace is moved to `knowledge-base/intents/_archive/<id>-<timestamp>/`.
- Applied intents are recorded in the release ledger entry (`intents_applied[]`) when `kbx release tag` is run.

For Recorder role responsibilities and doctrine, see [`../15-governance/self-evolution-doctrine.md`](../15-governance/self-evolution-doctrine.md).

## Prompting Help

- For the best prompt patterns by goal, read [../12-ai-skills/prompting-guide.md](../12-ai-skills/prompting-guide.md).
- For ready-to-use prompt snippets, read [../12-ai-skills/prompt-pack.md](../12-ai-skills/prompt-pack.md).

## Definition Of Done For A Doc Update

- Frontmatter valid and complete
- Current State and Target State separated
- Evidence section updated
- Related links and index references updated
- No project-specific secrets or credentials


