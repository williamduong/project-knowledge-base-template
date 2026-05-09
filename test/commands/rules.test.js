'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { runRules } = require('../../src/commands/rules');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpKb(files = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-rules-cmd-test-'));
  for (const [relPath, content] of Object.entries(files)) {
    const abs = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
  return tmpDir;
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

function captureOutput(fn) {
  const stdout = [];
  const stderr = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a) => stdout.push(a.join(' '));
  console.error = (...a) => stderr.push(a.join(' '));
  const origExit = process.exitCode;
  process.exitCode = 0;
  let err = null;
  try {
    const result = fn();
    if (result && typeof result.then === 'function') return result.then(() => {
      console.log = origLog;
      console.error = origErr;
      const exitCode = process.exitCode;
      process.exitCode = origExit;
      return { stdout: stdout.join('\n'), stderr: stderr.join('\n'), exitCode };
    });
  } catch (e) {
    err = e;
  } finally {
    if (!err) {
      console.log = origLog;
      console.error = origErr;
    }
  }
  console.log = origLog;
  console.error = origErr;
  const exitCode = process.exitCode;
  process.exitCode = origExit;
  if (err) throw err;
  return { stdout: stdout.join('\n'), stderr: stderr.join('\n'), exitCode };
}

async function captureAsync(fn) {
  const stdout = [];
  const stderr = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a) => stdout.push(a.join(' '));
  console.error = (...a) => stderr.push(a.join(' '));
  const origExit = process.exitCode;
  process.exitCode = 0;
  try {
    await fn();
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
  const exitCode = process.exitCode;
  process.exitCode = origExit;
  return { stdout: stdout.join('\n'), stderr: stderr.join('\n'), exitCode };
}

// ─── kbx rules list ──────────────────────────────────────────────────────────

describe('kbx rules list', () => {
  it('outputs registered rules count and metadata', async () => {
    const { stdout, exitCode } = await captureAsync(() => runRules({ args: ['list'] }));
    assert.ok(stdout.includes('Registered rules'), `Expected rule count line, got: ${stdout}`);
    assert.ok(stdout.includes('KBX-M001'), `Expected KBX-M001 in output, got: ${stdout}`);
    assert.equal(exitCode, 0);
  });

  it('--json outputs valid JSON with rules array', async () => {
    const { stdout, exitCode } = await captureAsync(() => runRules({ args: ['list', '--json'] }));
    const data = JSON.parse(stdout);
    assert.ok(data.rules);
    assert.ok(Array.isArray(data.rules));
    assert.ok(data.rules.length >= 4);
    assert.equal(exitCode, 0);
  });

  it('each rule in --json has id, severity, description', async () => {
    const { stdout } = await captureAsync(() => runRules({ args: ['list', '--json'] }));
    const data = JSON.parse(stdout);
    for (const r of data.rules) {
      assert.ok(r.id, `Missing id in rule: ${JSON.stringify(r)}`);
      assert.ok(r.severity, `Missing severity: ${r.id}`);
      assert.ok(r.description, `Missing description: ${r.id}`);
    }
  });
});

// ─── kbx rules lint ──────────────────────────────────────────────────────────

