---
title: Release Pipeline Policy
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-01
last_verified: 2026-05-01
related:
  - release-policy.md
  - verification-policy.md
  - template-versioning-policy.md
  - ../16-release-pipelines/
tags:
  - governance
  - release-pipeline
  - automation
  - safety
---

# Release Pipeline Policy

## Scope

This policy governs declarative release pipelines stored at `.kb/release-pipeline.yaml` and starter templates under `template/16-release-pipelines/`.

## Supported DSL

Release pipeline YAML is intentionally small. Supported step fields are:

- `name`
- `description`
- `run`
- `confirm`
- `fail_on_nonzero`
- `outputs`

Supported interpolation roots are:

- `${{ inputs.* }}`
- `${{ outputs.<step>.* }}`

Do not treat release pipeline YAML as a general CI system. Features such as matrix builds, containers, services, includes, and rollback graphs are out of scope.

## Storage Rule

- The active runtime pipeline lives at `.kb/release-pipeline.yaml` under the resolved content root.
- The command `kb release init-pipeline` copies one starter template into that location.
- Repository logic must resolve the content root dynamically; do not hardcode `knowledge-base/.kb/`.

## Execution Rule

- `kb release plan` validates and previews a pipeline without executing commands.
- `kb release run` executes steps sequentially.
- `confirm: true` means a step must be explicitly approved unless `--yes` is used.
- `fail_on_nonzero` defaults to true.
- Pipeline outputs are available only after the producing step completes.

## Pre And Post Hooks

- `kb release run` must execute `kb status --quiet` before any pipeline step runs.
- If status returns `attention` or `blocked`, release execution must halt immediately.
- After a successful pipeline run, catalog metadata should be updated from the resolved release version and matching git tag.
- Catalog auto-update must remain idempotent: if a release version already exists, do not append a duplicate entry.

## Security Rules

- Interpolated values must reject shell metacharacters.
- Custom `run:` commands must be rejected when they match dangerous patterns.
- Minimum blocked categories:
  - destructive recursive delete
  - remote script pipe execution
  - unsafe recursive permission change
  - force push
  - filesystem formatting or shutdown commands
- Security rejection is a hard stop, not a warning.

## Authoring Rules

- Prefer one responsibility per step.
- Prefer explicit `outputs` mappings when later steps need a normalized version string.
- Prefer annotated git tags in examples and defaults.
- Keep publish and push steps behind `confirm: true` unless the pipeline is CI-only.
- If the project needs conditional logic beyond the supported DSL, keep it inside a project-owned script and call that script from one pipeline step.

## Template Rules

- Starter templates must stay additive and safe-by-default.
- Example pipelines may demonstrate project variations, but must not rely on unsupported DSL features.
- New release pipeline docs or examples must be registered in `template/INDEX.md` in the same change set.

## Operational Guidance

- Use `kb release init` before relying on catalog automation.
- Use `kb release plan` after editing pipeline YAML and before running a real release.
- Keep pipeline comments explicit when a step assumes external tooling such as `gh` or `npm` authentication.
- If a project requires dangerous operations outside the allowed policy, keep them outside the KB release pipeline system.
