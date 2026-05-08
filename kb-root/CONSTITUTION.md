# CONSTITUTION — KBRoot Architectural Axioms

> **Supremacy Clause:** This document is the highest-authority artefact in this repository.
> All principles, plans, processes, and code are subordinate to it.
> In any conflict between this document and any other file, this document wins.
>
> **Amendment Rule:** Changes to this file require explicit, named approval from the repository owner.
> No agent, no automated process, and no PR may modify this file without that approval on record.

---

## How To Use This Document

Before introducing any new feature, command, module, or architectural pattern into KBRoot:

1. Read each Axiom.
2. State which Axiom(s) your change touches.
3. Verify your change does not violate the Enforcement Rule.
4. If it does — discard the change. Do not negotiate. Do not create exceptions.

Keywords in Enforcement Rules follow [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119):
`MUST`, `MUST NOT`, `SHALL`, `SHALL NOT`, `REQUIRED`, `FORBIDDEN`.

---

## AXIOM 1 — Separation of Powers

**Statement:** "KBRoot is Legislative. KBAgent is Executive."

**Definition:**
KBRoot solely creates rule sets (Compiler) and validates them (Validator). It does not execute the daily tasks of any project. Coordinating agents, running intents, or driving workflows are exclusively KBAgent responsibilities.

**Enforcement Rule:**
Any command, module, or function that executes an operational workflow (intent run, agent coordination, task dispatch) MUST NOT be placed in KBRoot. It SHALL be placed in KBAgent.

**Practical Check:**
- KBRoot knows how to read `company-dna.yaml` to understand the law. ✓
- KBRoot does NOT know that Intent INT-042 is about fixing the Auth bug. ✗ (KBAgent's job)

**Reflection:**
If a proposed command is `kbroot run intent` → Architectural violation. The correct form is `kbagent run intent`. Reject immediately.

---

## AXIOM 2 — Domain Agnosticism

**Statement:** "KBRoot has no projects. KBRoot has no concept of Business."

**Definition:**
KBRoot MUST work identically for a B2B SaaS project, an educational platform, and a research blog. It provides only primitive types: `Intent`, `Gate`, `Evidence`, `Chaos_Score`. KBAgent builds domain concepts on top of these primitives.

**Enforcement Rule:**
KBRoot code MUST NOT contain any domain-specific logic, hardcoded project names, business-layer identifiers, or routing based on project type. Any variable or function name that encodes a business concept is FORBIDDEN in KBRoot source.

**Practical Check:**
- KBRoot exposes `Intent` as a primitive. ✓
- KBRoot contains a function `check_stripe_payment`. ✗ (domain-specific violation)

**Reflection:**
If a PR introduces variables like `is_marketing_task` or `check_stripe_payment` into KBRoot code → Architectural violation. Block the PR.

---

## AXIOM 3 — Deterministic Block

**Statement:** "KBRoot does not advise. KBRoot only Permits (Exit 0) or Blocks (Exit 1)."

**Definition:**
KBRoot is the structural gatekeeper. It has no AI flexibility. If a schema or DNA rule is violated, KBRoot refuses execution with a deterministic exit code. It does not attempt to guess, suggest a fix, or retry using an LLM.

**Enforcement Rule:**
Every KBRoot validation function MUST return only Exit 0 (permit) or Exit 1 (block). KBRoot MUST NOT call any LLM API, generate advisory text, or apply automatic corrections. Auto-fix logic using LLM SHALL NOT exist in KBRoot — it belongs exclusively in KBAgent.

**Practical Check:**
- An agent pushes a file without a required Intent ID. KBRoot drops Exit 1 and blocks the PR immediately. ✓
- KBRoot calls an LLM to guess which Intent the file belongs to, then proceeds. ✗ (extremely dangerous violation)

**Reflection:**
If a proposed feature is "Auto-fix schema errors using LLM" inside KBRoot → Reject immediately. KBAgent detects the error, fixes it, and resubmits. KBRoot only gates.

---

## AXIOM 4 — Checkpoint-Driven Audit

**Statement:** "KBRoot does not track timelines. It only lives at Intersections."

**Definition:**
KBRoot operates as a serverless function, not a daemon. It activates exclusively at three defined checkpoints:
1. **Init / Compile** — When DNA Schema is converted to runtime configuration.
2. **Pre-commit / Pre-merge** — When an Evidence or code branch attempts to merge.
3. **Audit Request** — When an explicit inspection command is invoked (e.g., Chaos Report).

**Enforcement Rule:**
KBRoot MUST NOT contain any file-watching, polling, or continuous background monitoring logic. Any module named `watch_*`, `monitor_*`, or `daemon_*` is FORBIDDEN in KBRoot. Real-time observation belongs to KBAgent's MCP layer.

**Practical Check:**
- KBRoot fires a schema validation gate at pre-commit time. ✓
- KBRoot has a `watch_file_changes_realtime` module running in the background. ✗ (system garbage)

**Reflection:**
If a proposed module watches for file changes in real time inside KBRoot → Delete it. That capability belongs in KBAgent or the MCP Server layer.

---

## AXIOM 5 — Invisibility

**Statement:** "The end-user (CEO, Partners, Clients) never sees KBRoot."

**Definition:**
KBRoot has no UI and no dashboard. It communicates exclusively via machine standards: MCP (Model Context Protocol), JSON, and CLI stdout. Any interface the end-user sees is rendered by KBAgent or an MCP Client — never by KBRoot directly.

**Enforcement Rule:**
KBRoot MUST NOT contain any UI component, rendered HTML, interactive prompt, or user-facing display logic. KBRoot output SHALL be machine-readable (JSON or structured CLI stdout) only. KBRoot SHALL reside inside CI/CD pipelines or `node_modules/@williamduong/kb-root` — never in a user-visible product surface.

**Practical Check:**
- KBRoot outputs a JSON result to stdout. KBAgent renders it as a chat message in VS Code. ✓
- KBRoot contains a React component for displaying a Chaos Dashboard. ✗ (wrong layer entirely)

**Reflection:**
If a proposed feature adds a React component or interactive terminal UI inside KBRoot → Wrong repository. Redirect to KBAgent's MCP rendering surface.

---

## Architecture Mandate — Folder Split Target

The 5 Axioms above mandate the following physical separation (target: v3.0 monorepo):

```
packages/kb-root    — Schema Validation, System Prompt Generator, CLI init
                      (Legislative: Axioms 1, 2, 3, 4, 5)

packages/kb-agent   — Intent Lifecycle, Impact Analysis, MCP Server, orchestration
                      (Executive: consumes kb-root primitives)
```

Any new code written today MUST be mentally assigned to one of these two packages.
If it cannot be cleanly assigned — it is an architectural violation by ambiguity. Resolve before merging.

---

*Last amended: 2026-05-08. Amendment requires explicit owner approval on record.*
