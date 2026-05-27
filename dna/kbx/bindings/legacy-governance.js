'use strict';

/**
 * KBX legacy governance binding.
 *
 * This file preserves the old KBX/SaaS-flavored state machine and mutation
 * guard behavior while keeping it out of SVFactory core.
 */

const { z } = require('zod');

const VALID_REPO_ORIGINS = ['billing', 'auth', 'gateway', 'infrastructure'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SaaSNodeDNA = z.object({
  id: z.string().regex(UUID_REGEX, 'Invalid UUID format'),
  repo_origin: z.enum(['billing', 'auth', 'gateway', 'infrastructure'])
    .describe('Mandatory DNA positioning for multi-tenant governance'),
  canonical_name: z.string().min(1, 'canonical_name is required')
    .describe('Normalized per Microsoft CDM'),
  sensitivity: z.number().int().min(1).max(5).default(1)
    .describe('Data sensitivity: 1=public, 5=critical'),
  aliases: z.array(z.string()).default([])
    .describe('Alternate names, resolved via TerminologyRegistry'),
  last_audit_id: z.string().regex(UUID_REGEX, 'Invalid UUID format').optional(),
});

const SaaSNodeDNA_spec = {
  id: 'UUID (required)',
  repo_origin: 'Enum[billing|auth|gateway|infrastructure] (required)',
  canonical_name: 'String (required, >=1 char, normalized per CDM)',
  sensitivity: 'Integer 1-5 (default: 1)',
  aliases: 'String[] (default: [])',
  last_audit_id: 'UUID (optional)',
};

const IntentSchema = SaaSNodeDNA.extend({
  lifecycle: z.enum(['DRAFT', 'PROPOSED', 'VERIFIED', 'EXECUTED', 'COMMITTED'])
    .describe('5-state machine: DRAFT → PROPOSED → VERIFIED → EXECUTED → COMMITTED'),
  title: z.string().min(1, 'title is required'),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical'])
    .describe('Risk classification for governance'),
  evidenceLinks: z.array(z.string()).default([])
    .describe('URIs to Document or Claim IDs; required for PROPOSED→VERIFIED transition'),
  commitAllowed: z.boolean().default(false)
    .describe('Only true after VERIFIED state; gates VERIFIED→EXECUTED'),
  governanceThreshold: z.number().min(0).max(1).optional()
    .describe('Minimum confidence/safety score required for domain'),
  reasoningTrace: z.string().optional()
    .describe('AI decision log; captured for audit trail at COMMITTED'),
});

const IntentSchema_spec = {
  id: 'UUID (required)',
  repo_origin: 'Enum[billing|auth|gateway|infrastructure] (required)',
  canonical_name: 'String (required)',
  lifecycle: 'Enum[DRAFT|PROPOSED|VERIFIED|EXECUTED|COMMITTED] (required)',
  title: 'String (required, >=1 char)',
  riskLevel: 'Enum[Low|Medium|High|Critical] (required)',
  evidenceLinks: 'String[] URI (default: []; required for PROPOSED→VERIFIED)',
  commitAllowed: 'Boolean (default: false; true only after VERIFIED)',
  governanceThreshold: 'Float 0.0-1.0 (optional)',
  reasoningTrace: 'String (optional; audit trail)',
};

const CypherTemplates = {
  evidence_path_check: `
MATCH (i:Intent {id: $intentId})-[:SUPPORTS]->(d:Document)
WHERE d.id IN $evidenceLinks
MATCH (d)-[:REFERENCES]->(t:Entity {canonical_name: $targetCanonicalName, repo_origin: $targetRepoOrigin})
RETURN COUNT(t) > 0 AS path_exists
`.trim(),
  cross_repo_grant_check: `
MATCH (src:RepoOrigin {name: $fromRepoOrigin})-[g:CROSS_REPO_GRANT]->(dst:RepoOrigin {name: $toRepoOrigin})
RETURN COUNT(g) > 0 AS grant_exists
`.trim(),
  claim_threshold_check: `
MATCH (i:Intent {id: $intentId})-[:SUPPORTS]->(c:Claim)
WHERE c.confidence >= $governanceThreshold
RETURN COUNT(c) > 0 AS threshold_pass
`.trim(),
};

function normalizeGrantEdge(edge = {}) {
  const from = (edge.from || edge.fromRepoOrigin || '').toString().toLowerCase();
  const to = (edge.to || edge.toRepoOrigin || '').toString().toLowerCase();
  return { from, to };
}

function hasEvidencePath(intent, targetEntity, graphState = null) {
  const evidenceLinks = Array.isArray(intent.evidenceLinks) ? intent.evidenceLinks : [];
  if (evidenceLinks.length === 0) {
    return {
      allowed: false,
      reason: 'PROPOSED→VERIFIED: requires non-empty evidenceLinks',
      query: CypherTemplates.evidence_path_check,
      params: {
        intentId: intent.id,
        evidenceLinks: [],
        targetCanonicalName: targetEntity?.canonical_name || null,
        targetRepoOrigin: targetEntity?.repo_origin || null,
      },
    };
  }

  if (!targetEntity || !targetEntity.canonical_name || !targetEntity.repo_origin) {
    return {
      allowed: true,
      reason: null,
      query: CypherTemplates.evidence_path_check,
      params: {
        intentId: intent.id,
        evidenceLinks,
        targetCanonicalName: null,
        targetRepoOrigin: null,
      },
    };
  }

  if (!graphState || !Array.isArray(graphState.evidencePaths)) {
    return {
      allowed: false,
      reason: 'Missing graph evidence path state for target mutation validation',
      query: CypherTemplates.evidence_path_check,
      params: {
        intentId: intent.id,
        evidenceLinks,
        targetCanonicalName: targetEntity.canonical_name,
        targetRepoOrigin: targetEntity.repo_origin,
      },
    };
  }

  const pathExists = graphState.evidencePaths.some(path => {
    if (!path || typeof path !== 'object') {
      return false;
    }
    const sameIntent = path.intentId === intent.id;
    const sameTargetName = path.targetCanonicalName === targetEntity.canonical_name;
    const sameTargetRepo = path.targetRepoOrigin === targetEntity.repo_origin;
    const linkedEvidence = evidenceLinks.includes(path.evidenceLink);
    return sameIntent && sameTargetName && sameTargetRepo && linkedEvidence;
  });

  return {
    allowed: pathExists,
    reason: pathExists
      ? null
      : `No evidence path found: Intent(${intent.id}) -> Document -> Target(${targetEntity.canonical_name})`,
    query: CypherTemplates.evidence_path_check,
    params: {
      intentId: intent.id,
      evidenceLinks,
      targetCanonicalName: targetEntity.canonical_name,
      targetRepoOrigin: targetEntity.repo_origin,
    },
  };
}

function checkCrossRepoGrant(fromRepoOrigin, toRepoOrigin, graphState = null) {
  if (fromRepoOrigin === toRepoOrigin) {
    return { allowed: true };
  }

  if (!VALID_REPO_ORIGINS.includes(fromRepoOrigin)) {
    return { allowed: false, reason: `Invalid fromRepoOrigin: ${fromRepoOrigin}` };
  }
  if (!VALID_REPO_ORIGINS.includes(toRepoOrigin)) {
    return { allowed: false, reason: `Invalid toRepoOrigin: ${toRepoOrigin}` };
  }

  if (graphState && Array.isArray(graphState.crossRepoGrants)) {
    const grantExists = graphState.crossRepoGrants
      .map(normalizeGrantEdge)
      .some(edge => edge.from === fromRepoOrigin && edge.to === toRepoOrigin);

    if (grantExists) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `Cross-repo mutation (${fromRepoOrigin}→${toRepoOrigin}) requires CROSS_REPO_GRANT edge (Phase 2 validates via graph)`,
  };
}

function verifyMutation(intent, targetEntity, graphState = null) {
  const evidenceResult = hasEvidencePath(intent, targetEntity, graphState);
  if (!evidenceResult.allowed) {
    return evidenceResult;
  }

  if (targetEntity && targetEntity.repo_origin) {
    const crossRepoResult = checkCrossRepoGrant(intent.repo_origin, targetEntity.repo_origin, graphState);
    if (!crossRepoResult.allowed) {
      return {
        allowed: false,
        reason: crossRepoResult.reason,
        query: CypherTemplates.cross_repo_grant_check,
        params: {
          fromRepoOrigin: intent.repo_origin,
          toRepoOrigin: targetEntity.repo_origin,
        },
      };
    }
  }

  return {
    allowed: true,
    reason: null,
    query: evidenceResult.query,
    params: evidenceResult.params,
  };
}

function ToolCallInterceptor({ intent, targetEntity = null, graphState = null }) {
  return verifyMutation(intent, targetEntity, graphState);
}

const StateTransitionGuards = {
  DRAFT: {
    allowedTo: ['PROPOSED'],
    guard: intent => ({
      allowed: intent.evidenceLinks && intent.evidenceLinks.length >= 1,
      reason: !intent.evidenceLinks || intent.evidenceLinks.length === 0
        ? 'DRAFT→PROPOSED: evidenceLinks required (must have >=1 link)'
        : null,
    }),
  },
  PROPOSED: {
    allowedTo: ['VERIFIED'],
    guard: (intent, context = {}) => verifyMutation(intent, context.targetEntity || null, context.graphState || null),
  },
  VERIFIED: {
    allowedTo: ['EXECUTED'],
    guard: intent => ({
      allowed: intent.commitAllowed === true,
      reason: !intent.commitAllowed ? 'VERIFIED→EXECUTED: commitAllowed must be true' : null,
    }),
  },
  EXECUTED: {
    allowedTo: ['COMMITTED'],
    guard: intent => ({
      allowed: !!intent.reasoningTrace,
      reason: !intent.reasoningTrace ? 'EXECUTED→COMMITTED: reasoningTrace required for audit' : null,
    }),
  },
  COMMITTED: {
    allowedTo: [],
    guard: () => ({
      allowed: false,
      reason: 'COMMITTED: immutable final state, no rollback allowed',
    }),
  },
};

function verifyStateTransition(intent, targetState, context = {}) {
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

  return guard.guard(intent, context);
}

function validateIntent(intent) {
  try {
    const parsed = IntentSchema.parse(intent);
    if (parsed.lifecycle !== 'DRAFT' && (!parsed.evidenceLinks || parsed.evidenceLinks.length === 0)) {
      return {
        valid: false,
        errors: ['evidenceLinks: required for lifecycle states beyond DRAFT'],
      };
    }
    return { valid: true, data: parsed };
  } catch (error) {
    return {
      valid: false,
      errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
}

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

module.exports = {
  VALID_REPO_ORIGINS,
  SaaSNodeDNA,
  SaaSNodeDNA_spec,
  IntentSchema,
  IntentSchema_spec,
  CypherTemplates,
  StateTransitionGuards,
  checkCrossRepoGrant,
  hasEvidencePath,
  verifyMutation,
  ToolCallInterceptor,
  verifyStateTransition,
  validateIntent,
  validateSaaSNode,
};
