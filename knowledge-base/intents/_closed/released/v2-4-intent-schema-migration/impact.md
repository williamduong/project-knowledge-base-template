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
- Positive: dry-run output provides auditability before write.
- Positive: write-path implemented with DELETE_SENTINEL — original legacy fields (`status`, `lifecycle_state`) are physically removed from frontmatter after rename.
- Positive: `kb doctor` now surfaces migration need automatically on every workspace health check — users upgrading to v2.4.0 see the warning without running `kb intent cleanup` first.
- Closed: write-path migration is implemented and tested.