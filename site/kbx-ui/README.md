# KBAgent Localhost UI (Option B)

This app is the Phase 1 localhost shell for KBAgent roadmap execution.

Interaction boundary:
- Copilot Chat (agent `KBAgent`) stays in VS Code for proposing actions and generating prompts/patches.
- The webapp reads runtime state and triggers deterministic CLI-backed actions.
- State mutations must go through `kbx` CLI paths, not direct model calls.

## Run

From repo root:

```bash
npm run kbx:ui
```

Or directly:

```bash
npm --prefix ./site/kbx-ui run dev
```

Frontend:
- http://localhost:4173

Bridge backend:
- http://localhost:4174

## Validation Proof

Bridge endpoint for shell proof:

```bash
curl http://localhost:4174/api/version
```

Expected shape:

```json
{
  "command": "kbx --version",
  "ok": true,
  "exitCode": 0,
  "stdout": "2.7.0-beta.2",
  "stderr": ""
}
```

## Build

```bash
npm run kbx:ui:build
```