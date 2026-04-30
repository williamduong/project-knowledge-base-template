'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  contentRootRelativeToWorkspace,
  deriveVerdict,
  partitionChanges,
} = require('../../src/lib/impact');

test('contentRootRelativeToWorkspace: relative + normalized', () => {
  const ws = '/repo';
  const cr = '/repo/knowledge-base';
  assert.equal(contentRootRelativeToWorkspace(ws, cr), 'knowledge-base');
});

test('partitionChanges: filters paths under contentRoot into selfEdits (R12)', () => {
  const changes = [
    { status: 'M', path: 'src/cli.js' },
    { status: 'M', path: 'knowledge-base/00-start-here/x.md' },
    { status: 'A', path: 'knowledge-base/.kb/state.json' },
    { status: 'M', path: 'README.md' },
  ];
  const { selfEdits, codeChanges } = partitionChanges(changes, 'knowledge-base');
  assert.deepEqual(selfEdits.map((e) => e.path), [
    'knowledge-base/00-start-here/x.md',
    'knowledge-base/.kb/state.json',
  ]);
  assert.deepEqual(codeChanges.map((c) => c.path), ['src/cli.js', 'README.md']);
});

test('partitionChanges: trailing slash in contentRootRel handled', () => {
  const changes = [{ status: 'M', path: 'kb/file.md' }, { status: 'M', path: 'src/x.js' }];
  const { selfEdits, codeChanges } = partitionChanges(changes, 'kb/');
  assert.equal(selfEdits.length, 1);
  assert.equal(codeChanges.length, 1);
});

test('partitionChanges: empty contentRootRel → no selfEdits', () => {
  const changes = [{ status: 'M', path: 'a.js' }];
  const { selfEdits, codeChanges } = partitionChanges(changes, '');
  assert.equal(selfEdits.length, 0);
  assert.equal(codeChanges.length, 1);
});

test('deriveVerdict: clean when impacted=0 and unbound=0', () => {
  const v = deriveVerdict({ impacted: [], unbound_changes: [], skipped_reason: null });
  assert.deepEqual(v, { code: 0, label: 'clean', reason: null });
});

test('deriveVerdict: attention with impacted-docs reason', () => {
  const v = deriveVerdict({ impacted: [{ doc: 'a.md' }], unbound_changes: [], skipped_reason: null });
  assert.equal(v.code, 1);
  assert.equal(v.label, 'attention');
  assert.equal(v.reason, 'impacted-docs');
});

test('deriveVerdict: attention with unbound-changes reason', () => {
  const v = deriveVerdict({ impacted: [], unbound_changes: ['x'], skipped_reason: null });
  assert.equal(v.code, 1);
  assert.equal(v.reason, 'unbound-changes');
});

test('deriveVerdict: blocked when skipped_reason present', () => {
  const v = deriveVerdict({ impacted: [], unbound_changes: [], skipped_reason: 'no-baseline' });
  assert.equal(v.code, 2);
  assert.equal(v.label, 'blocked');
  assert.equal(v.reason, 'no-baseline');
});

test('deriveVerdict: error when data null', () => {
  const v = deriveVerdict(null);
  assert.equal(v.code, 2);
  assert.equal(v.label, 'error');
});
