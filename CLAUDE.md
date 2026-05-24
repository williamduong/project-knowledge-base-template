# CLAUDE.md — Claude Code Bridge

This file is the Claude Code equivalent of `AGENTS.md`. Read both together; they govern different surfaces but share the same maintainer contract.

---

## 🎯 STRATEGIC GOALS (CRITICAL — Read First)

### Long-Term Vision

**Build a factory that can generate KBX.**

KBX = Extensible, human-directed knowledge management software for code and non-code data across any multi-domain project.

### Current Phase (Factory Architecture Refactor)

**Establish dual-graph + layered architecture:**
1. **Data:** GraphDB (semantic governance) + SQLite (utilities)
2. **Logic:** Extraction, normalization, validation pipelines
3. **UI:** Comprehensive factory management interface

### Next Steps (KBX Production Features)

- DNA feature set (genetic code for KBX variants)
- Production pipeline: prepare → test → release
- On-demand generation from Knowledge Graph

**This is the 3-5 year north star. Every task should move toward this vision.**

---

## Self-Host Boundary

- This is the **SVFactory maintainer workspace** for `@williamduong/kbx`.
- Maintainer agent surface: `@SVFactory` and `/svfactory-*` prompts.
- Downstream-user surfaces (`@kbx`, `/kbx-*`) are disabled here. Validate those in a clean downstream workspace.
- Do not treat self-host output as acceptance evidence for shipped KBAgent behavior.

## Bootstrap — Read Before Any Non-Trivial Task

Read in order, do not skip:

1. [svfactory/agent.md](svfactory/agent.md) — full persona + interaction protocol
2. [svfactory/principles.md](svfactory/principles.md) — P0–P15 (immutable constraints)
3. [svfactory/focus.md](svfactory/focus.md) — active version target, blockers, next action
4. [svfactory/process.md](svfactory/process.md) — workflow matching for the current task
5. [svfactory/knowledge.md](svfactory/knowledge.md) — tricks, risks, decisions

Then print the 5-line session summary (Workflow 7 in process.md):
- Version focus
- Current phase
- Last shipped
- Active blocker
- Next action recommended

## KB Navigation

- `knowledge-base/INDEX.md` — full KB scope map
- `knowledge-base/00-start-here/repository-revision-state.md` — drift baseline
- `knowledge-base/00-start-here/knowledge-base-architecture.md` — trust and navigation rules
- `knowledge-base/12-ai-skills/agent-operating-manual.md` — agent behavioral contract

## Operating Rules

- **Language:** Chat in Vietnamese by default. Keep KB docs, prompts, schemas, and shipped artifacts in English.
- **Verify before assert:** Read real files and CLI state. Do not infer from stale notes.
- **Scope lock:** Every task must name an explicit version (`v2.8`, `v2.9.x`). No unbounded backlog.
- **Intent-first:** For non-trivial tasks, check `node ./bin/kbx.js intent list` first. Resume or create an intent before doing work.
- **Minimal change:** Prefer the smallest change that solves the problem. Do not expand scope without explicit request.
- **Backward compat:** Minor bumps must not break downstream users of prior minor.
- **Graph-first for governance entities (Phase 5.3c+):** Goals, Decisions, Principles, and Lessons are created in the Knowledge Graph first (via CLI or direct insert). Old scattered files (`svfactory/goals.state.json`, `knowledge-base/03-architecture/adr/`, `svfactory/principles.md`) are deprecated as canonical source. See [DEPRECATED.md](DEPRECATED.md).

## Knowledge Graph Agent Contract (Phase 5.3c+)

When creating, updating, or referencing **Goals, Decisions, Principles, or Lessons**:

**MANDATORY WORKFLOW:**

1. **Create in Knowledge Graph first** — entities must go into graph entities (kg_goals, kg_decisions, kg_principles, kg_lessons):
   ```bash
   kbx knowledge-graph create goal --title "..." --description "..."
   kbx knowledge-graph create decision --title "..." --rationale "..."
   kbx knowledge-graph create principle --title "..." --statement "..."
   kbx knowledge-graph create lesson --title "..." --what-happened "..."
   ```
   Or via direct graph API using seed scripts/programmatic access.

2. **Old files are deprecated — optional update only:**
   - May update `adr/*.md`, `goals.state.json`, `principles.md` for historical completeness
   - These are derived records, not canonical source
   - If graph and file diverge, graph is correct

3. **Query from graph, not files:**
   - Programmatic: use `src/graph-db/knowledge/api-*.js`
   - UI rendering: use UIv2 hooks (useGoalsGraph, useDecisionsGraph, usePrinciplesGraph)
   - Tests: query graph collections (kg_goals, kg_decisions, etc.)

4. **Never create scattered entities:**
   - ❌ Do NOT create new goals in `goals.state.json`
   - ❌ Do NOT create new ADRs manually in `adr/` expecting them to be seeded
   - ❌ Do NOT add principles only to `principles.md`
   - ✅ Create in graph, then optionally sync to files for reference

**Rationale:** Phase 5.3c stops scattered creation to unify governance data. The Knowledge Graph is the single source of truth for all governance entities. File-based sources are historical records only.

See [DEPRECATED.md](DEPRECATED.md) for migration guide and workflow examples.

## CLI in This Workspace

`kbx` is not installed globally. Use:

```sh
node ./bin/kbx.js <command>
```

Common read-only checks:
```sh
node ./bin/kbx.js status --json
node ./bin/kbx.js intent list
node ./bin/kbx.js doctor --json
node ./bin/kbx.js chaos --json --scan-src src
```

## Commit / Scratch Boundary

Do NOT commit these paths:

- `notes/` — scratch planning docs
- `sample_repo/` — test samples
- `kb-test-sample/` — test samples
- `.tmp-*` files
- `svfactory/focus.state.db` or similar runtime state files

`svfactory/` is **maintainer-only** and must NOT be included in npm `files` whitelist.

## Shared Workspace — Codex Coexistence

Both Claude Code and Codex operate in this workspace:
- `AGENTS.md` is the Codex bridge (do not delete or contradict it).
- `CLAUDE.md` (this file) is the Claude Code bridge.
- Both bridge to the same `svfactory/` maintainer contract.
- When a file is written by one agent, the other should treat it as authoritative unless the user says otherwise.

## Boundary

NEVER:
- Push, publish, or release without explicit user confirmation
- Edit `svfactory/principles.md` or `svfactory/agent.md` without explicit user approval
- Hardcode `knowledge-base/` paths — use `context.contentRoot` in CLI code
- Generate fake URLs, version numbers, or dependency versions
- Simulate slash-command UX; apply the contract through normal chat + file edits

OK:
- Read and edit files in the workspace
- Run non-destructive terminal commands
- Propose plans and apply after confirmation
- Update self-knowledge files in `svfactory/` after user approval
