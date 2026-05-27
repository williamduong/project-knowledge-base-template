'use strict';

/**
 * SVFactory Ontology Contract Toolkit (design-first)
 *
 * This module describes the neutral worldview declaration format for a DNA.
 * It models entity/edge/property/glossary contracts without imposing one domain.
 *
 * Includes both core SVFactory primitives and legacy compatibility validators
 * used during KBX → DNA extraction phase.
 */

const { z } = require('zod');

// ============================================================================
// SVFactory Core Ontology Schemas (Neutral)
// ============================================================================

const PropertyValueTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'json',
  'string[]',
  'number[]',
  'boolean[]',
]);

const PropertyContractSchema = z.object({
  type: PropertyValueTypeSchema,
  required: z.boolean().default(false),
  description: z.string().optional(),
  default: z.any().optional(),
  enum_values: z.array(z.string()).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.enum_values && value.type !== 'string') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'enum_values currently requires type=string',
      path: ['enum_values'],
    });
  }
});

const EntityTypeContractSchema = z.object({
  description: z.string().optional(),
  properties: z.record(PropertyContractSchema),
}).strict();

const EdgeTypeContractSchema = z.object({
  from: z.array(z.string().min(1)).min(1),
  to: z.array(z.string().min(1)).min(1),
  description: z.string().optional(),
  properties: z.record(PropertyContractSchema).default({}),
}).strict();

const GlossaryEntrySchema = z.object({
  term: z.string().min(1),
  canonical_name: z.string().min(1),
  definition: z.string().min(1),
  aliases: z.array(z.string()).default([]),
}).strict();

const OntologyContractSchema = z.object({
  version: z.string().min(1),
  entities: z.record(EntityTypeContractSchema),
  edges: z.record(EdgeTypeContractSchema),
  glossary: z.array(GlossaryEntrySchema).default([]),
}).strict();

const ONTOLOGY_PRIMITIVES = Object.freeze({
  worldviewLayer: 'DNA worldview',
  requiredSections: ['entities', 'edges'],
  optionalSections: ['glossary'],
});

// ============================================================================
// Legacy Compatibility Schemas (KBX extraction phase)
// ============================================================================

const PropertySpecSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'uuid', 'enum', 'string[]', 'number[]']),
  required: z.boolean().default(false),
  enumValues: z.array(z.string()).optional(),
  description: z.string().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.type === 'enum' && (!value.enumValues || value.enumValues.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'enumValues is required when type=enum',
      path: ['enumValues'],
    });
  }
  if (value.type !== 'enum' && value.enumValues) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'enumValues is only allowed when type=enum',
      path: ['enumValues'],
    });
  }
});

const NodeTypeContractSchema = z.object({
  required: z.array(z.string()).default([]),
  optional: z.array(z.string()).default([]),
  properties: z.record(PropertySpecSchema),
  repo_origin: z.string().optional(),
}).strict().superRefine((value, ctx) => {
  const overlap = value.required.filter(name => value.optional.includes(name));
  overlap.forEach(name => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `property appears in both required and optional: ${name}`,
      path: ['required'],
    });
  });

  const propertyNames = new Set(Object.keys(value.properties || {}));
  value.required.forEach(name => {
    if (!propertyNames.has(name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `required property missing from properties map: ${name}`,
        path: ['required'],
      });
    }
  });
  value.optional.forEach(name => {
    if (!propertyNames.has(name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `optional property missing from properties map: ${name}`,
        path: ['optional'],
      });
    }
  });
});

const LegacyEdgeTypeContractSchema = z.object({
  from: z.array(z.string()).min(1),
  to: z.array(z.string()).min(1),
  required: z.array(z.string()).default([]),
  optional: z.array(z.string()).default([]),
  properties: z.record(PropertySpecSchema),
  description: z.string().optional(),
}).strict().superRefine((value, ctx) => {
  const overlap = value.required.filter(name => value.optional.includes(name));
  overlap.forEach(name => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `edge property appears in both required and optional: ${name}`,
      path: ['required'],
    });
  });

  const propertyNames = new Set(Object.keys(value.properties || {}));
  value.required.forEach(name => {
    if (!propertyNames.has(name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `edge required property missing from properties map: ${name}`,
        path: ['required'],
      });
    }
  });
  value.optional.forEach(name => {
    if (!propertyNames.has(name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `edge optional property missing from properties map: ${name}`,
        path: ['optional'],
      });
    }
  });
});

const TerminologyRegistryEntry = z.object({
  canonical_name: z.string().min(1),
  aliases: z.array(z.string()),
  repo_origin: z.string().min(1),
  microsoft_cdm_mapping: z.string().optional(),
});

const LegacyOntologyContractSchema = z.object({
  version: z.string().min(1),
  dnaRegistry: z.record(TerminologyRegistryEntry),
  nodes: z.record(NodeTypeContractSchema),
  edges: z.record(LegacyEdgeTypeContractSchema),
}).strict();

function validateOntologyContract(contract) {
  let parsed;
  try {
    parsed = LegacyOntologyContractSchema.parse(contract);
  } catch (error) {
    return {
      valid: false,
      errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }

  const errors = [];
  const nodeNames = Object.keys(parsed.nodes || {});
  const validEdgeEndpoints = new Set([...nodeNames, 'Entity']);

  if (Object.keys(parsed.dnaRegistry || {}).length < 10) {
    errors.push('dnaRegistry must contain at least 10 entities');
  }

  Object.entries(parsed.edges || {}).forEach(([edgeName, edge]) => {
    edge.from.forEach(source => {
      if (!validEdgeEndpoints.has(source)) {
        errors.push(`edge ${edgeName}: invalid from endpoint ${source}`);
      }
    });
    edge.to.forEach(target => {
      if (!validEdgeEndpoints.has(target)) {
        errors.push(`edge ${edgeName}: invalid to endpoint ${target}`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    data: parsed,
  };
}

function evaluateUnknownPropertyRejectionMatrix() {
  const cases = [
    {
      schema: 'GlossaryEntry',
      validator: () => GlossaryEntrySchema.safeParse({
        term: 'x',
        canonical_name: 'Intent',
        definition: 'demo',
        aliases: [],
        rogue: true,
      }),
    },
    {
      schema: 'NodeTypeContract',
      validator: () => NodeTypeContractSchema.safeParse({
        required: ['id'],
        optional: [],
        properties: { id: { type: 'uuid', required: true } },
        rogue: true,
      }),
    },
    {
      schema: 'EdgeTypeContract',
      validator: () => LegacyEdgeTypeContractSchema.safeParse({
        from: ['Intent'],
        to: ['Document'],
        required: [],
        optional: [],
        properties: {},
        rogue: true,
      }),
    },
  ];

  return cases.map(item => {
    const result = item.validator();
    return {
      schema: item.schema,
      unknownPropertyRejected: !result.success,
      errors: result.success ? [] : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  });
}

module.exports = {
  // SVFactory core primitives
  PropertyValueTypeSchema,
  PropertyContractSchema,
  EntityTypeContractSchema,
  EdgeTypeContractSchema,
  GlossaryEntrySchema,
  OntologyContractSchema,
  ONTOLOGY_PRIMITIVES,

  // Legacy compatibility (KBX extraction phase)
  PropertySpecSchema,
  NodeTypeContractSchema,
  LegacyEdgeTypeContractSchema,
  TerminologyRegistryEntry,
  LegacyOntologyContractSchema,
  validateOntologyContract,
  evaluateUnknownPropertyRejectionMatrix,
};
