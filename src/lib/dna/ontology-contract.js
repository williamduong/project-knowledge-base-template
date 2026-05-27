'use strict';

/**
 * SVFactory Ontology Contract Toolkit (design-first)
 *
 * This module describes the neutral worldview declaration format for a DNA.
 * It models entity/edge/property/glossary contracts without imposing one domain.
 */

const { z } = require('zod');

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

module.exports = {
  PropertyValueTypeSchema,
  PropertyContractSchema,
  EntityTypeContractSchema,
  EdgeTypeContractSchema,
  GlossaryEntrySchema,
  OntologyContractSchema,
  ONTOLOGY_PRIMITIVES,
};
