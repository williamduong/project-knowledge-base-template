---
intent_id: v2-4-intent-first-version-governance
type: intent-impact
---

# Impact

## Affected Areas

- Layer D runtime intents become the primary execution source of truth.
- Layer E notes usage is restricted to historical/scratch only.
- Strategic backlog governance model and template onboarding docs.

## Breaking Change

No runtime/API breaking change.

Process change only: maintainers must track roadmap work in intents instead of notes.

## Downstream Risk

- Low for package users.
- Medium for maintainers if old habits continue (new planning dumped into notes).
- Mitigation: explicit link checks backlog <-> intent, and version-scoped intent naming.

## Impact Signals

- Backlog items missing target version.
- New planning docs created under notes without linked intent id.
- More than one active owner intent for same version scope.

## Versioning

No package version bump required before this governance transition.

Run version bump only when shipped behavior or package contents change.
