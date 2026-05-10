'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseBatchArgs,
  parseSelectArgs,
  parseSingleArgs,
  runBatchDispatch,
  runDispatch,
} = require('../../src/commands/dispatch');

function captureRun(fn) {
  const stdout = [];
  const stderr = [];
  const oldLog = console.log;
  const oldErr = console.error;
  const oldWrite = process.stdout.write;
  const oldExitCode = process.exitCode;

  console.log = (...args) => stdout.push(args.join(' '));
  console.error = (...args) => stderr.push(args.join(' '));
  process.stdout.write = (chunk) => {
    stdout.push(String(chunk));
    return true;
  };
  process.exitCode = 0;

  try {
    fn();
  } finally {
    console.log = oldLog;
    console.error = oldErr;
    process.stdout.write = oldWrite;
  }

  const exitCode = process.exitCode;
  process.exitCode = oldExitCode;
  return { stdout: stdout.join('\n'), stderr: stderr.join('\n'), exitCode };
}

describe('kbx dispatch', () => {
  it('parses single-fixture args', () => {
    const parsed = parseSingleArgs(['--fixture', 'a.yaml', '--dry-run', '--json']);
    assert.equal(parsed.fixture, 'a.yaml');
    assert.equal(parsed.dryRun, true);
    assert.equal(parsed.json, true);
  });

  it('parses batch-fixture args', () => {
    const parsed = parseBatchArgs(['--fixtures', 'fixtures-dir', '--json']);
    assert.equal(parsed.fixturesDir, 'fixtures-dir');
    assert.equal(parsed.json, true);
  });

  it('parses selector args', () => {
    const parsed = parseSelectArgs(['--fixture', 'a.yaml', '--mode', 'diagnostic', '--json']);
    assert.equal(parsed.fixture, 'a.yaml');
    assert.equal(parsed.mode, 'diagnostic');
    assert.equal(parsed.json, true);
  });

  it('passes fixture dispatch-001-read-only-explain', () => {
    const cwd = path.resolve(__dirname, '..', '..');
    const out = captureRun(() => runDispatch({
      args: [
        '--fixture',
        'template/15-governance/fixtures/dispatch-cases/dispatch-001-read-only-explain.yaml',
        '--dry-run',
        '--json',
      ],
      cwd,
    }));

    const payload = JSON.parse(out.stdout);
    assert.equal(out.exitCode, 0);
    assert.equal(payload.match, true);
    assert.equal(payload.actual_output.primary_pipe, 'PipeReadOnly');
  });

  it('is deterministic across repeated runs', () => {
    const cwd = path.resolve(__dirname, '..', '..');
    const args = [
      '--fixture',
      'template/15-governance/fixtures/dispatch-cases/dispatch-001-read-only-explain.yaml',
      '--dry-run',
      '--json',
    ];

    const first = captureRun(() => runDispatch({ args, cwd }));
    const second = captureRun(() => runDispatch({ args, cwd }));

    assert.equal(first.exitCode, 0);
    assert.equal(second.exitCode, 0);
    assert.equal(first.stdout, second.stdout);
  });

  it('returns non-zero JSON error for invalid fixture path', () => {
    const cwd = path.resolve(__dirname, '..', '..');
    const out = captureRun(() => runDispatch({
      args: ['--fixture', 'template/15-governance/fixtures/dispatch-cases/missing.yaml', '--dry-run', '--json'],
      cwd,
    }));

    const payload = JSON.parse(out.stdout);
    assert.equal(out.exitCode, 1);
    assert.equal(payload.ok, false);
    assert.match(payload.error, /Fixture file not found/);
  });

  it('returns non-zero JSON error for malformed YAML', () => {
    const cwd = path.resolve(__dirname, '..', '..');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-dispatch-malformed-'));
    const fixture = path.join(tempDir, 'bad.yaml');
    fs.writeFileSync(fixture, 'case_id: bad\ndispatch_tuple: [\n', 'utf8');

    try {
      const out = captureRun(() => runDispatch({
        args: ['--fixture', fixture, '--dry-run', '--json'],
        cwd,
      }));

      const payload = JSON.parse(out.stdout);
      assert.equal(out.exitCode, 1);
      assert.equal(payload.ok, false);
      assert.match(payload.error, /Invalid fixture YAML/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('runs batch fixture tests and reports totals', () => {
    const cwd = path.resolve(__dirname, '..', '..');
    const out = captureRun(() => runDispatch({
      args: ['test', '--fixtures', 'template/15-governance/fixtures/dispatch-cases', '--json'],
      cwd,
    }));

    const payload = JSON.parse(out.stdout);
    assert.equal(out.exitCode, 0);
    assert.equal(payload.command, 'kbx dispatch test');
    assert.equal(payload.summary.total, 30);
    assert.equal(payload.summary.fail, 0);
    assert.equal(payload.summary.pass, 30);
    assert.equal(payload.summary.skipped, 0);
  });

  it('returns non-zero for batch run when one fixture mismatches', () => {
    const cwd = path.resolve(__dirname, '..', '..');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-dispatch-batch-mismatch-'));
    const fixturePath = path.join(tempDir, 'dispatch-bad.yaml');
    fs.writeFileSync(
      fixturePath,
      [
        'case_id: dispatch-bad',
        'dispatch_tuple:',
        '  intent_type: explain',
        '  intent_state: active',
        '  ontology_entity: Rule',
        '  target_scope: docs',
        '  mutation_class: read-only',
        '  risk_level: low',
        '  evidence_state: sufficient',
        '  actor_mode: agent-assisted',
        'expected_output:',
        '  primary_pipe: PipeStandard',
        '  applicable_rules: []',
        '  required_gates: []',
        '  allowed_actions: []',
        '  verification_requirements: []',
        '  fallback_or_escalation: null',
      ].join('\n'),
      'utf8',
    );

    try {
      const out = captureRun(() => runBatchDispatch({
        args: ['--fixtures', tempDir, '--json'],
        cwd,
      }));

      const payload = JSON.parse(out.stdout);
      assert.equal(out.exitCode, 1);
      assert.equal(payload.summary.total, 1);
      assert.equal(payload.summary.fail, 1);
      assert.equal(payload.summary.pass, 0);
      assert.equal(payload.summary.skipped, 0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('runs selector mode with explainability output', () => {
    const cwd = path.resolve(__dirname, '..', '..');
    const out = captureRun(() => runDispatch({
      args: ['select', '--fixture', 'template/15-governance/fixtures/dispatch-cases/dispatch-003-standard-contract-update.yaml', '--json'],
      cwd,
    }));

    const payload = JSON.parse(out.stdout);
    assert.equal(out.exitCode, 0);
    assert.equal(payload.command, 'kbx dispatch select');
    assert.equal(payload.mode, 'execution');
    assert.ok(payload.applicable_rules.includes('KBX-I001'));
    assert.ok(payload.applicable_rules.includes('KBX-GB001'));
    assert.ok(Array.isArray(payload.explainability.tuple_to_rule_basis));
  });

  it('returns non-zero JSON error for selector invalid mode', () => {
    const cwd = path.resolve(__dirname, '..', '..');
    const out = captureRun(() => runDispatch({
      args: ['select', '--fixture', 'template/15-governance/fixtures/dispatch-cases/dispatch-001-read-only-explain.yaml', '--mode', 'invalid', '--json'],
      cwd,
    }));

    const payload = JSON.parse(out.stdout);
    assert.equal(out.exitCode, 1);
    assert.equal(payload.ok, false);
    assert.match(payload.error, /invalid mode/i);
  });
});
