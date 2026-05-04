---
title: KB Numbering System
type: governance
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-04
last_verified: 2026-05-04
related:
  - ../12-ai-skills/agent-operating-manual.md
  - metadata-schema.md
tags:
  - numbering
  - intent
  - governance
---

# KB Numbering System

Defines how every intent, plan, intent-phase, and intent-task is identified across a knowledge-base project. Consistent numbering enables traceability, cross-session resumability, and unambiguous references in agent output.

Vocabulary note (D00): `runtime-step` belongs to `/kb-plan` and `/kb-run` execution of `runtime-plan.md`; it is intentionally outside this numbering contract.

---

## 1. Hierarchy

Four levels, each scoped to its parent:

```
INT-001          Intent
  └─ PL-001        Plan (scoped to INT-001)
       └─ PH-1       Phase (scoped to PL-001)
            └─ T-1     Task (scoped to PH-1)
                 └─ T-1.1  Sub-task
```

Every level may have a sub-level using dot notation.

| Level  | Prefix | Format        | Scope              |
|--------|--------|---------------|--------------------|
| Intent | `INT`  | `INT-001`     | Global within KB   |
| Plan   | `PL`   | `PL-001`      | Within one Intent  |
| intent-phase  | `PH`   | `PH-1`        | Within one Plan    |
| intent-task   | `T`    | `T-1`         | Within one intent-phase   |

Sub-levels use dot notation at any depth:
- `INT-001.1` — sub-intent of `INT-001`
- `PL-001.2` — sub-plan
- `PH-1.3` — sub-phase
- `T-2.1`, `T-2.1.4` — sub-task, nested sub-task

---

## 2. Format Rules

### Intent (`INT`)
- Three-digit zero-padded counter, global to the KB: `INT-001`, `INT-002`, …, `INT-999`.
- Sub-intents append dot-and-digit: `INT-001.1`, `INT-001.2`.
- Counter stored at `.kb/numbering.json` under key `"intent"`.

### Plan (`PL`)
- Three-digit zero-padded, scoped to parent intent: `PL-001`.
- Restarts from `001` for each new Intent.
- Counter stored at `.kb/numbering.json` under key `"plan.<INT-id>"`.

### Intent-Phase (`PH`)
- One-based integer, scoped to parent plan: `PH-1`, `PH-2`.
- Restarts from `1` for each new Plan.

### Intent-Task (`T`)
- One-based integer, scoped to parent intent-phase: `T-1`, `T-2`.
- Sub-tasks use dot notation: `T-3.1`, `T-3.2`.
- Restarts from `1` for each new intent-phase.

### Full Reference
Combine levels from outermost to innermost:

```
[INT-002][PL-001][PH-2][T-3]
```

Within a session where the Intent context is already clear, short form is acceptable:

```
[PH-2][T-3]
```

---

## 3. Counter Storage

Counter state lives at `.kb/numbering.json` (within `contentRoot`):

```json
{
  "intent": 3,
  "plan": {
    "INT-001": 1,
    "INT-002": 2,
    "INT-003": 1
  }
}
```

- `intent` is the last issued INT number.
- `plan.<id>` is the last issued PL number within that intent.
- Intent-phase and intent-task counters are transient (session-scoped), not persisted — they reset at the start of each new intent-phase or Plan.

---

## 4. Fallback (No Counter Available)

When `.kb/numbering.json` does not exist or the counter cannot be read:

| Level  | Fallback Format                          | Example                    |
|--------|------------------------------------------|----------------------------|
| Intent | `INT-` + ISO timestamp compact           | `INT-20260503T1414`        |
| Plan   | `PL-` + ISO timestamp compact            | `PL-20260503T1414`         |
| Intent-phase | Sequential from `1` within session       | `PH-1`, `PH-2`             |
| Intent-task  | Sequential from `1` within intent-phase  | `T-1`, `T-2`               |

After successful fallback use, create `.kb/numbering.json` with the timestamp-derived value so subsequent IDs are sequential.

---

## 5. Setup (User Preference)

During the Persona Wizard (first KB activation), the agent asks:

> "How should intents be numbered?  
> A) Sequential (`INT-001`, `INT-002`, …) — clean and readable  
> B) Timestamp-based (`INT-20260503T1414`) — unique across sessions without a counter  
> C) Custom prefix (e.g. `FEAT-001`, `BUG-001`) — use your own category prefixes"

If the user picks **C**, they supply the prefix(es) and the counter still follows the same zero-padded format under that prefix.

Store the choice in `state.json` under `numberingPreference: { style: "sequential" | "timestamp" | "custom", prefixes: {...} }`.

---

## 6. Agent Rules

1. **Always assign IDs before starting work.** Do not begin a plan without issuing an `INT-` ID.
2. **Always reference by full path in cross-session output.** Use `[INT-002][PL-001][PH-2][T-3]` in plan files, commit messages, and session summaries.
3. **Short form in-session only.** `[PH-2][T-3]` is acceptable when the intent context is already established in the same session.
4. **Never re-use IDs.** Cancelled or archived intents keep their ID. New intents get the next counter value.
5. **Print ID at start of every intent.** First output line for any intent-scoped task: `[INT-NNN] <title>`.
6. **Sub-intents are real intents.** `INT-001.1` must have its own `intent.md` and archive path. Do not use sub-intent notation for tasks.

## 6.1 Version-Embedded INT IDs

When a KB tracks a versioned software project, INT IDs **may** embed the version in place of the sequential counter:

```
INT-<major>-<minor>-<patch>-<slug>   →  INT-2-3-2-notes-migration-closeout
```

Rules:
- A version may have exactly **one** owner intent (identified by the version scope directly, e.g. `v2-3-2-closure-pass`).
- Supporting intents for the same version use the version-embedded INT format above.
- Supporting intents must not reuse the owner intent's exact version-scoped ID.
- This format is an alternative to the sequential `INT-001` counter; choose one style per KB and record it in `state.json` under `numberingPreference.style`.

Example:
- valid: owner `v2-3-2-closure-pass` + supporting `INT-2-3-2-notes-migration-closeout`
- invalid: owner `v2-3-2-closure-pass` + supporting `v2-3-2-notes-migration-closeout`

---

## 7. Examples

### Minimal (quick intent)
```
[INT-005] Fix review-cadence governance doc
  [PH-1][T-1] Read current doc
  [PH-1][T-2] Stage corrected version
  [PH-1][T-3] Apply and archive
```

### Multi-intent-phase (full intent)
```
[INT-006][PL-001] Init realworld-express project knowledge base
  [PH-1] Discovery
    [T-1] Run kb status
    [T-2] Detect project type and stack
    [T-3] Scaffold tier structure
  [PH-2] Core Documentation
    [T-1] Fill system-overview
    [T-2] Fill domain model
    [T-2.1] Entity definitions
    [T-2.2] Relationship map
  [PH-3] Verification
    [T-1] Doc-gate pass
    [T-2] Archive intent
```

### Sub-intent
```
[INT-006]     Init project knowledge base  (parent)
[INT-006.1]   Fill AI skills tier          (sub-intent, spawned during PH-2)
```
