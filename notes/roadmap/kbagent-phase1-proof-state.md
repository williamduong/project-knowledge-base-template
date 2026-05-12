# KBAgent Phase 1 Proof State

## Scope

This document records deterministic evidence that Phase 1 (Option B shell decision + bootstrap) is complete, Phase 2 bridge hardening is test-backed, and Phase 3 read-only delivery has started.

## Checkpoint

- Branch: `intent/v2-8-2-principal-grounding-contract`
- Head: `7426557`
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
- `GET /api/rules`
- `GET /api/intents`
- `GET /api/workspace`
- `GET /api/system`
- `GET /api/documents`

Expected behavior:

- `/api/version` returns `ok=true` and CLI version output.
- `/api/status` returns parsed status JSON from `kbx status --json`.
- `/api/phase2-bridge` returns gate summary with severity policy (`hard-fail`, `warn`, `info`) and block/warn evaluation.
- `/api/rules` returns parsed rule catalog JSON from `kbx rules list --json`.
- `/api/intents` returns parsed intent registry JSON from `kbx intent list --all --json`.
- `/api/workspace` returns summarized workspace snapshot (no source field; 500 on error).
- `/api/system` returns summarized health snapshot (no source field; 500 on error).
- `/api/documents` returns summarized graph consistency snapshot (no source field; 500 on error).

Observed endpoint evidence:

- `/api/rules`: `ok=true`, `parsed.count=19`, `command="kbx rules list --json"`
- `/api/intents`: `ok=true`, `parsed.count=63`, `command="kbx intent list --all --json"`
- `/api/system`: `ok=true`, `result="WARN"`, check summary captured.
- `/api/documents`: `ok=true`, `entityCount=301`, `relationCount=109`, `issueCount=2`.

## Test Evidence (Phase 2 + Phase 3 Hardening)

Command:

```bash
npm --prefix ./site/kbx-ui run test
```

Result:

- `pass 12`, `fail 0`
- Covered behaviors:
  - hard-fail summary marks bridge as blocked
  - success path with unique active intent
  - fail path when active intent uniqueness is violated
  - `/api/rules` contract payload
  - `/api/intents` contract payload
  - `/api/phase2-bridge` summary contract payload
  - `/api/workspace` summary (success + command-fail paths)
  - `/api/system` summary (success + command-fail paths)
  - `/api/documents` summary (success + command-fail paths)

## Phase 4 Mutation Contract Checkpoint

Command:

```bash
npm --prefix ./site/kbx-ui run test
npm --prefix ./site/kbx-ui run build
```

Result:

- `pass 21`, `fail 0`
- `tsc -b && vite build` passed.
- Mutation endpoints implemented and contract-tested:
  - `POST /api/intents/create`
  - `PATCH /api/intents/:id`
  - `POST /api/intents/:id/approve`
  - `GET /api/intents/:id/apply-preview`
  - `POST /api/intents/:id/apply`

Observed behavior:

- Create intent form is wired to the bridge and reloads intents on success.
- Patch/approve/apply flows validate request payloads before calling the CLI.
- Apply-preview returns structured diff + warnings, and apply requires `confirmed=true`.
- No source payload leak reintroduced in workspace/system/documents endpoints.

## Phase Assessment

- Phase 0: complete (naming/lifecycle/principles-vs-rules closure).
- Phase 1: complete (Option B shell decision + executable proof).
- Phase 1.5: complete (status endpoint + runtime error handling + gate evaluation endpoint).
- Phase 2: complete for gate-evaluation baseline (typed wrappers + core gate tests passing).
- Phase 3: complete (all 6 read-only endpoints live; fail-path tests passing; no-source-leak hardening in place).
- Phase 4: mutation-contract checkpoint complete (endpoints + create form + contract tests + build).

## Next Gate: Remaining Phase 4 Interactive Flows

Phase 4 mutation checkpoint satisfied:
- Mutation endpoints are live and contract-tested.
- Create form is wired to the bridge.
- Build and test validation passed on the current checkpoint.

Remaining Phase 4 work:
1. Add update / approve / apply UI surfaces.
2. Add pre-apply review UI with diff and warnings.
3. Extend intent lifecycle actions beyond create.
