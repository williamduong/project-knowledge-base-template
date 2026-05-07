---
intent_id: kb-agent-centric-docs
type: intent-plan
---

# Plan

## Goal

Separate KBRoot-internal naming conventions from the generic defaults shipped to downstream KB Agent users. After this change, every shipped template doc expresses opinionated defaults that work for any project cadence — without KBRoot-specific terminology leaking through.

## Files Touched

| File | Change type | Summary |
|---|---|---|
| `template/12-ai-skills/intent-lifecycle-schema.md` | modified | Rewrote Purpose section; replaced KBRoot ID examples with generic; removed D1-D56 tag reference; replaced KBRoot-specific YAML examples; added Governance Defaults table; clarified `wave` as generic grouping label |
| `template/12-ai-skills/agent-operating-manual.md` | modified | Added Design Philosophy section explaining opinionated-defaults pattern; clarified `wave` field in step 9 |
| `template/.github/agents/kb.agent.template.md` | modified | Fixed branch naming to use generic `<id>` instead of `vX-Y-<slug>` |
| `kb-root/specifics.md` | new | Documents KBRoot-specific choices that override generic defaults: P18 ID format, D1-D56 tag system, wave=version |

## Acceptance Criteria

- [ ] `intent-lifecycle-schema.md` Purpose section does not mention "KBRoot maintainer workflows" as a co-equal audience
- [ ] All YAML examples use generic IDs (not `v2-5-cli-first-*` or `v2-4-*`)
- [ ] `impact_signals` description does not reference D1-D56
- [ ] Governance Defaults table present with configurable flag and `wave` note
- [ ] `agent-operating-manual.md` Design Philosophy section present
- [ ] `kb.agent.template.md` branch suggestion uses generic `<id>` not `vX-Y-<slug>`
- [ ] `kb-root/specifics.md` created with KBRoot overrides documented
- [ ] v2.5 backlog entry created for user-customization-framework
- [ ] All tests still pass
- [ ] `kb doctor` still PASS
