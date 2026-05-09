'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseArgs,
  inspectIntentMigration,
  collectIntentMigrations,
  runMigrate,
} = require('../../src/commands/migrate');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-migrate-'));
}

function initTrackedWorkspace(root) {
  const svFactoryRoot = path.join(root, 'knowledge-base');
  fs.mkdirSync(path.join(svFactoryRoot, '.kb'), { recursive: true });
  fs.writeFileSync(path.join(svFactoryRoot, '.kb', 'state.json'), '{}\n', 'utf8');
  return svFactoryRoot;
}

function writeLegacyIntent(filePath, frontmatterLines) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `---\n${frontmatterLines.join('\n')}\n---\n\n# Legacy Intent\n`, 'utf8');
}

async function captureConsole(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    await fn();
  } finally {
    console.log = originalLog;
  }
  return logs.join('\n');
}

test('migrate parseArgs: requires target version', () => {
  assert.throws(() => parseArgs(['--dry-run']), /requires --to/);
});

test('migrate parseArgs: accepts dry-run target', () => {
  const options = parseArgs(['--to=2.4.0', '--dry-run', '--json']);
  assert.equal(options.targetVersion, 'v2.4.0');
  assert.equal(options.dryRun, true);
  assert.equal(options.json, true);
});

test('inspectIntentMigration: maps superseded legacy state to dropped close type', () => {
  const result = inspectIntentMigration({
    id: 'legacy-superseded',
    scope: 'closed',
    workspacePath: '/tmp/legacy-superseded',
    meta: {
      id: 'legacy-superseded',
      status: 'closed',
      lifecycle_state: 'superseded',
    },
  }, 'v2.4.0');

  assert.equal(result.canonical_lifecycle, 'closed');
  assert.equal(result.write_mode, 'full');
  assert.ok(result.proposed_updates.some((entry) => entry.field === 'legacy_status' && entry.to === 'closed'));
  assert.ok(result.proposed_updates.some((entry) => entry.field === 'status' && entry.to === '__DELETE__'));
  assert.ok(result.proposed_updates.some((entry) => entry.field === 'legacy_lifecycle_state' && entry.to === 'superseded'));
  assert.ok(result.proposed_updates.some((entry) => entry.field === 'lifecycle_state' && entry.to === '__DELETE__'));
  assert.ok(result.proposed_updates.some((entry) => entry.field === 'close_type' && entry.to === 'dropped'));
  assert.ok(result.proposed_updates.some((entry) => entry.field === 'drop_reason' && /superseded by unknown/.test(entry.to)));
});

test('collectIntentMigrations: reports active, closed, and archived legacy fixtures', () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);

  writeLegacyIntent(path.join(contentRoot, 'intents', '_active', 'legacy-active', 'intent.md'), [
    'id: legacy-active',
    'mode: quick',
    'status: open',
    'change_type: docs',
  ]);

  writeLegacyIntent(path.join(contentRoot, 'intents', '_closed', 'released', 'legacy-superseded', 'intent.md'), [
    'id: legacy-superseded',
    'mode: quick',
    'status: closed',
    'lifecycle_state: superseded',
    'change_type: docs',
  ]);

  writeLegacyIntent(path.join(contentRoot, 'intents', '_archive', 'legacy-archived-20260506120000', 'intent.md'), [
    'id: legacy-archived',
    'mode: quick',
    'status: closed',
    'change_type: docs',
  ]);

  const result = collectIntentMigrations(contentRoot, 'v2.4.0');
  assert.equal(result.count, 3);
  assert.equal(result.legacy_count, 3);
  assert.equal(result.marker_only_count, 1);
  assert.equal(result.full_write_count, 2);

  const archived = result.intents.find((item) => item.id === 'legacy-archived');
  assert.equal(archived.canonical_lifecycle, 'archived');
  assert.equal(archived.write_mode, 'marker-only');
  assert.ok(archived.proposed_updates.some((entry) => entry.field === 'legacy_status'));
});

test('runMigrate: write-path updates active/closed but not archived', async () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);

  const activeMetaPath = path.join(contentRoot, 'intents', '_active', 'legacy-active', 'intent.md');
  writeLegacyIntent(activeMetaPath, [
    'id: legacy-active',
    'mode: quick',
    'status: open',
    'change_type: docs',
  ]);

  const archiveMetaPath = path.join(contentRoot, 'intents', '_archive', 'legacy-archived-20260506120000', 'intent.md');
  writeLegacyIntent(archiveMetaPath, [
    'id: legacy-archived',
    'mode: quick',
    'status: closed',
    'change_type: docs',
  ]);

  const archiveBefore = fs.readFileSync(archiveMetaPath, 'utf8');
  const output = await captureConsole(() => runMigrate({ args: ['--to=v2.4.0', '--json'], cwd: root }));
  const archiveAfter = fs.readFileSync(archiveMetaPath, 'utf8');

  const parsed = JSON.parse(output);
  assert.equal(parsed.dry_run, false);
  assert.equal(parsed.written_count, 1);
  assert.ok(parsed.written.includes('legacy-active'));

  // Archive file must NOT be modified
  assert.equal(archiveAfter, archiveBefore);

  // Active file must have schema_version written and legacy status field removed
  const activeAfter = fs.readFileSync(activeMetaPath, 'utf8');
  assert.ok(activeAfter.includes('schema_version: v2.4.0'));
  assert.ok(activeAfter.includes('legacy_status: open'));
  assert.ok(!activeAfter.includes('\nstatus: '), 'original status field should be removed');
});

test('runMigrate: dry-run JSON preview stays read-only', async () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);
  const metaPath = path.join(contentRoot, 'intents', '_active', 'legacy-active', 'intent.md');

  writeLegacyIntent(metaPath, [
    'id: legacy-active',
    'mode: quick',
    'status: open',
    'change_type: docs',
  ]);

  const before = fs.readFileSync(metaPath, 'utf8');
  const output = await captureConsole(() => runMigrate({ args: ['--to=v2.4.0', '--dry-run', '--json'], cwd: root }));
  const after = fs.readFileSync(metaPath, 'utf8');

  const parsed = JSON.parse(output);
  assert.equal(parsed.command, 'kb migrate');
  assert.equal(parsed.dry_run, true);
  assert.equal(parsed.target_version, 'v2.4.0');
  assert.equal(parsed.legacy_count, 1);
  assert.equal(after, before);
});
