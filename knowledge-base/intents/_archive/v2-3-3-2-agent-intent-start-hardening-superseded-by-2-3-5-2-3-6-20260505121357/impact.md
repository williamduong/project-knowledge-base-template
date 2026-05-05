---
intent_id: v2-3-3-2-agent-intent-start-hardening
type: intent-impact
---

# Impact

## Affected Areas

- Maintainer agent protocol (`kb-root/agent.md`, `kb-root/process.md`)
- Shipped KB Agent contract (`template/.github/agents/kb.agent.template.md`)
- Governance discoverability (`template/12-ai-skills/agent-operating-manual.md`)
- Intent governance consistency for upgrade-test flows

## Breaking Change

no

This is an additive process hardening change. Existing commands remain unchanged.

## Downstream Risk

- Low risk: startup adds one explicit intent-selection interaction, which can increase first-response verbosity.
- Medium process risk: if active intent list is stale/noisy, user may choose wrong intent; mitigated by one-line summary per intent.

## Impact Signals

- Reduced startup ambiguity for multi-intent repositories.
- Lower chance of agent auto-creating wrong intent.
- Better traceability when user asks to patch old version line before current focus version.
