---
title: Ontology Contract
type: reference
status: active
owner: architecture
time_state: current
verification: unverified
last_updated: 2026-05-10
---

# Ontology Contract

Defines the strict node type and edge type contracts for this project's ontology.
Validate with `kbx ontology validate --input ontology-contract.json --type contract`.

**Strict mode:** Unknown keys in any node type, edge type, or the contract root cause exit code 1.

---

## Contract JSON Shape

```json
{
  "version": "1.0",
  "dnaRegistry": {
    "[EntityName]": {
      "canonical_name": "[EntityName]",
      "aliases": ["[alias1]", "[alias2]"],
      "repo_origin": "[billing|auth|gateway|infrastructure]"
    }
  },
  "nodes": {
    "[NodeTypeName]": {
      "properties": {
        "[propertyName]": {
          "type": "[string|number|boolean|uuid|enum|array]",
          "required": true,
          "description": "[What this property represents]"
        }
      },
      "required": ["[propertyName1]", "[propertyName2]"]
    }
  },
  "edges": {
    "[EdgeTypeName]": {
      "from": "[SourceNodeType]",
      "to": "[TargetNodeType]",
      "properties": {
        "[propertyName]": {
          "type": "[string|boolean]",
          "required": false
        }
      }
    }
  }
}
```

---

## Filling the Contract

### Node Types (`nodes`)

Each node type key must match a canonical entity name in the registry (or a type known to `kbx ontology show`).

| Field | Required | Notes |
|---|---|---|
| `properties` | ✓ | Object map of property name → `PropertySpec` |
| `required` | ✓ | Array of required property names |

**`PropertySpec` fields:**

| Field | Type | Notes |
|---|---|---|
| `type` | string | Allowed: `string`, `number`, `boolean`, `uuid`, `enum`, `array` |
| `required` | boolean | Whether the property is mandatory |
| `description` | string | Human-readable description |

### Edge Types (`edges`)

| Field | Required | Notes |
|---|---|---|
| `from` | ✓ | Source node type name or `Entity` (wildcard) |
| `to` | ✓ | Target node type name or `Entity` (wildcard) |
| `properties` | — | Optional edge property map |

---

## Example (Minimal Contract)

```json
{
  "version": "1.0",
  "dnaRegistry": {
    "Tenant": {
      "canonical_name": "Tenant",
      "aliases": ["org", "workspace"],
      "repo_origin": "billing"
    },
    "Intent": {
      "canonical_name": "Intent",
      "aliases": ["task", "action"],
      "repo_origin": "infrastructure"
    }
  },
  "nodes": {
    "Tenant": {
      "properties": {
        "id":         { "type": "uuid",   "required": true,  "description": "Primary key" },
        "name":       { "type": "string", "required": true,  "description": "Display name" },
        "active":     { "type": "boolean","required": false, "description": "Billing status" }
      },
      "required": ["id", "name"]
    },
    "Intent": {
      "properties": {
        "id":         { "type": "uuid",   "required": true,  "description": "Primary key" },
        "lifecycle":  { "type": "enum",   "required": true,  "description": "DRAFT|PROPOSED|VERIFIED|EXECUTED|COMMITTED" },
        "repo_origin":{ "type": "enum",   "required": true,  "description": "billing|auth|gateway|infrastructure" }
      },
      "required": ["id", "lifecycle", "repo_origin"]
    }
  },
  "edges": {
    "BELONGS_TO": {
      "from": "Intent",
      "to": "Tenant",
      "properties": {}
    }
  }
}
```

---

## Validation

```bash
# Validate the contract (strict unknown-key check)
kbx ontology validate --input ontology-contract.json --type contract

# Show registry and schema definitions
kbx ontology show

# Build runtime artifact that embeds this contract
kbx ontology build --output ontology-artifact.json
```
