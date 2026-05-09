'use strict';

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

// ─── Rule Definition Contract ───────────────────────────────────────────────

/**
 * @typedef {Object} RuleDefinition
 * @property {string} id - Unique rule ID (KBX-DOMAIN###)
 * @property {string} description - Human-readable rule description
 * @property {string} severity - One of SEVERITY.ERROR | WARN | INFO
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
};

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate that a rule definition conforms to the contract.
 * Throws if invalid.
 */
function validateRuleDefinition(rule) {
  if (!rule || typeof rule !== 'object') {
    throw new Error(`Rule must be an object, got ${typeof rule}`);
  }

  const { id, description, severity, source_doc, check } = rule;

  if (typeof id !== 'string' || !id.match(/^KBX-[A-Z]+\d{3}$/)) {
    throw new Error(`Invalid rule ID format: "${id}" (expected KBX-DOMAIN###)`);
  }

  if (typeof description !== 'string' || description.length === 0) {
    throw new Error(`Rule ${id}: description missing or empty`);
  }

  if (!Object.values(SEVERITY).includes(severity)) {
    throw new Error(`Rule ${id}: severity must be one of ${Object.values(SEVERITY).join(', ')}, got "${severity}"`);
  }

  if (typeof source_doc !== 'string' || source_doc.length === 0) {
    throw new Error(`Rule ${id}: source_doc missing or empty`);
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
  RULE_DOMAINS,
  validateRuleDefinition,
  findDuplicateRuleIds,
};
