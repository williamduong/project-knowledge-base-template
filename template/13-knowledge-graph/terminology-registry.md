---
title: Terminology Registry
type: reference
status: active
owner: architecture
time_state: current
verification: unverified
last_updated: 2026-05-10
---

# Terminology Registry

Canonical entity registry for this project. Each entry defines the authoritative name, aliases, and governing subsystem.

**Rules:**
- Every canonical name must be unique across the registry (no polysemy).
- Aliases must also be unique — no alias may map to more than one canonical name.
- `repo_origin` declares which subsystem owns the entity for governance and mutation scope.

Run `kbx ontology audit --input <nl-terms.json>` to verify alias coverage and zero polysemy.

---

## Canonical Entities

### 1. [EntityName] (repo_origin: [billing|auth|gateway|infrastructure])

**Aliases:** [alias1, alias2, alias3]

**Definition:** [One sentence describing what this entity represents in your domain.]

**Example:**
```json
{
  "canonical_name": "[EntityName]",
  "id": "[uuid-or-domain-key]",
  "repo_origin": "[billing|auth|gateway|infrastructure]",
  "aliases": ["[alias1]", "[alias2]"]
}
```

**When to use:**
- [Scenario 1]
- [Scenario 2]

---

### 2. [EntityName] (repo_origin: [billing|auth|gateway|infrastructure])

**Aliases:** [alias1, alias2]

**Definition:** [One sentence describing what this entity represents.]

**When to use:**
- [Scenario 1]
- [Scenario 2]

---

<!-- Add more entities following the pattern above. -->
<!-- Minimum recommended: 5 entities; reference implementation uses 10. -->

## Anti-Patterns

- Do not add generic terms ("data", "item", "record") as canonical names.
- Do not share aliases between entities.
- Do not omit `repo_origin` — it is required by the governance contract.

## Validation

```bash
# Audit NL terms against this registry
kbx ontology audit --input nl-terms.json

# Validate a governed glossary JSON against the registry rules
kbx ontology validate --input glossary.json --glossary glossary.json
```
