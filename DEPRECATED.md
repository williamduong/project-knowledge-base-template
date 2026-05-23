# Deprecated Files & Patterns

**Date:** 2026-05-23  
**Status:** Phase 5.3a — Graph as Canonical Source  
**Scope:** Knowledge Graph migration from scattered files to unified semantic graph

---

## Overview

This document marks files and patterns that have been superseded by the **Knowledge Graph** (graphdb system with unified semantic entities). These files are retained for **historical reference only** and should not be the canonical source for new work.

**Direction:** Going forward, entities (goals, decisions, principles, lessons) are created in the Knowledge Graph first. File-based sources become derived/historical records, not the primary source.

---

## Deprecated File Locations

### 1. Architecture Decision Records (ADRs)

**Location:** `knowledge-base/03-architecture/adr/*.md`

**Status:** ❌ DEPRECATED as canonical source

**Why:** Decisions are now entities in the Knowledge Graph (`kg_decisions` collection). ADR files are historical records.

**Migration:**
- Existing ADR content has been extracted into `kg_decisions` entities with proper metadata
- New decisions must be created as graph entities first (via `kbx knowledge-graph seed-decisions`)
- ADR files can be updated for historical completeness, but the graph is authoritative
- See [[#How to create new decisions]] below

**Reference:** See `notes/DATA-TRANSFORMATION-COMPLETE.md` for extraction details (6 decisions extracted from existing ADRs).

---

### 2. Goals State File

**Location:** `svfactory/goals.state.json`

**Status:** ❌ DEPRECATED as canonical source

**Why:** Goals are now entities in the Knowledge Graph (`kg_goals` collection). JSON state is historical snapshot.

**Migration:**
- All goals (7 system + 31 milestone) have been seeded into the graph with full hierarchy
- Goal hierarchy, parent relationships, and success metrics are canonical in the graph
- System Goals have explicit decision constraints (via `decides_for` edges)
- Milestone Goals inherit decision constraints from parent System Goals
- New goals must be created as graph entities first (via `kbx knowledge-graph seed-governance`)
- See [[#How to create new goals]] below

**Reference:** See `notes/DATA-TRANSFORMATION-COMPLETE.md` § Transformation Phases Completed → Phase 1 for seeding details (38 goals total).

---

### 3. Principles Manifest

**Location:** `svfactory/principles.md`

**Status:** ❌ DEPRECATED as canonical source

**Why:** Principles are now entities in the Knowledge Graph (`kg_principles` collection). Markdown is historical reference.

**Migration:**
- 26 principles (P0–P15 + 11 domain-specific) have been seeded with full metadata
- Principles are linked to code symbols via the Code Graph (blocked on Code Graph Phase 1)
- Current state: All principles extracted, no code bridges yet (deferred)
- New principles must be created as graph entities first
- Updates to principle statements should be made in the graph, then reflected in markdown
- See [[#How to create new principles]] below

**Reference:** See `notes/DATA-TRANSFORMATION-COMPLETE.md` § Problem Resolution → P3 (Principle→Code Gap) for deferred status.

---

### 4. Intent Directory (Partial Deprecation)

**Location:** `knowledge-base/intents/*.md`

**Status:** ⚠️ PARTIALLY DEPRECATED

**Why:** Intent metadata is now parsed and stored in the Knowledge Graph (`kg_intents` collection), but files remain as source.

**Current state:**
- Intent files are the primary source (remain authoritative for now)
- Metadata is extracted into graph entities for querying and relationship building
- Intent→Goal mappings are captured as `implements` edges in the graph
- Intent→Document mappings are captured as `describes` edges (semantic bridges)
- Intent→Lesson mappings are captured as `learned_from` edges
- Files can continue to be updated; changes will be re-synced to graph

**Migration path (Phase 5 future):**
- As UIv2 query layer matures, intent workspace becomes primary interface
- Intent files may become derived/archived
- Timeline: TBD, not blocking Phase 5.3a

---

## How to Create New Entities (Graph-First Workflow)

### How to Create New Decisions

1. **Create in Knowledge Graph** (primary source):
   ```bash
   # Via CLI (once implemented):
   kbx knowledge-graph create decision \
     --title "Decision title" \
     --rationale "Why this decision matters" \
     --impact-scope "Which goals are affected"
   
   # Or directly in graph database:
   # Insert kg_decisions entity with relationships
   ```

2. **Link to Goals:**
   - Decisions apply to System Goals (via `decides_for` edges)
   - Child goals inherit decision constraints from parent
   - Graph queries account for inheritance automatically

3. **Update ADR files (optional):**
   - May update `knowledge-base/03-architecture/adr/*.md` for historical completeness
   - But graph is authoritative for status, impact, and relationships

4. **Reference in documentation:**
   - Link to decision via graph ID (`d-<slug>`)
   - Example: "This goal implements decision d-sg1-end-to-end-capability"

---

### How to Create New Goals

1. **Create in Knowledge Graph** (primary source):
   ```bash
   # Via CLI (once implemented):
   kbx knowledge-graph create goal \
     --title "Goal title" \
     --description "What success looks like" \
     --parent-goal-id "parent-system-goal-id" \
     --success-metrics "Measurable outcomes"
   
   # Or directly in graph database:
   # Insert kg_goals entity with parent_goal_id for hierarchy
   ```

2. **Establish Hierarchy:**
   - System Goals (7 total) are top-level, no parent
   - Milestone Goals link to parent System Goals (via `parent_goal_id`)
   - Queries automatically traverse hierarchy for constraint inheritance

3. **Link to Decisions:**
   - System Goals link to decisions via `decides_for` edges
   - Milestone Goals inherit via parent relationship
   - No need to manually create child→decision edges

4. **Update goals.state.json (optional):**
   - May keep JSON for historical snapshot
   - But graph is authoritative for hierarchy and relationships

---

### How to Create New Principles

1. **Create in Knowledge Graph** (primary source):
   ```bash
   # Via CLI (once implemented):
   kbx knowledge-graph create principle \
     --title "Principle title" \
     --statement "The principle statement" \
     --domain "domain-category" \
     --motivation "Why this principle matters"
   
   # Or directly in graph database:
   # Insert kg_principles entity
   ```

2. **Link to Code (Phase 5+ after Code Graph Phase 1):**
   - Once code symbols exist in Code Graph, create `applies_to` edges
   - Pattern detection: auto-detect principle violations in code
   - Currently blocked; structure will be ready when symbols arrive

3. **Update principles.md (optional):**
   - May keep markdown for historical reference
   - But graph is authoritative for metadata and relationships

---

### How to Create New Lessons

1. **Create in Knowledge Graph** (primary source):
   ```bash
   # Via CLI (once implemented):
   kbx knowledge-graph create lesson \
     --title "What we learned" \
     --what-happened "The situation" \
     --why-it-matters "Impact on decisions" \
     --next-time "How to apply this" \
     --learned-from-intent "intent-id"
   
   # Or directly in graph database:
   # Insert kg_lessons entity with learned_from edge
   ```

2. **Link to Intents:**
   - Lessons are linked to the intent they came from (via `learned_from` edges)
   - Enables learning loop: intent experience → lesson → future decisions

3. **No file creation needed:**
   - Lessons are stored and queried from graph
   - Not scattered into files

---

## Graph Entities & Collections

**Knowledge Graph canonical entities:**

| Entity Type | Collection | Status | Created By |
|---|---|---|---|
| Intents | `kg_intents` | Partial (files still primary) | Manual + intent-parser |
| Goals | `kg_goals` | Canonical | seed-governance.js |
| Decisions | `kg_decisions` | Canonical | seed-decisions.js + synthetic |
| Principles | `kg_principles` | Canonical | seed-governance.js |
| Documents | `kg_documents` | Canonical | document auto-generator |
| Lessons | `kg_lessons` | Canonical | seed-lessons.js |

**Edges (relationships):**

| Edge Type | From | To | Status |
|---|---|---|---|
| `implements` | Intent | Goal | Canonical |
| `has_phase` | Goal | Goal | Canonical (hierarchy) |
| `decides_for` | Decision | Goal | Canonical |
| `describes` | Intent | Document | Canonical (semantic bridges) |
| `learned_from` | Lesson | Intent | Canonical |
| `applies_to` | Principle | Code Symbol | Deferred (Phase 5.1) |

---

## Migration Timeline

### Phase 5.3a: Lock Graph (NOW)
- ✅ Mark scattered files as deprecated
- ✅ Update agent contracts (CLAUDE.md, AGENTS.md)
- ✅ Document graph-first workflow
- ✅ Retain old files for historical reference

### Phase 5.3b: On-Demand Generation (Week 2-3)
- [ ] Implement UIv2 query layers for goals, decisions, principles
- [ ] Test on-demand rendering from graph
- [ ] Retire file reading in UI

### Phase 5.3c: Stop Scattered Creation (Week 2-3)
- [ ] Update agent contracts to enforce graph-first
- [ ] Audit: no new decisions/goals/principles created outside graph
- [ ] Old file creation becomes optional/deprecated

### Phase 5.3d: Archive (Gradual, Week 4+)
- [ ] Move old ADR files to `archive/` (immutable historical reference)
- [ ] Redirect code imports: `require('./adr/...')` → `queryGraph('kg_decisions')`
- [ ] Validate no code breaks
- [ ] Cleanup: remove dead code paths reading from files

---

## Why This Change?

### Problems Solved
1. **Single source of truth:** No more scattered goals across 3+ files
2. **Semantic relationships:** Graph enables inheritance, constraints, impact analysis
3. **On-demand generation:** Render goals/decisions from graph, not static files
4. **Easier audits:** One canonical query surface (graph) instead of 4+ file formats
5. **Version history:** Graph preserves metadata changes; files are snapshots

### Deferred Constraints
- **Principle→Code:** Blocked on Code Graph Phase 1 (code symbols must exist first)
- **Two-graph boundaries:** Design task for Phase 5.1 (cross-graph semantics)

---

## Reference Files

- **Phase 4 work:** `notes/DATA-TRANSFORMATION-COMPLETE.md`
- **Problem resolution:** `notes/PROBLEM-RESOLUTION-EXECUTIVE-SUMMARY.md`
- **Phase 5 plan:** `notes/PHASE-5-READINESS-AND-IMPLEMENTATION.md`
- **Gap analysis:** Run `kbx knowledge-graph gap-analysis` for current metrics
- **Graph queries:** `src/graph-db/knowledge/query.js` for programmatic access

---

## Questions?

See the agent operating manual in `svfactory/agent.md` § Knowledge Graph operations, or the Knowledge Graph initialization docs in `src/commands/knowledge-graph.js`.

---

**Last updated:** 2026-05-23 (Phase 5.3a)  
**Status:** Deprecated files retained for reference; graph is canonical
