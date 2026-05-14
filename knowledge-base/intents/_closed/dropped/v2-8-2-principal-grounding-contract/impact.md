---
intent_id: intent-v2-8-2-principal-grounding-contract
type: intent-impact
---

# Impact

## Affected Areas

**Knowledge Base tiers:**
- 03-architecture/ — blueprint, flows, components
- 07-database/ — data model, schema
- 06-api/ — pipelines, endpoints
- 15-governance/ — rules, master rules

**Code:**
- `site/kbx-ui/` — React component (will be refactored after verification)
- `bin/kbx.js` — CLI commands (verify implementation)
- `site/kbx-ui/server.mjs` — bridge server (verify endpoints)

**Scope:** Self-host maintainer only (SVFactory) — user-facing downstream not affected yet.

## Breaking Change

**No.** This is pure verification phase — no code changes, no new APIs, no data migration.

Intent outcome is either:
- "Source matches document" → safe to proceed with UI refactor using design as base
- "Gaps found" → document them, prioritize fixes, then proceed

## Downstream Risk

**Low.** No risk to downstream consumers because:
1. No code deployed
2. No schema changes
3. No API contract changes
4. Local verification only (bridge mock data)

**High value to downstream:** Ensures UI delivered matches design document, preventing wasted effort from future divergence.

## Impact Signals

**Pre-condition (already observed):**
- User reported: "giao diện xấu quá vậy khác xa với thiết kế" (UI ugly, differs from design)
- Confirmed: Previous UI built from scratch, not using HTML design as base
- Risk: Would repeat mistake if we don't verify document first

**Post-condition (expected):**
- ✅ Design-code alignment confirmed (confidence increases)
- ❌ Gaps identified (blockers list created)
- 🎯 Clear path forward (what to build next)

**Success criteria:** All 9 sections reviewed, gaps documented, UI refactor can proceed with design as contract.

---

**Chaos impact:** None (verification only, no code changes)  
**KPI impact:** None yet (will manifest during UI refactor execution)  
**Lessons:** Document-first approach catches design-code divergence early
