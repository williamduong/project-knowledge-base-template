'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseArgs,
  runIntent,
  runApply,
  parseIntentVersionFromId,
  compareVersionTuple,
  enforceIntentVersionProgression,
} = require('../../src/commands/intent');
const {
  sanitizeId,
  suggestIntentId,
  buildIntentMeta,
  buildBacklogIntentMeta,
  buildPlanStub,
  buildImpactStub,
  parseIntentFrontmatter,
  serializeIntentFrontmatter,
  createBacklogIntent,
  activateBacklogIntent,
  createIntentWorkspace,
  readIntentMeta,
  listBacklogIntentIds,
  listActiveIntentIds,
  listStagedFiles,
  validateStagedFilePaths,
  cancelIntent,
  updateIntentFocus,
  closeIntent,
  archiveIntent,
  archiveFolderName,
  intentWorkspacePath,
  backlogIntentPath,
  closedIntentWorkspacePath,
  proposedChangesPath,
  VALID_MODES,
  // Phase 2
  buildApplyRecord,
  applyStagedFiles,
  writeApplyRecord,
  deriveIntentsApplied,
  getActiveIntentsSummary,
} = require('../../src/lib/intent');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-intent-'));
}

function initTrackedWorkspace(root) {
  const svFactoryRoot = path.join(root, 'knowledge-base');
  fs.mkdirSync(path.join(svFactoryRoot, '.kb'), { recursive: true });
  fs.writeFileSync(path.join(svFactoryRoot, '.kb', 'state.json'), '{}\n', 'utf8');
  return svFactoryRoot;
}

async function captureConsole(fn) {
  const logs = [];
  const warns = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args) => logs.push(args.join(' '));
  console.warn = (...args) => warns.push(args.join(' '));
  try {
    await fn();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
  return {
    stdout: logs.join('\n'),
    stderr: warns.join('\n'),
  };
}

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

test('intent parseArgs: create defaults', () => {
  const o = parseArgs(['create']);
  assert.equal(o.sub, 'create');
  assert.equal(o.mode, 'quick');
  assert.equal(o.changeType, 'docs');
  assert.equal(o.yes, false);
  assert.equal(o.json, false);
  assert.equal(o.intentId, null);
});

test('intent parseArgs: create with id and full mode', () => {
  const o = parseArgs(['create', 'my-intent', '--mode=full', '--change-type=feature']);
  assert.equal(o.sub, 'create');
  assert.equal(o.intentId, 'my-intent');
  assert.equal(o.mode, 'full');
  assert.equal(o.changeType, 'feature');
});

test('intent parseArgs: create with --yes --json', () => {
  const o = parseArgs(['create', '--yes', '--json']);
  assert.equal(o.yes, true);
  assert.equal(o.json, true);
});

test('intent parseArgs: create with invalid mode throws', () => {
  assert.throws(() => parseArgs(['create', '--mode=badmode']), /invalid mode/);
});

test('intent parseArgs: status with id', () => {
  const o = parseArgs(['status', 'fix-something']);
  assert.equal(o.sub, 'status');
  assert.equal(o.intentId, 'fix-something');
});

test('intent parseArgs: status without id', () => {
  const o = parseArgs(['status']);
  assert.equal(o.sub, 'status');
  assert.equal(o.intentId, null);
});

test('intent parseArgs: draft with slug', () => {
  const o = parseArgs(['draft', 'intent-governance']);
  assert.equal(o.sub, 'draft');
  assert.equal(o.intentId, 'intent-governance');
});

test('intent parseArgs: activate requires slug and wave', () => {
  const o = parseArgs(['activate', 'intent-governance', '--wave=v2.4', '--mode=full']);
  assert.equal(o.sub, 'activate');
  assert.equal(o.wave, 'v2.4');
  assert.equal(o.mode, 'full');
  assert.throws(() => parseArgs(['activate', 'intent-governance']), /requires --wave/);
});

test('intent parseArgs: list', () => {
  const o = parseArgs(['list']);
  assert.equal(o.sub, 'list');
});

test('intent parseArgs: list scope flags', () => {
  assert.equal(parseArgs(['list', '--closed']).listScope, 'closed');
  assert.equal(parseArgs(['list', '--backlog']).listScope, 'backlog');
  assert.equal(parseArgs(['list', '--archived']).listScope, 'archived');
  assert.equal(parseArgs(['list', '--all']).listScope, 'all');
  assert.throws(() => parseArgs(['list', '--closed', '--archived']), /accepts only one scope flag/);
  assert.throws(() => parseArgs(['status', '--closed']), /List scope flags are only valid/);
});

test('intent parseArgs: cancel with id', () => {
  const o = parseArgs(['cancel', 'old-intent']);
  assert.equal(o.sub, 'cancel');
  assert.equal(o.intentId, 'old-intent');
});

test('intent parseArgs: cancel without id throws', () => {
  assert.throws(() => parseArgs(['cancel']), /requires an intent ID/);
});

test('intent parseArgs: focus requires id and a field', () => {
  const o = parseArgs(['focus', 'my-intent', '--current=Investigating']);
  assert.equal(o.sub, 'focus');
  assert.equal(o.current, 'Investigating');
  assert.throws(() => parseArgs(['focus', 'my-intent']), /requires --current or --next/);
});

test('intent parseArgs: archive with id', () => {
  const o = parseArgs(['archive', 'my-intent']);
  assert.equal(o.sub, 'archive');
  assert.equal(o.intentId, 'my-intent');
});

