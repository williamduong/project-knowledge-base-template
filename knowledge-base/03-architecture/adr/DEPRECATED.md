# ADR Directory — DEPRECATED (Phase 5.3c+)

**Status:** Deprecated as canonical source for decisions (2026-05-24)  
**Replacement:** Knowledge Graph (`kg_decisions` collection)  
**Rationale:** See root [DEPRECATED.md](../../../DEPRECATED.md)

---

## Important

**This directory contains historical ADR files only.** Decisions are now entities in the Knowledge Graph and are rendered on-demand via UIv2.

### If you're creating a new decision:

1. **Create in Knowledge Graph first:**
   ```bash
   kbx knowledge-graph create decision \
     --title "Your decision title" \
     --rationale "Why this matters" \
     --impact-scope "Which goals are affected"
   ```

2. **Optionally update an ADR file in this directory** for historical completeness:
   - File name: `d-<slug>.md`
   - Include the graph decision ID in the file
   - Example: `d-sg1-end-to-end-capability.md` → contains link to `kg_decisions/d-sg1-end-to-end-capability`

### If you're updating an existing decision:

- **Primary source:** Update the Knowledge Graph entity via API or direct edit
- **Secondary action:** Update the corresponding `.md` file for reference if you want to keep historical notes

### Where to find decisions:

- **Canonical source:** Knowledge Graph (`src/graph-db/knowledge/`)
- **UI workspace:** `/graph/decisions` in UIv2 (renders from graph)
- **Programmatic access:** `src/graph-db/knowledge/api-decisions.js`
- **Historical reference:** ADR files in this directory (read-only)

---

## Historical Content

Files in this directory are:
- ✅ Complete (extracted from ADRs and synthetic creation for missing System Goals)
- ✅ Immutable (will not be modified)
- ✅ Referenced in Knowledge Graph (each kg_decisions entity links to its ADR source via `extracted_from`)
- ⏳ Will be archived in Phase 5.3d (moved to `archive/`)

**Do not** rely on these files as the source of truth. Always query the Knowledge Graph for current decision data.

---

**Last updated:** 2026-05-24 (Phase 5.3c)  
**Next step:** Phase 5.3d will archive these files to `archive/`
