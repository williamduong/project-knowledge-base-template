---
intent_id: v2-3-5-stabilization
type: intent-impact
---

# Impact

## Affected Areas

- CLI behavior for `kbx intent create`
- Intent governance discipline for version planning
- Intent command unit tests

## Breaking Change

no

This is a validation hardening change. Existing create flow is preserved, but
now rejects versioned IDs that do not move forward relative to active lines.

## Downstream Risk

- Low-to-medium: users creating versioned IDs out of order will get a hard error
  and must pick a higher version.
- Low: non-versioned IDs continue to work as before.

## Impact Signals

- Reduced version-line drift in active intents.
- Fewer manual corrections/renames for mis-versioned intents.

