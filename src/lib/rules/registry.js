'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Rule Registry Contract — v2.7 Phase 2
 *
 * Defines:
 *   - Stable rule ID format
 *   - Severity enum
 *   - Source doc reference
 *   - Ownership model
 *
 * All rules must conform to this contract.
 * Single registration entrypoint for Phase 2+.
 */

// ─── Rule ID Format ─────────────────────────────────────────────────────────
//
// Format: <DOMAIN>-<NUMBER>
//   DOMAIN: 3-4 uppercase letters (M=Metadata, V=Verification, I=Intent, GB=GitBinding)
//   NUMBER: 001, 002, 003, ... (zero-padded 3-digit)
//
// Examples:
//   KBX-M001   Metadata rule 1
//   KBX-V002   Verification rule 2
//   KBX-I001   Intent rule 1
//   KBX-GB001  Git Binding rule 1
//
// Constraints:
//   - No duplicate IDs across all registered rules
//   - No gaps in numbering within same domain (0xx → valid, 001 404 → invalid)
//   - New rules increment only at end of domain block
//

const SEVERITY = Object.freeze({
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
});

const OWNER_LAYER = Object.freeze({
  SVFACTORY: 'svfactory',
  KBAGENT: 'kbagent',
  SHARED: 'shared',
});

const ENFORCEABILITY = Object.freeze({
  AUTO: 'auto',
  SEMI: 'semi',
  HUMAN: 'human',
});

const RUNTIME_STATUS = Object.freeze({
  IMPLEMENTED: 'implemented',
  PLANNED: 'planned',
});

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

const RULE_DOMAIN_CONFIG = Object.freeze({
  M: Object.freeze({ label: 'Metadata', module_path: 'src/lib/rules/metadata.js' }),
  V: Object.freeze({ label: 'Verification', module_path: 'src/lib/rules/verification.js' }),
  I: Object.freeze({ label: 'Intent', module_path: 'src/lib/rules/intent.js' }),
  GB: Object.freeze({ label: 'Git Binding', module_path: 'src/lib/rules/git-binding.js' }),
  AX: Object.freeze({ label: 'Axiom (Behavioral)', module_path: 'src/lib/rules/contract-alignment.js' }),
  GV: Object.freeze({ label: 'Governance Verification', module_path: 'src/lib/rules/contract-alignment.js' }),
  P: Object.freeze({ label: 'Pipeline Rules', module_path: 'src/lib/rules/intent.js' }),
  PR: Object.freeze({ label: 'Principle Alignment', module_path: 'src/lib/rules/contract-alignment.js' }),
  WF: Object.freeze({ label: 'Workflow Alignment', module_path: 'src/lib/rules/contract-alignment.js' }),
  KA: Object.freeze({ label: 'Knowledge Alignment', module_path: 'src/lib/rules/contract-alignment.js' }),
});

// ─── Rule Definition Contract ───────────────────────────────────────────────

/**
 * @typedef {Object} RuleDefinition
 * @property {string} id - Unique rule ID (KBX-DOMAIN###)
 * @property {string} title - Stable short rule title
 * @property {string} description - Human-readable rule description
 * @property {string} severity - One of SEVERITY.ERROR | WARN | INFO
 * @property {string} owner_layer - One of OWNER_LAYER.SVFACTORY | KBAGENT | SHARED
 * @property {string} enforceability - One of ENFORCEABILITY.AUTO | SEMI | HUMAN
 * @property {string} runtime_status - One of RUNTIME_STATUS.IMPLEMENTED | PLANNED
 * @property {string} since_version - Version when rule contract became valid
 * @property {string} source_doc - Path to governance doc that defines this rule
 *                                 (e.g., 'template/15-governance/metadata-schema.md')
 * @property {Function} check - (context: {kbPath, contentRoot}) => RuleViolation[] | []
 *
 * @typedef {Object} RuleViolation
 * @property {string} file - Relative path to violating file (or null)
 * @property {number} [line] - Line number in file (optional)
 * @property {string} message - Violation message
 */

// ─── Rule Domains (Informational) ───────────────────────────────────────────

const RULE_DOMAINS = {
  M: 'Metadata',
  V: 'Verification',
  I: 'Intent',
  GB: 'Git Binding',
  AX: 'Axiom (Behavioral)',
  GV: 'Governance Verification',
  P: 'Pipeline Rules',
  PR: 'Principle Alignment',
  WF: 'Workflow Alignment',
  KA: 'Knowledge Alignment',
};

function parseRuleId(ruleId) {
  const match = /^KBX-([A-Z]+)(\d{3})$/.exec(String(ruleId || '').trim());
  if (!match) return null;
  return {
    domain: match[1],
    number: Number(match[2]),
  };
}

function getRuleDomainConfig(domain) {
  return RULE_DOMAIN_CONFIG[String(domain || '').trim().toUpperCase()] || null;
}

