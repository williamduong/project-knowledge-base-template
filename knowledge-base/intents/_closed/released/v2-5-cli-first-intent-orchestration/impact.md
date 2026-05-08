---
intent_id: v2-5-cli-first-intent-orchestration
type: intent-impact
---

# Impact

## Affected Areas

- Runtime command surface design for project context and intent scoping
- KB Agent orchestration contract and governance wording
- Strategic backlog prioritization and intent sequencing

## Breaking Change

no

This intent defines command contracts and governance alignment first; implementation can remain additive and backward-compatible.

## Downstream Risk

- Risk of confusion if command naming is unclear across single-project vs multi-project mode.
- Risk of over-constraining AI behavior if policy text is interpreted as strict-only instead of soft-first.
- Risk of drift if CLI contract and agent prompt updates are not shipped together.

## Impact Signals

- anticipated-user-confusion-on-context-switch
- anticipated-drift-if-prompt-cli-not-synced
- reduced-prompt-bloat-via-deterministic-rules
