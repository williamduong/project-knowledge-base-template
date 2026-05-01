---
title: How to Use This Knowledge Base Template
type: guide
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: 2026-05-01
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

## Default Decisions Before Scanning

- Verification strategy default: maximize `code-verified` coverage and execute it in phases.
- Start with the most operationally important `reference` and `implementation` docs, then expand section by section.
- Use `design-only` only for architecture or target-state material that genuinely cannot be verified yet.
- Use `unverified` as a temporary fallback, not as the default operating mode.
- Review queue source of truth default: keep it in [finalization-plan.md](finalization-plan.md).
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

- `kb init`
- `kb update`
- `kb maintain`
- `kb uninstall`

Power-user commands are still available via `kb help --advanced`.

**Step 1: Initialize KB in your workspace**

> **Two-step bootstrap.** The `@kb` agent and the `/kb-plan` + `/kb-run` chat prompts are **per-project files**. They are written into your repo only by `kb init`. Until then, your IDE chat does not know about `@kb`. Order is always: install (or `npx`) the CLI → `kb init` inside the target repo → chat with `@kb` / `/kb-run`.

```bash
# Fastest path: one-liner with npx, no global install
cd <your-repo>
npx @williamduong/kb@latest init --yes

# OR — global install if you'll use `kb` often
npm install -g @williamduong/kb@latest
cd <your-repo>
kb init
# Mode is auto-detected: private-git (if .git exists) or tracked.
# If no git repo exists, kb init falls back to tracked mode with a warning.
```

After `kb init` completes, you'll see:
- KB template copied to your repo (in `.git/project-kb/` or `knowledge-base/`)
- `.github/agents/kb.agent.md` — master KB agent (Q&A oracle, structural guardian)
- `.github/prompts/kb-plan.prompt.md` — `/kb-plan` analyzer
- `.github/prompts/kb-run.prompt.md` — `/kb-run` step executor (auto-inits if needed)
- Handoff summary printed to terminal

**Step 2: Drive the KB from chat (`/kb-run`)**

Open Copilot Chat (VS Code, Cursor, Claude, or any agent that resolves `AGENTS.md`) and run:

```
/kb-plan      Analyze the workspace and write a runtime plan
/kb-run       Execute the next pending step (auto-inits if state is missing)
```

`/kb-run` is resumable — close the IDE, come back later, run again to continue from `current_step`.

You can also ask the master agent directly:

```
@kb What database does this project use?
@kb What are the main components?
@kb How do I add an extension/plugin?
@kb audit metadata
@kb status
```

The `@kb` master agent uses the routing table at [code-qa-index.md](code-qa-index.md) to load only the relevant docs before answering, then falls back to bounded source-code search if KB evidence is incomplete.

Reference: [.github/agents/kb.agent.md](.github/agents/kb.agent.md) for the full agent contract (3 roles, governance, output format).

**Step 3: Review and continue**

After each step:
- Review the plan file at `.kb/runtime-plan.md`
- Fill in high-priority items (marked P0 in [finalization-plan.md](finalization-plan.md))
- Run `/kb-run` again to continue, or `kb maintain` from CLI for the same pipeline

### Maintenance: Keep KB in Sync Over Time

Either:

```bash
kb maintain          # full pipeline (sync + doc:gate + test --all + doctor --strict)
kb maintain --fast   # quick mode (sample test, non-strict doctor)
```

or chat-driven:

```
/kb-run              # next step in the plan; if drift detected, plan adds a maintain step
```

### Troubleshooting: partial or corrupted KB state

If `knowledge-base/.kb/state.json` is missing or invalid but other KB artifacts (`knowledge-base/`, `.github/agents/kb.agent.md`, `.github/prompts/kb-*.prompt.md`) still exist, `/kb-run` and `@kb` will **HALT and refuse to auto-run `kb init`**. This is intentional — re-running `init` would overwrite your existing KB content.

Recover in this order:

1. `kb doctor` — diagnose environment.
2. `kb status` — see what state can still be read.
3. Restore from git if the state file was deleted by accident:
   ```bash
   git checkout HEAD -- knowledge-base/.kb/state.json
   ```
4. Only if you intentionally want a clean reinstall:
   ```bash
   kb uninstall --force
   kb init --yes
   ```

After the state is healthy, re-run `/kb-run`.

### Advanced: CLI Commands for Custom Workflows

If you prefer CLI-driven workflows:

```bash
kb help                    # show basic commands
kb help --advanced         # show all advanced commands
kb maintain                # full maintenance pipeline
kb maintain --fast         # quicker checks for large projects
kb bootstrap              # scan code, generate stubs
kb index                  # build KB summary report
kb questions --batch 5    # generate intake Q&A
kb normalize-state        # assign kb_state to unset docs
kb doctor                 # publish-readiness checks
kb sync                   # detect KB drift from source
kb update                 # refresh KB version state
```
## Prompting Help

- For the best prompt patterns by goal, read [../12-ai-skills/prompting-guide.md](../12-ai-skills/prompting-guide.md).
- For ready-to-use prompt snippets, read [../12-ai-skills/prompt-pack.md](../12-ai-skills/prompt-pack.md).

## Definition Of Done For A Doc Update

- Frontmatter valid and complete
- Current State and Target State separated
- Evidence section updated
- Related links and index references updated
- No project-specific secrets or credentials
