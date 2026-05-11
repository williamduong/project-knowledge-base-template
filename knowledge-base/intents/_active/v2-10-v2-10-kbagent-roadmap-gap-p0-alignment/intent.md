---
id: v2-10-v2-10-kbagent-roadmap-gap-p0-alignment
mode: quick
lifecycle: active
created_at: "2026-05-11T15:33:22.388Z"
focus:
  current: "P0 gap closure artifacts completed: dispatch tuple contract, ontology/CDM mapping, gates+generative loop contract, Axiom 4/5 boundary notes, and bi-temporal model documentation are now published in roadmap docs."
  last_updated: 2026-05-11
  next_action: "Close P0 intent as released if no additional roadmap wording gaps are found, then activate P1 intent (dispatch+CDM integration hardening) according to depends_on chain."
change_type: docs
change_scope:
  - src/commands/intent.js
  - src/commands/chaos.js
  - src/commands/graph.js
  - src/commands/release.js
  - src/commands/bind.js
  - src/commands/doctor.js
  - src/commands/extract.js
  - src/commands/maintain.js
  - src/commands/mark.js
  - src/commands/plan.js
  - src/commands/baseline.js
  - src/commands/bootstrap.js
  - src/commands/ide.js
  - src/commands/impact.js
  - src/commands/index.js
  - src/commands/ingest.js
  - src/commands/init.js
  - src/commands/migrate.js
  - src/commands/next.js
  - src/commands/normalize-state.js
  - src/commands/questions.js
  - src/commands/scan.js
  - src/commands/status.js
  - src/commands/test.js
  - src/commands/uninstall.js
  - src/commands/verify.js
  - notes/roadmap/kbagent-gap-analysis.html
  - notes/roadmap/kbagent-roadmap.html
  - notes/roadmap/kbagent-rules.html
  - notes/roadmap/kbagent-roadmap-execution-plan.md
  - notes/roadmap/kbagent-dispatch-decision-tuple.html
  - notes/roadmap/kbagent-ontology-cdm-mapping.html
  - notes/roadmap/kbagent-gates-and-generative-loop.html
impact_signals: []
decision_summary: "P0 closure is complete across documentation and command-surface wording: (1) kb→kbx normalization in src/commands/*.js; (2) lifecycle domain separation wording (workflow lifecycle vs ontology lifecycle) across roadmap docs; (3) principles-vs-runtime-rules separation explicitly documented; (4) previously open conceptual gaps now have dedicated artifacts: dispatch tuple, ontology/CDM mapping, gate catalog with severity policy, generative loop contract, Axiom 4/5 boundary, and bi-temporal frontmatter model."
review_after: null
schema_version: 2.7.0-beta.2
slug: v2-10-kbagent-roadmap-gap-p0-alignment
title: "KBAgent roadmap-gap P0 alignment"
description: "Apply P0 corrections from gap analysis: naming normalization, lifecycle wording alignment, and principles-vs-rules separation in roadmap-facing artifacts."
activated_at: "2026-05-11T15:33:22.392Z"
architecture_position:
  wave: v2.10
---

# Intent: v2-10-v2-10-kbagent-roadmap-gap-p0-alignment

## Summary

Apply P0 corrections identified in the KBAgent gap analysis (notes/roadmap/kbagent-gap-analysis.html):

1. **CLI naming normalization** — Source code in `src/commands/*.js` still referenced `kb <command>` in error messages, help text, and console output after the CLI was renamed to `kbx` (commit 71d68f2). Fixed 233 occurrences across 26 files.
2. **Lifecycle domain labeling** — Documentation conflates two lifecycle systems: workflow lifecycle (folder-based: _backlog, _active, _archive) and ontology lifecycle (formal states: DRAFT/PROPOSED/VERIFIED/EXECUTED/COMMITTED). Roadmap artifacts need to distinguish these clearly.
3. **Principles vs Rules separation** — Roadmap docs present KBX-AX (constitutional) and KBX-P (process) rules as a single rule system, but the repo separates governance into 25 Principles (P0-P25 in svfactory/principles.md) and runtime rule families (M/V/I/GB/AX/PR/WF/KA).
4. **Concept gap closure artifacts** — Added dedicated docs to close all mismatch items from gap analysis:
  - `notes/roadmap/kbagent-dispatch-decision-tuple.html`
  - `notes/roadmap/kbagent-ontology-cdm-mapping.html`
  - `notes/roadmap/kbagent-gates-and-generative-loop.html`

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-svfactory>`

