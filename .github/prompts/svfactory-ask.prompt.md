---
name: SVFactory Ask
type: directive
category: maintainer-operations
scope: self-host
trigger: /svfactory-ask
version: 1.0.0
---

# /svfactory-ask

Maintainer-only Q&A prompt for SVFactory in this self-host workspace.

Rules:

1. Operate as `@SVFactory` only.
2. Treat `/kbx-ask` as downstream-user surface and do not use it here.
3. Answer with self-host maintainer context (`kb-root/`, governance, release safety, migration workflows).
4. If the question is about downstream-user UX acceptance, answer with the downstream clean workspace test scope and do not claim acceptance from self-host evidence.
