'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseInspectArgs,
  classifyTargetScope,
  inspectTarget,
  runInspect,
} = require('../../src/commands/inspect');

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-inspect-'));
  fs.mkdirSync(path.join(root, 'knowledge-base', '05-backend'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'commands'), { recursive: true });
  fs.mkdirSync(path.join(root, 'template', '15-governance'), { recursive: true });
  fs.writeFileSync(path.join(root, 'knowledge-base', '05-backend', 'auth.md'), '# auth\n', 'utf8');
  fs.writeFileSync(path.join(root, 'src', 'commands', 'cli.js'), 'module.exports = {};\n', 'utf8');
  fs.writeFileSync(path.join(root, 'template', '15-governance', 'rule-catalog-contract.md'), '# contract\n', 'utf8');
  return root;
}

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

test('inspect parseInspectArgs parses required options', () => {
  const parsed = parseInspectArgs(['--path', 'knowledge-base/05-backend/auth.md', '--json']);
  assert.equal(parsed.targetPath, 'knowledge-base/05-backend/auth.md');
  assert.equal(parsed.json, true);
});

test('inspect parseInspectArgs rejects unknown option', () => {
  assert.throws(() => parseInspectArgs(['--bogus']), /Unknown inspect option/);
});

test('inspect classifyTargetScope identifies source scope', () => {
  const classified = classifyTargetScope('src/commands/cli.js', 'file');
  assert.equal(classified.targetScope, 'source');
});

test('inspectTarget classifies docs path and suggests PipeDocsFast', () => {
  const root = makeWorkspace();

  const payload = inspectTarget({
    cwd: root,
    targetPath: 'knowledge-base/05-backend/auth.md',
  });

  assert.equal(payload.classification.target_scope, 'docs');
  assert.equal(payload.classification.mutation_class, 'docs-only');
  assert.equal(payload.suggestion.primary_pipe, 'PipeDocsFast');
  assert.equal(payload.suggestion.fallback_or_escalation, null);
});

test('inspectTarget classifies source path and escalates human gate', () => {
  const root = makeWorkspace();

  const payload = inspectTarget({
    cwd: root,
    targetPath: 'src/commands/cli.js',
  });

  assert.equal(payload.classification.target_scope, 'source');
  assert.equal(payload.classification.mutation_class, 'source-changing');
  assert.equal(payload.suggestion.primary_pipe, null);
  assert.equal(payload.suggestion.fallback_or_escalation, 'HumanGateRequired');
});

test('runInspect --json prints payload and returns non-zero on escalation', () => {
  const root = makeWorkspace();
  const out = captureRun(() => runInspect({
    args: ['--path', 'src/commands/cli.js', '--json'],
    cwd: root,
  }));

  const payload = JSON.parse(out.stdout);
  assert.equal(payload.command, 'kbx inspect');
  assert.equal(payload.classification.target_scope, 'source');
  assert.equal(out.exitCode, 1);
});

test('runInspect prints machine-readable error on missing path', () => {
  const root = makeWorkspace();
  const out = captureRun(() => runInspect({
    args: ['--path', 'missing.md', '--json'],
    cwd: root,
  }));

  const payload = JSON.parse(out.stdout);
  assert.equal(payload.command, 'kbx inspect');
  assert.equal(payload.ok, false);
  assert.match(payload.error, /Inspect target not found/);
  assert.equal(out.exitCode, 1);
});
