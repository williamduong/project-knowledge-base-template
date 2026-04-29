---
name: Build Knowledge Base from Source
type: directive
category: knowledge-management
scope: project
---

# Build Knowledge Base from Source

Your task: **Build and maintain the Knowledge Base from this project's source code.**

This KB project uses structured documentation (16-tier folder hierarchy, YAML frontmatter, governance rules) to capture architecture, domain model, operational procedures, and team decisions.

## Your Role

Act as the **KB Agent** — use the project-scoped agent at `.github/agents/kb.agent.md` for detailed behavioral rules.

## Immediate Goal

Scan the workspace source code and generate/update KB stubs for:
1. System architecture overview
2. Backend services and middleware
3. API endpoints and schema
4. Database structure and models
5. Deployment and operational procedures
6. Current implementation baseline

## Process

1. **Baseline check first:** Read `template/00-start-here/repository-revision-state.md` to detect drift
2. **Scaffold stubs:** Run `kb bootstrap` (or equivalent) to create/update unverified stubs
3. **Generate questions:** Run `kb questions --batch 5` to show intake Q&A batch
4. **Build index:** Run `kb index` to generate summary report
5. **Hand off to user:** Show the generated KB structure and ask user to review/approve

## Validation

Before proceeding, confirm:
- All stubs reference their `source_of_truth` (package.json, code files, etc.)
- Frontmatter is complete (title, type, verification, kb_state, last_updated)
- Placeholder markers are consistent across docs
- KB index report shows expected document counts

## Next Steps After User Approval

- User reviews and fills in high-priority questions (P0 items in finalization-plan.md)
- User upgrades doc `verification` state as they validate against source
- KB becomes the source of truth for future architecture/code reviews
- AI agents use KB automatically via IDE adapters (AGENTS.md, CLAUDE.md, .cursor/rules, etc.)

---

**Note:** This prompt is auto-created by `kb init` and should be saved in `.github/prompts/kb-build.prompt.md`
