'use strict';

/**
 * Legacy ontology contract compatibility toolkit.
 *
 * This module keeps the structurally generic validation pieces from the former
 * mixed-boundary ontology implementation. It preserves the v2.6 surface while
 * letting KBX worldview data move into `dna/kbx/*`.
 */

const { z } = require('zod');

const GlossaryEntrySchema = z.object({
  term_id: z.string().min(1, 'term_id is required'),
  canonical_name: z.string().min(1, 'canonical_name is required'),
  definition: z.string().min(1, 'definition is required'),
  aliases: z.array(z.string()).default([]),
  source_refs: z.array(z.string()).min(1, 'source_refs must contain at least one source'),
}).strict();

const GlossarySchema = z.array(GlossaryEntrySchema).min(1, 'glossary must contain at least one entry');

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

const EdgeTypeContractSchema = z.object({
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

const OntologyContractSchema = z.object({
  version: z.string().min(1),
  dnaRegistry: z.record(TerminologyRegistryEntry),
  nodes: z.record(NodeTypeContractSchema),
  edges: z.record(EdgeTypeContractSchema),
}).strict();

function validateOntologyContract(contract) {
  let parsed;
  try {
    parsed = OntologyContractSchema.parse(contract);
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
        term_id: 'x',
        canonical_name: 'Intent',
        definition: 'demo',
        aliases: [],
        source_refs: ['a.md'],
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
      validator: () => EdgeTypeContractSchema.safeParse({
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
  GlossaryEntrySchema,
  GlossarySchema,
  PropertySpecSchema,
  NodeTypeContractSchema,
  EdgeTypeContractSchema,
  TerminologyRegistryEntry,
  OntologyContractSchema,
  validateOntologyContract,
  evaluateUnknownPropertyRejectionMatrix,
};
