# Project Knowledge Base Template

This repository is a multi-project knowledge base template for documenting software systems, delivery decisions, architecture, operations, security, testing, and agent workflows.

It is designed for teams that want a consistent documentation baseline across different project archetypes such as web apps, API platforms, data and AI systems, internal enterprise tools, and extension or integration products.

## Current Runtime Focus

- Runtime focus: `v2.3.x (solo-first)`
- Current messaging baseline: prioritize executable now-path (`init -> bootstrap -> index -> next`) and avoid over-claiming deferred phases
- License: GNU AGPL v3 with separate commercial licensing available
- Baseline state file for downstream projects: [template/00-start-here/repository-revision-state.md](template/00-start-here/repository-revision-state.md)

## CLI Preview

This repository now includes a preview CLI scaffold (`kb`) for local initialization and maintenance workflow bootstrapping.

### Quick Start (5-minute path)

```bash
cd <your-repo>
npx @williamduong/kb@latest init --yes
kb bootstrap --dry-run
kb bootstrap
kb index
kb next
```

The first command installs the KB template, the `@kb` master agent, and the `/kb-plan` + `/kb-run` chat prompts into your repo. Then run the follow-up commands to scaffold docs, build index, and get the next best action from `kb next`.

> **Two-step bootstrap (important).** The `@kb` agent and `/kb-*` prompts are **per-project files** that live in your repo's `.github/`. They do not exist until `kb init` writes them. Order is always: **(1) install or `npx` the CLI → (2) `kb init` inside the target repo → (3) chat with `@kb` / `/kb-run`**.

### Other usage modes

Run directly from this repository:

```bash
node ./bin/kb.js help
```

Global install mode (after publish):

```bash
npm install -g @williamduong/kb@latest
kb help
```

One-off usage with npx:

```bash
npx @williamduong/kb help
```

Core lifecycle commands (default user path):

- `init [--mode private-git|tracked] [--brand <name>] [--yes]` - Install KB into the workspace.
- `bootstrap [--dry-run]` - Generate initial stub docs from source signals.
- `index` - Build KB index summary.
- `next [--json]` - Show the next best KB action by priority (drift -> review -> missing -> source).
- `update [--accept-baseline]` - Sync state and refresh template version metadata.
- `maintain [--accept-baseline] [--fast]` - Run one maintenance pipeline (sync + checks).
- `uninstall [--keep-ai-files] [--remove-hook] [--force]` - Remove KB setup from workspace.

No git repository detected?

- `kb init` automatically falls back to `tracked` mode and prints a warning.
- Run `git init` first if you want `private-git` mode.

Advanced commands remain available via `kb help --advanced`.

## Three-Layer Power Surface

KB ships three complementary layers; pick whichever matches your workflow.

| Layer | Surface | When to use |
|---|---|---|
| **CLI (35+ commands)** | `kb init` / `kb update` / `kb maintain` / `kb intent *` / `kb graph *` / `kb chaos` / `kb release *` / ... | Power user, CI, scripting. Deterministic. |
| **Prompts (2)** | `/kb-plan` and `/kb-run` in any agent chat (Copilot, Cursor, Claude) | Step-by-step, resumable. `/kb-run` auto-inits if needed and executes one step per call. |
| **Master agent** | `@kb` in chat | Code Q&A oracle, structural guardian (bi-temporal, metadata schema), governance, intent conflict resolution (v2.0 Role 4 Reasoner). Backed by `.github/agents/kb.agent.md`. |

Examples:

```text
@kb What database does this project use and how does it connect?
@kb What are the main components?
@kb How do I add an extension/plugin?
@kb audit metadata
@kb status
```

Plan + run pipeline (no CLI typing required after install):

```text
/kb-plan         # writes knowledge-base/.kb/runtime-plan.md
/kb-run          # executes the next pending step (resumable)
```

Currently implemented commands:

**Scaffold & Fill**

- `init [--mode private-git|tracked] [--brand <name>] [--skip-adapters] [--install-hooks] [--skip-bootstrap] [--skip-index]` — Auto-detects mode when `--mode` is omitted, creates project-scoped KB agent and handoff prompts
- `bootstrap [--dry-run] [--no-fill-placeholders]` — Scan source code and generate stub docs for architecture, backend, API, database, and operations tiers
- `index [--watch]` — Build KB summary report: doc count, placeholder count, fill rate per tier
- `questions [--print] [--chat] [--batch <n>] [--batch-size <n>]` — Generate intake questions from unresolved placeholders; use batch output for a 5-question AI chat handoff
- `mark --file <relative-md-path> --state <template|autofilled|needs-review|verified|blocked>` — Set `kb_state` on a specific doc without renaming files
- `normalize-state [--dry-run]` — Assign `kb_state: template` to all docs that are currently unset

