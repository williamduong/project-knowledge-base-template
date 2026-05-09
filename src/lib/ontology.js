'use strict';

/**
 * Ontology Schema & DNA Registry for KB v2.6
 *
 * This module defines the type-safe contract for ontology entities using Zod schemas.
 * These schemas implement Microsoft CDM principles for multi-tenant SaaS governance.
 *
 * Exports:
 * - SaaSNodeDNA: Master DNA definition for all entities
 * - IntentSchema: Intent NodeType contract with state machine
 * - TerminologyRegistry: Collision register for aliases → canonical_name mapping
 * - validateIntent: Zod validator for Intent with state guards
 * - validateSaaSNode: Zod validator for SaaSNodeDNA
 * - validateTerminology: Resolve alias to canonical_name
 * - verifyStateTransition: Guard logic for 5-state lifecycle
 * - checkCrossRepoGrant: Verify cross-repo mutation eligibility
 * - createOntologyValidator: Factory function for manual validation (backward compat)
 */

const { z } = require('zod');

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
 */

// UUID regex from RFC 4122
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SaaSNodeDNA = z.object({
  id: z.string()
    .regex(UUID_REGEX, 'Invalid UUID format'),
  repo_origin: z.enum(['billing', 'auth', 'gateway', 'infrastructure'])
    .describe('Mandatory DNA positioning for multi-tenant governance'),
  canonical_name: z.string()
    .min(1, 'canonical_name is required')
    .describe('Normalized per Microsoft CDM'),
  sensitivity: z.number()
    .int()
    .min(1)
    .max(5)
    .default(1)
    .describe('Data sensitivity: 1=public, 5=critical'),
  aliases: z.array(z.string())
    .default([])
    .describe('Alternate names, resolved via TerminologyRegistry'),
  last_audit_id: z.string()
    .regex(UUID_REGEX, 'Invalid UUID format')
    .optional(),
});

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
 */

const IntentSchema = SaaSNodeDNA.extend({
  lifecycle: z.enum(['DRAFT', 'PROPOSED', 'VERIFIED', 'EXECUTED', 'COMMITTED'])
    .describe('5-state machine: DRAFT → PROPOSED → VERIFIED → EXECUTED → COMMITTED'),
  title: z.string()
    .min(1, 'title is required'),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical'])
    .describe('Risk classification for governance'),
  evidenceLinks: z.array(z.string())
    .default([])
    .describe('URIs to Document or Claim IDs; required for PROPOSED→VERIFIED transition'),
  commitAllowed: z.boolean()
    .default(false)
    .describe('Only true after VERIFIED state; gates VERIFIED→EXECUTED'),
  governanceThreshold: z.number()
    .min(0)
    .max(1)
    .optional()
    .describe('Minimum confidence/safety score required for domain'),
  reasoningTrace: z.string()
    .optional()
    .describe('AI decision log; captured for audit trail at COMMITTED'),
});

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
 * 10 SaaS Core Entities (Phase 0 — DNA Alignment)
 */

const TerminologyRegistryEntry = z.object({
  canonical_name: z.string().min(1),
  aliases: z.array(z.string()),
  repo_origin: z.enum(['billing', 'auth', 'gateway', 'infrastructure']),
  microsoft_cdm_mapping: z.string().optional(),
});

