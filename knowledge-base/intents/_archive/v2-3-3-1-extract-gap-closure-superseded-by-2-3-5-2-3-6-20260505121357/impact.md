---
intent_id: v2-3-3-1-extract-gap-closure
type: intent-impact
---

# Impact

## Affected Areas

- CLI commands:
	- new `plugin` command group
	- command lifecycle integration points for existing commands
- KB runtime state under `.kb/`:
	- plugin registry/cache state
	- plugin diagnostics and health state
- Agent/prompt surface:
	- `@kbx` behavioral guidance
	- `/kbx-run` pluginability expansion pattern
- Documentation contract:
	- plugin architecture in README
	- extension-point design recipe in agent docs

Primary tiers impacted:
- `12-ai-skills`
- `15-governance`
- runtime command docs in root README

## Breaking Change

No.

Compatibility intent:
- Existing core CLI behavior remains valid when no plugin is installed.
- Plugin system is additive and opt-in.

## Downstream Risk

1. Plugin ordering may cause non-obvious behavior if hooks conflict.
2. Community plugins may be unsafe if installed without trust checks.
3. Fast expansion of extension points may create governance debt.

Risk controls:
- Deterministic hook ordering + execution modes.
- Capability-policy enforcement and explicit denied-operation logs.
- Extension-point design recipe and governance checklist before adding new plugin surfaces.

## Impact Signals

Observed signals from review:
- Missing plugin kernel for generalized extensibility.
- Missing extension-point registry for repeatable expansion.
- Missing policy boundaries for safe plugin mutation.
- Missing prompt-native pattern for "make this part pluginable" requests.

Anticipated post-fix signals to monitor:
- Reduced rework for future pluginability requests.
- Faster implementation cycle for AI-generated plugin changes.
- Improved trust in extensibility boundaries and governance.

## Deferred Scope Note

Parser/extract plugins (docx/xlsx/pdf/image) are intentionally deferred to a
separate follow-up intent. This intent only establishes the plugin kernel and
extension architecture required to implement those safely.