**Lifecycle**

- `plan list` / `plan add "<description>" [--owner <name>] [--priority P0|P1|P2]` — Manage finalization-plan.md
- `show [--backup-existing]` (private-git mode)
- `hide [--restore-backup]` (private-git mode)
- `test [--sample <count>] [--all]`
- `sync [--accept-baseline]`
- `update [--accept-baseline]`
- `maintain [--accept-baseline] [--fast]`
- `doctor [--json] [--strict]`
- `status [--json]` — Report KB install state (fresh / healthy / partial)
- `ide <enable|disable> [--dry-run]` — Inject/remove KB-MANAGED IDE integration blocks
- `uninstall [--keep-ai-files] [--remove-hook] [--force]` — Remove KB content and generated AI helper files from the workspace

**Analysis & Intelligence**

- `impact <doc-or-code> [--depth=N]` — Recursive impact analysis: traverses related_strong + binds_to links
- `scan [--recursive] [--depth=N]` — Scan git diff (baseline..HEAD), bind code changes to docs, write impact.json; also reports stale source-mirror docs when source-index.json is present (v2.2)
- `verify <doc>` / `verify --all` — Bump last_verified + last_verified_commit, clear resolved entries from impact.json
- `baseline show` / `baseline set <sha>` / `baseline set --to-head` — Manage the source git baseline
- `chaos [--quiet] [--no-save] [--scan-src <dir>]` (v1.8) — Compute KB Chaos Coefficient (0–100): aggregates technical debt, entropy, coverage gap, cognitive load, instability; detects spikes ≥10 pts vs previous snapshot; stale source-mirror docs reduce coverage score (v2.2)

**Graph (v1.9)**

- `graph export [--output=<path>]` — Write JSONL of KB entities + relations (deterministic)
- `graph check` — Run consistency checks: missing-node-reference, invalid-relation-type, duplicate-entity-id

**Intent Workspace (v2.0)**

- `intent create [<id>] [--mode=quick|full] [--change-type=<type>]` — Create a structured intent workspace for a KB change batch
- `intent status [<id>]` — Show staged files, warnings, plan/impact presence for one or all intents
- `intent list` — List all active intent IDs
- `intent apply <id> [--release] [--yes]` — Write staged files to KB core, archive workspace, optionally trigger release pipeline
- `intent cancel <id>` — Delete an active intent workspace (irreversible)
- `intent suggest-lessons` — Analyze recent applied intents and surface lesson candidates for KB improvement
- `intent extract <commit-range> [--title=...] [--type=...]` — (v2.1) Retroactively package ad-hoc KB commits into archived sub-intents

**Source Mirror (v2.2)**

- `extract <source-file> [--target-doc=<path>] [--model=<hint>] [--yes]` — Generate an AI extraction prompt for a source file; track source→doc linkage in `.kb/source-index.json`. CLI does **not** call any LLM — it creates a prompt file the user runs in their AI tool.
- `extract --uncovered` — List source files tracked in source-index without a covering KB doc

**Release Catalog & Pipeline**

- `release init` — Build catalog from git tags\n- `release tag <version> --summary=...` — Append one release from an existing git tag
- `release list` / `release show <version>` — Browse catalog entries
- `release notes <version> [--from=<tag>] [--output=<path>]` — Generate release notes from git range
- `release init-pipeline [--template=npm-package|docs-only|custom]` — Copy a starter pipeline into `.kb/release-pipeline.yaml`
- `release plan [--bump=patch|minor|major]` — Dry-run alias: print resolved step plan, no execution
- `release run [--bump=patch|minor|major] [--yes]` — Execute release pipeline

**AI IDE Adapter Files**

`kb init` automatically generates the relevant adapter file for the active AI IDE and also creates project-scoped Copilot prompt files:

| File | IDE |
|------|-----|
| `AGENTS.md` | VS Code / Generic agent context |
| `CLAUDE.md` | Claude Projects |
| `.cursor/rules/kb.mdc` | Cursor |
| `.windsurfrules` | Windsurf |
| `.clinerules` | Cline |

It also creates:

