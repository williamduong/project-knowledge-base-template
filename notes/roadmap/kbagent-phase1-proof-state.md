# KBAgent Phase 1 Proof State

## Scope

This document records deterministic evidence that Phase 1 (Option B shell decision + bootstrap) is complete and that Phase 2 bridge hardening has started.

## Checkpoint

- Branch: `intent/v2-8-2-principal-grounding-contract`
- Head: `ea2eb26`
- Verified at: `2026-05-12`

## Decision Evidence

- Option B (localhost webapp + CLI bridge) is selected and implemented under `site/kbx-ui/`.
- Interaction boundary is explicit:
  - Chat proposes actions.
  - Web displays runtime evidence.
  - CLI remains the deterministic write path.

## Build Evidence

Command:

```bash
npm --prefix ./site/kbx-ui run build
```

Result:

- `tsc -b && vite build` passed.
- Output bundle generated in `site/kbx-ui/dist/`.

## Runtime Evidence (Bridge)

Expected endpoints (bridge server at `http://localhost:4174`):

- `GET /api/version`
- `GET /api/status`
- `GET /api/phase2-bridge`

Expected behavior:

- `/api/version` returns `ok=true` and CLI version output.
- `/api/status` returns parsed status JSON from `kbx status --json`.
- `/api/phase2-bridge` returns gate summary with severity policy (`hard-fail`, `warn`, `info`) and block/warn evaluation.

## Phase Assessment

- Phase 0: complete (naming/lifecycle/principles-vs-rules closure).
- Phase 1: complete (Option B shell decision + executable proof).
- Phase 1.5: complete (status endpoint + runtime error handling + gate evaluation endpoint).
- Phase 2: in progress (typed wrappers present; test coverage still pending).

## Next Gate To Close

Phase 2 exit criteria still open:

1. Add wrapper tests for success and fail paths.
2. Keep endpoint payload contracts stable.
3. Attach test evidence to roadmap execution plan.
