# KBX UI Intent Scan

## Status

This note captures the minimum source-aligned `Intent` contract currently available to the rebuild.

## Evidence Base

Current evidence comes from:

- `notes/kbx-ui-localhost-summary.md`
- `notes/kbx-ui-redesign-strategy.md`
- `notes/upgrade-phase4-interactive-mutations-plan.md`

Direct legacy source files are not currently available on this branch, so this scan is **notes-backed** rather than code-verified.

## Confirmed Intent Capabilities

- intents list exists
- selected intent detail exists
- create draft intent exists
- update intent exists
- approve intent exists
- apply preview exists
- apply intent exists
- task board exists inside the intent workspace
- metadata edit surface exists

## Canonical Endpoint Direction

```txt
GET    /api/intents
GET    /api/intents/:id/detail

POST   /api/intents/create
PATCH  /api/intents/:id
POST   /api/intents/:id/approve
GET    /api/intents/:id/apply-preview
POST   /api/intents/:id/apply
```

## Frontend Build Order For Intent

1. intent list
2. intent detail
3. intent actions / lifecycle controls
4. task list inside intent
5. task detail inside intent
6. summary blocks after flows are stable

## Current Refactor Risk

Open risk:

- task, rule, and pipeline context may still be mixed into intent-oriented payloads in ways that should eventually be split into cleaner contracts

Until runtime/source is re-scanned from live backend code, this remains a likely backend refactor watchpoint rather than a confirmed defect.