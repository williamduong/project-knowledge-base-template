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
 * 10 SaaS Core Entities (Phase 0 — DNA Alignment):
 *
 * === Identity Group (3 entities) ===
 * 1. Tenant: Customer account entity. Aliases: Client, Customer, Account, Organization
 *    repo_origin: billing | microsoft_cdm_mapping: Account
 *
 * 2. Subscription: Billing plan tied to tenant. Aliases: Billing Plan, License, Tier
 *    repo_origin: billing | microsoft_cdm_mapping: Subscription
 *
 * 3. ServicePrincipal: Agent/Machine identity. Aliases: AgentIdentity, AppIdentity, SP, Machine, Bot, agent
 *    repo_origin: auth | microsoft_cdm_mapping: ServicePrincipal
 *
 * === Infrastructure Group (3 entities) ===
 * 4. Project: Repo/workspace container. Aliases: Repo, Repository, Workspace, Team, project, project_id
 *    repo_origin: infrastructure | microsoft_cdm_mapping: Project
 *
 * 5. Module: Component/package/feature. Aliases: Component, Package, Library, Feature, module
 *    repo_origin: infrastructure | microsoft_cdm_mapping: Module
 *
 * 6. Config: Configuration/setting entity. Aliases: Configuration, Setting, Parameter, Environment, config, kbx.agent.md
 *    repo_origin: infrastructure | microsoft_cdm_mapping: Configuration
 *
 * === Governance Group (3 entities) ===
 * 7. Intent: Mutation proposal task. Aliases: Task, Request, Proposal, Change, intent, intent_id, workflow
 *    repo_origin: auth | microsoft_cdm_mapping: WorkflowIntent
 *
 * 8. Policy: Governance rule. Aliases: Rule, Governance Rule, AccessPolicy, Gate, policy, directive
 *    repo_origin: infrastructure | microsoft_cdm_mapping: ResourcePolicy
 *
 * 9. CLICommand: Executable command/script. Aliases: Command, Script, Action, Operation, command, kbx, subcommand
 *    repo_origin: infrastructure | microsoft_cdm_mapping: ExecutableCommand
 *
 * === Evidence Group (1 entity) ===
 * 10. Evidence: Supporting documentation/proof. Aliases: Document, Claim, Proof, Record, Artifact, evidence, evidenceLinks, reasoning_trace
 *     repo_origin: auth | microsoft_cdm_mapping: Evidence
 *
 * Zod Schema (key = canonical_name):
 * ```
 * export const TerminologyRegistry = z.record(
 *   z.string(),
 *   z.object({
 *     canonical_name: z.string(),
 *     aliases: z.array(z.string()),
 *     repo_origin: z.enum(['billing', 'auth', 'gateway', 'infrastructure']),
 *     microsoft_cdm_mapping: z.string().optional(),
 *   })
 * );
 * ```
 */