- `.github/agents/kb.agent.md` — master KB agent (Q&A oracle, structural guardian)
- `.github/prompts/kb-plan.prompt.md` — `/kb-plan` analyzer
- `.github/prompts/kb-run.prompt.md` — `/kb-run` step executor (auto-inits if needed)

Skip adapter generation with `--skip-adapters` if not needed.

Recommended first-run flow after global install:

```bash
kb help
kb init
kb maintain

# Or, fully agent-driven (no CLI typing after install):
# Open Copilot Chat in your workspace and run:
#   /kb-run
```

Pre-publish artifact simulation:

```bash
npm run doctor:json
npm run pack:smoke
npm run release:dry
```

Generate release notes from git history (new v1.5 flow):

```bash
npm run release:notes -- v1.1.1 -- --from=v1.1.0 --format=md
```

Release notes remain `manual-only`: they do not auto-update on every commit push and are reviewed before being copied into `template/TEMPLATE_CHANGELOG.md`.

Write output to a file for review:

```bash
npm run release:notes -- v1.1.1 -- --from=v1.1.0 --output=notes/release-v1.1.1.md --format=md
```

Legacy path `tools/generate-template-changelog.js` is deprecated and retained only as a compatibility wrapper.

### Release Pipeline (v1.6)

Declare your release workflow as YAML and execute it with `kb release run`. Steps run sequentially, outputs are captured, and dangerous commands are rejected before execution.

Release execution modes:

- Path A (recommended): pipeline-first with `kb release init-pipeline` + `kb release plan` + `kb release run`.
- Path B (fallback): manual command flow in [`notes/npm-release-checklist.md`](notes/npm-release-checklist.md).

```bash
# Initialize a pipeline in your KB (once per project)
kb release init-pipeline --template=npm-package
# Available templates: npm-package | docs-only | custom

# Preview what the pipeline will do without executing
kb release plan --from=v1.5.0 --bump=patch

# Execute the pipeline (requires clean kb status)
kb release run --from=v1.5.0 --bump=patch

# Dry-run: execute all steps except destructive shell commands
kb release run --from=v1.5.0 --bump=patch --dry-run
```

The pipeline file lives at `.kb/release-pipeline.yaml` inside your KB content root. Pipeline execution:

1. Pre-checks `kb status` — fails fast if workspace is `attention` or `blocked`.
2. Runs steps sequentially; each step can `run` a shell command, capture `outputs`, and `confirm` before proceeding.
3. On success, auto-updates the catalog with the new release entry.
4. Rejects dangerous commands (`rm -rf /`, `curl | bash`, `git push --force`, etc.) before shell execution.

Starter templates and examples are in [`template/16-release-pipelines/`](template/16-release-pipelines/). Governance policy is in [`template/15-governance/release-pipeline-policy.md`](template/15-governance/release-pipeline-policy.md).

Downstream project KBs should stamp both the adopted template version and the brand-scoped source baseline commit they were verified against.

### Intent Intelligence (v2.0)

Structure multi-file KB changes as versioned intent workspaces. Each intent accumulates staged docs, a plan, and an impact map — then applies atomically with archive.

```bash
# Create an intent workspace (suggests ID from current git branch)
kb intent create --mode=full --change-type=feature

# Check status (staged files, warnings)
kb intent status

# Apply: writes to KB core, archives workspace, optionally triggers release
kb intent apply my-intent --release

# After multiple applies: surface lesson candidates for KB improvement
kb intent suggest-lessons
```

Conflict resolution: when two intents modify the same file, `kb intent apply` detects the conflict and shows a concrete resolution strategy (`resolve-first`, `merge`, etc.) before proceeding.

After each apply, `ai-decision-context.json` is written to the intent archive — records the conflict analysis and decision context for future review.

## What This Repository Contains

- Orientation and onboarding documents in `template/00-start-here/`
- Product, domain, architecture, frontend, backend, API, database, security, operations, and testing knowledge areas
- AI-agent guidance in `template/12-ai-skills/`
- Reusable document stubs in `template/14-templates/`
- Governance rules for metadata, verification, review cadence, and template lifecycle in `template/15-governance/`

## Public Site (Landing + Docs)

This repository includes a standalone website bundle in `site/` for GitHub Pages publishing:

- Landing page: `site/index.html`
- Docs portal: `site/docs.html`
- Shared assets: `site/css/`, `site/js/`, `site/data/`

The docs portal renders markdown directly from the `main` branch via `raw.githubusercontent.com`, so docs stay up to date without duplicating template files.

### Enable GitHub Pages

