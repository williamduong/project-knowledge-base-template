# SVFactory-Only Mode Plan

**Date:** 2026-05-27  
**Status:** Active execution policy  
**Purpose:** Lock the current build mode so SVFactory can finish its own foundation before switching to downstream KBX generation work.

---

## 1. Current Policy

Only one operator mode is active now:

- `svfactory`

The downstream mode is intentionally not active yet:

- `kbx` -> disabled until SVFactory surfaces are complete enough to generate, validate, and release KBX variants with confidence

This means the product should currently behave like:

- build the factory first
- use the factory later

---

## 2. Why This Mode Freeze Exists

The repository is already clear enough to move into structured workspace completion, but it is not yet complete enough to support both:

1. building SVFactory itself
2. building downstream KBX products

at the same time without splitting focus.

Therefore:

- no parallel product-story expansion into full KBX generation mode yet
- no premature dual-mode UX complexity
- finish factory surfaces first

---

## 3. What "SVFactory-Only Mode" Means In Practice

### 3.1 Product scope

The shell should currently optimize for:

- factory governance
- factory code graph
- factory intent management
- factory rules harness
- factory flow/gates/process orchestration
- factory tools registry
- factory DNA readiness
- factory runtime operations

### 3.2 UX scope

The UI may show that a future `kbx` mode exists conceptually, but:

- it should not be interactive as a full operator mode yet
- it should not dominate navigation
- it should not steal implementation focus from the factory core

### 3.3 Delivery scope

Each workspace must be completed as a real slice before moving on:

- boundary
- data contract
- UI route/page
- empty/loading/error states
- test coverage
- documentation

No workspace should be considered "done enough" with only partial implementation.

---

## 4. Ordered Build Sequence

The factory should be completed in this order:

1. `Shell + mode boundary`
2. `Code`
3. `Intent`
4. `Rules`
5. `Flow`
6. `Tools`
7. `DNA`
8. `System`
9. `Dashboard`

### 4.1 Why this order

- `Shell + mode boundary` prevents future navigation drift.
- `Code` is foundational because code graph is already real and useful.
- `Intent` comes next because followability and impact depend on a stable substrate.
- `Rules` turns governance into a trustworthy harness.
- `Flow` turns gates, pipelines, and triggers into the execution grammar of the factory.
- `Tools` constrains how agents actually act.
- `DNA` only becomes truly useful once the underlying grammar is stable.
- `System` should be narrowed after the real operator surfaces are extracted.
- `Dashboard` should only summarize mature surfaces, not guess ahead of them.

---

## 5. Completion Rule Per Workspace

A workspace is only allowed to count as completed when it has all of the following:

1. boundary clearly defined
2. contract/data shape clearly defined
3. primary UI page and navigation integrated
4. stable states handled:
   - empty
   - loading
   - error
   - populated
5. test coverage for the slice
6. short architecture note so later agents do not reinterpret it incorrectly

This policy exists to prevent:

- half-backend slices
- half-UI slices
- shell sprawl without trustworthy operator surfaces

---

## 6. Mode Strategy For Later

The future two-mode model is still valid:

1. `svfactory` mode
2. `kbx` mode

But activation order matters:

- first finish `svfactory`
- then unlock `kbx`

When `kbx` mode is enabled later, it should reuse the same shell grammar where possible, but operate on downstream user/project data rather than the factory's own worldview.

---

## 7. Immediate Working Rule

From this point forward:

- all UI refactor decisions should be evaluated against `SVFactory-only mode`
- if a feature primarily serves downstream KBX runtime instead of factory completion, defer it
- only one major workspace implementation should be in active construction at a time

Current active implementation target:

- `Code`