test('intent parseArgs: close validates release and drop modes', () => {
  const released = parseArgs(['close', 'my-intent', '--type=released', '--release=v2.4.0']);
  assert.equal(released.closeType, 'released');
  assert.equal(released.release, 'v2.4.0');

  const dropped = parseArgs(['close', 'my-intent', '--type=dropped', '--reason=No longer needed']);
  assert.equal(dropped.closeType, 'dropped');
  assert.equal(dropped.reason, 'No longer needed');

  assert.throws(() => parseArgs(['close', 'my-intent', '--type=released']), /requires --release/);
  assert.throws(() => parseArgs(['close', 'my-intent', '--type=dropped']), /requires --reason/);
});

test('intent parseArgs: unknown subcommand throws', () => {
  assert.throws(() => parseArgs(['frobnicate']), /unknown subcommand/);
});

test('intent parseArgs: no args throws', () => {
  assert.throws(() => parseArgs([]), /requires a subcommand/);
});

test('intent parseArgs: unknown option throws', () => {
  assert.throws(() => parseArgs(['create', '--nonexistent']), /Unknown intent option/);
});

// ---------------------------------------------------------------------------
// version progression guard helpers
// ---------------------------------------------------------------------------

test('parseIntentVersionFromId: parses numeric prefix from versioned IDs', () => {
  assert.deepEqual(parseIntentVersionFromId('v2-3-5-stabilization'), [2, 3, 5]);
  assert.deepEqual(parseIntentVersionFromId('v2-3-3-2-agent-intent-start-hardening'), [2, 3, 3, 2]);
  assert.equal(parseIntentVersionFromId('feature-add-intent'), null);
});

test('compareVersionTuple: compares variable-length tuples', () => {
  assert.equal(compareVersionTuple([2, 3, 5], [2, 3, 4, 9]), 1);
  assert.equal(compareVersionTuple([2, 3, 4], [2, 3, 4]), 0);
  assert.equal(compareVersionTuple([2, 3, 4], [2, 4]), -1);
});

test('enforceIntentVersionProgression: rejects non-increasing version IDs', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');

  // Existing highest version is v2-3-6-* from active intents.
  createIntentWorkspace(contentRoot, { intentId: 'v2-3-6-planned-backlog', mode: 'quick', changeType: 'governance' });

  const rejected = enforceIntentVersionProgression(contentRoot, 'v2-3-5-fix-intent-list');
  assert.equal(rejected.ok, false);
  assert.equal(rejected.highest.id, 'v2-3-6-planned-backlog');

  const accepted = enforceIntentVersionProgression(contentRoot, 'v2-3-7-next-step');
  assert.equal(accepted.ok, true);
});

// ---------------------------------------------------------------------------
// sanitizeId
// ---------------------------------------------------------------------------

test('sanitizeId: converts to kebab-case', () => {
  assert.equal(sanitizeId('Feature/Add Intent'), 'feature-add-intent');
});

test('sanitizeId: strips leading/trailing hyphens', () => {
  assert.equal(sanitizeId('--foo--'), 'foo');
});

test('sanitizeId: collapses consecutive separators', () => {
  assert.equal(sanitizeId('fix___thing---now'), 'fix-thing-now');
});

test('sanitizeId: returns null for empty/null input', () => {
  assert.equal(sanitizeId(''), null);
  assert.equal(sanitizeId(null), null);
});

test('sanitizeId: truncates at 60 chars', () => {
  const long = 'a'.repeat(80);
  assert.ok(sanitizeId(long).length <= 60);
});

// ---------------------------------------------------------------------------
// suggestIntentId
// ---------------------------------------------------------------------------

test('suggestIntentId: uses sanitized branch name', () => {
  const id = suggestIntentId('feature/add-intent');
  assert.equal(id, 'feature-add-intent');
});

test('suggestIntentId: falls back to timestamp when branch null', () => {
  const id = suggestIntentId(null);
  assert.ok(id.startsWith('intent-'), `expected intent- prefix, got: ${id}`);
  assert.ok(id.length >= 16);
});

test('suggestIntentId: falls back to timestamp when branch too short', () => {
  const id = suggestIntentId('ab');
  assert.ok(id.startsWith('intent-'));
});

// ---------------------------------------------------------------------------
// buildIntentMeta / parseIntentFrontmatter
// ---------------------------------------------------------------------------

test('buildIntentMeta: quick mode has no reserve fields', () => {
  const text = buildIntentMeta({ intentId: 'test-id', mode: 'quick', changeType: 'docs' });
  const fm = parseIntentFrontmatter(text);
  assert.equal(fm.id, 'test-id');
  assert.equal(fm.mode, 'quick');
  assert.equal(fm.status, undefined);
  assert.equal(fm.lifecycle, 'active');
  assert.equal(fm.change_type, 'docs');
  // reserve fields should NOT be present in quick mode frontmatter
  assert.equal(fm.lesson_id, undefined);
});

test('buildIntentMeta: full mode includes all reserve fields', () => {
  const text = buildIntentMeta({ intentId: 'full-id', mode: 'full', changeType: 'feature' });
  const fm = parseIntentFrontmatter(text);
  assert.equal(fm.mode, 'full');
  assert.equal(fm.lesson_id, null);
  // lifecycle_state removed from new intents post-v2.4 (D27 cleanup)
  assert.equal(fm.lifecycle_state, undefined);
  assert.equal(fm.promotion_ready, false);
});

test('buildBacklogIntentMeta: contains backlog lifecycle and nested blocks', () => {
  const text = buildBacklogIntentMeta({ slug: 'intent-governance', title: 'Intent Governance', description: 'Upgrade flow', wave: 'v2.4' });
  const fm = parseIntentFrontmatter(text);
  assert.equal(fm.slug, 'intent-governance');
  assert.equal(fm.lifecycle, 'backlog');
  assert.equal(fm.focus.current, '');
  assert.equal(fm.architecture_position.wave, 'v2.4');
});

