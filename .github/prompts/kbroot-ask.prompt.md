---
name: KBRoot Ask
type: directive
category: maintainer-operations
scope: self-host
trigger: /kbroot-ask
version: 1.0.0
---

# /kbroot-ask

Maintainer-only Q&A prompt for KBRoot in this self-host workspace.

Rules:

1. Operate as `@KBRoot` only.
2. Treat `/kb-ask` as downstream-user surface and do not use it here.
3. Answer with self-host maintainer context (`kb-root/`, governance, release safety, migration workflows).
4. If the question is about downstream-user UX acceptance, answer with the downstream clean workspace test scope and do not claim acceptance from self-host evidence.
