'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  SEVERITY,
  OWNER_LAYER,
  ENFORCEABILITY,
  RUNTIME_STATUS,
  validateRuleDefinition,
  findDuplicateRuleIds,
} = require('../../src/lib/rules/registry');

describe('rule registry contract', () => {
  function makeValidRule(overrides = {}) {
    return {
      id: 'KBX-T001',
      title: 'Test rule title',
      description: 'Test rule description',
      severity: SEVERITY.ERROR,
      owner_layer: OWNER_LAYER.SVFACTORY,
      enforceability: ENFORCEABILITY.AUTO,
      runtime_status: RUNTIME_STATUS.IMPLEMENTED,
      since_version: '2.8.0',
      source_doc: 'template/15-governance/metadata-schema.md',
      check: () => [],
      ...overrides,
    };
  }

  it('accepts a valid rule definition', () => {
    const rule = makeValidRule();
    assert.doesNotThrow(() => validateRuleDefinition(rule));
  });

  it('rejects invalid severity enum', () => {
    const rule = makeValidRule({ severity: 'critical' });
    assert.throws(() => validateRuleDefinition(rule), /severity must be one of/);
  });

  it('rejects invalid owner_layer enum', () => {
    const rule = makeValidRule({ owner_layer: 'owner-x' });
    assert.throws(() => validateRuleDefinition(rule), /owner_layer must be one of/);
  });

  it('rejects invalid enforceability enum', () => {
    const rule = makeValidRule({ enforceability: 'manual-only' });
    assert.throws(() => validateRuleDefinition(rule), /enforceability must be one of/);
  });

  it('rejects invalid runtime_status enum', () => {
    const rule = makeValidRule({ runtime_status: 'unknown' });
    assert.throws(() => validateRuleDefinition(rule), /runtime_status must be one of/);
  });

  it('rejects missing source_doc path in workspace package', () => {
    const rule = makeValidRule({ source_doc: 'template/15-governance/not-existing-file.md' });
    assert.throws(() => validateRuleDefinition(rule), /source_doc path not found/);
  });

  it('findDuplicateRuleIds returns duplicate IDs only once', () => {
    const duplicate = findDuplicateRuleIds([
      makeValidRule({ id: 'KBX-T001' }),
      makeValidRule({ id: 'KBX-T001' }),
      makeValidRule({ id: 'KBX-T002' }),
      makeValidRule({ id: 'KBX-T001' }),
    ]);
    assert.deepEqual(duplicate, ['KBX-T001']);
  });
});
