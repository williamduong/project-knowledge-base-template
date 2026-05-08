'use strict';

/**
 * Ontology Schema & DNA Registry for KB v2.6
 *
 * This module defines the type-safe contract for ontology entities using Zod schemas.
 * These schemas implement Microsoft CDM principles for multi-tenant SaaS governance.
 *
 * Dependencies:
 * - Zod: npm install zod (add to package.json dependencies in Phase 4: Typed ontology schema)
 *
 * Exports:
 * - SaaSNodeDNA: Master DNA definition for all entities
 * - IntentSchema: Intent NodeType contract with state machine
 * - TerminologyRegistry: Collision register for aliases → canonical_name mapping
 * - ToolCallInterceptor: Guard middleware signature for Action Gate
 * - createOntologyValidator: Factory function for schema validation
 */

// NOTE: Zod import is deferred until Phase 4 implementation.
// Uncomment when ready: const { z } = require('zod');

// ---------------------------------------------------------------------------
// SaaSNodeDNA: Master Data Entity for all SaaS Domain Objects
// ---------------------------------------------------------------------------

/**
 * DNA represents the authoritative identity of any entity in the SaaS system.
 * All entities MUST have repo_origin to prevent cross-tenant mutation accidents.
 *
 * Fields:
 * - id: UUID primary key
 * - repo_origin: MANDATORY; one of [billing, auth, gateway, infrastructure]
 * - canonical_name: CDM-normalized term (e.g., "Tenant", "ServicePrincipal")
 * - sensitivity: Data sensitivity level (1-5, where 5 is most sensitive)
 * - aliases: Other names this entity is known by (resolved via TerminologyRegistry)
 * - last_audit_id: Reference to last audit event
 *
 * Zod Schema:
 * ```
 * export const SaaSNodeDNA = z.object({
 *   id: z.string().uuid('Invalid UUID format'),
 *   repo_origin: z.enum(['billing', 'auth', 'gateway', 'infrastructure']),
 *   canonical_name: z.string().min(1, 'canonical_name is required').describe('Normalized per Microsoft CDM'),
 *   sensitivity: z.number().int().min(1).max(5).default(1).describe('Data sensitivity: 1=public, 5=critical'),
 *   aliases: z.array(z.string()).default([]).describe('Alternate names, resolved via TerminologyRegistry'),
 *   last_audit_id: z.string().uuid().optional(),
 * });
 * ```
 */
const SaaSNodeDNA_spec = {
  id: 'UUID (required)',
  repo_origin: 'Enum[billing|auth|gateway|infrastructure] (required)',
  canonical_name: 'String (required, >=1 char, normalized per CDM)',
  sensitivity: 'Integer 1-5 (default: 1)',
  aliases: 'String[] (default: [])',
  last_audit_id: 'UUID (optional)',
};

// ---------------------------------------------------------------------------
// IntentSchema: Intent NodeType Contract (State Machine + Governance)
// ---------------------------------------------------------------------------

/**
 * Intent represents a mutation proposal with deterministic state machine.
 * Extends SaaSNodeDNA with governance properties.
 *
 * Lifecycle States (5-state machine):
 * - DRAFT: Initial; AI receives request
 * - PROPOSED: Has evidenceLinks; mutation proposal logged
 * - VERIFIED: Action Guard passed; no policy violation
 * - EXECUTED: CLI ran; infrastructure mutation applied
 * - COMMITTED: Audit entry written; immutable
 *
 * Critical Guard: commitAllowed must be true to transition VERIFIED → EXECUTED
 *
 * Zod Schema:
 * ```
 * export const IntentSchema = SaaSNodeDNA.extend({
 *   lifecycle: z.enum(['DRAFT', 'PROPOSED', 'VERIFIED', 'EXECUTED', 'COMMITTED']),
 *   title: z.string().min(1, 'title required'),
 *   riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']),
 *   evidenceLinks: z.array(z.string().url('Invalid evidence link URI')).default([])
 *     .describe('URIs to Document or Claim IDs; required for PROPOSED→VERIFIED transition'),
 *   commitAllowed: z.boolean().default(false)
 *     .describe('Only true after VERIFIED state; gates VERIFIED→EXECUTED'),
 *   governanceThreshold: z.number().min(0).max(1).optional()
 *     .describe('Minimum confidence/safety score required for domain'),
 *   reasoningTrace: z.string().optional()
 *     .describe('AI decision log; captured for audit trail at COMMITTED'),
 * });
 * ```
 *
 * State Transition Guards:
 * ```
 * DRAFT → PROPOSED: evidenceLinks.length >= 1
 * PROPOSED → VERIFIED: verifyMutation() + Graph path validation (Intent → Document → TargetNode)
 * VERIFIED → EXECUTED: commitAllowed === true
 * EXECUTED → COMMITTED: Final state; no rollback
 * ```
 */
