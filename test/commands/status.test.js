const test = require('node:test');
const assert = require('node:assert/strict');

const { deriveStatusVerdict, partitionWorkingTree } = require('../../src/commands/status');

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
