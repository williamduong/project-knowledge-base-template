const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  deriveStatusVerdict,
  detectPipelineTemplate,
  getReleasePipelineState,
  partitionWorkingTree,
} = require('../../src/commands/status');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-status-'));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

test('partitionWorkingTree: KB paths under contentRoot go to kbDirty', () => {
  const tree = [
    { status: 'M', filePath: 'knowledge-base/00-start-here/index.md' },
    { status: 'A', filePath: 'src/auth/index.ts' },
    { status: 'M', filePath: 'knowledge-base/.kb/impact.json' },
  ];
  const { kbDirty, codeDirty } = partitionWorkingTree(tree, 'knowledge-base');
  assert.equal(kbDirty.length, 2);
  assert.equal(codeDirty.length, 1);
  assert.equal(codeDirty[0].path, 'src/auth/index.ts');
});

test('partitionWorkingTree: handles backslashes via normalizePath', () => {
  const tree = [{ status: 'M', filePath: 'knowledge-base\\05-backend\\auth.md' }];
  const { kbDirty } = partitionWorkingTree(tree, 'knowledge-base');
  assert.equal(kbDirty.length, 1);
  assert.equal(kbDirty[0].path, 'knowledge-base/05-backend/auth.md');
});

test('partitionWorkingTree: contentRoot=null treats everything as code', () => {
  const tree = [{ status: 'M', filePath: 'foo/bar.md' }];
  const { kbDirty, codeDirty } = partitionWorkingTree(tree, null);
  assert.equal(kbDirty.length, 0);
  assert.equal(codeDirty.length, 1);
});

test('deriveStatusVerdict: presence partial → blocked kb-partial', () => {
  const v = deriveStatusVerdict({ presence: 'partial' });
  assert.deepEqual(v, { code: 2, label: 'blocked', reasons: ['kb-partial'] });
});

test('deriveStatusVerdict: stateError → blocked state-error', () => {
  const v = deriveStatusVerdict({ presence: 'healthy', stateError: 'oops' });
  assert.equal(v.label, 'blocked');
  assert.deepEqual(v.reasons, ['state-error']);
});

test('deriveStatusVerdict: presence fresh → clean no-kb', () => {
  const v = deriveStatusVerdict({ presence: 'fresh' });
  assert.deepEqual(v, { code: 0, label: 'clean', reasons: ['no-kb'] });
});

test('deriveStatusVerdict: impact skipped → blocked with skip reason', () => {
  const v = deriveStatusVerdict({
    presence: 'healthy',
    impactData: { skipped_reason: 'no-baseline', impacted: [], unbound_changes: [] },
  });
  assert.deepEqual(v, { code: 2, label: 'blocked', reasons: ['no-baseline'] });
});

test('deriveStatusVerdict: impacted docs → attention impacted-docs', () => {
  const v = deriveStatusVerdict({
    presence: 'healthy',
    impactData: { impacted: [{ doc: 'a.md' }], unbound_changes: [] },
  });
  assert.equal(v.code, 1);
  assert.deepEqual(v.reasons, ['impacted-docs']);
});

test('deriveStatusVerdict: unbound + kbDirty → attention multi-reason', () => {
  const v = deriveStatusVerdict({
    presence: 'healthy',
    impactData: { impacted: [], unbound_changes: ['x.ts'] },
    kbDirty: [{ status: 'M', path: 'knowledge-base/foo.md' }],
  });
  assert.equal(v.code, 1);
  assert.deepEqual(v.reasons, ['unbound-changes', 'kb-uncommitted']);
});

test('deriveStatusVerdict: code uncommitted alone does NOT trigger attention', () => {
  const v = deriveStatusVerdict({
    presence: 'healthy',
    impactData: { impacted: [], unbound_changes: [] },
    kbDirty: [],
  });
  assert.deepEqual(v, { code: 0, label: 'clean', reasons: [] });
});

test('deriveStatusVerdict: all clean → code 0 clean empty reasons', () => {
  const v = deriveStatusVerdict({
    presence: 'healthy',
    impactData: {
      impacted: [],
      unbound_changes: [],
      baseline: 'abc',
      head: 'def',
    },
    kbDirty: [],
  });
  assert.deepEqual(v, { code: 0, label: 'clean', reasons: [] });
});

test('detectPipelineTemplate: parses known and unknown headers', () => {
  assert.equal(detectPipelineTemplate('# Release pipeline template: npm-package'), 'npm-package');
  assert.equal(detectPipelineTemplate('# Release pipeline template: docs-only'), 'docs-only');
  assert.equal(detectPipelineTemplate('# Release pipeline template: internal-team'), 'custom');
  assert.equal(detectPipelineTemplate('steps:\n  - name: a\n    run: echo ok'), 'custom');
});

test('getReleasePipelineState: returns not configured when pipeline file missing', () => {
  const root = tmpRoot();
  const state = getReleasePipelineState(root);
  assert.equal(state.configured, false);
  assert.equal(state.template, null);
  assert.equal(state.valid, null);
  assert.equal(typeof state.filePath, 'string');
});

test('getReleasePipelineState: returns configured + template for valid pipeline', () => {
  const root = tmpRoot();
  const filePath = path.join(root, '.kb', 'release-pipeline.yaml');
  writeFile(
    filePath,
    [
      '# Release pipeline template: docs-only',
      'steps:',
      '  - name: pre-check',
      '    run: echo ok',
      '',
    ].join('\n')
  );

  const state = getReleasePipelineState(root);
  assert.equal(state.configured, true);
  assert.equal(state.template, 'docs-only');
  assert.equal(state.valid, true);
  assert.equal(state.error, null);
});

test('getReleasePipelineState: marks invalid pipeline but keeps configured=true', () => {
  const root = tmpRoot();
  const filePath = path.join(root, '.kb', 'release-pipeline.yaml');
  writeFile(
    filePath,
    [
      '# Release pipeline template: npm-package',
      'steps:',
      '  - name: broken',
      '',
    ].join('\n')
  );

  const state = getReleasePipelineState(root);
  assert.equal(state.configured, true);
  assert.equal(state.template, 'npm-package');
  assert.equal(state.valid, false);
  assert.match(String(state.error || ''), /Invalid pipeline schema/);
});