1. Push the repository to GitHub (default branch `main`).
2. Open **Settings -> Pages**.
3. Under **Build and deployment**, choose **Source: GitHub Actions**.
4. Keep workflow file `.github/workflows/pages.yml` enabled.

After deployment, the site will be available at:

- `https://<owner>.github.io/<repo>/landing/`
- `https://<owner>.github.io/<repo>/docs/`

## Quick Start

1. Read [template/INDEX.md](template/INDEX.md) for the full template map.
2. Choose the project archetype in [template/00-start-here/project-scope-matrix.md](template/00-start-here/project-scope-matrix.md).
3. Read [template/00-start-here/how-to-use-this-kb.md](template/00-start-here/how-to-use-this-kb.md) for working mode and default decisions.
4. Start or refine the maintenance queue in [template/00-start-here/finalization-plan.md](template/00-start-here/finalization-plan.md).
5. Use the documents under `template/14-templates/` and fill only the modules that are relevant to the project.

## Recommended Reading Paths

- Engineers: `template/00-start-here` -> `template/03-architecture` -> `template/05-backend` or `template/04-frontend` -> `template/06-api` -> `template/07-database`
- Product and BA: `template/00-start-here` -> `template/01-product` -> `template/02-domain-model` -> `template/03-architecture`
- QA: `template/00-start-here` -> `template/10-testing` -> `template/08-security` -> `template/09-operations`
- AI agents: `template/00-start-here` -> `template/15-governance` -> task-specific folders

## Working With AI Agents

If you use GitHub Copilot or another coding agent in this repository:

- Start with [template/12-ai-skills/agent-operating-manual.md](template/12-ai-skills/agent-operating-manual.md)
- Use [template/12-ai-skills/ai-ide-compatibility-matrix.md](template/12-ai-skills/ai-ide-compatibility-matrix.md) to keep the same KB workflow across common AI-enabled IDEs
- Check [template/00-start-here/repository-revision-state.md](template/00-start-here/repository-revision-state.md) against the current git revision before broad maintenance or upgrade work
- Use [template/12-ai-skills/prompting-guide.md](template/12-ai-skills/prompting-guide.md) to choose prompt shape
- Keep document metadata valid per [template/15-governance/metadata-schema.md](template/15-governance/metadata-schema.md)
- Respect verification and time-state rules before asserting facts

## Repository Rules

- Keep placeholders explicit using values such as `TODO`, `TBC`, and `UNKNOWN`
- Do not remove unused template areas prematurely; keep them as placeholders until governance says otherwise
- Separate current state from target state when both need to exist in one document
- Update links, indexes, and metadata when files are added, moved, or renamed

## Key Entry Points

- [template/INDEX.md](template/INDEX.md)
- [template/00-start-here/how-to-use-this-kb.md](template/00-start-here/how-to-use-this-kb.md)
- [template/00-start-here/terminology-guard.md](template/00-start-here/terminology-guard.md)
- [template/00-start-here/what-this-repo-is-not.md](template/00-start-here/what-this-repo-is-not.md)
- [template/00-start-here/intent-index.md](template/00-start-here/intent-index.md)
- [template/00-start-here/repository-revision-state.md](template/00-start-here/repository-revision-state.md)
- [template/12-ai-skills/prompting-guide.md](template/12-ai-skills/prompting-guide.md)
- [template/12-ai-skills/agent-operating-manual.md](template/12-ai-skills/agent-operating-manual.md)
- [template/12-ai-skills/ai-ide-compatibility-matrix.md](template/12-ai-skills/ai-ide-compatibility-matrix.md)
- [template/15-governance/metadata-schema.md](template/15-governance/metadata-schema.md)
- [template/TEMPLATE_CHANGELOG.md](template/TEMPLATE_CHANGELOG.md)

## License

This project is dual-licensed.

- Open-source use is licensed under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE).
- Commercial use without the open-source obligations of the AGPL v3 requires a separate commercial license from the copyright holder.

Copyright (c) 2026 Dương Tấn Nghĩa.

**Commercial Licensing:**
If you wish to use this software for commercial purposes without the open-source requirements of the AGPL v3, please contact **duongtannghia@gmail.com** to acquire a commercial license.

## Author

**William Duong (Dương Tấn Nghĩa)**

- **GitHub:** [github.com/williamduong](https://github.com/williamduong)
- **Email:** duongtannghia@gmail.com
- **Blog:** [William Research Logs](https://williamresearch.com/)