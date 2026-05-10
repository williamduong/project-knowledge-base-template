const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseArgs, buildPreviewPlan, runPlan } = require('../../src/commands/plan');

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

test('plan parseArgs: parses preview flags', () => {
  const parsed = parseArgs(['--request', 'implement inspect command', '--dry-run', '--json']);
  assert.equal(parsed.subcommand, 'preview');
  assert.equal(parsed.request, 'implement inspect command');
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.json, true);
});

test('plan parseArgs: preview requires dry-run', () => {
  assert.throws(
    () => parseArgs(['--request', 'implement inspect command']),
    /supports dry-run only/
  );
});

test('plan buildPreviewPlan: classifies source-changing from implementation request', () => {
  const preview = buildPreviewPlan('implement runtime command and fix bug in src');
  assert.equal(preview.classification.intent_type, 'update');
  assert.equal(preview.classification.target_scope, 'source');
  assert.equal(preview.classification.mutation_class, 'source-changing');
  assert.equal(preview.suggestion.fallback_or_escalation, 'HumanGateRequired');
  assert.equal(preview.proposed_patch_plan.write_operations.length, 0);
});

test('runPlan preview: outputs json and does not require KB state files', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-plan-preview-'));
  const out = captureRun(() => {
    runPlan({
      args: ['--request', 'update docs for dispatch flow', '--dry-run', '--json'],
      cwd: root,
    });
  });

  const payload = JSON.parse(out.stdout);
  assert.equal(payload.command, 'kbx plan');
  assert.equal(payload.mode, 'preview');
  assert.equal(payload.dry_run, true);
  assert.equal(payload.write_intent, false);
  assert.ok(Array.isArray(payload.proposed_patch_plan.target_paths));
});

test('runPlan preview: does not mutate strategic backlog file', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-plan-preview-no-write-'));
  const kbRoot = path.join(root, 'knowledge-base', '00-start-here');
  fs.mkdirSync(kbRoot, { recursive: true });
  const planPath = path.join(kbRoot, 'strategic-backlog.md');
  const original = [
    '| ID | Item | Owner | Priority | Due | Status | Notes |',
    '|---|---|---|---|---|---|---|',
    '| KB-100 | Existing item | owner | P1 | 2026-05-01 | todo | |',
  ].join('\n');
  fs.writeFileSync(planPath, original, 'utf8');

  captureRun(() => {
    runPlan({
      args: ['--request', 'update docs for dispatch flow', '--dry-run', '--json'],
      cwd: root,
    });
  });

  const after = fs.readFileSync(planPath, 'utf8');
  assert.equal(after, original);
});