describe('kbx rules lint', () => {
  let emptyDir;
  before(() => { emptyDir = makeTmpKb({}); });
  after(() => cleanup(emptyDir));

  it('exits 0 on clean KB (no governed docs)', async () => {
    const { exitCode } = await captureAsync(() => runRules({ args: ['lint'], cwd: emptyDir }));
    assert.equal(exitCode, 0);
  });

  it('stdout includes "Rules run" summary', async () => {
    const { stdout } = await captureAsync(() => runRules({ args: ['lint'], cwd: emptyDir }));
    assert.ok(stdout.includes('Rules run'), `Expected summary line, got: ${stdout}`);
  });

  it('exits 1 when error violations found', async () => {
    const dir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', '---', '# T',
      ].join('\n'),
    });
    const { exitCode } = await captureAsync(() => runRules({ args: ['lint'], cwd: dir }));
    cleanup(dir);
    assert.equal(exitCode, 1, 'Should exit 1 when error violations exist');
  });

  it('--json outputs valid JSON shape', async () => {
    const { stdout } = await captureAsync(() => runRules({ args: ['lint', '--json'], cwd: emptyDir }));
    const data = JSON.parse(stdout);
    assert.ok('violations' in data);
    assert.ok('rulesRun' in data);
    assert.ok('violationCount' in data);
    assert.ok(Array.isArray(data.violations));
  });

  it('unknown option exits 1 and shows error', async () => {
    const { exitCode, stderr } = await captureAsync(() => runRules({ args: ['lint', '--unknown-flag'], cwd: emptyDir }));
    assert.equal(exitCode, 1);
    assert.ok(stderr.includes('Unknown option'), `Expected error about unknown option, got: ${stderr}`);
  });
});

// ─── kbx rules check ─────────────────────────────────────────────────────────

describe('kbx rules check', () => {
  let emptyDir;
  before(() => { emptyDir = makeTmpKb({}); });
  after(() => cleanup(emptyDir));

  it('exits 0 when rule passes', async () => {
    const { exitCode, stdout } = await captureAsync(() =>
      runRules({ args: ['check', 'KBX-M001'], cwd: emptyDir })
    );
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes('[PASS]'), `Expected PASS, got: ${stdout}`);
  });

  it('exits 1 when rule not found', async () => {
    const { exitCode } = await captureAsync(() =>
      runRules({ args: ['check', 'NOT-REAL-RULE'], cwd: emptyDir })
    );
    assert.equal(exitCode, 1);
  });

  it('exits 1 without rule id argument', async () => {
    const { exitCode } = await captureAsync(() =>
      runRules({ args: ['check'], cwd: emptyDir })
    );
    assert.equal(exitCode, 1);
  });

  it('exits 1 when rule fails with violations', async () => {
    const dir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'type: doc', '---', '# Doc',
      ].join('\n'),
    });
    const { exitCode, stdout } = await captureAsync(() =>
      runRules({ args: ['check', 'KBX-M001'], cwd: dir })
    );
    cleanup(dir);
    assert.equal(exitCode, 1);
    assert.ok(stdout.includes('[FAIL]'), `Expected FAIL, got: ${stdout}`);
  });

  it('--json found:false for unknown rule', async () => {
    const { stdout } = await captureAsync(() =>
      runRules({ args: ['check', 'NO-RULE', '--json'], cwd: emptyDir })
    );
    const data = JSON.parse(stdout);
    assert.equal(data.found, false);
  });

  it('--json found:true with passed:true for known passing rule', async () => {
    const { stdout } = await captureAsync(() =>
      runRules({ args: ['check', 'KBX-M001', '--json'], cwd: emptyDir })
    );
    const data = JSON.parse(stdout);
    assert.equal(data.found, true);
    assert.equal(data.passed, true);
  });
});

// ─── kbx rules help ──────────────────────────────────────────────────────────

describe('kbx rules help', () => {
  it('outputs usage lines', async () => {
    const { stdout } = await captureAsync(() => runRules({ args: ['help'] }));
    assert.ok(stdout.includes('kbx rules lint'), `Expected usage line, got: ${stdout}`);
    assert.ok(stdout.includes('kbx rules check'), `Expected check line, got: ${stdout}`);
    assert.ok(stdout.includes('kbx rules list'), `Expected list line, got: ${stdout}`);
  });

  it('unknown subcommand exits 1 with error', async () => {
    const { exitCode, stderr } = await captureAsync(() => runRules({ args: ['nonexistent'] }));
    assert.equal(exitCode, 1);
    assert.ok(stderr.includes('Unknown rules subcommand'), `Expected error message, got: ${stderr}`);
  });
});