test('serializeIntentFrontmatter: writes nested objects', () => {
  const text = serializeIntentFrontmatter({
    lifecycle: 'active',
    focus: { current: 'Investigate', next_action: 'Patch', last_updated: '2026-05-06' },
  });
  assert.ok(text.includes('focus:'));
  assert.ok(text.includes('  current: Investigate'));
  const parsed = parseIntentFrontmatter(text);
  assert.equal(parsed.focus.next_action, 'Patch');
});

test('buildIntentMeta: contains decision_summary empty string', () => {
  const text = buildIntentMeta({ intentId: 'test-id', mode: 'quick', changeType: 'fix' });
  const fm = parseIntentFrontmatter(text);
  assert.equal(fm.decision_summary, '');
});

test('buildPlanStub: contains required headings', () => {
  const text = buildPlanStub('test-intent');
  assert.ok(text.includes('## Goal'));
  assert.ok(text.includes('## Files Touched'));
  assert.ok(text.includes('## Acceptance Criteria'));
});

test('buildImpactStub: contains required headings', () => {
  const text = buildImpactStub('test-intent');
  assert.ok(text.includes('## Affected Areas'));
  assert.ok(text.includes('## Breaking Change'));
  assert.ok(text.includes('## Impact Signals'));
});

// ---------------------------------------------------------------------------
// VALID_MODES
// ---------------------------------------------------------------------------

test('VALID_MODES contains quick and full', () => {
  assert.ok(VALID_MODES.has('quick'));
  assert.ok(VALID_MODES.has('full'));
  assert.ok(!VALID_MODES.has('draft'));
});

// ---------------------------------------------------------------------------
// createIntentWorkspace
// ---------------------------------------------------------------------------

test('createIntentWorkspace: quick mode creates required files', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');

  const wsPath = createIntentWorkspace(contentRoot, { intentId: 'test-quick', mode: 'quick', changeType: 'docs' });

  assert.ok(fs.existsSync(wsPath));
  assert.ok(fs.existsSync(path.join(wsPath, 'intent.md')));
  assert.ok(fs.existsSync(path.join(wsPath, 'proposed-changes')));
  // plan.md and impact.md should NOT exist for quick mode
  assert.ok(!fs.existsSync(path.join(wsPath, 'plan.md')));
  assert.ok(!fs.existsSync(path.join(wsPath, 'impact.md')));
});

test('createIntentWorkspace: full mode creates plan.md and impact.md', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');

  const wsPath = createIntentWorkspace(contentRoot, { intentId: 'test-full', mode: 'full', changeType: 'feature' });

  assert.ok(fs.existsSync(path.join(wsPath, 'plan.md')));
  assert.ok(fs.existsSync(path.join(wsPath, 'impact.md')));
  assert.ok(fs.existsSync(path.join(wsPath, 'intent.md')));
  assert.ok(fs.existsSync(path.join(wsPath, 'proposed-changes')));
});

test('createIntentWorkspace: throws if workspace already exists', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');

  createIntentWorkspace(contentRoot, { intentId: 'duplicate', mode: 'quick', changeType: 'docs' });
  assert.throws(
    () => createIntentWorkspace(contentRoot, { intentId: 'duplicate', mode: 'quick', changeType: 'docs' }),
    /already exists/
  );
});

test('createBacklogIntent: creates markdown backlog file', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  const filePath = createBacklogIntent(contentRoot, { slug: 'intent-governance', title: 'Intent Governance', description: 'Upgrade intent flow', wave: 'v2.4' });

  assert.ok(fs.existsSync(filePath));
  const meta = parseIntentFrontmatter(fs.readFileSync(filePath, 'utf8'));
  assert.equal(meta.lifecycle, 'backlog');
  assert.equal(meta.architecture_position.wave, 'v2.4');
});

test('activateBacklogIntent: promotes backlog file into active workspace', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createBacklogIntent(contentRoot, { slug: 'intent-governance', title: 'Intent Governance', description: 'Upgrade flow', wave: 'v2.4' });

  const wsPath = activateBacklogIntent(contentRoot, {
    slug: 'intent-governance',
    intentId: 'v2-4-intent-governance',
    mode: 'full',
    changeType: 'governance',
    wave: 'v2.4',
  });

  assert.ok(fs.existsSync(wsPath));
  assert.ok(!fs.existsSync(backlogIntentPath(contentRoot, 'intent-governance')));
  const meta = readIntentMeta(contentRoot, 'v2-4-intent-governance');
  assert.equal(meta.lifecycle, 'active');
  assert.equal(meta.slug, 'intent-governance');
  assert.equal(meta.architecture_position.wave, 'v2.4');
});

// ---------------------------------------------------------------------------
// readIntentMeta
// ---------------------------------------------------------------------------

test('readIntentMeta: returns parsed frontmatter', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'my-intent', mode: 'quick', changeType: 'docs' });

  const meta = readIntentMeta(contentRoot, 'my-intent');
  assert.equal(meta.id, 'my-intent');
  assert.equal(meta.mode, 'quick');
  assert.equal(meta.status, undefined);
  assert.equal(meta.lifecycle, 'active');
});

test('readIntentMeta: throws for missing intent', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  assert.throws(() => readIntentMeta(contentRoot, 'ghost'), /not found/);
});

// ---------------------------------------------------------------------------
// listActiveIntentIds
// ---------------------------------------------------------------------------

test('listActiveIntentIds: returns empty array when no intents', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  assert.deepEqual(listActiveIntentIds(contentRoot), []);
});

