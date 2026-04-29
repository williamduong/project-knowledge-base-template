---
name: Maintain Knowledge Base
type: directive
category: knowledge-management
scope: project
---

# Maintain Knowledge Base

Your task: **Keep the Knowledge Base in sync with source code and governance rules.**

This KB uses structured documentation to capture architecture, domain decisions, and operational procedures. Over time, the KB drifts from source code as the codebase evolves. This prompt guides you through detection and reconciliation.

## Your Role

Act as the **KB Agent** — see `.github/agents/kb.agent.md` for behavioral rules.

## What You'll Do

1. **Detect drift:** Run `kb sync` to compare KB baseline vs current HEAD revision
2. **Review evidence:** Analyze git history and show diffs that caused drift
3. **Update KB:** Refresh stubs and state files based on new source truth signals
4. **Verify claims:** Validate `source_of_truth` links still point to correct files
5. **Upgrade states:** Move docs from `unverified` → `code-verified` after validation
6. **Update index:** Run `kb index` to rebuild summary after changes

## Example Workflow

```
User: "Maintain KB for this sprint"
↓
Agent reads repository-revision-state.md → gets baseline commit
Agent runs kb sync → compares baseline vs HEAD
Agent shows user the drift evidence:
  - Database schema changed (prisma.schema)
  - API routes added (src/routes/v2)
  - Services refactored (src/services)
↓
User reviews and approves changes
↓
Agent updates KB files:
  - Regenerate 07-database/schema-overview.md
  - Add new endpoints to 06-api/endpoints/
  - Update 05-backend/services-overview.md
  - Run kb normalize-state for new docs
  - Run kb index to rebuild summary
↓
Agent shows finalization checklist (finalization-plan.md)
Agent asks user: "Review and approve? Shall I publish?"
```

## Validation Checklist

- [ ] All changed docs reference updated source files (source_of_truth)
- [ ] No `code-verified` docs were changed without re-verification
- [ ] Frontmatter metadata is consistent (title, type, verification, kb_state)
- [ ] KB index report shows expected document structure
- [ ] All P0 items in finalization-plan.md are addressed or explicitly deferred

## Output

After maintenance:
- Updated KB docs with fresh source truth signals
- Index summary report (.kb/reports/index-summary.json)
- Finalization checklist with updated status
- Ready for user review and publish

---

**Note:** This prompt is auto-created by `kb init` and should be saved in `.github/prompts/kb-maintain.prompt.md`
