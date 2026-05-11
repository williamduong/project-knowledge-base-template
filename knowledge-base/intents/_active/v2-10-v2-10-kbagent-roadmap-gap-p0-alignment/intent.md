---
id: v2-10-v2-10-kbagent-roadmap-gap-p0-alignment
mode: quick
lifecycle: active
created_at: "2026-05-11T15:33:22.388Z"
focus:
  current: "Executing P0 naming normalization: fixing kb→kbx in src/commands/*.js (233 replacements across 26 files). Next: lifecycle domain labeling and principles/rules separation in roadmap HTML docs."
  last_updated: 2026-05-12
  next_action: "Update kbagent-complete-doc.html to clarify workflow lifecycle (folder-based) vs ontology lifecycle (DRAFT/PROPOSED/VERIFIED/EXECUTED/COMMITTED), then address KBX-AX/P rules vs Principles separation."
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
  - notes/roadmap/kbagent-roadmap-execution-plan.md
impact_signals: []
decision_summary: "P0 scope is documentation and source code cleanup only: (1) normalize all CLI command references from kb to kbx across src/commands/*.js — 233 replacements completed; (2) make lifecycle states domain-explicit in roadmap HTML docs (workflow: _backlog/_active/_archive folder states vs ontology: DRAFT/PROPOSED/VERIFIED/EXECUTED/COMMITTED formal states); (3) clarify KBX-AX constitutional rules vs KBX-P process rules vs Principles (P0-P25 governance in svfactory/principles.md) as three distinct layers. No runtime behavior change. Prior anchor v2-9-kbagent-observability-graph was dropped (scope drift); this intent is sole active work."
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

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-svfactory>`

