---
intent_id: v2-5-cli-first-intent-orchestration
type: intent-gates
---

# Gates

## GATE-01 — Downstream Apply and KB Agent Acceptance

| Field | Value |
|---|---|
| **Status** | deferred — moved to backlog intent |
| **Actor** | human |
| **Blocking** | false (explicitly deferred by owner 2026-05-08 — downstream machine not ready) |
| **Deferred to** | KB-016 backlog intent: downstream acceptance test for v2.5 template changes |

### Deferral Reason

Owner's downstream machine setup not complete. Acceptance test cannot run now.
This gate is converted to a standalone backlog intent (KB-016) and is no longer blocking intent close.

### Action Required

Run the Phase 4 downstream acceptance checklist manually:

1. `npm pack` in this workspace (or use `@beta` tag: `npx @williamduong/kb@beta`)
2. In a **clean downstream workspace** (not this repo), run `kb init` or `kb update`
3. Verify `.github/agents/kb.agent.md` contains the "KBRoot Gate vs Agent Soft-First (A1 Separation)" section
4. Verify `12-ai-skills/agent-operating-manual.md` contains the "KBRoot Gate vs Agent Soft-First — A1 Separation (v2.5+)" section
5. Open `@kb` in that downstream workspace. Ask: _"What happens when a KBRoot gate returns exit 1?"_
   - Expected: agent references A1 separation, states it stops without retry or negotiation
6. Confirm no `kb-root/`, `CONSTITUTION.md` references, or maintainer-only rules appear in the downstream install

### Inputs

- Packed artifact from `npm pack` **or** published `@beta` tag (`2.4.0-rc.1` or newer)
- A clean workspace that does NOT have this repo's history

### Expected Output

- All 5 checklist items in Phase 4 checked off
- No KBRoot contamination found
- KB Agent behavior in downstream workspace aligns with A1 separation contract

### Blocking Steps

- `kb intent close v2-5-cli-first-intent-orchestration` — blocked until this gate passes
