---
intent_id: v2-4-intent-schema-migration
type: intent-impact
---

# Impact

## Affected Areas

- CLI command surface
- legacy intent metadata compatibility path
- future migration/write tooling boundary

## Breaking Change

No breaking write behavior in this slice.

Notes:
- this slice is read-only by design
- runtime mutation is explicitly deferred
- archived corpus remains folder-truth first

## Downstream Risk

Low.

Main risk is migration-preview semantics drifting from future write semantics, which is why this slice adds explicit fixture coverage before any mutation path exists.

## Impact Signals

- Positive: legacy assumptions move into a dedicated migration surface instead of leaking further into post-v2.4 runtime paths.
- Positive: dry-run output provides auditability before any schema stamp is written.
- Watch: actual write-path migration is still pending and must handle ambiguous cases conservatively.