---
title: Release Pipeline Examples
type: guide
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-01
last_verified: 2026-05-01
related:
  - ../npm-package.yaml
  - ../docs-only.yaml
  - ../custom.yaml
  - ../../15-governance/release-pipeline-policy.md
tags:
  - examples
  - release-pipeline
  - guide
---

# Release Pipeline Examples

These examples demonstrate how to adapt the small release pipeline DSL for common project shapes without adding unsupported features.

## Included Examples

- `monorepo-package.yaml`: publish one package from a monorepo after version bump and targeted build.
- `docs-site.yaml`: tag and publish documentation artifacts without npm publish.
- `github-release-only.yaml`: create release notes and GitHub release metadata for artifact-based projects.

## Usage

1. Copy one example into `.kb/release-pipeline.yaml` and adjust commands for your repository.
2. Run `kb release plan -f <example-file> --bump=patch` to validate interpolation and step order.
3. Convert any project-specific complexity into scripts, then call those scripts from `run:`.

## Guardrails

- Examples must remain compatible with the supported DSL from `release-pipeline-policy.md`.
- Examples should prefer `confirm: true` for push, publish, or release steps.
- Examples should avoid unsupported conditional syntax and keep logic inside scripts when needed.
