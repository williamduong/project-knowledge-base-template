'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { runDispatch } = require('../../src/commands/dispatch');

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
});