function suggestNextRuleId(rules, domain) {
  const normalizedDomain = String(domain || '').trim().toUpperCase();
  if (!getRuleDomainConfig(normalizedDomain)) {
    throw new Error(`Unknown rule domain: ${domain}`);
  }

  let maxNumber = 0;
  for (const rule of rules || []) {
    const parsed = parseRuleId(rule && rule.id);
    if (parsed && parsed.domain === normalizedDomain) {
      maxNumber = Math.max(maxNumber, parsed.number);
    }
  }

  return `KBX-${normalizedDomain}${String(maxNumber + 1).padStart(3, '0')}`;
}

function buildRuleScaffold({
  ruleId,
  title,
  description,
  severity,
  ownerLayer,
  enforceability,
  runtimeStatus,
  sinceVersion,
  sourceDoc,
}) {
  return [
    '{',
    `  id: '${ruleId}',`,
    `  title: '${title.replace(/'/g, "\\'")}',`,
    `  description: '${description.replace(/'/g, "\\'")}',`,
    `  severity: SEVERITY.${String(severity || '').toUpperCase()},`,
    `  owner_layer: OWNER_LAYER.${String(ownerLayer || '').toUpperCase()},`,
    `  enforceability: ENFORCEABILITY.${String(enforceability || '').toUpperCase()},`,
    `  runtime_status: RUNTIME_STATUS.${String(runtimeStatus || '').toUpperCase()},`,
    `  since_version: '${sinceVersion.replace(/'/g, "\\'")}',`,
    `  source_doc: '${sourceDoc.replace(/'/g, "\\'")}',`,
    '  check(context) {',
    '    void context;',
    '    return [];',
    '  },',
    '}',
  ].join('\n');
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate that a rule definition conforms to the contract.
 * Throws if invalid.
 */
function validateRuleDefinition(rule) {
  if (!rule || typeof rule !== 'object') {
    throw new Error(`Rule must be an object, got ${typeof rule}`);
  }

  const {
    id,
    title,
    description,
    severity,
    owner_layer,
    enforceability,
    runtime_status,
    since_version,
    source_doc,
    check,
  } = rule;

  if (typeof id !== 'string' || !id.match(/^KBX-[A-Z]+\d{3}$/)) {
    throw new Error(`Invalid rule ID format: "${id}" (expected KBX-DOMAIN###)`);
  }

  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new Error(`Rule ${id}: title missing or empty`);
  }

  if (typeof description !== 'string' || description.length === 0) {
    throw new Error(`Rule ${id}: description missing or empty`);
  }

  if (!Object.values(SEVERITY).includes(severity)) {
    throw new Error(`Rule ${id}: severity must be one of ${Object.values(SEVERITY).join(', ')}, got "${severity}"`);
  }

  if (!Object.values(OWNER_LAYER).includes(owner_layer)) {
    throw new Error(`Rule ${id}: owner_layer must be one of ${Object.values(OWNER_LAYER).join(', ')}, got "${owner_layer}"`);
  }

  if (!Object.values(ENFORCEABILITY).includes(enforceability)) {
    throw new Error(`Rule ${id}: enforceability must be one of ${Object.values(ENFORCEABILITY).join(', ')}, got "${enforceability}"`);
  }

  if (!Object.values(RUNTIME_STATUS).includes(runtime_status)) {
    throw new Error(`Rule ${id}: runtime_status must be one of ${Object.values(RUNTIME_STATUS).join(', ')}, got "${runtime_status}"`);
  }

  if (typeof since_version !== 'string' || since_version.trim().length === 0) {
    throw new Error(`Rule ${id}: since_version missing or empty`);
  }

  if (typeof source_doc !== 'string' || source_doc.length === 0) {
    throw new Error(`Rule ${id}: source_doc missing or empty`);
  }

  const sourceDocPath = path.join(PROJECT_ROOT, source_doc);
  if (!fs.existsSync(sourceDocPath)) {
    throw new Error(`Rule ${id}: source_doc path not found: ${source_doc}`);
  }

  if (typeof check !== 'function') {
    throw new Error(`Rule ${id}: check must be a function`);
  }
}

/**
 * Check for duplicate rule IDs.
 * Returns array of duplicate IDs, or [] if no duplicates.
 */
function findDuplicateRuleIds(rules) {
  const seen = {};
  const duplicates = [];
  for (const rule of rules) {
    if (seen[rule.id]) {
      duplicates.push(rule.id);
    }
    seen[rule.id] = true;
  }
  return [...new Set(duplicates)]; // Deduplicate duplicates array
}

module.exports = {
  SEVERITY,
  OWNER_LAYER,
  ENFORCEABILITY,
  RUNTIME_STATUS,
  RULE_DOMAINS,
  RULE_DOMAIN_CONFIG,
  parseRuleId,
  getRuleDomainConfig,
  suggestNextRuleId,
  buildRuleScaffold,
  validateRuleDefinition,
  findDuplicateRuleIds,
};
