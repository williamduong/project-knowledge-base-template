# Archive — Historical Reference

**Date:** 2026-05-24  
**Reason:** Phase 5.3d — Migrate from scattered files to Knowledge Graph  
**Status:** Archive complete, graph is canonical

---

## Contents

This directory contains historical files that have been migrated to the Knowledge Graph.

### `adr/` — Architecture Decision Records

**Status:** Archived from `knowledge-base/03-architecture/adr/` (Phase 5.3d)

These ADR files have been extracted into the Knowledge Graph as `kg_decisions` entities. The files are kept here as immutable historical reference.

**To access decisions:**
- **Primary source:** Knowledge Graph (`kg_decisions` collection)
- **Query API:** `src/graph-db/knowledge/api-decisions.js`
- **UI workspace:** `/graph/decisions` in UIv2
- **Historical reference:** ADR files in this directory

**Mapping:**
- `adr-001-*.md` → `kg_decisions/d-001-*`
- `adr-006-*.md` → `kg_decisions/d-006-*`
- (See each kg_decisions entity for `extracted_from` reference)

---

## How Archive Works

Files in this directory:
- ✅ Are immutable (not updated)
- ✅ Serve as historical reference
- ✅ Are linked from Knowledge Graph entities via `extracted_from` metadata
- ❌ Are NOT the canonical source (graph is)

To update archived content:
1. Update the corresponding Knowledge Graph entity (kg_decisions, kg_goals, etc.)
2. The graph becomes the source of truth
3. Archive files stay unchanged as historical snapshots

---

## Future Phases

- **Phase 6+:** Code paths that read from `archive/` may be updated to query the Knowledge Graph instead
- **Gradual:** Archive remains a reference for as long as needed
- **Eventually:** Archive can be moved to `git log` or external documentation system

---

**Archive started:** 2026-05-24  
**Last updated:** 2026-05-24  
**Next phase:** Code path updates and validation
