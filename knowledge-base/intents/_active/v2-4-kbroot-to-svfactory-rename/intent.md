---
id: v2-4-kbroot-to-svfactory-rename
mode: full
lifecycle: active
created_at: 2026-05-08T08:42:41.748Z
focus:
  current: "Phase 0 — plan locked, ready for implementation"
  last_updated: 2026-05-08
  next_action: "Start Phase 1: package.json + bin rename"
change_type: breaking
change_scope:
  - package.json
  - bin/kb.js
  - src/lib/kb-presence.js
  - src/lib/ide-detect.js
  - src/lib/context.js
  - src/commands/init.js
  - src/commands/uninstall.js
  - src/commands/status.js
  - src/commands/doctor.js
  - src/commands/help.js
  - template/.github/agents/kb.agent.template.md
  - template/.github/prompts/kb-plan.prompt.template.md
  - template/.github/prompts/kb-run.prompt.template.md
  - template/.github/prompts/kb-ask.prompt.template.md
  - kb-root/agent.md
  - kb-root/principles.md
  - kb-root/process.md
  - kb-root/foundation.md
  - kb-root/knowledge.md
  - kb-root/specifics.md
  - README.md
  - AGENTS.md
impact_signals:
  - breaking-change
  - cross-module
  - large-intent-branch-confirmed
decision_summary: "Rename KBRoot concept → SV Factory (sfact). Rename KB Agent CLI binary + npm package: kb → kbx, @williamduong/kb → @williamduong/kbx. Downstream migration is a separate intent. No deprecated alias — hard cut."
review_after: null
schema_version: 2.4.0-rc.2
# v1.8+ reserve fields:
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-4-kbroot-to-svfactory-rename

## Summary

Two parallel renames with zero overlap:

1. **Concept rename:** "KBRoot" → "SV Factory" (sfact) — affects internal governance docs in `kb-root/` and self-host docs. NOT shipped to downstream users via npm.
2. **CLI + package rename:** `kb` → `kbx`, `@williamduong/kb` → `@williamduong/kbx` — affects all user-facing surfaces: binary, template agent file, prompt files, src hardcoded paths.

Rationale: `kb` conflicts with an existing npm package. "KBRoot" causes confusion between the Legislative layer (KBRoot/SV Factory) and the Executive layer (KB Agent). Hard cut — no deprecated alias. Downstream migration is a separate intent.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-kb-root>`

