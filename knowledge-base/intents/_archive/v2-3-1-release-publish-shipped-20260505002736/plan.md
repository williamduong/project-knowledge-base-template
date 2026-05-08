---
intent_id: v2-3-1-release-publish
type: intent-plan
---

# Plan

## Goal

Ship patch release `2.3.1` with governance/tooling updates and prevent repeated publish attempts for already published versions.

## Files Touched

- `package.json` (version bump + prepublish guard script wiring)
- `tools/prepublish-version-guard.js` (new)
- `template/template.json` (version sync)
- `template/.github/agents/kb.agent.md` (version sync)
- `template/.github/prompts/kbx-ask.prompt.md` (version sync)
- `template/.github/prompts/kbx-plan.prompt.md` (version sync)
- `template/.github/prompts/kbx-run.prompt.md` (version sync)
- `notes/npm-release-checklist.md` (release process hardening)
- `template/00-start-here/strategic-backlog.md` (policy hardening)
- `template/00-start-here/repository-revision-state.md` (metadata alignment)

## Acceptance Criteria

1. `npm run prepublish:version-guard` passes for local version.
2. `npm run version:sync` and `npm run version:check` pass.
3. `npm run release:dry` passes.
4. Release commit is created and pushed.
5. `npm publish --access public` succeeds.
6. `v2.3.1` tag is created and pushed after successful publish.

