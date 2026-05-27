'use strict';

/**
 * SVFactory DNA Contract Schemas (design-first)
 *
 * This module defines the neutral package-level contract for a DNA.
 * It is intentionally declarative and does not import legacy KBX worldview code.
 */

const { z } = require('zod');

const VERSION_REGEX = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/;
const RELATIVE_JSON_REF_REGEX = /^\.\/[A-Za-z0-9._/-]+\.json$/;
const PACKAGE_NAME_REGEX = /^(?:@[\w.-]+\/)?[\w.-]+$/;

const DnaKindSchema = z.enum([
  'reference',
  'domain',
  'industry',
  'internal',
]);

const RelativeJsonRefSchema = z.string()
  .regex(RELATIVE_JSON_REF_REGEX, 'Expected a relative JSON ref such as "./ontology.json"');

const CompatibilityRangeSchema = z.string()
  .min(1, 'Compatibility range is required');

const DnaContractSchema = z.object({
  dna_id: z.string()
    .min(1, 'dna_id is required')
    .regex(/^[a-z0-9-]+$/, 'dna_id must be lowercase kebab-case'),
  name: z.string().min(1, 'name is required'),
  version: z.string().regex(VERSION_REGEX, 'version must be semver-like'),
  kind: DnaKindSchema,
  extends: z.string().min(1).nullable().optional(),
  description: z.string().min(1).optional(),
  ontology_ref: RelativeJsonRefSchema,
  governance_ref: RelativeJsonRefSchema,
  release_ref: RelativeJsonRefSchema,
}).strict();

const ReleaseContractSchema = z.object({
  version: z.string().regex(VERSION_REGEX, 'version must be semver-like'),
  package_name: z.string()
    .regex(PACKAGE_NAME_REGEX, 'package_name must look like an npm package name'),
  display_name: z.string().min(1, 'display_name is required'),
  compatibility: z.object({
    svfactory: CompatibilityRangeSchema,
  }).strict(),
  artifacts: z.array(z.object({
    kind: z.string().min(1),
    path: z.string().min(1),
    required: z.boolean().default(false),
  }).strict()).default([]),
  notes: z.string().optional(),
}).strict();

const CONTRACT_FILE_NAMES = Object.freeze({
  DNA: 'dna.json',
  ONTOLOGY: 'ontology.json',
  GOVERNANCE: 'governance.json',
  RELEASE: 'release.json',
});

const CONTRACT_SCHEMA_DESIGN = Object.freeze({
  dna: {
    file: CONTRACT_FILE_NAMES.DNA,
    purpose: 'Identity, compatibility, and composition metadata for a DNA package.',
  },
  release: {
    file: CONTRACT_FILE_NAMES.RELEASE,
    purpose: 'Release-facing metadata and SVFactory compatibility target.',
  },
});

module.exports = {
  VERSION_REGEX,
  RELATIVE_JSON_REF_REGEX,
  PACKAGE_NAME_REGEX,
  DnaKindSchema,
  RelativeJsonRefSchema,
  CompatibilityRangeSchema,
  DnaContractSchema,
  ReleaseContractSchema,
  CONTRACT_FILE_NAMES,
  CONTRACT_SCHEMA_DESIGN,
};
