const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseApplyArgs, buildGateDecision, runApply } = require('../../src/commands/apply');

function captureRun(fn) {
  const stdout = [];
  const oldLog = console.log;
  const oldExitCode = process.exitCode;

  console.log = (...args) => stdout.push(args.join(' '));
  process.exitCode = 0;

  try {
    fn();
  } finally {
    console.log = oldLog;
  }

  const exitCode = process.exitCode;
  process.exitCode = oldExitCode;
  return { stdout: stdout.join('\n'), exitCode };
}

function makeTrackedWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-apply-'));
  const stateDir = path.join(root, 'knowledge-base', '.kb');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'state.json'), JSON.stringify({ schemaVersion: 2 }, null, 2), 'utf8');
  return root;
}

test('apply parseApplyArgs parses dry-run mode', () => {
  const parsed = parseApplyArgs(['--request', 'update docs', '--dry-run', '--json']);
  assert.equal(parsed.request, 'update docs');
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.execute, false);
  assert.equal(parsed.json, true);
});

test('apply parseApplyArgs requires explicit mode', () => {
  assert.throws(() => parseApplyArgs(['--request', 'update docs']), /requires one mode flag/);
});

test('apply gate blocks when human gate required', () => {
  const gate = buildGateDecision({
    classification: { mutation_class: 'source-changing' },
    suggestion: { fallback_or_escalation: 'HumanGateRequired' },
  });
  assert.equal(gate.decision, 'blocked');
  assert.equal(gate.requires_human_gate, true);
});

test('runApply dry-run blocks risky request with non-zero exit code', () => {
  const root = makeTrackedWorkspace();
  const out = captureRun(() => {
    runApply({
      args: ['--request', 'implement new runtime command in src', '--dry-run', '--json'],
      cwd: root,
    });
  });

  const payload = JSON.parse(out.stdout);
  assert.equal(payload.command, 'kbx apply');
  assert.equal(payload.mode, 'dry-run');
  assert.equal(payload.gate.decision, 'blocked');
  assert.equal(out.exitCode, 1);
});

test('runApply execute writes receipt for safe docs request', () => {
  const root = makeTrackedWorkspace();
  const out = captureRun(() => {
    runApply({
      args: ['--request', 'update docs index links', '--execute', '--yes', '--json'],
      cwd: root,
    });
  });

  const payload = JSON.parse(out.stdout);
  assert.equal(payload.command, 'kbx apply');
  assert.equal(payload.mode, 'execute');
  assert.equal(payload.gate.decision, 'allow');
  assert.equal(payload.ok, true);
  assert.ok(fs.existsSync(payload.write_result.receipt_path));
  assert.ok(fs.existsSync(payload.write_result.ledger_path));
  assert.equal(out.exitCode, 0);
});
