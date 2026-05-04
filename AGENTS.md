# AGENTS

This repository uses a structured Knowledge Base (KB) to provide AI agents with
architectural context, domain model, and governance rules.

## Mandatory read-order before any multi-file task

1. `knowledge-base/INDEX.md` — full KB scope map
2. `knowledge-base/00-start-here/repository-revision-state.md` — drift baseline check
3. `knowledge-base/00-start-here/knowledge-base-architecture.md` — trust and navigation rules
4. `knowledge-base/12-ai-skills/agent-operating-manual.md` — behavioral contract for agents

## Navigation shortcut

- Architecture intent → `knowledge-base/03-architecture/`
- Backend / API → `knowledge-base/05-backend/` and `knowledge-base/06-api/`
- Database schema → `knowledge-base/07-database/`
- Security rules → `knowledge-base/08-security/`
- Governance → `knowledge-base/15-governance/`

Do not create top-level folders outside the 16-tier hierarchy without user approval.
Do not upgrade `verification` fields without re-checking `source_of_truth`.