const TerminologyRegistry_spec = {
  // --- Identity Group (billing | auth) ---
  'Tenant': {
    canonical_name: 'Tenant',
    aliases: ['Client', 'Customer', 'Account', 'Organization'],
    repo_origin: 'billing',
    microsoft_cdm_mapping: 'Account',
  },
  'Subscription': {
    canonical_name: 'Subscription',
    aliases: ['Billing Plan', 'License', 'Tier'],
    repo_origin: 'billing',
    microsoft_cdm_mapping: 'Subscription',
  },
  'ServicePrincipal': {
    canonical_name: 'ServicePrincipal',
    aliases: ['AgentIdentity', 'AppIdentity', 'SP', 'Machine', 'Bot', 'agent'],
    repo_origin: 'auth',
    microsoft_cdm_mapping: 'ServicePrincipal',
  },
  // --- Infrastructure Group (infrastructure) ---
  'Project': {
    canonical_name: 'Project',
    aliases: ['Repo', 'Repository', 'Workspace', 'Team', 'project', 'project_id'],
    repo_origin: 'infrastructure',
    microsoft_cdm_mapping: 'Project',
  },
  'Module': {
    canonical_name: 'Module',
    aliases: ['Component', 'Package', 'Library', 'Feature', 'module'],
    repo_origin: 'infrastructure',
    microsoft_cdm_mapping: 'Module',
  },
  'Config': {
    canonical_name: 'Config',
    aliases: ['Configuration', 'Setting', 'Parameter', 'Environment', 'config', 'kbx.agent.md'],
    repo_origin: 'infrastructure',
    microsoft_cdm_mapping: 'Configuration',
  },
  // --- Governance Group (auth | infrastructure) ---
  'Intent': {
    canonical_name: 'Intent',
    aliases: ['Task', 'Request', 'Proposal', 'Change', 'intent', 'intent_id', 'workflow'],
    repo_origin: 'auth',
    microsoft_cdm_mapping: 'WorkflowIntent',
  },
  'Policy': {
    canonical_name: 'Policy',
    aliases: ['Rule', 'Governance Rule', 'AccessPolicy', 'Gate', 'policy', 'directive'],
    repo_origin: 'infrastructure',
    microsoft_cdm_mapping: 'ResourcePolicy',
  },
  'CLICommand': {
    canonical_name: 'CLICommand',
    aliases: ['Command', 'Script', 'Action', 'Operation', 'command', 'kbx', 'subcommand'],
    repo_origin: 'infrastructure',
    microsoft_cdm_mapping: 'ExecutableCommand',
  },
  // --- Evidence Group (auth) ---
  'Evidence': {
    canonical_name: 'Evidence',
    aliases: ['Document', 'Claim', 'Proof', 'Record', 'Artifact', 'evidence', 'evidenceLinks', 'reasoning_trace'],
    repo_origin: 'auth',
    microsoft_cdm_mapping: 'Evidence',
  },
};

// ---------------------------------------------------------------------------
// ToolCallInterceptor: Action Guard Middleware Type
// ---------------------------------------------------------------------------

/**
 * ToolCallInterceptor defines the signature for Action Guard middleware.
 * Implements Microsoft Security Graph patterns to validate mutations before execution.
 *
 * Purpose:
 * - Intercept CLI mutation proposals
 * - Validate security graph path: Intent → Evidence (Document) → TargetNode
 * - Check RBAC + repo_origin compatibility
 * - Deny mutation if path invalid or cross-repo grant missing
 * - Performance SLA: <0.1ms per check
 *
 * Input:
 * ```typescript
 * interface ToolCallInterceptorInput {
 *   intent: IntentSchema;  // Proposed mutation
 *   targetNode: SaaSNodeDNA;  // Destination entity
 *   graphState: any;  // Current security graph state
 *   evidenceDocuments: Document[];  // Supporting evidence
 * }
 * ```
 *
 * Output:
 * ```typescript
 * interface ToolCallInterceptorOutput {
 *   allowed: boolean;
 *   reason?: string;  // Deny reason (e.g., "Missing evidence path", "Cross-repo without grant")
 *   pathValidated?: boolean;  // Security graph path found
 *   durationMs?: number;  // Execution time
 * }
 * ```
 *
 * Implementation Pseudocode:
 * ```javascript
 * async function ToolCallInterceptor(input) {
 *   const startTime = performance.now();
 *   
 *   // 1. Check repo_origin alignment
 *   if (input.intent.repo_origin !== input.targetNode.repo_origin) {
 *     // 2. If cross-origin, verify CROSS_REPO_GRANT edge in graph
 *     const grantPath = findGraphPath(input.graphState,
 *       { from: input.intent.repo_origin, to: input.targetNode.repo_origin },
 *       'CROSS_REPO_GRANT'
 *     );
 *     if (!grantPath) {
 *       return { allowed: false, reason: 'Cross-repo mutation without CROSS_REPO_GRANT' };
 *     }
 *   }
 *   
 *   // 3. Verify evidence path: Intent → Document → TargetNode
 *   if (input.intent.evidenceLinks.length === 0) {
 *     return { allowed: false, reason: 'No evidence links attached' };
 *   }
 *   
 *   const hasValidPath = input.evidenceDocuments.some(doc =>
 *     existsPath(input.graphState,
 *       { from: input.intent.id, via: doc.id, to: input.targetNode.id }
 *     )
 *   );
 *   
 *   if (!hasValidPath) {
 *     return { allowed: false, reason: 'Evidence path not found in graph' };
 *   }
 *   
 *   // 4. Check governance threshold
 *   if (input.intent.governanceThreshold && !input.intent.reasoningTrace) {
 *     return { allowed: false, reason: 'Governance threshold set but no reasoning trace' };
 *   }
 *   
 *   return {
 *     allowed: true,
 *     pathValidated: true,
 *     durationMs: performance.now() - startTime
 *   };
 * }
 * ```
 */
