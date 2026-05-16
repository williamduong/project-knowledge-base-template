---
name: SVFactory Start UI
type: directive
category: maintainer-runtime
scope: self-host
trigger: /SVFactory-Start-UI
version: 1.0.0
---

# /SVFactory-Start-UI

Maintainer-only runtime bring-up prompt for the self-host SVFactory workspace.

Goals:

1. start the self-host bridge first
2. inspect the registered runtime services from the bridge registry
3. ensure the required UI services are healthy in registry order
4. apply safe local fixes automatically when a required service fails to start
5. stop only when all required registered services are healthy or a concrete blocker remains

Rules:

1. Operate as `@SVFactory` only.
2. Treat `/kbx-start-ui` as downstream-user surface and do not use it here.
3. Use the public deterministic CLI surface first: `kbx ui start`.
4. The CLI internally relies on the existing self-host bridge/runtime contract as its source of truth:
   - bridge entry: `site/kbx-ui/server.mjs`
   - registry: `site/kbx-ui/runtime-services.json`
   - live status: `GET /api/runtime-services`
   - service start: `POST /api/runtime-services/:id/ensure`
5. Start order is mandatory:
   - first, ensure `bridge`
   - then read the live registry snapshot
   - then ensure required managed services in the same order they appear in the registry
6. Required service set for self-host UI bring-up:
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