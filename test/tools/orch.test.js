'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadPlan } = require('../../tools/orch/planner');
const { runPlan } = require('../../tools/orch');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-orch-'));
}

test('loadPlan: rejects missing steps', () => {
  const root = tmpRoot();
  const planPath = path.join(root, 'plan.json');
  fs.writeFileSync(planPath, JSON.stringify({ id: 'p1', steps: [] }));

  assert.throws(() => loadPlan(planPath), /plan\.steps must be a non-empty array/);
});

test('runPlan: shell step succeeds and writes report', async () => {
  const root = tmpRoot();
  const outDir = path.join(root, 'out');
  const planPath = path.join(root, 'plan.json');

  fs.writeFileSync(planPath, JSON.stringify({
    id: 'ok-plan',
    steps: [
      {
        id: 's1',
        executor: 'shell',
        command: process.execPath,
        args: ['-e', 'process.stdout.write("OK")'],
        workingDir: '.',
        allowedRoots: ['.'],
        assert: {
          exitCode: 0,
          stdoutContains: ['OK'],
        },
      },
    ],
  }, null, 2));

  const result = await runPlan(planPath, {
    workspaceRoot: root,
    outputPath: path.join(outDir, 'report.json'),
  });

  assert.equal(result.ok, true);
  assert.equal(result.report.summary.passed, 1);
  assert.equal(fs.existsSync(result.outputPath), true);
});

test('runPlan: scope violation blocks step', async () => {
  const root = tmpRoot();
  const outsideDir = tmpRoot();
  const planPath = path.join(root, 'plan.json');

  fs.writeFileSync(planPath, JSON.stringify({
    id: 'scope-plan',
    steps: [
      {
        id: 's1',
        executor: 'shell',
        command: process.execPath,
        args: ['-e', 'process.exit(0)'],
        workingDir: outsideDir,
        allowedRoots: ['.'],
      },
    ],
  }, null, 2));

  const result = await runPlan(planPath, {
    workspaceRoot: root,
  });

  assert.equal(result.ok, false);
  assert.equal(result.report.summary.blocked, 1);
  assert.equal(result.report.steps[0].state, 'BLOCKED_SCOPE');
});