test('listActiveIntentIds: returns list of created intents', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'alpha', mode: 'quick', changeType: 'docs' });
  createIntentWorkspace(contentRoot, { intentId: 'beta', mode: 'full', changeType: 'feature' });

  const ids = listActiveIntentIds(contentRoot);
  assert.ok(ids.includes('alpha'));
  assert.ok(ids.includes('beta'));
  assert.equal(ids.length, 2);
});

test('listBacklogIntentIds: returns markdown slugs from backlog folder', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createBacklogIntent(contentRoot, { slug: 'intent-governance', title: 'Intent Governance', description: 'Upgrade flow' });
  assert.deepEqual(listBacklogIntentIds(contentRoot), ['intent-governance']);
});

// ---------------------------------------------------------------------------
// listStagedFiles
// ---------------------------------------------------------------------------

test('listStagedFiles: returns empty when proposed-changes is empty', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'empty', mode: 'quick', changeType: 'docs' });

  const files = listStagedFiles(contentRoot, 'empty');
  assert.deepEqual(files, []);
});

test('listStagedFiles: returns staged files with relative paths', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'staged', mode: 'quick', changeType: 'docs' });

  // Stage a file with proper mirror path
  const pcDir = proposedChangesPath(contentRoot, 'staged');
  const fileDir = path.join(pcDir, 'template', '15-governance');
  fs.mkdirSync(fileDir, { recursive: true });
  fs.writeFileSync(path.join(fileDir, 'review-cadence.md'), '# Review Cadence');

  const files = listStagedFiles(contentRoot, 'staged');
  assert.equal(files.length, 1);
  assert.equal(files[0], 'template/15-governance/review-cadence.md');
});

// ---------------------------------------------------------------------------
// validateStagedFilePaths
// ---------------------------------------------------------------------------

test('validateStagedFilePaths: no issues for valid paths', () => {
  const issues = validateStagedFilePaths(['template/15-governance/review-cadence.md']);
  assert.deepEqual(issues, []);
});

test('validateStagedFilePaths: flags files in proposed-changes root', () => {
  const issues = validateStagedFilePaths(['flat-file.md']);
  assert.equal(issues.length, 1);
  assert.ok(issues[0].issue.includes('proposed-changes/<relative-from-svfactory>'));
});

test('validateStagedFilePaths: accepts nested paths without issues', () => {
  const issues = validateStagedFilePaths([
    'template/12-ai-skills/index.md',
    '00-start-here/repository-revision-state.md',
  ]);
  assert.deepEqual(issues, []);
});

// ---------------------------------------------------------------------------
// cancelIntent
// ---------------------------------------------------------------------------

test('cancelIntent: removes workspace directory', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'to-cancel', mode: 'quick', changeType: 'docs' });

  const wsPath = intentWorkspacePath(contentRoot, 'to-cancel');
  assert.ok(fs.existsSync(wsPath));

  const closedPath = cancelIntent(contentRoot, 'to-cancel');
  assert.ok(!fs.existsSync(wsPath));
  assert.ok(fs.existsSync(closedPath));
  const meta = parseIntentFrontmatter(fs.readFileSync(path.join(closedPath, 'intent.md'), 'utf8'));
  assert.equal(meta.close_type, 'dropped');
  assert.equal(meta.drop_reason, 'cancelled via legacy command');
});

test('cancelIntent: throws for non-existent intent', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  assert.throws(() => cancelIntent(contentRoot, 'ghost'), /not found/);
});

test('updateIntentFocus: writes nested focus block into active intent frontmatter', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'focus-intent', mode: 'quick', changeType: 'docs' });

  updateIntentFocus(contentRoot, 'focus-intent', {
    current: 'Investigating command surface',
    nextAction: 'Implement activate',
    lastUpdated: '2026-05-06',
  });

  const meta = readIntentMeta(contentRoot, 'focus-intent');
  assert.equal(meta.focus.current, 'Investigating command surface');
  assert.equal(meta.focus.next_action, 'Implement activate');
  assert.equal(meta.focus.last_updated, '2026-05-06');
});

// ---------------------------------------------------------------------------
// archiveFolderName
// ---------------------------------------------------------------------------

test('archiveFolderName: uses provided timestamp', () => {
  const name = archiveFolderName('fix-cadence', '2026-05-02T10:30:00.000Z');
  assert.ok(name.startsWith('fix-cadence-'));
  assert.ok(name.length > 'fix-cadence-'.length);
});

test('archiveFolderName: generates name when no timestamp provided', () => {
  const name = archiveFolderName('fix-cadence');
  assert.ok(name.startsWith('fix-cadence-'));
});

// ---------------------------------------------------------------------------
// archiveIntent
// ---------------------------------------------------------------------------

test('archiveIntent: moves workspace to archive with timestamp suffix', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'to-archive', mode: 'quick', changeType: 'docs' });

  const archivePath = archiveIntent(contentRoot, 'to-archive', '2026-05-02T10:00:00.000Z');
  assert.ok(fs.existsSync(archivePath));
  assert.ok(!fs.existsSync(intentWorkspacePath(contentRoot, 'to-archive')));
  // Archive path should include the intent id
  assert.ok(path.basename(archivePath).startsWith('to-archive-'));
});

test('archiveIntent: throws for non-existent intent', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  assert.throws(() => archiveIntent(contentRoot, 'ghost'), /not found/);
});

test('archiveIntent: also archives closed intent workspaces', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  const closedPath = closedIntentWorkspacePath(contentRoot, 'closed-intent', 'released');
  fs.mkdirSync(closedPath, { recursive: true });
  fs.writeFileSync(path.join(closedPath, 'intent.md'), buildIntentMeta({ intentId: 'closed-intent', mode: 'quick', changeType: 'docs' }));

  const archivePath = archiveIntent(contentRoot, 'closed-intent', '2026-05-02T10:00:00.000Z');
  assert.ok(fs.existsSync(archivePath));
  assert.ok(!fs.existsSync(closedPath));
});