const TerminologyRegistry_data = {
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

// Build reverse alias → canonical_name mapping (case-insensitive)
const aliasToCanonical = {};
Object.values(TerminologyRegistry_data).forEach(entry => {
  entry.aliases.forEach(alias => {
    const key = alias.toLowerCase();
    if (aliasToCanonical[key] && aliasToCanonical[key] !== entry.canonical_name) {
      throw new Error(`Polysemy detected: alias "${alias}" maps to both "${aliasToCanonical[key]}" and "${entry.canonical_name}"`);
    }
    aliasToCanonical[key] = entry.canonical_name;
  });
});

const TerminologyRegistry_spec = Object.keys(TerminologyRegistry_data).length > 0 
  ? TerminologyRegistry_data 
  : {};

// ---------------------------------------------------------------------------
// State Transition Guards & Validators
// ---------------------------------------------------------------------------

/**
 * Define allowed state transitions and their guard conditions.
 * 5-state machine: DRAFT → PROPOSED → VERIFIED → EXECUTED → COMMITTED
 */
const StateTransitionGuards = {
  'DRAFT': {
    allowedTo: ['PROPOSED'],
    guard: (intent) => {
      // DRAFT → PROPOSED requires evidenceLinks
      return {
        allowed: intent.evidenceLinks && intent.evidenceLinks.length >= 1,
        reason: !intent.evidenceLinks || intent.evidenceLinks.length === 0
          ? 'DRAFT→PROPOSED: evidenceLinks required (must have >=1 link)'
          : null,
      };
    },
  },
  'PROPOSED': {
    allowedTo: ['VERIFIED'],
    guard: (intent) => {
      // PROPOSED → VERIFIED requires Action Guard path validation
      // (Will be implemented in Phase 2 with actual graph check)
      // For Phase 1, we check evidence is present
      return {
        allowed: intent.evidenceLinks && intent.evidenceLinks.length >= 1,
        reason: 'PROPOSED→VERIFIED: requires valid evidence path (Phase 2 checks graph)',
      };
    },
  },
  'VERIFIED': {
    allowedTo: ['EXECUTED'],
    guard: (intent) => {
      // VERIFIED → EXECUTED requires commitAllowed=true
      return {
        allowed: intent.commitAllowed === true,
        reason: !intent.commitAllowed
          ? 'VERIFIED→EXECUTED: commitAllowed must be true'
          : null,
      };
    },
  },
  'EXECUTED': {
    allowedTo: ['COMMITTED'],
    guard: (intent) => {
      // EXECUTED → COMMITTED is final
      return {
        allowed: !!intent.reasoningTrace,
        reason: !intent.reasoningTrace
          ? 'EXECUTED→COMMITTED: reasoningTrace required for audit'
          : null,
      };
    },
  },
  'COMMITTED': {
    allowedTo: [],
    guard: (intent) => {
      return {
        allowed: false,
        reason: 'COMMITTED: immutable final state, no rollback allowed',
      };
    },
  },
};

/**
 * Verify that a state transition is allowed
 * 
 * @param {object} intent - Intent object with lifecycle property
 * @param {string} targetState - Target lifecycle state
 * @returns {object} { allowed: boolean, reason?: string }
 */
function verifyStateTransition(intent, targetState) {
  const currentState = intent.lifecycle;
  
  if (!StateTransitionGuards[currentState]) {
    return { allowed: false, reason: `Unknown current state: ${currentState}` };
  }
  
  const guard = StateTransitionGuards[currentState];
  
  if (!guard.allowedTo.includes(targetState)) {
    return {
      allowed: false,
      reason: `${currentState}→${targetState}: invalid transition. Allowed: [${guard.allowedTo.join(', ')}]`,
    };
  }
  
  // Run guard condition
  return guard.guard(intent);
}

/**
 * Resolve alias to canonical_name using TerminologyRegistry
 * 
 * @param {string} term - Term or alias to resolve
 * @returns {object} { canonical_name: string, repo_origin: string } or null if not found
 */
function resolveTerminology(term) {
  const key = term.toLowerCase();
  
  // Check direct match
  if (TerminologyRegistry_data[term]) {
    return TerminologyRegistry_data[term];
  }
  
  // Check alias match
  const canonical = aliasToCanonical[key];
  if (canonical && TerminologyRegistry_data[canonical]) {
    return TerminologyRegistry_data[canonical];
  }
  
  return null;
}

/**
 * Check if cross-repo mutation is allowed
 * Requires both intents to have valid repo_origin
 * 
 * @param {string} fromRepoOrigin - Source repo_origin
 * @param {string} toRepoOrigin - Target repo_origin
 * @param {object} graphState - (Future: security graph state for grant lookup)
 * @returns {object} { allowed: boolean, reason?: string }
 */
function checkCrossRepoGrant(fromRepoOrigin, toRepoOrigin, graphState = null) {
  // Same repo is always allowed
  if (fromRepoOrigin === toRepoOrigin) {
    return { allowed: true };
  }
  
  // Cross-repo requires CROSS_REPO_GRANT edge (Phase 2 with graph)
  // For Phase 1, we only check that both origins are valid
  const validOrigins = ['billing', 'auth', 'gateway', 'infrastructure'];
  
  if (!validOrigins.includes(fromRepoOrigin)) {
    return { allowed: false, reason: `Invalid fromRepoOrigin: ${fromRepoOrigin}` };
  }
  if (!validOrigins.includes(toRepoOrigin)) {
    return { allowed: false, reason: `Invalid toRepoOrigin: ${toRepoOrigin}` };
  }
  
  // Cross-repo would require grant edge (Phase 2)
  return {
    allowed: false,
    reason: `Cross-repo mutation (${fromRepoOrigin}→${toRepoOrigin}) requires CROSS_REPO_GRANT edge (Phase 2 validates via graph)`,
  };
}

// ---------------------------------------------------------------------------
// Validators (Zod + custom logic)
// ---------------------------------------------------------------------------

/**
 * Validate Intent against schema + state machine guards
 */
function validateIntent(intent) {
  try {
    const parsed = IntentSchema.parse(intent);
    return { valid: true, data: parsed };
  } catch (error) {
    return {
      valid: false,
      errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
}

/**
 * Validate SaaSNodeDNA
 */
function validateSaaSNode(node) {
  try {
    const parsed = SaaSNodeDNA.parse(node);
    return { valid: true, data: parsed };
  } catch (error) {
    return {
      valid: false,
      errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
}

/**
 * Validate terminology (alias → canonical_name)
 */
function validateTerminology(alias) {
  const resolved = resolveTerminology(alias);
  if (resolved) {
    return { valid: true, data: resolved };
  }
  return {
    valid: false,
    error: `Unresolved terminology: "${alias}" not found in TerminologyRegistry`,
  };
}

// ---------------------------------------------------------------------------
// Factory: createOntologyValidator (backward compat)
// ---------------------------------------------------------------------------

/**
 * Factory function to create a validator for ontology schemas.
 * Uses Zod validators; kept for backward compatibility.
 *
 * @param {string} schemaType - One of ['SaaSNodeDNA', 'IntentSchema']
 * @returns {Function} - Validator function (input) => { valid: boolean, errors?: string[] }
 */
function createOntologyValidator(schemaType) {
  const validators = {
    SaaSNodeDNA: validateSaaSNode,
    IntentSchema: validateIntent,
    Terminology: validateTerminology,
  };
  
  const validator = validators[schemaType];
  if (!validator) {
    return (obj) => ({ valid: false, errors: [`Unknown schema type: ${schemaType}`] });
  }
  
  return validator;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Zod Schemas
  SaaSNodeDNA,
  IntentSchema,
  TerminologyRegistryEntry,
  
  // Schema specifications (use for documentation/reference)
  SaaSNodeDNA_spec,
  IntentSchema_spec,
  TerminologyRegistry_spec,
  
  // Registry data
  TerminologyRegistry: TerminologyRegistry_data,
  aliasToCanonical,
  
  // State transition & guard logic
  StateTransitionGuards,
  verifyStateTransition,
  resolveTerminology,
  checkCrossRepoGrant,
  
  // Validators
  validateIntent,
  validateSaaSNode,
  validateTerminology,
  createOntologyValidator,
};
