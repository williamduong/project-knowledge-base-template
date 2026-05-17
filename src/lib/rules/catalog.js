'use strict';

const { loadRules } = require('../rule-engine');
const { loadRuleRegistry } = require('./registry-loader');

const RULE_KIND = Object.freeze({
  MASTER: 'master',
  SOFT: 'soft',
  HARD: 'hard',
});

const RULE_LAYER = Object.freeze({
  ROOT: 'root',
  AGENT: 'agent',
  CLI: 'cli',
  UI: 'ui',
});

const RULE_SCOPE = Object.freeze({
  ALWAYS: 'always',
  KB_MUTATION: 'kb-mutation',
  READ_ONLY: 'read-only',
  ONBOARDING: 'onboarding',
  INTENT: 'intent',
  RELEASE: 'release',
  MULTI_PROJECT: 'multi-project',
  SESSION: 'session',
  ADVANCED_PLAN: 'advanced-plan',
});

const RULE_PRIORITY = Object.freeze({
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
});

const RULE_PACK = Object.freeze({
  CORE: 'core',
  READ_ONLY: 'read-only',
  MUTATION: 'mutation',
  ONBOARDING: 'onboarding',
  INTENT: 'intent',
  RELEASE: 'release',
  MULTI_PROJECT: 'multi-project',
  SESSION: 'session',
  ADVANCED_PLAN: 'advanced-plan',
});

function inferPrecedence(kind, layer) {
  if (layer === RULE_LAYER.ROOT) return 1;
  if (kind === RULE_KIND.HARD) return 2;
  if (kind === RULE_KIND.MASTER) return 3;
  return 4;
}

function normalizeRegistryRule(rule) {
  return {
    id: rule.id,
    title: rule.title || rule.id,
    description: rule.description || null,
    severity: rule.severity || 'info',
    kind: rule.kind || RULE_KIND.SOFT,
    layer: rule.layer || RULE_LAYER.AGENT,
    scope: Array.isArray(rule.scope) ? [...rule.scope] : [],
    priority: rule.priority || RULE_PRIORITY.P2,
    source_doc: rule.sourceDoc || null,
    source_anchor: rule.sourceAnchor || null,
    dependsOn: Array.isArray(rule.dependsOn) ? [...rule.dependsOn] : [],
    overrideMode: rule.overrideMode || 'none',
    tools: Array.isArray(rule.tools) ? [...rule.tools] : [],
    precedence: typeof rule.precedence === 'number' ? rule.precedence : inferPrecedence(rule.kind, rule.layer),
    checkerId: rule.checkerId || null,
    enforcementLevel: rule.enforcementLevel || null,
    status: rule.status || 'active',
  };
}

function listRegistryRules() {
  return loadRuleRegistry().rules.map(normalizeRegistryRule);
}

function listSoftRules() {
  return listRegistryRules().filter((rule) => rule.kind !== RULE_KIND.HARD);
}

function listHardRules() {
  const registryRules = listRegistryRules().filter((rule) => rule.kind === RULE_KIND.HARD);
  const runtimeRules = new Map(loadRules().map((rule) => [rule.id, rule]));

  return registryRules.map((rule) => {
    const runtimeRule = runtimeRules.get(rule.id);
    if (!runtimeRule) {
      return rule;
    }

    return {
      ...rule,
      description: runtimeRule.description || rule.description,
      severity: runtimeRule.severity || rule.severity,
      source_doc: runtimeRule.source_doc || rule.source_doc,
    };
  });
}

function listRuleCatalog() {
  return [...listHardRules(), ...listSoftRules()].sort((left, right) => left.id.localeCompare(right.id));
}

function listRulePacks() {
  const registry = loadRuleRegistry();
  const byId = new Map(listRuleCatalog().map((rule) => [rule.id, rule]));

  return registry.packs.map((pack) => {
    const rules = pack.ruleIds.map((ruleId) => byId.get(ruleId)).filter(Boolean);
    return {
      id: pack.id,
      title: pack.title,
      context: pack.context,
      description: pack.description,
      ruleIds: [...pack.ruleIds],
      stats: {
        count: rules.length,
        hardCount: rules.filter((rule) => rule.kind === RULE_KIND.HARD).length,
        masterCount: rules.filter((rule) => rule.kind === RULE_KIND.MASTER).length,
        softCount: rules.filter((rule) => rule.kind === RULE_KIND.SOFT).length,
        toolCoverage: rules.filter((rule) => Array.isArray(rule.tools) && rule.tools.length > 0).length,
      },
    };
  });
}

function listPrecedenceOrder() {
  return loadRuleRegistry().precedence.map((entry) => ({ ...entry }));
}

module.exports = {
  RULE_KIND,
  RULE_LAYER,
  RULE_SCOPE,
  RULE_PRIORITY,
  RULE_PACK,
  listHardRules,
  listSoftRules,
  listRuleCatalog,
  listRulePacks,
  listPrecedenceOrder,
};