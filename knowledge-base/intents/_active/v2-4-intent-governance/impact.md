---
intent_id: v2-4-intent-governance
type: intent-impact
---

# Impact

## Affected Areas

- CLI intent management surface
- intent filesystem model under `knowledge-base/intents/`
- prompt/agent template version markers
- maintainer planning/focus docs

## Breaking Change

No intentional runtime breaking change in this slice.

Notes:
- Existing commands still work.
- New helpers extend behavior but do not yet remove legacy paths.
- Full migration remains separated into `INT-2-4-intent-schema-migration`.

## Downstream Risk

- Low for this slice: changes are additive and covered by unit tests.
- Main remaining risk is expectation mismatch because `apply`, `status`, and `list` still carry some legacy assumptions; this is the next alignment slice.

## Impact Signals

- Positive: nested frontmatter support removes the need for brittle manual string patching when `focus` and future governance fields are introduced.
- Positive: `_backlog` and `_closed` path helpers reduce future state-logic duplication.
- Positive: `activate` and `close` now exist as explicit governance transitions instead of being plan-only concepts.
- Watch: current `cancel` and `apply` semantics are still partially legacy and need a later slice to align fully with the v2.4 governance contract.
