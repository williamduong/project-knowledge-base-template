---
intent_id: v2-8-2-principal-grounding-contract
type: intent-plan
---

# Plan

## Goal

Finish the runtime-vs-target review of the principal grounding contract, lock each reviewed section with a deterministic verdict, and split residual implementation work into child backlog intents instead of leaving ambiguity in the parent intent.

## Files Touched

- `knowledge-base/intents/_active/intent-v2-8-2-principal-grounding-contract/intent.md` — record the final review verdict and lock checklist items.
- `knowledge-base/intents/_backlog/v2-8-2-t002-user-flows-runtime-closure.md` — carry residual user-flow/runtime parity work.
- `knowledge-base/intents/_backlog/v2-8-2-t003-components-runtime-closure.md` — carry residual component/runtime drift.
- `knowledge-base/intents/_backlog/v2-8-2-t004-data-architecture-runtime-closure.md` — carry residual graph/data architecture work.
- `knowledge-base/intents/_backlog/v2-8-2-t005-default-data-runtime-closure.md` — carry residual seed/default-data work.
- `knowledge-base/intents/_backlog/v2-8-2-t006-pipelines-runtime-closure.md` — carry residual CLI/pipeline parity work.
- `knowledge-base/intents/_backlog/v2-8-2-t007-rules-runtime-closure.md` — carry residual rule-engine/domain-rule work.
- `knowledge-base/intents/_backlog/v2-8-2-t008-master-rules-runtime-closure.md` — carry residual AX/P enforcement work.
- `knowledge-base/intents/_backlog/v2-8-2-t009-foundation-runtime-closure.md` — carry residual onboarding/foundation-generator work.
- `knowledge-base/intents/_backlog/v2-8-2-t010-platform-completion-frame-closure.md` — carry residual shell completion/wiring work.

## Acceptance Criteria

- Every reviewed section in the parent intent is explicitly marked `review locked` or equivalent final wording.
- The parent intent no longer implies unfinished implementation work should stay active inside the same verification scope.
- Residual runtime/product work is represented by separate backlog intents with clear activation triggers.
- The parent intent can close as completed non-release review work once retro is recorded.