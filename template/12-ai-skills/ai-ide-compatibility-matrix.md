---
title: Ai Ide Compatibility Matrix
type: guide
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-04-29
last_verified: 2026-04-29
related:
  - agent-operating-manual.md
  - prompting-guide.md
  - prompt-pack.md
  - version-patch-prompts.md
  - ../00-start-here/how-to-use-this-kb.md
  - ../00-start-here/repository-revision-state.md
  - ../00-start-here/strategic-backlog.md
tags:
  - ai-agent
  - ide
  - compatibility
  - workflow
---

# AI IDE Compatibility Matrix

Use this matrix to keep the KB workflow consistent across common AI-enabled IDEs and editor environments.

## Intent

- Keep the KB workflow editor-agnostic where possible.
- Standardize which repo documents an agent should read before broad edits.
- Clarify what must exist in the repository versus what depends on the IDE.
- Record compatibility guidance without overstating feature parity across tools.

## Core Rule

The KB workflow is defined by repository documents, not by one editor vendor. If an IDE can open the repository, read Markdown, run prompts, and let the agent edit files safely, it can follow the same KB operating model.

## Required Repository Assets

For any AI-enabled IDE, the minimum repo assets are:

- `template/INDEX.md`
- `template/00-start-here/how-to-use-this-kb.md`
- `template/00-start-here/repository-revision-state.md`
- `template/15-governance/metadata-schema.md`
- `template/12-ai-skills/agent-operating-manual.md`
- `template/12-ai-skills/prompting-guide.md`
- `template/12-ai-skills/prompt-pack.md`
- `template/12-ai-skills/version-patch-prompts.md`

## Compatibility Matrix

| IDE / Editor | Typical Agent Surface | KB Workflow Fit | What Works Well | Watchouts | Recommended Starting Point |
|---|---|---|---|---|---|
| VS Code + GitHub Copilot | Chat panel, inline edit, workspace-aware agent mode | Strong | Repo instructions, Markdown-first prompts, file edits, terminal workflows | Behavior depends on workspace instructions and extension capabilities | Read `INDEX.md`, `how-to-use-this-kb.md`, then use `prompt-pack.md` |
| Cursor | Chat/composer with repo context | Strong | Fast prompt-driven KB build and maintenance passes, multi-file edits | Repo rules must still be explicit in prompt/context to avoid broad rewrites | Start with `agent-operating-manual.md` and one-line prompts from `prompt-pack.md` |
| Windsurf | Agent/chat with codebase context | Strong | Good for maintenance sweeps, targeted updates, repo-wide prompt execution | Needs explicit guardrails for verification and queue updates | Start with `repository-revision-state.md` before any broad maintenance |
| JetBrains IDEs with AI assistant | AI chat/action tools with project context | Moderate to strong | Good for guided doc maintenance and synchronized code/doc updates | Workflow can be more tool-window dependent; keep prompts explicit and file-scoped | Start with `prompting-guide.md` and keep output contract explicit |
| Other agent-capable IDEs or editors | Prompt/chat plus file editing | Conditional | Can still use the KB because the rules live in Markdown inside the repo | Feature parity varies; assume less automation and validate results more aggressively | Use `agent-operating-manual.md` as the minimum operating contract |

## Common Workflow Across IDEs

1. Open the repository.
2. Read the entry-point docs listed in Required Repository Assets.
3. Choose a prompt shape from `prompting-guide.md`.
4. Use a ready-made prompt from `prompt-pack.md` when possible.
5. Before broad maintenance or upgrades, compare stored baseline versus current git `HEAD` using `repository-revision-state.md`.
6. Update docs, indexes, and governance metadata in the same change set.
7. Run maintenance checks after the agent finishes.

```bash
kbx doctor
```

## Prompt Portability Guidance

- Prefer plain-English prompts stored in Markdown over IDE-specific automation flows.
- Keep prompts file-aware: name the entry docs, scope, constraints, and verification target.
- Reuse the same one-line prompts across IDEs before creating IDE-specific variants.
- Treat IDE-specific slash commands, workflow builders, or UI shortcuts as optional wrappers around the same KB instructions.

## Maintenance Portability Guidance

- Drift reconciliation is the same in every IDE: read `repository-revision-state.md`, compare baseline to current `HEAD`, then run a maintenance pass.
- Template upgrades are the same in every IDE: read `TEMPLATE_CHANGELOG.md`, then use `version-patch-prompts.md`.
- Queue discipline is the same in every IDE: update `strategic-backlog.md` instead of keeping follow-up work only inside chat history.

## Support Model

- The template is designed to be portable across common AI-enabled IDEs.
- The repository currently documents a compatibility model and recommended workflow, not a vendor-certified integration matrix.
- If a team validates an IDE in production use, add concrete evidence and operating notes here.

## Current Gaps

- No empirical feature-by-feature certification matrix is stored yet.
- No IDE-specific prompt wrappers are published yet.
- No benchmark currently compares output quality across IDEs for the same KB tasks.

## When To Extend This Document

Extend this file when one of the following becomes true:

- an IDE-specific workflow repeatedly differs from the default KB workflow
- an IDE needs special prompt framing to respect verification or metadata rules
- a new editor becomes common enough to deserve explicit support notes
- teams collect evidence that one environment has meaningful limits or strengths for KB maintenance

## Suggested Evidence To Add Later

- validated IDE versions
- extension or plugin names
- known limitations in file editing, terminal access, or workspace context
- sample prompts that work better in one IDE than another
- screenshots or runbooks in user docs if a team depends heavily on one environment
