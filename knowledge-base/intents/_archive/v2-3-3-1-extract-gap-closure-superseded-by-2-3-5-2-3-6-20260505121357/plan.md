---
intent_id: v2-3-3-1-extract-gap-closure
type: intent-plan
---

# Plan

## Goal

Ship a plugin-first v2.3.3.1 foundation that introduces a stable extension kernel
for KB capabilities, enables safe hook-based customization, and proves the model
with 1-3 sample plugins, without bundling third-party parser dependencies in core.

Version boundaries:
- v2.3.3.1: plugin kernel, hook bus, extension point registry, plugin policy, sample plugins.
- Follow-up intent (new ID, separate): extract parser plugins (docx/xlsx/pdf/image) and ingestion adapters.
- Explicitly out of scope: any v2.4/v2.5 extension or marketplace work.

## Evidence Baseline

Validated findings and evidence anchors:
- Existing plugin proposal was parser-centric and too narrow for future AI-native extension use.
- No generic extension-point model currently exists to expose "this area can be customized by plugins".
- No lifecycle hooks exist for pre/post command processing or cross-cutting capabilities.
- No capability declaration exists to constrain what plugins can mutate.
- No plugin contribution pattern exists for future prompt-driven expansion ("make X pluginable").

## Work Breakdown

### v2.3.3.1 Phase 0 - Kernel Baseline (must-do)

Tasks:
1. Introduce Microkernel core in `src/lib/plugin-kernel/`.
2. Add immutable extension point registry with explicit IDs and typed contracts.
3. Add plugin manifest schema with validation and compatibility checks.
4. Add plugin lifecycle manager (discover -> validate -> activate -> deactivate).

Acceptance:
- Core can boot with zero plugins and produce deterministic behavior.
- Invalid plugin manifests are rejected with actionable diagnostics.
- Plugin activation is deterministic and auditable.

### v2.3.3.1 Phase 1 - Hook Bus + Capability Policy

Design decisions locked:

Pattern selection synthesis (from mature ecosystems):
- VS Code style: declarative contribution points + context-gated activation.
- Fastify style: encapsulation scope to avoid uncontrolled cross-plugin mutation.
- ESLint style: plugin object contract + metadata + peer compatibility.
- Webpack/Rollup style: ordered lifecycle hooks + explicit inter-plugin communication model.

Chosen architecture for KB:
- Microkernel + Hook Bus + Capability-based policy.
- Command handlers publish lifecycle events; plugins subscribe via declared hooks.
- Plugins can only mutate scopes they explicitly request and core grants.

Core extension points (v1):
1. command.pre:<name>
2. command.post:<name>
3. ingest.normalize
4. route.rank
5. template.generate
6. docs.enrich
7. telemetry.event

Capability policy (granted per plugin):
- read:kb-state
- write:kb-temp
- write:kb-docs
- register:hook
- emit:telemetry
- execute:external-process (disabled by default)

Tasks:
1. Implement Hook Bus with ordered execution and per-hook timeout.
2. Add hook execution modes: first, sequential, parallel (with safe defaults).
3. Add plugin context object with stable APIs (logger, kb paths, safe fs wrappers, hook metadata).
4. Add policy gate that blocks unauthorized operations.
5. Add deterministic error strategy: isolate plugin failures from core command failures unless hook requires hard-fail.

Acceptance:
- Hook ordering is deterministic and test-covered.
- One failing plugin does not crash unrelated command flow.
- Policy violations produce explicit denied logs.

### v2.3.3.1 Phase 2 - Prompt-native Pluginability Pattern

Objective:
Design a repeatable pattern so future prompts like "make <area> pluginable" can be fulfilled consistently.

Pattern template (Extension Point Design Recipe):
1. Define extension point ID and lifecycle placement.
2. Define input/output contract and side-effect constraints.
3. Define capability requirements.
4. Define deterministic merge strategy (replace/merge/rank/append).
5. Define failure policy (continue, degrade, abort).
6. Register in extension registry + docs + tests.

Tasks:
1. Add CLI assistant command: `kb plugin scaffold --point=<extension-point-id>`.
2. Add docs template for new extension points and plugin contracts.
3. Add governance check ensuring new extension points declare policy + tests.

Acceptance:
- New extension point can be added in one structured pass with no ad-hoc wiring.
- Prompt-to-implementation path for pluginability is deterministic and documented.

