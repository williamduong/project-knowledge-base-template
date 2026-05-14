---
slug: v2-8-2-t002-user-flows-runtime-closure
title: "T002 user flows runtime closure"
description: "Section 2 is a review-and-runtime-truth task. The child intent records the remaining UX and command-surface gaps after the review is locked."
lifecycle: backlog
created_at: 2026-05-14T17:39:34.034Z
focus:
  current: "Lock Section 2 User flows as a runtime-truth review result and move residual UX/runtime follow-up into a child intent."
  last_updated: 2026-05-14
  next_action: "Capture the final Section 2 verdict, link follow-up work, and remove partial-review ambiguity from the parent checklist."
decision_summary: "Section 2 is a review-and-runtime-truth task. The child intent records the remaining UX and command-surface gaps after the review is locked."
architecture_position:
  wave: v2.8.2
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-8-2-t002-user-flows-runtime-closure

## Summary

This backlog child intent records the residual follow-up from parent review task `T-002` under `v2-8-2-principal-grounding-contract`.

Current state:
- Section 2 User flows review is complete enough to close the parent checklist item.
- The current localhost UI should treat the actual `kbx intent` lifecycle as runtime truth, not the broader HTML flow wording.

Why it matters:
- The parent review task should not stay stuck in `partial` once the runtime verdict is already clear enough for current UI work.
- Remaining gaps such as F3 prompt handoff, F8 retrofit flow, and bridge mutation parity are implementation follow-up, not unresolved review state.

Activation trigger:
- Activate this backlog item only after the current active parent intent is closed or explicitly split, and only when Section 2 residuals are ready to become implementation work rather than review work.

