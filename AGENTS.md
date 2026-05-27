# AGENTS

This repository uses a structured Knowledge Base (KB) to provide AI agents with
architectural context, domain model, and governance rules.

---

## 🎯 STRATEGIC GOALS (CRITICAL — Read First)

### Long-Term Vision (3-5 năm)

**Xây dựng một factory có thể generate ra KBX.**

KBX = Phần mềm quản lý tri thức có khả năng mở rộng, phát triển theo chỉ đạo con người, cho dữ liệu code và non-code của bất kỳ dự án đa lĩnh vực nào.

### Current Phase (Factory Architecture Refactor)

**Establish dual-graph + layered architecture:**
1. **Data Layer:** GraphDB (semantic) + SQLite (utilities) if needed
2. **Logic Layer:** Extraction, normalization, validation code
3. **UI Layer:** Comprehensive factory management interface

### Next Immediate Steps (KBX Production Pipeline)

- DNA feature set (genetic code for KBX variants)
- Production process: preparation → testing → release
- On-demand generation from Knowledge Graph

**Every task should advance this 3-5 year vision.**

---

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
- SVFactory is **not** KBX. SVFactory is the neutral factory core that defines how worldviews are generated.
- A DNA package defines a **specific worldview** for a downstream KBX variant (domain ontology, rules, gates, pipes, graph/storage profile, templates).
- KBX instances inherit a DNA worldview but are further shaped by real user data, documents, code, and graph state.
- Legacy KBX semantics must be treated as a **reference DNA / downstream form**, not as the architectural core of SVFactory.

## Worldview Layering

- `SVFactory core worldview`: how systems are generated and validated (`DNA`, ontology contract, rule, gate, pipeline, evidence, compiler, variant, release contract).
- `DNA worldview`: how one domain sees its world (for example SaaS, legal, research, manufacturing).
- `KBX instance worldview`: one concrete downstream knowledge base, shaped by the chosen DNA plus live user/project data.

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

## Knowledge Graph Agent Contract (Phase 5.3c+)

**MANDATORY (Codex & all agents):** When creating Goals, Decisions, Principles, or Lessons:

1. **Create in Knowledge Graph first** (primary source):
   - Use graph API: `kbx knowledge-graph create goal/decision/principle/lesson`
   - Or direct insert via graph seed scripts
   - Entities are canonical in: kg_goals, kg_decisions, kg_principles, kg_lessons

2. **Old scattered files are deprecated:**
   - `svfactory/goals.state.json` → historical reference only
   - `knowledge-base/03-architecture/adr/` → historical reference only
   - `svfactory/principles.md` → historical reference only
   - May optionally update for completeness, but graph is authoritative

3. **Query from graph (not files):**
   - Programmatic access: `src/graph-db/knowledge/api-*.js`
   - UI renders from graph queries (GoalsPage, DecisionsPage, PrinciplesPage)
   - Tests query graph collections

4. **Never create scattered governance entities:**
   - ❌ Do NOT add goals to goals.state.json
   - ❌ Do NOT create standalone ADRs in adr/ expecting seeding
   - ❌ Do NOT add principles only to principles.md
   - ✅ Create in graph, optionally sync to files

**Rationale:** Phase 5.3c unifies all governance under the Knowledge Graph. Files are historical records; graph is the single source of truth.

See [DEPRECATED.md](DEPRECATED.md) for complete migration guide and examples.

## Navigation shortcut

- Architecture intent → `knowledge-base/03-architecture/`
- Backend / API → `knowledge-base/05-backend/` and `knowledge-base/06-api/`
- Database schema → `knowledge-base/07-database/`
- Security rules → `knowledge-base/08-security/`
- Governance → `knowledge-base/15-governance/`

Do not create top-level folders outside the 16-tier hierarchy without user approval.
Do not upgrade `verification` fields without re-checking `source_of_truth`.
