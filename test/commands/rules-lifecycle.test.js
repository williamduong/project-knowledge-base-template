'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { runRules } = require('../../src/commands/rules');

let workspaceRoot;

function writeStateFixture(root) {
  const statePath = path.join(root, 'knowledge-base', '.kb', 'state.json');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ schemaVersion: 2, storageMode: 'tracked' }, null, 2));
}

async function captureAsync(fn) {
  const stdout = [];
  const stderr = [];
  const oldLog = console.log;
  const oldErr = console.error;
  const oldExit = process.exitCode;
  console.log = (...a) => stdout.push(a.join(' '));
  console.error = (...a) => stderr.push(a.join(' '));
  process.exitCode = 0;

  try {
    await fn();
  } finally {
    console.log = oldLog;
    console.error = oldErr;
  }

  const exitCode = process.exitCode;
  process.exitCode = oldExit;
  return { stdout: stdout.join('\n'), stderr: stderr.join('\n'), exitCode };
}

describe('kbx rules lifecycle command', () => {
  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-rules-lifecycle-cmd-'));
    writeStateFixture(workspaceRoot);
  });

  afterEach(() => {
    try { fs.rmSync(workspaceRoot, { recursive: true, force: true }); } catch { }
  });

  it('sets and returns lifecycle status in JSON', async () => {
    const setOut = await captureAsync(() => runRules({
      args: ['lifecycle', 'set', 'KBX-M001', '--status=active', '--state=implemented', '--json'],
      cwd: workspaceRoot,
    }));
    const setData = JSON.parse(setOut.stdout);
    assert.equal(setData.rule.rule_id, 'KBX-M001');
    assert.equal(setData.rule.status, 'active');
  });

  it('returns lifecycle status list', async () => {
    await captureAsync(() => runRules({
      args: ['lifecycle', 'set', 'KBX-M001', '--status=active', '--state=implemented'],
      cwd: workspaceRoot,
    }));

    const out = await captureAsync(() => runRules({
      args: ['lifecycle', 'status', '--json'],
      cwd: workspaceRoot,
    }));
    const data = JSON.parse(out.stdout);
    assert.equal(data.count, 1);
    assert.equal(data.rules[0].rule_id, 'KBX-M001');
  });

  it('returns lifecycle history for a rule', async () => {
    await captureAsync(() => runRules({
      args: ['lifecycle', 'set', 'KBX-V001', '--status=active', '--state=implemented'],
      cwd: workspaceRoot,
    }));

    const out = await captureAsync(() => runRules({
      args: ['lifecycle', 'history', 'KBX-V001', '--json'],
      cwd: workspaceRoot,
    }));

    const data = JSON.parse(out.stdout);
    assert.equal(data.rule_id, 'KBX-V001');
    assert.equal(data.count, 1);
  });
});
