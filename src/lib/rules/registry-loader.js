'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REGISTRY_RELATIVE_PATH = path.join('src', 'lib', 'rules', 'rules.yaml');
const ENFORCEMENT_LEVELS = new Set(['assist', 'check', 'validate', 'block']);
const ENFORCEMENT_ACTORS = new Set(['agent', 'cli', 'runtime', 'human', 'tool']);

function getRuleRegistryPath() {
  return path.join(__dirname, 'rules.yaml');
}

function assertString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`rules registry: ${fieldName} must be a non-empty string`);
  }
}

function assertArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`rules registry: ${fieldName} must be an array`);
  }
}

function normalizeRule(rule, index) {
  if (!rule || typeof rule !== 'object') {
    throw new Error(`rules registry: rules[${index}] must be an object`);
  }

  assertString(rule.id, `rules[${index}].id`);
  assertString(rule.title, `rules[${index}].title`);
  assertString(rule.description, `rules[${index}].description`);
  assertString(rule.severity, `rules[${index}].severity`);
  assertString(rule.kind, `rules[${index}].kind`);
  assertString(rule.layer, `rules[${index}].layer`);
  assertString(rule.priority, `rules[${index}].priority`);
  assertString(rule.overrideMode, `rules[${index}].overrideMode`);
  assertString(rule.status, `rules[${index}].status`);

  assertArray(rule.scope, `rules[${index}].scope`);
  assertArray(rule.dependsOn, `rules[${index}].dependsOn`);
  assertArray(rule.tools, `rules[${index}].tools`);

  if (rule.sourceDoc !== null) {
    assertString(rule.sourceDoc, `rules[${index}].sourceDoc`);
  }

  if (rule.sourceAnchor !== null && typeof rule.sourceAnchor !== 'string') {
    throw new Error(`rules registry: rules[${index}].sourceAnchor must be a string or null`);
  }

  if (rule.checkerId !== null && typeof rule.checkerId !== 'string') {
    throw new Error(`rules registry: rules[${index}].checkerId must be a string or null`);
  }

  // enforcement may be null or an object with contract { level, actor?, surface?, rationale? }
  if (rule.enforcement !== null && rule.enforcement !== undefined) {
    if (typeof rule.enforcement !== 'object') {
      throw new Error(`rules registry: rules[${index}].enforcement must be an object`);
    }

    if (!rule.enforcement.level || !ENFORCEMENT_LEVELS.has(rule.enforcement.level)) {
      throw new Error(`rules registry: rules[${index}].enforcement.level must be one of ${[...ENFORCEMENT_LEVELS].join(', ')}`);
    }

    if (rule.enforcement.actor !== null && rule.enforcement.actor !== undefined) {
      if (typeof rule.enforcement.actor !== 'string' || !ENFORCEMENT_ACTORS.has(rule.enforcement.actor)) {
        throw new Error(`rules registry: rules[${index}].enforcement.actor must be one of ${[...ENFORCEMENT_ACTORS].join(', ')}`);
      }
    }

    if (rule.enforcement.surface !== null && rule.enforcement.surface !== undefined) {
      if (!Array.isArray(rule.enforcement.surface)) {
        throw new Error(`rules registry: rules[${index}].enforcement.surface must be an array of strings`);
      }
      for (const s of rule.enforcement.surface) {
        assertString(s, `rules[${index}].enforcement.surface[]`);
      }
    }

    if (rule.enforcement.rationale !== null && rule.enforcement.rationale !== undefined) {
      assertString(rule.enforcement.rationale, `rules[${index}].enforcement.rationale`);
    }
  }

  return {
    id: rule.id,
    title: rule.title,
    description: rule.description,
    severity: rule.severity,
    kind: rule.kind,
    layer: rule.layer,
    priority: rule.priority,
    scope: [...rule.scope],
    dependsOn: [...rule.dependsOn],
    overrideMode: rule.overrideMode,
    tools: [...rule.tools],
    precedence: typeof rule.precedence === 'number' ? rule.precedence : null,
    sourceDoc: rule.sourceDoc ?? null,
    sourceAnchor: rule.sourceAnchor ?? null,
    checkerId: rule.checkerId ?? null,
    enforcement: rule.enforcement ?? null,
    status: rule.status,
  };
}

function normalizePack(pack, index, knownRuleIds) {
  if (!pack || typeof pack !== 'object') {
    throw new Error(`rules registry: packs[${index}] must be an object`);
  }

  assertString(pack.id, `packs[${index}].id`);
  assertString(pack.title, `packs[${index}].title`);
  assertString(pack.context, `packs[${index}].context`);
  assertString(pack.description, `packs[${index}].description`);
  assertArray(pack.ruleIds, `packs[${index}].ruleIds`);

  for (const ruleId of pack.ruleIds) {
    assertString(ruleId, `packs[${index}].ruleIds[]`);
    if (!knownRuleIds.has(ruleId)) {
      throw new Error(`rules registry: pack ${pack.id} references unknown rule id ${ruleId}`);
    }
  }

  return {
    id: pack.id,
    title: pack.title,
    context: pack.context,
    description: pack.description,
    ruleIds: [...pack.ruleIds],
  };
}

function normalizePrecedenceEntry(entry, index) {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`rules registry: precedence[${index}] must be an object`);
  }

  if (typeof entry.level !== 'number') {
    throw new Error(`rules registry: precedence[${index}].level must be a number`);
  }

  assertString(entry.label, `precedence[${index}].label`);
  assertString(entry.description, `precedence[${index}].description`);

  return {
    level: entry.level,
    label: entry.label,
    description: entry.description,
  };
}

function validateRuleRegistryDocument(document) {
  if (!document || typeof document !== 'object') {
    throw new Error('rules registry: document must be an object');
  }

  if (document.version !== 1) {
    throw new Error(`rules registry: unsupported version ${document.version}`);
  }

  assertArray(document.precedence, 'precedence');
  assertArray(document.packs, 'packs');
  assertArray(document.rules, 'rules');

  const normalizedRules = document.rules.map(normalizeRule);
  const seenRuleIds = new Set();
  for (const rule of normalizedRules) {
    if (seenRuleIds.has(rule.id)) {
      throw new Error(`rules registry: duplicate rule id ${rule.id}`);
    }
    seenRuleIds.add(rule.id);
  }

  const normalizedPacks = document.packs.map((pack, index) => normalizePack(pack, index, seenRuleIds));
  const normalizedPrecedence = document.precedence.map(normalizePrecedenceEntry);

  return {
    version: document.version,
    metadata: document.metadata && typeof document.metadata === 'object' ? { ...document.metadata } : {},
    precedence: normalizedPrecedence,
    packs: normalizedPacks,
    rules: normalizedRules,
    registryPath: REGISTRY_RELATIVE_PATH,
  };
}

function loadRuleRegistry() {
  const filePath = getRuleRegistryPath();
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = yaml.load(raw);
  return validateRuleRegistryDocument(parsed);
}

module.exports = {
  ENFORCEMENT_LEVELS,
  ENFORCEMENT_ACTORS,
  REGISTRY_RELATIVE_PATH,
  getRuleRegistryPath,
  loadRuleRegistry,
  validateRuleRegistryDocument,
};