test('closeIntent: moves active intent into released closed folder', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'close-me', mode: 'quick', changeType: 'docs' });

  const closedPath = closeIntent(contentRoot, 'close-me', {
    closeType: 'released',
    releaseRef: 'v2.4.0',
    timestamp: '2026-05-06T12:00:00.000Z',
  });

  assert.ok(fs.existsSync(closedPath));
  assert.ok(!fs.existsSync(intentWorkspacePath(contentRoot, 'close-me')));
  const meta = parseIntentFrontmatter(fs.readFileSync(path.join(closedPath, 'intent.md'), 'utf8'));
  assert.equal(meta.lifecycle, 'closed');
  assert.equal(meta.status, undefined);
  assert.equal(meta.close_type, 'released');
  assert.equal(meta.release_ref, 'v2.4.0');
});

test('closeIntent: normalizes legacy status into legacy_status', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'legacy-close', mode: 'quick', changeType: 'docs' });

  const metaPath = path.join(intentWorkspacePath(contentRoot, 'legacy-close'), 'intent.md');
  const legacyText = fs.readFileSync(metaPath, 'utf8').replace('lifecycle: active', 'status: open\nlifecycle: active');
  fs.writeFileSync(metaPath, legacyText, 'utf8');

  const closedPath = closeIntent(contentRoot, 'legacy-close', {
    closeType: 'released',
    releaseRef: 'v2.4.0',
    timestamp: '2026-05-06T12:00:00.000Z',
  });

  const meta = parseIntentFrontmatter(fs.readFileSync(path.join(closedPath, 'intent.md'), 'utf8'));
  assert.equal(meta.status, undefined);
  assert.equal(meta.legacy_status, 'open');
  assert.equal(meta.lifecycle, 'closed');
});

test('closeIntent: requires drop reason for dropped intents', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'drop-me', mode: 'quick', changeType: 'docs' });
  assert.throws(() => closeIntent(contentRoot, 'drop-me', { closeType: 'dropped' }), /dropReason/);
});

// ---------------------------------------------------------------------------
// Phase 2: buildApplyRecord
// ---------------------------------------------------------------------------

test('buildApplyRecord: builds correct payload from meta and staged files', () => {
  const meta = {
    id: 'my-intent',
    mode: 'quick',
    change_type: 'docs',
    decision_summary: 'fixed cadence section',
    change_scope: [],
    impact_signals: ['documentation'],
    review_after: null,
  };
  const stagedFiles = ['template/15-governance/review-cadence.md'];
  const record = buildApplyRecord({ meta, stagedFiles, appliedAt: '2026-05-02T12:00:00.000Z' });

  assert.equal(record.intent_id, 'my-intent');
  assert.equal(record.mode, 'quick');
  assert.equal(record.change_type, 'docs');
  assert.equal(record.applied_at, '2026-05-02T12:00:00.000Z');
  assert.deepEqual(record.applied_files, stagedFiles);
  assert.equal(record.decision_summary, 'fixed cadence section');
  assert.deepEqual(record.impact_signals, ['documentation']);
});

test('buildApplyRecord: uses stagedFiles as change_scope fallback when meta.change_scope empty', () => {
  const meta = { id: 'x', mode: 'quick', change_type: 'docs', change_scope: [], decision_summary: '', impact_signals: [] };
  const staged = ['template/15-governance/review-cadence.md'];
  const record = buildApplyRecord({ meta, stagedFiles: staged, appliedAt: '2026-05-02T12:00:00Z' });
  assert.deepEqual(record.change_scope, staged);
});

test('buildApplyRecord: generates appliedAt if not provided', () => {
  const meta = { id: 'x', mode: 'quick', change_type: 'docs', change_scope: [], decision_summary: '', impact_signals: [] };
  const record = buildApplyRecord({ meta, stagedFiles: [] });
  assert.ok(record.applied_at);
  assert.ok(new Date(record.applied_at).getTime() > 0);
});

// ---------------------------------------------------------------------------
// Phase 2: applyStagedFiles
// ---------------------------------------------------------------------------

test('applyStagedFiles: copies staged files to contentRoot', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'apply-test', mode: 'quick', changeType: 'docs' });

  // Stage a file
  const pcDir = proposedChangesPath(contentRoot, 'apply-test');
  const subDir = path.join(pcDir, 'template', '15-governance');
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(path.join(subDir, 'review-cadence.md'), '# Review Cadence');

  const results = applyStagedFiles(contentRoot, 'apply-test', ['template/15-governance/review-cadence.md']);

  assert.equal(results.length, 1);
  assert.equal(results[0].file, 'template/15-governance/review-cadence.md');
  assert.equal(results[0].op, 'new');
  assert.ok(fs.existsSync(path.join(contentRoot, 'template', '15-governance', 'review-cadence.md')));
});

test('applyStagedFiles: classifies existing file as modified', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'modify-test', mode: 'quick', changeType: 'docs' });

  // Pre-create target file in contentRoot
  const targetDir = path.join(contentRoot, 'template', '15-governance');
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'review-cadence.md'), '# Old Content');

  // Stage an update
  const pcDir = proposedChangesPath(contentRoot, 'modify-test');
  const subDir = path.join(pcDir, 'template', '15-governance');
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(path.join(subDir, 'review-cadence.md'), '# New Content');

  const results = applyStagedFiles(contentRoot, 'modify-test', ['template/15-governance/review-cadence.md']);

  assert.equal(results[0].op, 'modified');
  const content = fs.readFileSync(path.join(contentRoot, 'template', '15-governance', 'review-cadence.md'), 'utf8');
  assert.equal(content, '# New Content');
});

