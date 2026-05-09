'use strict';

/**
 * Rule Engine — v2.7 Phase 1.0
 *
 * Rule definition schema:
 *   { id, description, severity, source_doc, check(context) }
 *
 * check(context) must return:
 *   [] if no violations
 *   [{ rule_id, severity, file, line?, message }] for violations
 *
 * context shape:
 *   { kbPath: string, contentRoot: string }
 */

const registeredRules = [];

/**
 * Register a rule module (array of rule definitions).
 * Called by each src/lib/rules/*.js module.
 */
function registerRules(rules) {
  for (const rule of rules) {
    if (!rule.id || !rule.severity || typeof rule.check !== 'function') {
      throw new Error(`Invalid rule definition: missing id, severity, or check(). Got: ${JSON.stringify(rule)}`);
    }
    registeredRules.push(rule);
  }
}

/**
 * Return all registered rules (sorted by id for deterministic output).
 */
function loadRules() {
  return [...registeredRules].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Run all (or a subset of) rules against a KB.
 *
 * @param {string} kbPath - absolute path to KB root (contains knowledge-base/ or template/)
 * @param {string[]} [ruleIds] - optional list of rule IDs to run; defaults to all
 * @returns {{ violations: RuleViolation[], rulesRun: number }}
 */
function runRules(kbPath, ruleIds) {
  const rules = loadRules().filter(r => !ruleIds || ruleIds.includes(r.id));
  const context = { kbPath, contentRoot: kbPath };
  const violations = [];
  for (const rule of rules) {
    let results;
    try {
      results = rule.check(context);
    } catch (err) {
      results = [{
        rule_id: rule.id,
        severity: 'error',
        file: null,
        message: `Rule check threw: ${err.message}`,
      }];
    }
    if (Array.isArray(results)) {
      for (const v of results) {
        violations.push({ rule_id: rule.id, severity: rule.severity, ...v });
      }
    }
  }
  return { violations, rulesRun: rules.length };
}

/**
 * Run a single rule by ID. Returns { found, violations }.
 */
function runRule(kbPath, ruleId) {
  const rule = loadRules().find(r => r.id === ruleId);
  if (!rule) return { found: false, violations: [] };
  const context = { kbPath, contentRoot: kbPath };
  let results;
  try {
    results = rule.check(context);
  } catch (err) {
    results = [{ rule_id: ruleId, severity: rule.severity, file: null, message: `Rule check threw: ${err.message}` }];
  }
  const violations = (Array.isArray(results) ? results : []).map(v => ({ rule_id: rule.id, severity: rule.severity, ...v }));
  return { found: true, violations };
}

module.exports = { registerRules, loadRules, runRules, runRule };

// Auto-load built-in rule modules (v2.7 Phase 2: all rule domains)
require('./rules/metadata');
require('./rules/verification');
require('./rules/intent');
require('./rules/git-binding');
