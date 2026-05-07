# KBRoot — Project-Specific Overrides

> This file documents how this maintainer workspace overrides the generic KB Agent defaults.
> It is the source of truth for what makes KBRoot's governance choices different from what ships to users.
>
> Layer: C (maintainer-only). NOT shipped via npm `files` whitelist.

---

## Intent ID Format (overrides generic default)

**Generic default:** kebab-case, user-defined naming convention.  
**KBRoot choice:** `vX-Y-Z-slug` version-prefixed format.

Examples: `v2-4-intent-governance`, `v2-5-cli-first-intent-orchestration`

Rationale: KBRoot manages a versioned npm package. Tying intent IDs to version numbers makes it trivial to trace which intents shipped in which release without consulting git log.

---

## Wave Field (overrides generic default)

**Generic default:** Free string. Projects use sprint names, quarters, version tags, or any grouping label.  
**KBRoot choice:** Wave = target release version. Examples: `v2.4`, `v2.5`, `v3.0`.

Rationale: KBRoot roadmap is organized by semantic version. Using version-prefixed wave values aligns intent grouping with release milestones.

---

## Impact Signal Tag System (D1-D56)

**Generic default:** Free tags in `impact_signals[]`. No centralized registry required.  
**KBRoot choice:** Structured tag system based on KB-internal decision log entries D1-D56.

- `D1`–`D19`: initial template decisions (up to v2.3)
- `D20`+: v2.4+ schema migration decisions
- `large-intent-branch-confirmed`, `cross-module`, `breaking-change` — semantic tags used by `kb chaos` and cleanup

These tags are internal governance signals. Downstream users should define their own signals based on their own project's decision vocabulary.

---

## Architecture Model (6-Layer)

**Generic default:** KB Agent does not prescribe a specific architecture tier model for users' projects.  
**KBRoot choice:** 6-layer architecture applied to the KB template itself:

- L1: Static content (Markdown docs)
- L2: CLI / tooling layer (`src/commands/`, `bin/`)
- L3: Template governance layer (`template/`)
- L4: Agent orchestration layer (`template/.github/agents/`, prompts)
- L5: Validation/CI layer (tests, doctor, release scripts)
- L6: Agent self-knowledge layer (`kb-root/`)

This model is specific to maintaining a documentation template package. It does NOT ship as a user-facing concept.

---

## Branch Naming

**Generic default:** `intent/<id>`.  
**KBRoot choice:** `intent/vX-Y-<slug>` matching the intent ID format.

---

## Release Reference

**Generic default:** Any canonical release reference (version tag, PR link, milestone).  
**KBRoot choice:** npm semver tag published to `@williamduong/kb` on npm.

---

## Stale Threshold

**Generic default:** 14 days.  
**KBRoot choice:** 14 days (same — no override).
