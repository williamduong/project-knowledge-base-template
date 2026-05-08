---
intent_id: v2-5-1-deterministic-multi-project-model
type: intent-impact
---

# Impact

## Affected Areas

- CLI runtime guardrails in `src/commands/*` (mutation gating).
- Context/state resolver logic in `src/lib/*`.
- Template agent contracts (`template/.github/agents/`, `template/12-ai-skills/`) for project namespace guidance.
- Governance and planning docs (`strategic-backlog.md`, intent docs, focus).

## Breaking Change

No immediate breaking change for solo repositories.

Potential behavior change for multi-repo workspaces:
- Previously implicit/loose project selection may have succeeded.
- New deterministic policy will block ambiguous mutation commands unless `--project` or explicit workspace mode is provided.

Migration expectation:
- Multi-repo users should set stable `project_id` in `.kbx/project.yaml` and update scripts to pass `--project` when running from ambiguous roots.

## Downstream Risk

- Risk: existing automation from workspace root may fail closed after guard is introduced.
- Mitigation: clear error codes + `kbx project resolve` guidance + `kbx workspace promote` path.
- Risk: duplicate `project_id` across repos creates hard block.
- Mitigation: deterministic duplicate detection and explicit rename path.

## Impact Signals

- Reduced accidental cross-project writes.
- Short-term increase in `ERR_PROJECT_AMBIGUOUS` until scripts add explicit `--project`.
- Improved reproducibility for CI and Copilot-assisted mutation flows.
