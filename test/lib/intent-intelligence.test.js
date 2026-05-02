'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const { analyzeIntentConflicts, buildIntentContext } = require('../../src/lib/intent-intelligence');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-intel-'));
}

function mkKbRoot(tmp) {
  const contentRoot = path.join(tmp, 'knowledge-base');
  fs.mkdirSync(path.join(contentRoot, 'intents', '_active'), { recursive: true });
  return contentRoot;
}

function writeIntent(contentRoot, intentId, files) {
  const base = path.join(contentRoot, 'intents', '_active', intentId, 'proposed-changes');
  for (const f of files) {
    const p = path.join(base, f);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, '# staged\n', 'utf8');
  }
}

test('buildIntentContext: returns domains and staged files', () => {
  const tmp = mkTmp();
  const contentRoot = mkKbRoot(tmp);

  writeIntent(contentRoot, 'INT-A', [
    '01-product/a.md',
    '03-architecture/b.md',
  ]);

  const ctx = buildIntentContext(contentRoot, 'INT-A');
  assert.equal(ctx.intent_id, 'INT-A');
  assert.deepEqual(ctx.staged_files.sort(), ['01-product/a.md', '03-architecture/b.md']);
  assert.ok(ctx.domains.includes('01-product'));
  assert.ok(ctx.domains.includes('03-architecture'));
});

test('analyzeIntentConflicts: no conflicts when only one intent', () => {
  const tmp = mkTmp();
  const contentRoot = mkKbRoot(tmp);
  writeIntent(contentRoot, 'INT-A', ['01-product/a.md']);

  const res = analyzeIntentConflicts(contentRoot, 'INT-A');
  assert.equal(res.conflict_count, 0);
  assert.equal(res.high_risk_count, 0);
});

test('analyzeIntentConflicts: exact file overlap => high risk', () => {
  const tmp = mkTmp();
  const contentRoot = mkKbRoot(tmp);
  writeIntent(contentRoot, 'INT-A', ['01-product/a.md']);
  writeIntent(contentRoot, 'INT-B', ['01-product/a.md']);

  const res = analyzeIntentConflicts(contentRoot, 'INT-A');
  assert.equal(res.conflict_count, 1);
  assert.equal(res.conflicts[0].against_intent_id, 'INT-B');
  assert.equal(res.conflicts[0].risk, 'high');
  assert.ok(res.conflicts[0].signals.exact_file_overlap >= 1);
});

test('analyzeIntentConflicts: same directory overlap => medium risk', () => {
  const tmp = mkTmp();
  const contentRoot = mkKbRoot(tmp);
  writeIntent(contentRoot, 'INT-A', ['01-product/a.md']);
  writeIntent(contentRoot, 'INT-B', ['01-product/b.md']);

  const res = analyzeIntentConflicts(contentRoot, 'INT-A');
  assert.equal(res.conflict_count, 1);
  assert.equal(res.conflicts[0].risk, 'medium');
  assert.ok(res.conflicts[0].signals.same_directory_overlap >= 1);
});

test('analyzeIntentConflicts: same domain only => low risk', () => {
  const tmp = mkTmp();
  const contentRoot = mkKbRoot(tmp);
  writeIntent(contentRoot, 'INT-A', ['01-product/a.md']);
  writeIntent(contentRoot, 'INT-B', ['01-product/sub/b.md']);

  // Ensure directory overlap is not identical
  const res = analyzeIntentConflicts(contentRoot, 'INT-A');
  assert.equal(res.conflict_count, 1);
  assert.ok(['low', 'medium'].includes(res.conflicts[0].risk));
});

test('analyzeIntentConflicts: unknown intent throws', () => {
  const tmp = mkTmp();
  const contentRoot = mkKbRoot(tmp);
  writeIntent(contentRoot, 'INT-A', ['01-product/a.md']);

  assert.throws(
    () => analyzeIntentConflicts(contentRoot, 'INT-UNKNOWN'),
    /not found in active intent set/
  );
});
