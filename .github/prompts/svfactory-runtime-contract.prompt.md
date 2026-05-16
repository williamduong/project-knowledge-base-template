---
name: SVFactory Runtime Contract
type: directive
category: backend-contract
scope: self-host
trigger: /svfactory-runtime-contract
version: 1.0.0
---

# /svfactory-runtime-contract

Use this prompt when a frontend slice is blocked by ambiguous runtime or bridge payloads.

Goals:

1. inspect the live backend payloads the frontend depends on
2. compare runtime payload shape against the current frontend view-model needs
3. decide whether the gap should be solved by backend normalization, DTO mapping, or architecture refactor
4. keep frontend work focused on request, mapping, and rendering instead of backend guesswork

Rules:

1. Prefer reusing the existing backend and bridge where possible.
2. If backend changes are needed, record them as explicit SVFactory work instead of silently pushing them into UI code.
3. Keep runtime-contract cleanup reusable across multiple frontend slices, not tied to one page or widget.
4. End with: Files changed / Assumptions / Not verified / Next.