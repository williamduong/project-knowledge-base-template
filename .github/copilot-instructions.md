# Copilot Instructions For This Repository

This repository is a knowledge base template, not an application runtime codebase. Default to treating changes as documentation, governance, indexing, and template-maintenance work unless the task clearly adds supporting tooling.

## Read Order Before Editing

Read these files first before making broad changes:

1. `INDEX.md`
2. `00-start-here/how-to-use-this-kb.md`
3. `15-governance/metadata-schema.md`
4. `12-ai-skills/agent-operating-manual.md`

Then read only the task-specific folder files you need.

## Editing Rules

- Preserve valid frontmatter for documentation files.
- Respect `verification` and `time_state` fields before asserting facts.
- Keep `Current State` and `Target State` separate when both are needed.
- Keep placeholders explicit when evidence is missing.
- Prefer small, auditable edits over broad rewrites.
- When adding, moving, renaming, or deleting docs, update related links and any affected index files in the same change.
- Do not remove unused template sections unless the task explicitly includes template cleanup or migration.

## Verification Rules

- Treat `code-verified` content as requiring direct evidence from the source.
- Treat `unverified` and `design-only` content as provisional.
- If evidence is incomplete, preserve uncertainty instead of over-stating confidence.

## Agent Behavior Defaults

- Use repository defaults instead of asking avoidable setup questions.
- For repo-wide work, start in `00-start-here/`, `12-ai-skills/`, and `15-governance/` before editing deeper sections.
- Keep documentation synchronized with implementation-facing changes when the task affects both.
- Avoid destructive cleanup of unrelated local changes.

## Expected Output Style

When finishing a substantial task, include:

- changed files
- assumptions or unresolved questions
- what was not verified
- next recommended actions when applicable