'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  ensureStore,
  setRuleLifecycle,
  listRuleLifecycle,
  readHistory,
  exportGraphIngest,
} = require('../../src/lib/rule-lifecycle');

let workspaceRoot;

function writeStateFixture(root) {
  const statePath = path.join(root, 'knowledge-base', '.kb', 'state.json');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({
    schemaVersion: 2,
    storageMode: 'tracked',
  }, null, 2));
}

describe('rule lifecycle skeleton', () => {
  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-rule-lifecycle-'));
    writeStateFixture(workspaceRoot);
  });

  afterEach(() => {
    try { fs.rmSync(workspaceRoot, { recursive: true, force: true }); } catch { }
  });

  it('creates lifecycle store files', () => {
    const paths = ensureStore(workspaceRoot);
    assert.ok(fs.existsSync(paths.statePath));
    assert.ok(fs.existsSync(paths.historyPath));
  });

  it('sets lifecycle values and returns record', () => {
    const { rule } = setRuleLifecycle(workspaceRoot, {
      ruleId: 'KBX-M001',
      status: 'active',
      state: 'implemented',
      note: 'phase-c seed',
    });
    assert.equal(rule.rule_id, 'KBX-M001');
    assert.equal(rule.status, 'active');
    assert.equal(rule.state, 'implemented');
  });

  it('lists records and reads history events', () => {
    setRuleLifecycle(workspaceRoot, {
      ruleId: 'KBX-V001',
      status: 'active',
      state: 'implemented',
    });

    const list = listRuleLifecycle(workspaceRoot);
    assert.equal(list.length, 1);
    assert.equal(list[0].rule_id, 'KBX-V001');

    const history = readHistory(workspaceRoot, { ruleId: 'KBX-V001', limit: 10 });
    assert.equal(history.length, 1);
    assert.equal(history[0].to_status, 'active');
  });

  it('exports lifecycle graph ingest payload', () => {
    setRuleLifecycle(workspaceRoot, {
      ruleId: 'KBX-GB001',
      status: 'active',
      state: 'implemented',
    });

    const payload = exportGraphIngest(workspaceRoot);
    assert.equal(payload.format, 'graph-ingest-v1');
    assert.ok(payload.nodes.length >= 2, 'Expected rule node + event node');
    assert.ok(payload.edges.length >= 1, 'Expected at least one rule-event edge');
    assert.equal(payload.stats.rule_count, 1);
  });
});