test('runApply: keeps intent active after applying staged files', async () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);
  createIntentWorkspace(contentRoot, { intentId: 'apply-stays-active', mode: 'quick', changeType: 'docs' });

  const pcDir = proposedChangesPath(contentRoot, 'apply-stays-active');
  const subDir = path.join(pcDir, 'template', '15-governance');
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(path.join(subDir, 'review-cadence.md'), '# New Content');

  await captureConsole(() => runApply(
    { contentRoot },
    { intentId: 'apply-stays-active', yes: true, json: true, release: false },
    root
  ));

  assert.ok(fs.existsSync(intentWorkspacePath(contentRoot, 'apply-stays-active')));
  assert.ok(fs.existsSync(path.join(intentWorkspacePath(contentRoot, 'apply-stays-active'), 'apply-record.json')));
  const archiveRoot = path.join(contentRoot, 'intents', '_archive');
  assert.ok(!fs.existsSync(archiveRoot) || fs.readdirSync(archiveRoot).length === 0);
});

// ---------------------------------------------------------------------------
// Phase 2: writeApplyRecord
// ---------------------------------------------------------------------------

test('writeApplyRecord: creates apply-record.json in active workspace', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'record-test', mode: 'quick', changeType: 'docs' });

  const record = { intent_id: 'record-test', applied_at: '2026-05-02T12:00:00Z', applied_files: [] };
  const dest = writeApplyRecord(contentRoot, 'record-test', record);

  assert.ok(fs.existsSync(dest));
  const parsed = JSON.parse(fs.readFileSync(dest, 'utf8'));
  assert.equal(parsed.intent_id, 'record-test');
  assert.equal(parsed.applied_at, '2026-05-02T12:00:00Z');
});

// ---------------------------------------------------------------------------
// Phase 2: deriveIntentsApplied
// ---------------------------------------------------------------------------

test('deriveIntentsApplied: returns empty when no archive exists', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  const result = deriveIntentsApplied(contentRoot, null);
  assert.deepEqual(result, []);
});

test('deriveIntentsApplied: returns all archived intents when no lastReleasedAt', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');

  // Simulate an archived intent with apply-record.json
  const { archiveIntentsRoot } = require('../../src/lib/intent');
  const archiveDir = path.join(archiveIntentsRoot(contentRoot), 'fix-cadence-20260502120000');
  fs.mkdirSync(archiveDir, { recursive: true });
  const record = { intent_id: 'fix-cadence', mode: 'quick', change_type: 'docs', applied_at: '2026-05-02T12:00:00.000Z' };
  fs.writeFileSync(path.join(archiveDir, 'apply-record.json'), JSON.stringify(record));

  const result = deriveIntentsApplied(contentRoot, null);
  assert.equal(result.length, 1);
  assert.equal(result[0].intent_id, 'fix-cadence');
});

test('deriveIntentsApplied: filters out intents before cutoff', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');

  const { archiveIntentsRoot } = require('../../src/lib/intent');
  const archiveRoot = archiveIntentsRoot(contentRoot);

  // Intent applied BEFORE the last release
  const old = path.join(archiveRoot, 'old-fix-20260101120000');
  fs.mkdirSync(old, { recursive: true });
  fs.writeFileSync(path.join(old, 'apply-record.json'), JSON.stringify({
    intent_id: 'old-fix', mode: 'quick', change_type: 'docs', applied_at: '2026-01-01T12:00:00.000Z',
  }));

  // Intent applied AFTER the last release
  const recent = path.join(archiveRoot, 'new-fix-20260502120000');
  fs.mkdirSync(recent, { recursive: true });
  fs.writeFileSync(path.join(recent, 'apply-record.json'), JSON.stringify({
    intent_id: 'new-fix', mode: 'quick', change_type: 'docs', applied_at: '2026-05-02T12:00:00.000Z',
  }));

  const result = deriveIntentsApplied(contentRoot, '2026-03-01T00:00:00.000Z');
  assert.equal(result.length, 1);
  assert.equal(result[0].intent_id, 'new-fix');
});

test('deriveIntentsApplied: returns results sorted ascending by applied_at', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  const { archiveIntentsRoot } = require('../../src/lib/intent');
  const archiveRoot = archiveIntentsRoot(contentRoot);

  for (const [id, appliedAt] of [
    ['intent-c', '2026-05-03T12:00:00.000Z'],
    ['intent-a', '2026-05-01T12:00:00.000Z'],
    ['intent-b', '2026-05-02T12:00:00.000Z'],
  ]) {
    const dir = path.join(archiveRoot, `${id}-ts`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'apply-record.json'), JSON.stringify({ intent_id: id, applied_at: appliedAt }));
  }

  const result = deriveIntentsApplied(contentRoot, null);
  assert.equal(result[0].intent_id, 'intent-a');
  assert.equal(result[1].intent_id, 'intent-b');
  assert.equal(result[2].intent_id, 'intent-c');
});

// ---------------------------------------------------------------------------
// Phase 2: getActiveIntentsSummary
// ---------------------------------------------------------------------------

test('getActiveIntentsSummary: returns count 0 when no intents', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  const summary = getActiveIntentsSummary(contentRoot);
  assert.equal(summary.count, 0);
  assert.deepEqual(summary.intents, []);
});

test('getActiveIntentsSummary: counts active intents', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'alpha', mode: 'quick', changeType: 'docs' });
  createIntentWorkspace(contentRoot, { intentId: 'beta', mode: 'full', changeType: 'feature' });

  const summary = getActiveIntentsSummary(contentRoot);
  assert.equal(summary.count, 2);
  const ids = summary.intents.map((i) => i.id);
  assert.ok(ids.includes('alpha'));
  assert.ok(ids.includes('beta'));
});

