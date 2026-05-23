# AGENTS

This repository uses a structured Knowledge Base (KB) to provide AI agents with
architectural context, domain model, and governance rules.

## Self-Host Agent Boundary

- This repository is a self-host maintainer workspace.
- `AGENTS.md` is the canonical instruction bridge for Codex and other generic workspace agents.
- Maintainer agent surface: `@SVFactory` and `/svfactory-*` prompts.
- Downstream-user surface (`@kbx`, `/kbx-plan`, `/kbx-run`, `/kbx-ask`) is disabled locally and must be validated in a downstream clean workspace.
- Do not use self-host prompt output as final user-experience acceptance evidence for shipped KB Agent behavior.

## Canonical Boundary Statement

- SVFactory is the meta-factory that defines governance contracts, templates, workflows, schemas, prompts, and deterministic gates.
- KBAgent is a downstream agent family instantiated from that contract to help users operate and evolve a reference-accurate knowledge base.
- kbx CLI is the deterministic enforcement bridge between SVFactory and KBAgent.

## Naming Taxonomy

- `kbx CLI`: deterministic command/runtime surface.
- `KBAgent`: agent prompt/runtime role.
- `KBX`: ecosystem/package/template.
- `SVFactory` / `sfact`: meta-factory/governance layer.

## Mandatory read-order before any multi-file task

1. `knowledge-base/INDEX.md` — full KB scope map
2. `knowledge-base/00-start-here/repository-revision-state.md` — drift baseline check
3. `knowledge-base/00-start-here/knowledge-base-architecture.md` — trust and navigation rules
4. `knowledge-base/12-ai-skills/agent-operating-manual.md` — behavioral contract for agents

## Codex Maintainer Bridge

When working as a generic coding agent in this repository:

1. Read `.github/agents/SVFactory.agent.md` to understand the maintainer surface and self-host boundary.
2. For any non-trivial maintainer task, then read:
   - `svfactory/agent.md`
   - `svfactory/principles.md`
   - `svfactory/focus.md`
   - `svfactory/process.md`
   - `svfactory/knowledge.md`
3. Treat those `svfactory/` files as the maintainer operating contract, even if the current IDE does not support `@SVFactory`.
4. Prefer applying the contract behaviorally through normal chat + file edits rather than simulating slash-command UX.

## Codex Working Rules

- Default user-facing chat language is Vietnamese unless the user asks otherwise.
- Keep KB documents, prompts, schemas, and shipped artifacts in English unless an existing file is intentionally bilingual.
- For planning or implementation, require an explicit version scope such as `v2.8` or `v2.8.x`; avoid unbounded backlog phrasing.
- Verify before asserting. Read real files and git/CLI state instead of inferring from stale notes.
- Do not treat local self-host validation as downstream acceptance for shipped `KBAgent` behavior.
- For broad maintenance, upgrades, or repo-wide edits, compare current git `HEAD` with the baseline recorded in `knowledge-base/00-start-here/repository-revision-state.md` before trusting KB freshness.
- **Graph-first for governance entities (Phase 5+):** Goals, Decisions, Principles, and Lessons must be created in the Knowledge Graph first (via CLI or direct insert). Old scattered files (`svfactory/goals.state.json`, `knowledge-base/03-architecture/adr/`, `svfactory/principles.md`) are deprecated as canonical source. See [DEPRECATED.md](DEPRECATED.md).

## Navigation shortcut

- Architecture intent → `knowledge-base/03-architecture/`
- Backend / API → `knowledge-base/05-backend/` and `knowledge-base/06-api/`
- Database schema → `knowledge-base/07-database/`
- Security rules → `knowledge-base/08-security/`
- Governance → `knowledge-base/15-governance/`

Do not create top-level folders outside the 16-tier hierarchy without user approval.
Do not upgrade `verification` fields without re-checking `source_of_truth`.
