---
name: KBX Start UI
type: directive
category: runtime-operations
scope: downstream
trigger: /kbx-start-ui
version: 1.0.0
---

# /kbx-start-ui

Use this explicit prompt when the user wants the local KBX UI stack to come up without manually orchestrating bridge and frontend services.

Goals:

1. verify the KB install is healthy before starting runtime services
2. start the bridge first
3. inspect the registered runtime services from the bridge registry
4. ensure the required UI services are healthy in registry order
5. apply safe local fixes automatically when a required service fails to start
6. stop only when all required registered services are healthy or a concrete blocker remains

Rules:

1. Operate as `@kbx` only.
2. Run the normal KB Agent preflight first (`kbx status --json`, `kbx doctor --json`). If install state is not healthy, stop and surface the recovery path instead of forcing UI startup.
3. Use the public deterministic CLI surface first: `kbx ui start`.
4. The CLI internally relies on the public runtime surfaces only. Do not import or edit CLI internals:
   - bridge entry: `site/kbx-ui/server.mjs`
   - registry: `site/kbx-ui/runtime-services.json`
   - live status: `GET /api/runtime-services`
   - service start: `POST /api/runtime-services/:id/ensure`
5. Start order is mandatory:
   - first, ensure `bridge`
   - then read the live registry snapshot
   - then ensure required managed services in the same order they appear in the registry
6. Required service set for downstream UI bring-up:
   - always include `bridge`
   - include `uiv2` when present in the registry
   - include every service with `autoStart: true`
   - do not invent extra services outside the registry
7. Prefer deterministic health checks over terminal guesses. Re-check `/api/runtime-services` after every start or fix attempt.
8. Safe auto-fix loop is allowed, but keep it local and bounded:
   - if the bridge fails to parse, run `node --check site/kbx-ui/server.mjs`
   - if a Vite service cannot start because dependencies are missing, run `npm install` in that service `cwd`
   - if a `vite-preview` service cannot start because build output is missing or stale, run `npm run build` in that service `cwd`
   - if a managed service is already healthy on another allowed port, accept it and continue
   - do not rewrite registry structure or ports unless the user explicitly asks
9. Retry each required service after each safe fix, but do not loop more than 2 repair rounds per service.
10. If a required service still fails, stop with the exact blocker, the failing service ID, and the last concrete evidence.
11. End with:
   - Services started
   - Fixes applied
   - Remaining blockers
   - Next