test('getActiveIntentsSummary: has_warnings true when decision_summary empty', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'no-summary', mode: 'quick', changeType: 'docs' });

  const summary = getActiveIntentsSummary(contentRoot);
  const intent = summary.intents.find((i) => i.id === 'no-summary');
  // decision_summary is empty by default -> has_warnings = true
  assert.equal(intent.has_warnings, true);
});

test('getActiveIntentsSummary: staged_count reflects staged files', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  createIntentWorkspace(contentRoot, { intentId: 'with-files', mode: 'quick', changeType: 'docs' });

  const pcDir = proposedChangesPath(contentRoot, 'with-files');
  const subDir = path.join(pcDir, 'template', '15-governance');
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(path.join(subDir, 'review-cadence.md'), '# Review');

  const summary = getActiveIntentsSummary(contentRoot);
  const intent = summary.intents.find((i) => i.id === 'with-files');
  assert.equal(intent.staged_count, 1);
});

// ---------------------------------------------------------------------------
// Phase 2: parseArgs apply subcommand
// ---------------------------------------------------------------------------

test('intent parseArgs: apply with id', () => {
  const o = parseArgs(['apply', 'my-intent']);
  assert.equal(o.sub, 'apply');
  assert.equal(o.intentId, 'my-intent');
  assert.equal(o.release, false);
});

test('intent parseArgs: apply with --release flag', () => {
  const o = parseArgs(['apply', 'my-intent', '--release']);
  assert.equal(o.release, true);
});

test('intent parseArgs: apply without id throws', () => {
  assert.throws(() => parseArgs(['apply']), /requires an intent ID/);
});

test('runIntent status: resolves backlog, closed, and archived refs', async () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);

  createBacklogIntent(contentRoot, { slug: 'intent-governance', title: 'Intent Governance', description: 'Backlog item' });
  createIntentWorkspace(contentRoot, { intentId: 'closed-item', mode: 'quick', changeType: 'docs' });
  closeIntent(contentRoot, 'closed-item', { closeType: 'released', releaseRef: 'v2.4.0' });
  createIntentWorkspace(contentRoot, { intentId: 'archived-item', mode: 'quick', changeType: 'docs' });
  closeIntent(contentRoot, 'archived-item', { closeType: 'dropped', dropReason: 'Superseded' });
  archiveIntent(contentRoot, 'archived-item', '2026-05-06T12:00:00.000Z');

  let captured = await captureConsole(() => runIntent({ args: ['status', 'intent-governance', '--json'], cwd: root }));
  let parsed = JSON.parse(captured.stdout);
  assert.equal(parsed.scope, 'backlog');
  assert.equal(parsed.status, 'open');

  captured = await captureConsole(() => runIntent({ args: ['status', 'closed-item', '--json'], cwd: root }));
  parsed = JSON.parse(captured.stdout);
  assert.equal(parsed.scope, 'closed');
  assert.equal(parsed.close_type, 'released');
  assert.equal(parsed.release_ref, 'v2.4.0');

  captured = await captureConsole(() => runIntent({ args: ['status', 'archived-item', '--json'], cwd: root }));
  parsed = JSON.parse(captured.stdout);
  assert.equal(parsed.scope, 'archived');
  assert.equal(parsed.status, 'closed');
});

test('runIntent list: respects v2.4 scope flags', async () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);

  createBacklogIntent(contentRoot, { slug: 'intent-governance', title: 'Intent Governance', description: 'Backlog item' });
  createIntentWorkspace(contentRoot, { intentId: 'active-item', mode: 'quick', changeType: 'docs' });
  createIntentWorkspace(contentRoot, { intentId: 'closed-item', mode: 'quick', changeType: 'docs' });
  closeIntent(contentRoot, 'closed-item', { closeType: 'released', releaseRef: 'v2.4.0' });
  createIntentWorkspace(contentRoot, { intentId: 'archived-item', mode: 'quick', changeType: 'docs' });
  closeIntent(contentRoot, 'archived-item', { closeType: 'dropped', dropReason: 'Superseded' });
  archiveIntent(contentRoot, 'archived-item', '2026-05-06T12:00:00.000Z');

  let captured = await captureConsole(() => runIntent({ args: ['list', '--json'], cwd: root }));
  let parsed = JSON.parse(captured.stdout);
  assert.equal(parsed.scope, 'active');
  assert.equal(parsed.count, 1);
  assert.equal(parsed.intents[0].intent_id, 'active-item');

  captured = await captureConsole(() => runIntent({ args: ['list', '--closed', '--json'], cwd: root }));
  parsed = JSON.parse(captured.stdout);
  assert.equal(parsed.scope, 'closed');
  assert.equal(parsed.count, 1);
  assert.equal(parsed.intents[0].close_type, 'released');

  captured = await captureConsole(() => runIntent({ args: ['list', '--all', '--json'], cwd: root }));
  parsed = JSON.parse(captured.stdout);
  assert.equal(parsed.scope, 'all');
  assert.equal(parsed.count, 4);
});

test('runIntent cancel: closes active intent as dropped alias', async () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);
  createIntentWorkspace(contentRoot, { intentId: 'legacy-cancel', mode: 'quick', changeType: 'docs' });

  const captured = await captureConsole(() => runIntent({ args: ['cancel', 'legacy-cancel', '--yes', '--json'], cwd: root }));
  const parsed = JSON.parse(captured.stdout);
  assert.equal(parsed.close_type, 'dropped');
  assert.equal(parsed.deprecated, true);
  assert.ok(fs.existsSync(closedIntentWorkspacePath(contentRoot, 'legacy-cancel', 'dropped')));
  assert.ok(!fs.existsSync(intentWorkspacePath(contentRoot, 'legacy-cancel')));
});