const IntentSchema_spec = {
  // Inherited from SaaSNodeDNA:
  id: 'UUID (required)',
  repo_origin: 'Enum[billing|auth|gateway|infrastructure] (required)',
  canonical_name: 'String (required)',
  
  // Intent-specific:
  lifecycle: 'Enum[DRAFT|PROPOSED|VERIFIED|EXECUTED|COMMITTED] (required)',
  title: 'String (required, >=1 char)',
  riskLevel: 'Enum[Low|Medium|High|Critical] (required)',
  evidenceLinks: 'String[] URI (default: []; required for PROPOSED→VERIFIED)',
  commitAllowed: 'Boolean (default: false; true only after VERIFIED)',
  governanceThreshold: 'Float 0.0-1.0 (optional)',
  reasoningTrace: 'String (optional; audit trail)',
};

// ---------------------------------------------------------------------------
// TerminologyRegistry: Collision Resolution via CDM Mapping
// ---------------------------------------------------------------------------

/**
 * TerminologyRegistry resolves aliases to canonical_name using Microsoft CDM.
 * Prevents AI from creating ambiguous entity names.
 *
 * Example Registry Structure:
 * ```
 * {
 *   "Tenant": {
 *     canonical_name: "Tenant",
 *     aliases: ["Client", "Customer", "Account"],
 *     repo_origin: "billing",
 *     microsoft_cdm_mapping: "Account"
 *   },
 *   "ServicePrincipal": {
 *     canonical_name: "ServicePrincipal",
 *     aliases: ["AgentIdentity", "AppIdentity", "SP"],
 *     repo_origin: "auth",
 *     microsoft_cdm_mapping: "ServicePrincipal"
 *   },
 *   "Policy": {
 *     canonical_name: "Policy",
 *     aliases: ["Rule", "Governance Rule", "AccessPolicy"],
 *     repo_origin: "infrastructure",
 *     microsoft_cdm_mapping: "ResourcePolicy"
 *   }
 * }
 * ```\n *\n * Zod Schema (key = canonical_name):\n * ```\n * export const TerminologyRegistry = z.record(\n *   z.string(),\n *   z.object({\n *     canonical_name: z.string(),\n *     aliases: z.array(z.string()),\n *     repo_origin: z.enum(['billing', 'auth', 'gateway', 'infrastructure']),\n *     microsoft_cdm_mapping: z.string().optional(),\n *   })\n * );\n * ```\n */\nconst TerminologyRegistry_spec = {\n  'Tenant': {\n    canonical_name: 'Tenant',\n    aliases: ['Client', 'Customer', 'Account'],\n    repo_origin: 'billing',\n    microsoft_cdm_mapping: 'Account',\n  },\n  'ServicePrincipal': {\n    canonical_name: 'ServicePrincipal',\n    aliases: ['AgentIdentity', 'AppIdentity', 'SP'],\n    repo_origin: 'auth',\n    microsoft_cdm_mapping: 'ServicePrincipal',\n  },\n  'Policy': {\n    canonical_name: 'Policy',\n    aliases: ['Rule', 'Governance Rule', 'AccessPolicy'],\n    repo_origin: 'infrastructure',\n    microsoft_cdm_mapping: 'ResourcePolicy',\n  },\n};\n\n// ---------------------------------------------------------------------------\n// ToolCallInterceptor: Action Guard Middleware Type\n// ---------------------------------------------------------------------------\n\n/**\n * ToolCallInterceptor defines the signature for Action Guard middleware.\n * Implements Microsoft Security Graph patterns to validate mutations before execution.\n *\n * Purpose:\n * - Intercept CLI mutation proposals\n * - Validate security graph path: Intent → Evidence (Document) → TargetNode\n * - Check RBAC + repo_origin compatibility\n * - Deny mutation if path invalid or cross-repo grant missing\n * - Performance SLA: <0.1ms per check\n *\n * Input:\n * ```typescript\n * interface ToolCallInterceptorInput {\n *   intent: IntentSchema;  // Proposed mutation\n *   targetNode: SaaSNodeDNA;  // Destination entity\n *   graphState: any;  // Current security graph state\n *   evidenceDocuments: Document[];  // Supporting evidence\n * }\n * ```\n *\n * Output:\n * ```typescript\n * interface ToolCallInterceptorOutput {\n *   allowed: boolean;\n *   reason?: string;  // Deny reason (e.g., \"Missing evidence path\", \"Cross-repo without grant\")\n *   pathValidated?: boolean;  // Security graph path found\n *   durationMs?: number;  // Execution time\n * }\n * ```\n *\n * Implementation Pseudocode:\n * ```javascript\n * async function ToolCallInterceptor(input) {\n *   const startTime = performance.now();\n *   \n *   // 1. Check repo_origin alignment\n *   if (input.intent.repo_origin !== input.targetNode.repo_origin) {\n *     // 2. If cross-origin, verify CROSS_REPO_GRANT edge in graph\n *     const grantPath = findGraphPath(input.graphState,\n *       { from: input.intent.repo_origin, to: input.targetNode.repo_origin },\n *       'CROSS_REPO_GRANT'\n *     );\n *     if (!grantPath) {\n *       return { allowed: false, reason: 'Cross-repo mutation without CROSS_REPO_GRANT' };\n *     }\n *   }\n *   \n *   // 3. Verify evidence path: Intent → Document → TargetNode\n *   if (input.intent.evidenceLinks.length === 0) {\n *     return { allowed: false, reason: 'No evidence links attached' };\n *   }\n *   \n *   const hasValidPath = input.evidenceDocuments.some(doc =>\n *     existsPath(input.graphState,\n *       { from: input.intent.id, via: doc.id, to: input.targetNode.id }\n *     )\n *   );\n *   \n *   if (!hasValidPath) {\n *     return { allowed: false, reason: 'Evidence path not found in graph' };\n *   }\n *   \n *   // 4. Check governance threshold\n *   if (input.intent.governanceThreshold && !input.intent.reasoningTrace) {\n *     return { allowed: false, reason: 'Governance threshold set but no reasoning trace' };\n *   }\n *   \n *   return {\n *     allowed: true,\n *     pathValidated: true,\n *     durationMs: performance.now() - startTime\n *   };\n * }\n * ```\n */\nconst ToolCallInterceptor_spec = {\n  input: {\n    intent: 'IntentSchema',\n    targetNode: 'SaaSNodeDNA',\n    graphState: 'object (security graph)',\n    evidenceDocuments: 'Document[]',\n  },\n  output: {\n    allowed: 'boolean',\n    reason: 'string (optional, deny reason)',\n    pathValidated: 'boolean (optional)',\n    durationMs: 'number (optional, <0.1ms SLA)',\n  },\n  sla: '<0.1ms per check (100 microseconds)',\n};\n\n// ---------------------------------------------------------------------------\n// Factory: createOntologyValidator\n// ---------------------------------------------------------------------------\n\n/**\n * Factory function to create a validator for ontology schemas.\n * Placeholder implementation; actual Zod validation happens in Phase 4.\n *\n * @param {string} schemaType - One of ['SaaSNodeDNA', 'IntentSchema']\n * @returns {Function} - Validator function (input) => { valid: boolean, errors?: string[] }\n */\nfunction createOntologyValidator(schemaType) {\n  const validators = {\n    SaaSNodeDNA: (obj) => {\n      const errors = [];\n      if (!obj.id || typeof obj.id !== 'string') errors.push('id: invalid UUID');\n      if (!['billing', 'auth', 'gateway', 'infrastructure'].includes(obj.repo_origin)) {\n        errors.push('repo_origin: must be one of [billing, auth, gateway, infrastructure]');\n      }\n      if (!obj.canonical_name || obj.canonical_name.length === 0) {\n        errors.push('canonical_name: required and must not be empty');\n      }\n      return { valid: errors.length === 0, errors };\n    },\n    IntentSchema: (obj) => {\n      const errors = [];\n      if (!obj.id || typeof obj.id !== 'string') errors.push('id: invalid UUID');\n      if (!['billing', 'auth', 'gateway', 'infrastructure'].includes(obj.repo_origin)) {\n        errors.push('repo_origin: must be one of [billing, auth, gateway, infrastructure]');\n      }\n      if (!obj.title || obj.title.length === 0) errors.push('title: required');\n      if (!['DRAFT', 'PROPOSED', 'VERIFIED', 'EXECUTED', 'COMMITTED'].includes(obj.lifecycle)) {\n        errors.push('lifecycle: invalid state');\n      }\n      if (!['Low', 'Medium', 'High', 'Critical'].includes(obj.riskLevel)) {\n        errors.push('riskLevel: must be one of [Low, Medium, High, Critical]');\n      }\n      if (obj.lifecycle === 'PROPOSED' && (!obj.evidenceLinks || obj.evidenceLinks.length === 0)) {\n        errors.push('evidenceLinks: required for PROPOSED state');\n      }\n      if (obj.lifecycle === 'EXECUTED' && !obj.commitAllowed) {\n        errors.push('commitAllowed: must be true before EXECUTED transition');\n      }\n      return { valid: errors.length === 0, errors };\n    },\n  };\n  return validators[schemaType] || (() => ({ valid: false, errors: ['Unknown schema type'] }));\n}\n\n// ---------------------------------------------------------------------------\n// Exports\n// ---------------------------------------------------------------------------\n\nmodule.exports = {\n  // Schema specifications (use for documentation/reference)\n  SaaSNodeDNA_spec,\n  IntentSchema_spec,\n  TerminologyRegistry_spec,\n  ToolCallInterceptor_spec,\n  \n  // Factory (use for Phase 0-2 manual validation)\n  createOntologyValidator,\n  \n  // Registry (reference data for Phase 0 DNA Alignment)\n  TerminologyRegistry: TerminologyRegistry_spec,\n};\n