---
intent_id: v2-8-v2-8-svfactory-rule-catalog-hardening
type: intent-plan
---

# Plan

## Goal

Establish deterministic rule-catalog governance before any additional runtime rewiring by completing:

1. Phase A: full rule mapping matrix across SVFactory + KBAgent surfaces.
2. Phase B: canonical schema contract and hard test gates.

This plan is scoped to governance hardening and validation only; Phase C runtime expansion is explicitly deferred.

## Scope Guard (Axiom Check)

- Axiom 1 (Separation of powers): preserved. This change only catalogs and validates rules; no new operational workflow executor is introduced in SVFactory.
- Axiom 2 (Domain agnosticism): preserved. Catalog metadata remains project-agnostic.
- Axiom 3 (Deterministic block): strengthened by registration-time validation gates.
- Axiom 4 (Checkpoint-driven): unchanged.
- Axiom 5 (End-user invisibility): unchanged (no downstream UI added).

## Phase A — Mapping Matrix (SVFactory + KBAgent)

### A. Existing deterministic runtime rules (implemented)

| Rule ID | Source Doc | Owner Layer | Enforceability | Runtime Status |
|---|---|---|---|---|
| KBX-M001 | template/15-governance/metadata-schema.md | svfactory | auto | implemented |
| KBX-M002 | template/15-governance/metadata-schema.md | svfactory | auto | implemented |
| KBX-M003 | template/15-governance/metadata-schema.md | svfactory | auto | implemented |
| KBX-M004 | template/15-governance/metadata-schema.md | svfactory | auto | implemented |
| KBX-V001 | template/15-governance/verification-policy.md | svfactory | auto | implemented |
| KBX-V002 | template/15-governance/verification-policy.md | svfactory | auto | implemented |
| KBX-I001 | template/12-ai-skills/intent-lifecycle-schema.md | kbagent | auto | implemented |
| KBX-I002 | template/12-ai-skills/intent-lifecycle-schema.md | kbagent | auto | implemented |
| KBX-GB001 | template/15-governance/git-binding-policy.md | svfactory | auto | implemented |
| KBX-GB002 | template/15-governance/git-binding-policy.md | svfactory | auto | implemented |

### B. SVFactory constitutional and governance rules (natural-language source)

| Surface | Rule Anchor | Proposed Namespace | Owner Layer | Enforceability | Runtime Status |
|---|---|---|---|---|---|
| svfactory/CONSTITUTION.md | Axiom 1 Separation of Powers | KBX-AX001 | svfactory | human -> auto candidate | planned |
| svfactory/CONSTITUTION.md | Axiom 2 Domain Agnosticism | KBX-AX002 | svfactory | human -> auto candidate | planned |
| svfactory/CONSTITUTION.md | Axiom 3 Deterministic Block | KBX-AX003 | svfactory | human -> auto candidate | planned |
| svfactory/CONSTITUTION.md | Axiom 4 Checkpoint-Driven Audit | KBX-AX004 | svfactory | human -> auto candidate | planned |
| svfactory/CONSTITUTION.md | Axiom 5 End-User Invisibility | KBX-AX005 | svfactory | human -> auto candidate | planned |
| svfactory/principles.md | P18 one-active-intent uniqueness | KBX-PR018 | svfactory | semi | planned |
| svfactory/principles.md | P19 chaos estimate gate | KBX-PR019 | svfactory | semi | planned |
| svfactory/principles.md | P22 large-intent branch gate | KBX-PR022 | svfactory | semi | planned |
| svfactory/principles.md | P23 deterministic-first | KBX-PR023 | svfactory | semi | planned |
| svfactory/principles.md | P25 three-layer execution | KBX-PR025 | shared | semi | planned |
| svfactory/process.md | Workflow 8 Gate 1/2/3 | KBX-WF008 | svfactory | semi | planned |
| svfactory/process.md | Workflow 9 Human-Gate non-blocking | KBX-WF009 | svfactory | human | planned |

### C. KBAgent operating contract rules (natural-language source)

