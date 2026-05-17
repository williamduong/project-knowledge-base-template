import { strict as assert } from 'assert';
import { describe, it } from 'node:test';

const mod = await import('../../src/lib/rules/registry-loader.js');
const loader = mod.default || mod;
const { loadRuleRegistry, validateRuleRegistryDocument } = loader;

describe('rules registry validation', () => {
  it('loads the current registry without error', () => {
    const doc = loadRuleRegistry();
    assert.ok(doc.rules && doc.rules.length > 0, 'registry should contain rules');
    assert.ok(doc.packs && doc.packs.length > 0, 'registry should contain packs');
  });

  it('rejects duplicate rule ids', () => {
    const doc = loadRuleRegistry();
    const dup = JSON.parse(JSON.stringify(doc));
    // duplicate first rule id
    dup.rules.push({ ...dup.rules[0], id: dup.rules[0].id });
    assert.throws(() => validateRuleRegistryDocument(dup), /duplicate rule id/, 'should throw on duplicate ids');
  });

  it('rejects orphan pack ruleIds', () => {
    const doc = loadRuleRegistry();
    const bad = JSON.parse(JSON.stringify(doc));
    bad.packs[0].ruleIds[0] = 'NON-EXISTENT-RULE';
    assert.throws(() => validateRuleRegistryDocument(bad), /references unknown rule id/, 'should throw on orphan pack entries');
  });

  it('rejects invalid enforcement.level values', () => {
    const doc = loadRuleRegistry();
    const bad = JSON.parse(JSON.stringify(doc));
    bad.rules[0].enforcement = { level: 'nope' };
    assert.throws(() => validateRuleRegistryDocument(bad), /enforcement.level must be one of/, 'should throw on invalid enforcement.level');
  });
});
