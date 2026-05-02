'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseArgs } = require('../../src/commands/intent');
const {
  sanitizeId,
  suggestIntentId,
  buildIntentMeta,
  buildPlanStub,
  buildImpactStub,
  parseIntentFrontmatter,
  createIntentWorkspace,
  readIntentMeta,
  listActiveIntentIds,
  listStagedFiles,
  validateStagedFilePaths,
  cancelIntent,
  archiveIntent,
  archiveFolderName,
  intentWorkspacePath,
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

test('intent parseArgs: list', () => {
  const o = parseArgs(['list']);
  assert.equal(o.sub, 'list');
});

test('intent parseArgs: cancel with id', () => {
  const o = parseArgs(['cancel', 'old-intent']);
  assert.equal(o.sub, 'cancel');
  assert.equal(o.intentId, 'old-intent');
});

test('intent parseArgs: cancel without id throws', () => {
  assert.throws(() => parseArgs(['cancel']), /requires an intent ID/);
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
  assert.equal(fm.status, 'open');
  assert.equal(fm.change_type, 'docs');
  // reserve fields should NOT be present in quick mode frontmatter
  assert.equal(fm.lesson_id, undefined);
});

test('buildIntentMeta: full mode includes all reserve fields', () => {
  const text = buildIntentMeta({ intentId: 'full-id', mode: 'full', changeType: 'feature' });
  const fm = parseIntentFrontmatter(text);
  assert.equal(fm.mode, 'full');
  assert.equal(fm.lesson_id, null);
  assert.equal(fm.lifecycle_state, 'proposed');
  assert.equal(fm.promotion_ready, false);
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
  assert.equal(meta.status, 'open');
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
  assert.ok(issues[0].issue.includes('proposed-changes/<relative-from-kb-root>'));
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

  cancelIntent(contentRoot, 'to-cancel');
  assert.ok(!fs.existsSync(wsPath));
});

test('cancelIntent: throws for non-existent intent', () => {
  const root = tmpRoot();
  const contentRoot = path.join(root, 'knowledge-base');
  assert.throws(() => cancelIntent(contentRoot, 'ghost'), /not found/);
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
