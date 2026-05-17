'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseArgs, runGates } = require('../../src/commands/gates');
const { createIntentWorkspace } = require('../../src/lib/intent');
const { readIntentGates } = require('../../src/lib/gates');

function tmpWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-gates-'));
  fs.mkdirSync(path.join(root, 'knowledge-base', '.kb'), { recursive: true });
  fs.writeFileSync(path.join(root, 'knowledge-base', '.kb', 'state.json'), '{}\n', 'utf8');
  return root;
}

function captureConsole(fn) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exitCode;
  process.exitCode = 0;
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));
  return Promise.resolve()
    .then(() => fn())
    .then((value) => {
      const exitCode = process.exitCode;
      process.exitCode = originalExit;
      return { value, stdout: logs.join('\n'), stderr: errors.join('\n'), exitCode };
    }, (error) => {
      process.exitCode = originalExit;
      throw error;
    })
    .finally(() => {
      console.log = originalLog;
      console.error = originalError;
    });
}

test('gates parseArgs: list defaults', () => {
  const options = parseArgs(['list']);
  assert.equal(options.sub, 'list');
  assert.equal(options.json, false);
  assert.equal(options.includeResolved, false);
});

test('gates parseArgs: add requires intent', () => {
  assert.throws(() => parseArgs(['add', '--action=A', '--why=B']), /requires --intent/);
});

test('gates parseArgs: skip requires reason', () => {
  assert.throws(() => parseArgs(['skip', 'HG-001', '--intent', 'demo']), /requires --reason/);
});

test('kbx gates add/list/done lifecycle works against intent-local gates.md', async () => {
  const root = tmpWorkspace();
  createIntentWorkspace(path.join(root, 'knowledge-base'), {
    intentId: 'v2-9-demo-gates',
    mode: 'quick',
    changeType: 'governance',
  });

  await captureConsole(() => runGates({
    args: [
      'add',
      '--intent', 'v2-9-demo-gates',
      '--action=Create publisher account',
      '--why=Release cannot proceed without publisher',
      '--input=Email address',
      '--expected-output=Publisher ID',
      '--blocking=P5-T1,P5-T2',
      '--priority=high',
    ],
    cwd: root,
  }));

  let state = readIntentGates(path.join(root, 'knowledge-base'), 'v2-9-demo-gates');
  assert.equal(state.gates.length, 1);
  assert.equal(state.gates[0].id, 'HG-001');
  assert.equal(state.gates[0].gate_type, 'intent-local');
  assert.equal(state.gates[0].scope, 'intent');

  const listResult = await captureConsole(() => runGates({
    args: ['list', '--intent', 'v2-9-demo-gates', '--json'],
    cwd: root,
  }));
  const listed = JSON.parse(listResult.stdout);
  assert.equal(listed.count, 1);
  assert.equal(listed.gates[0].id, 'HG-001');

  await captureConsole(() => runGates({
    args: ['done', 'HG-001', '--intent', 'v2-9-demo-gates', '--output=publisher-demo'],
    cwd: root,
  }));

  state = readIntentGates(path.join(root, 'knowledge-base'), 'v2-9-demo-gates');
  assert.equal(state.gates[0].status, 'done');
  assert.equal(state.gates[0].outputReceived, 'publisher-demo');
});

test('kbx gates skip records skip reason', async () => {
  const root = tmpWorkspace();
  createIntentWorkspace(path.join(root, 'knowledge-base'), {
    intentId: 'v2-9-demo-skip',
    mode: 'quick',
    changeType: 'governance',
  });

  await captureConsole(() => runGates({
    args: [
      'add',
      '--intent', 'v2-9-demo-skip',
      '--action=Obtain legal review',
      '--why=Needs human approval',
    ],
    cwd: root,
  }));

  await captureConsole(() => runGates({
    args: ['skip', 'HG-001', '--intent', 'v2-9-demo-skip', '--reason=Out of scope'],
    cwd: root,
  }));

  const state = readIntentGates(path.join(root, 'knowledge-base'), 'v2-9-demo-skip');
  assert.equal(state.gates[0].status, 'skipped');
  assert.equal(state.gates[0].skipReason, 'Out of scope');
});
