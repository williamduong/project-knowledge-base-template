---
intent_id: v2-3-3-1-human-gate
type: intent-plan
---

# Plan: v2-3-3-1 Human-Gate Protocol

## Phase P0 — Docs & Governance (ships with v2.3.4)

**Status:** in-progress

| Task | File | Status |
|---|---|---|
| P20 principle | `kb-root/principles.md` | pending |
| W9 workflow | `kb-root/process.md` | pending |
| Human-Gate Protocol section | `template/12-ai-skills/agent-operating-manual.md` | pending |
| gates.md schema template | `knowledge-base/14-templates/gates.md.template` | pending |
| KB Agent behavior update | `template/.github/agents/kbx.agent.template.md` | pending |

## Phase P1 — CLI Code (v2.4.x)

**Status:** not-started  
**Prerequisite:** P0 complete, design locked.

| Task | File | Status |
|---|---|---|
| `src/lib/gates.js` | appendGate, listGates, markDone, markSkipped, hasPending | not-started |
| `src/commands/gates.js` | `kb gates list/done/skip/add` | not-started |
| `kbx intent apply` guard | Block on pending gates, `--skip-gates` flag | not-started |
| Tests | `test/lib/gates.test.js`, `test/commands/gates.test.js` | not-started |

---

## Gate Schema (canonical)

Every `gates.md` entry uses this structure:

```
## HG-NNN · <status>

**Actor:** human | human:<role> | ai:<name> | external:<system>
**Action:** <imperative verb + object — specific, not vague>
**Why:** <impact if not done — 1–2 sentences>
**Inputs needed:**
- <item 1>
- <item 2>
**Expected output:** <what AI needs to resume — be concrete>
**Blocking:** [<plan step IDs, e.g. P5-T1, P5-T2>]
**Priority:** high | medium | low
**Created:** <ISO timestamp>
**Done at:** — (or timestamp when marked done)
**Output received:** — (or the actual output value)
```

**Status values:** `pending` | `in-progress` | `done` | `skipped`

**Actor types:**

| Value | Meaning |
|---|---|
| `human` | Any human — unspecified role |
| `human:<role>` | e.g. `human:admin`, `human:designer`, `human:legal` |
| `ai:<name>` | Another AI agent — e.g. `ai:github-copilot`, `ai:claude` |
| `external:<system>` | External service action — e.g. `external:stripe`, `external:marketplace` |

---

## Acceptance Criteria (full feature)

1. AI writes to `gates.md` and continues — never blocks workflow.
2. `kb gates list` shows all pending gates across active intents.
3. `kb gates done HG-001 --intent <id> --output "..."` marks done + records output.
4. `kb gates skip HG-001 --intent <id> --reason "..."` marks skipped.
5. `kbx intent apply` refuses to close if pending gates exist (unless `--skip-gates`).
6. Each gate is self-contained — actor can pick up cold without AI or chat context.
7. Session end: AI always prints pending gates summary if any exist.