const ToolCallInterceptor_spec = {
  input: {
    intent: 'IntentSchema',
    targetNode: 'SaaSNodeDNA',
    graphState: 'object (security graph)',
    evidenceDocuments: 'Document[]',
  },
  output: {
    allowed: 'boolean',
    reason: 'string (optional, deny reason)',
    pathValidated: 'boolean (optional)',
    durationMs: 'number (optional, <0.1ms SLA)',
  },
  sla: '<0.1ms per check (100 microseconds)',
};

// ---------------------------------------------------------------------------
// Factory: createOntologyValidator
// ---------------------------------------------------------------------------

/**
 * Factory function to create a validator for ontology schemas.
 * Placeholder implementation; actual Zod validation happens in Phase 4.
 *
 * @param {string} schemaType - One of ['SaaSNodeDNA', 'IntentSchema']
 * @returns {Function} - Validator function (input) => { valid: boolean, errors?: string[] }
 */
function createOntologyValidator(schemaType) {
  const validators = {
    SaaSNodeDNA: (obj) => {
      const errors = [];
      if (!obj.id || typeof obj.id !== 'string') errors.push('id: invalid UUID');
      if (!['billing', 'auth', 'gateway', 'infrastructure'].includes(obj.repo_origin)) {
        errors.push('repo_origin: must be one of [billing, auth, gateway, infrastructure]');
      }
      if (!obj.canonical_name || obj.canonical_name.length === 0) {
        errors.push('canonical_name: required and must not be empty');
      }
      return { valid: errors.length === 0, errors };
    },
    IntentSchema: (obj) => {
      const errors = [];
      if (!obj.id || typeof obj.id !== 'string') errors.push('id: invalid UUID');
      if (!['billing', 'auth', 'gateway', 'infrastructure'].includes(obj.repo_origin)) {
        errors.push('repo_origin: must be one of [billing, auth, gateway, infrastructure]');
      }
      if (!obj.title || obj.title.length === 0) errors.push('title: required');
      if (!['DRAFT', 'PROPOSED', 'VERIFIED', 'EXECUTED', 'COMMITTED'].includes(obj.lifecycle)) {
        errors.push('lifecycle: invalid state');
      }
      if (!['Low', 'Medium', 'High', 'Critical'].includes(obj.riskLevel)) {
        errors.push('riskLevel: must be one of [Low, Medium, High, Critical]');
      }
      if (obj.lifecycle === 'PROPOSED' && (!obj.evidenceLinks || obj.evidenceLinks.length === 0)) {
        errors.push('evidenceLinks: required for PROPOSED state');
      }
      if (obj.lifecycle === 'EXECUTED' && !obj.commitAllowed) {
        errors.push('commitAllowed: must be true before EXECUTED transition');
      }
      return { valid: errors.length === 0, errors };
    },
  };
  return validators[schemaType] || (() => ({ valid: false, errors: ['Unknown schema type'] }));
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Schema specifications (use for documentation/reference)
  SaaSNodeDNA_spec,
  IntentSchema_spec,
  TerminologyRegistry_spec,
  ToolCallInterceptor_spec,
  
  // Factory (use for Phase 0-2 manual validation)
  createOntologyValidator,
  
  // Registry (reference data for Phase 0 DNA Alignment)
  TerminologyRegistry: TerminologyRegistry_spec,
};
