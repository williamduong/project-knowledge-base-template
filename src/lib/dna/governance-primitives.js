'use strict';

/**
 * SVFactory Governance Primitives (design-first)
 *
 * This module defines neutral declarative primitives used by DNA governance.json.
 * Execution remains the responsibility of SVFactory core runtime/compiler logic.
 */

const { z } = require('zod');

const SeveritySchema = z.enum(['info', 'warn', 'error', 'critical']);
const GateStageSchema = z.enum([
  'pre-init',
  'pre-compile',
  'pre-merge',
  'pre-release',
  'audit',
]);

const EvidenceRequirementSchema = z.object({
  kind: z.string().min(1),
  required_for: z.array(z.string().min(1)).min(1),
}).strict();

const RuleContractSchema = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  require: z.array(z.string().min(1)).default([]),
  forbid: z.array(z.string().min(1)).default([]),
  severity: SeveritySchema,
  description: z.string().optional(),
}).strict();

const GateContractSchema = z.object({
  id: z.string().min(1),
  stage: GateStageSchema,
  requires: z.array(z.string().min(1)).default([]),
  block_on_fail: z.boolean().default(true),
  description: z.string().optional(),
}).strict();

const PipelineStepSchema = z.object({
  id: z.string().min(1),
  uses_gates: z.array(z.string().min(1)).default([]),
  emits: z.array(z.string().min(1)).default([]),
  description: z.string().optional(),
}).strict();

const PipelineContractSchema = z.object({
  id: z.string().min(1),
  steps: z.array(z.union([
    z.string().min(1),
    PipelineStepSchema,
  ])).min(1),
  description: z.string().optional(),
}).strict();

const MutationProposalSchema = z.object({
  subject_type: z.string().min(1),
  subject_id: z.string().min(1),
  requested_action: z.string().min(1),
  evidence_refs: z.array(z.string().min(1)).default([]),
}).strict();

const ValidationResultSchema = z.object({
  ok: z.boolean(),
  blocking: z.boolean().default(false),
  rule_id: z.string().optional(),
  gate_id: z.string().optional(),
  reason: z.string().optional(),
}).strict();

const GovernanceContractSchema = z.object({
  version: z.string().min(1),
  rules: z.array(RuleContractSchema).default([]),
  gates: z.array(GateContractSchema).default([]),
  pipelines: z.array(PipelineContractSchema).default([]),
  evidence_policy: z.object({
    required_for: z.array(z.string().min(1)).default([]),
    requirements: z.array(EvidenceRequirementSchema).default([]),
  }).default({
    required_for: [],
    requirements: [],
  }),
}).strict();

const GOVERNANCE_PRIMITIVES = Object.freeze({
  worldviewLayer: 'SVFactory core governance primitives',
  declarativeOnly: true,
  executionOwner: 'SVFactory core runtime/compiler',
});

module.exports = {
  SeveritySchema,
  GateStageSchema,
  EvidenceRequirementSchema,
  RuleContractSchema,
  GateContractSchema,
  PipelineStepSchema,
  PipelineContractSchema,
  MutationProposalSchema,
  ValidationResultSchema,
  GovernanceContractSchema,
  GOVERNANCE_PRIMITIVES,
};