| Surface | Rule Anchor | Proposed Namespace | Owner Layer | Enforceability | Runtime Status |
|---|---|---|---|---|---|
| template/.github/agents/kbx.agent.template.md | Mandatory Preflight 1 + 1.0 | KBX-KA101 | kbagent | semi | planned |
| template/.github/agents/kbx.agent.template.md | Session intent chooser 1.1 | KBX-KA102 | kbagent | semi | planned |
| template/.github/agents/kbx.agent.template.md | Deterministic NL intent-trigger mapping | KBX-KA103 | kbagent | semi | planned |
| template/.github/agents/kbx.agent.template.md | Three-layer vibe execution | KBX-KA104 | shared | semi | planned |
| template/.github/agents/kbx.agent.template.md | SVFactory gate vs soft-first separation | KBX-KA105 | shared | semi | planned |
| template/12-ai-skills/agent-operating-manual.md | Minimal workflow steps | KBX-KA201 | kbagent | human -> semi candidate | planned |
| template/12-ai-skills/agent-operating-manual.md | Governance Rules section alignment | KBX-KA202 | shared | human -> semi candidate | planned |

### D. User-requested post-refactor structure targets (locked)

| Target | Contract |
|---|---|
| Natural master rules location | Keep high-level foundational/natural-language rules in agent-facing files only. |
| SVFactory rule text footprint | Primary agent rule file max 8KB. |
| Extended natural rule file | Exactly one external extension file max 8KB. |
| Rule density policy | Only foundational/constitutional/master rules in natural-language files; detailed operational constraints move to deterministic logic catalog. |
| Claude skills pattern research | Mirror the compact-router + external skill-pack split pattern conceptually; use concise core rules + one external skill-like rules pack. |

## Phase B — Schema Contract (Locked)

Canonical deterministic rule object (required fields):

- id
- title
- description
- severity
- owner_layer
- enforceability
- runtime_status
- since_version
- source_doc
- check

Allowed enums:

- severity: error, warn, info
- owner_layer: svfactory, kbagent, shared
- enforceability: auto, semi, human
- runtime_status: implemented, planned

Validation gates (must fail deterministically):

1. Duplicate rule IDs are rejected at registration.
2. Missing required fields are rejected at registration.
3. Invalid enum values are rejected at registration.
4. Missing source_doc path is rejected at registration.

## Phase B — Test Gates (Implemented)

- test/lib/rule-registry.test.js
	- validates enum constraints
	- validates source_doc path existence
	- validates duplicate ID detection
- test/lib/rule-engine.test.js
	- updated registerRules assertion to match strict validation behavior
- test/commands/rules.test.js
	- confirms list/lint/check command compatibility after schema extension

## Files Touched

- Modified: src/lib/rules/registry.js
- Modified: src/lib/rule-engine.js
- Modified: src/lib/rules/metadata.js
- Modified: src/lib/rules/verification.js
- Modified: src/lib/rules/intent.js
- Modified: src/lib/rules/git-binding.js
- Modified: src/commands/rules.js
- Added: test/lib/rule-registry.test.js
- Modified: test/lib/rule-engine.test.js
- Modified: knowledge-base/intents/_active/v2-8-v2-8-svfactory-rule-catalog-hardening/intent.md
- Modified: knowledge-base/intents/_active/v2-8-v2-8-svfactory-rule-catalog-hardening/plan.md
- Modified: knowledge-base/intents/_active/v2-8-v2-8-svfactory-rule-catalog-hardening/impact.md

## Acceptance Criteria

1. Phase A matrix covers SVFactory constitutional/principle/process rule surfaces and KBAgent operating-contract surfaces.
2. Phase B schema fields and enums are deterministic and enforced in code.
3. Catalog gates fail fast on duplicate IDs, bad enums, missing source_doc metadata/path.
4. Existing rules CLI behavior stays backward-compatible for list/lint/check usage.
5. Phase C runtime rewiring remains deferred until this contract is accepted.

## Files Touched

> List each file and describe whether it is new or modified.

## Acceptance Criteria

> When is this intent done? What must be true to apply?