test('runIntent cleanup: reports critical when focus.current is empty', async () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);
  createIntentWorkspace(contentRoot, { intentId: 'v2-4-no-focus', mode: 'quick', changeType: 'docs' });

  const captured = await captureConsole(() => runIntent({ args: ['cleanup', '--json'], cwd: root }));
  const parsed = JSON.parse(captured.stdout);
  assert.equal(parsed.command, 'kb intent cleanup');
  assert.ok(parsed.critical > 0 || parsed.warning > 0);
  const finding = parsed.findings.find((f) => f.intent_id === 'v2-4-no-focus');
  assert.ok(finding, 'should have a finding for v2-4-no-focus');
});

test('runIntent cleanup: no issues when focus is fully filled', async () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);
  createIntentWorkspace(contentRoot, { intentId: 'v2-4-clean', mode: 'quick', changeType: 'docs' });
  // Update focus so it's fully filled and recent
  const { updateIntentFocus } = require('../../src/lib/intent');
  const today = new Date().toISOString().slice(0, 10);
  updateIntentFocus(contentRoot, 'v2-4-clean', {
    current: 'implementing feature',
    nextAction: 'write tests',
    lastUpdated: today,
  });

  const captured = await captureConsole(() => runIntent({ args: ['cleanup', '--json'], cwd: root }));
  const parsed = JSON.parse(captured.stdout);
  const focusFindings = parsed.findings.filter(
    (f) => f.intent_id === 'v2-4-clean' && (f.rule === 'missing-focus-current' || f.rule === 'missing-focus-next-action' || f.rule === 'stale-focus')
  );
  assert.equal(focusFindings.length, 0, 'should have no focus findings for clean intent');
});

test('runIntent cleanup: --stale excludes aged closed findings', async () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);
  createIntentWorkspace(contentRoot, { intentId: 'v2-4-stale-only', mode: 'quick', changeType: 'docs' });

  const captured = await captureConsole(() => runIntent({ args: ['cleanup', '--stale', '--json'], cwd: root }));
  const parsed = JSON.parse(captured.stdout);
  const agedFindings = parsed.findings.filter((f) => f.rule === 'closed-aged');
  assert.equal(agedFindings.length, 0, '--stale should exclude closed-aged findings');
});

// ---------------------------------------------------------------------------
// Gap 1 Fix: schema_version in new intents (T-G1, T-G4)
// ---------------------------------------------------------------------------

test('buildIntentMeta: includes schema_version field', () => {
  const meta = buildIntentMeta({ intentId: 'test-gap-1', mode: 'quick', changeType: 'docs' });
  assert.ok(meta.includes('schema_version:'), 'schema_version field should be present');
  const match = meta.match(/schema_version:\s*([^\n]+)/);
  assert.ok(match, 'schema_version should have a value');
  const version = match[1].trim();
  assert.ok(/^[\d.]+/.test(version), `schema_version should be a version string, got: ${version}`);
});

test('buildBacklogIntentMeta: includes schema_version field', () => {
  const meta = buildBacklogIntentMeta({ slug: 'backlog-gap', title: 'Test', description: '', wave: null });
  assert.ok(meta.includes('schema_version:'), 'backlog intent should have schema_version');
  const match = meta.match(/schema_version:\s*([^\n]+)/);
  assert.ok(match, 'schema_version should have a value');
  const version = match[1].trim();
  assert.ok(/^[\d.]+/.test(version), `schema_version should be a version string, got: ${version}`);
});

test('T-G1: intent create populates schema_version (quick mode)', () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);
  createIntentWorkspace(contentRoot, { intentId: 'new-intent-q', mode: 'quick', changeType: 'feature' });

  const metaPath = path.join(contentRoot, 'intents', '_active', 'new-intent-q', 'intent.md');
  assert.ok(fs.existsSync(metaPath), 'intent.md should exist');

  const text = fs.readFileSync(metaPath, 'utf8');
  const meta = parseIntentFrontmatter(text);
  assert.ok(meta.schema_version, 'schema_version should be populated');
  assert.ok(/^[\d.]+/.test(meta.schema_version), `schema_version should be valid, got: ${meta.schema_version}`);
});

test('T-G1: intent create populates schema_version (full mode)', () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);
  createIntentWorkspace(contentRoot, { intentId: 'new-intent-f', mode: 'full', changeType: 'feature' });

  const metaPath = path.join(contentRoot, 'intents', '_active', 'new-intent-f', 'intent.md');
  const text = fs.readFileSync(metaPath, 'utf8');
  const meta = parseIntentFrontmatter(text);
  assert.ok(meta.schema_version, 'schema_version should be populated');
  assert.ok(/^[\d.]+/.test(meta.schema_version), `schema_version should be valid, got: ${meta.schema_version}`);
});

test('T-G3: backlog activate preserves schema_version', () => {
  const root = tmpRoot();
  const contentRoot = initTrackedWorkspace(root);
  createBacklogIntent(contentRoot, { slug: 'test-backlog', title: 'Test Backlog', description: 'Test', wave: null });

  activateBacklogIntent(contentRoot, { slug: 'test-backlog', intentId: 'activated-intent', mode: 'quick', changeType: 'feature', wave: null });

  const metaPath = path.join(contentRoot, 'intents', '_active', 'activated-intent', 'intent.md');
  const text = fs.readFileSync(metaPath, 'utf8');
  const meta = parseIntentFrontmatter(text);
  assert.ok(meta.schema_version, 'activated intent should have schema_version');
  assert.ok(/^[\d.]+/.test(meta.schema_version), `schema_version should be valid, got: ${meta.schema_version}`);
});

