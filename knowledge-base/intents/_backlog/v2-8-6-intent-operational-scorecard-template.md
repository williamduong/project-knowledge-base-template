---
slug: v2-8-6-intent-operational-scorecard-template
title: "Intent operational scorecard template"
description: "Create a reusable per-intent operational scorecard template based on dispatch retrospective metrics."
lifecycle: backlog
priority: "5.0"
blocks: null
priority: "5.0"
blocks: null
created_at: 2026-05-10T21:05:00.000Z
focus:
  current: "Recorded only. Await explicit approval before implementation."
  last_updated: 2026-05-10
  next_action: "If approved, draft reusable scorecard template for all future intents."
schema_version: 2.7.0-beta.2
depends_on:
  - commit: 858e7ab
    reason: "Dispatch retrospective and coverage matrix define baseline scorecard dimensions."
---

# Backlog Intent: v2-8-6-intent-operational-scorecard-template

## Why This Intent Exists

Scorecard usage is recurring operational work and should be standardized as a reusable template rather than ad hoc per intent.

## Scope

- Create a reusable per-intent scorecard template based on:
  - `template/15-governance/dispatch-governance-retrospective.md`
- Ensure the template can be applied consistently across future intents.

## Acceptance

1. Template is reusable for all future intents.
2. Template includes the following metrics:
   - lead time
   - rework count
   - escalation hit-rate
   - fixture churn
   - decision latency
   - blocked duration
3. Work does not change dispatch fixtures.
4. Work does not introduce runtime code.

## Non-Scope

- Any fixture edits.
- Any dispatch runtime implementation.
- Any test harness/runtime execution changes.



