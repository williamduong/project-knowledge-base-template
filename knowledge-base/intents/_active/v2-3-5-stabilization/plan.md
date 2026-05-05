---
intent_id: v2-3-5-stabilization
type: intent-plan
---

# Plan

## Goal

Enforce forward-only version progression at intent creation time to prevent
mixed version lines and accidental version rollback in planning flow.

## Files Touched

- `src/commands/intent.js` (modified)
  - Added `parseIntentVersionFromId`, `compareVersionTuple`, `enforceIntentVersionProgression`.
  - Hooked guard into `runCreate` before workspace creation.
- `test/commands/intent.test.js` (modified)
  - Added tests for parser/comparator.
  - Added regression test that rejects non-increasing versions.

## Acceptance Criteria

1. `kb intent create v2-3-4-*` is blocked when highest active version line is `v2-3-6-*`.
2. `kb intent create v2-3-7-*` succeeds under the same context.
3. Non-versioned IDs remain allowed for backward compatibility.
4. Existing intent unit tests stay green.