### v2.3.3.1 Phase 3 - Sample Plugins (1-3 non-parser exemplars)

Sample plugin set for proving architectural breadth:
1. Hook Observer Plugin
   - Subscribes to command.pre and command.post
   - Emits structured telemetry
2. Route Ranker Plugin
   - Subscribes to route.rank
   - Adds score modifiers with explicit rationale
3. Template Enricher Plugin
   - Subscribes to template.generate
   - Injects metadata blocks/policies based on project profile

Tasks:
1. Provide plugin scaffold and tests for each sample plugin type.
2. Demonstrate ordered hook composition and conflict resolution.
3. Document "how to write a plugin" and "how to make a new surface pluginable".

Acceptance:
- At least 1 sample plugin per different extension point category is functional.
- Samples prove pattern is reusable beyond extraction/parsing.

### Follow-up Intent (separate, not in this intent)

Deferred scope moved to a new intent:
- Extract parser plugins (docx/xlsx/pdf/image)
- Ingestion parser adapter bridge for external documents
- Parser-specific performance and quality tuning

This deferred intent will consume plugin kernel APIs from v2.3.3.1.

## Files Touched

Planned modified files:
- `src/cli.js` - register plugin commands and lifecycle initialization
- `src/commands/plugin.js` - plugin command group
- `src/commands/doctor.js` - plugin health checks integration
- `README.md` - plugin architecture, boundaries, extension point guide
- `template/.github/agents/kb.agent.template.md` - prompt pattern for pluginability requests
- `template/.github/prompts/kb-run.prompt.template.md` - run-flow alignment for plugin lifecycle
- `template/12-ai-skills/agent-operating-manual.md` - plugin governance and safety notes
- `package.json` - no new parser dependencies added

Planned new files (subject to register-first checks at implementation time):
- `src/lib/plugin-kernel/index.js` - kernel bootstrap
- `src/lib/plugin-kernel/registry.js` - extension point registry
- `src/lib/plugin-kernel/manifest-schema.js` - manifest validation
- `src/lib/plugin-kernel/lifecycle.js` - discover/activate/deactivate
- `src/lib/plugin-kernel/hook-bus.js` - hook execution engine
- `src/lib/plugin-kernel/policy.js` - capability gate enforcement
- `src/lib/plugin-kernel/context.js` - plugin runtime context
- `src/plugins/samples/hook-observer/index.js`
- `src/plugins/samples/route-ranker/index.js`
- `src/plugins/samples/template-enricher/index.js`
- `test/plugin-kernel/*.test.js`
- `test/plugins/samples/*.test.js`

Out-of-scope repos (tracked separately, not in this intent):
- `github.com/williamduong/kb-plugins` for parser plugins in follow-up intent

## Acceptance Criteria

Intent done when all criteria below are true:
1. v2.3.3.1 delivers:
    - plugin kernel is stable and command-integrated
    - extension point registry and hook bus are operational
    - capability policy enforcement is operational
    - `kb plugin list/info/register/unregister/check/scaffold` commands operational
    - 1-3 sample plugins prove pattern across different extension points
    - zero new third-party parser dependencies added to `package.json`
2. Prompt-native extension-point design recipe is documented and test-backed.
3. Documentation and templates are synchronized with runtime behavior.
4. No references in this intent propose moving scope into v2.4/v2.5.
5. Follow-up parser-plugin intent is explicitly defined and linked (not blocking this intent).

## Risks and Mitigations

- Risk: scope explosion when every new idea asks for pluginability.
   Mitigation: enforce extension-point design recipe + policy declaration + tests before accepting new point.
- Risk: plugin hook order becomes nondeterministic.
   Mitigation: ordered hook model with explicit mode (first/sequential/parallel) and fixed tie-break rules.
- Risk: plugin side effects violate KB integrity.
   Mitigation: capability policy gate + restricted context + audit logs for mutations.
- Risk: AI-generated plugins produce inconsistent contracts.
   Mitigation: scaffold command with generated contract template + schema validation + plugin check command.
- Risk: parser pressure sneaks back into core scope.
   Mitigation: explicit defer to follow-up parser intent; core remains parser-agnostic.
- Risk: routing false positives.
	Mitigation: confidence threshold + dry-run/JSON explanation.
- Risk: scope creep toward roadmap work.
	Mitigation: hard boundary in plan and acceptance criteria.
