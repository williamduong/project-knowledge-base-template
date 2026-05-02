'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const {
  analyzeIntentConflicts,
  buildIntentContext,
  suggestApplyOrder,
  generateLessonCandidates,
} = require('../../src/lib/intent-intelligence');

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

// ---------------------------------------------------------------------------
// Phase 2: suggestApplyOrder
// ---------------------------------------------------------------------------

test('suggestApplyOrder: returns proceed when no conflict result given', () => {
  const result = suggestApplyOrder(null);
  assert.equal(result.strategy, 'proceed');
  assert.ok(typeof result.reason === 'string');
  assert.ok(Array.isArray(result.steps));
});

test('suggestApplyOrder: returns proceed when conflict_count is 0', () => {
  const fakeResult = { conflict_count: 0, high_risk_count: 0, medium_risk_count: 0, low_risk_count: 0, conflicts: [] };
  const result = suggestApplyOrder(fakeResult);
  assert.equal(result.strategy, 'proceed');
});

test('suggestApplyOrder: returns resolve-first for high-risk conflict', () => {
  const fakeResult = {
    conflict_count: 1,
    high_risk_count: 1,
    medium_risk_count: 0,
    low_risk_count: 0,
    conflicts: [{ against_intent_id: 'INT-B', risk: 'high', score: 10, signals: {} }],
  };
  const result = suggestApplyOrder(fakeResult);
  assert.equal(result.strategy, 'resolve-first');
  assert.ok(result.reason.includes('INT-B'));
  assert.ok(result.steps.length > 0);
});

test('suggestApplyOrder: returns review-order for medium-risk only conflict', () => {
  const fakeResult = {
    conflict_count: 1,
    high_risk_count: 0,
    medium_risk_count: 1,
    low_risk_count: 0,
    conflicts: [{ against_intent_id: 'INT-C', risk: 'medium', score: 5, signals: {} }],
  };
  const result = suggestApplyOrder(fakeResult);
  assert.equal(result.strategy, 'review-order');
  assert.ok(result.reason.includes('INT-C'));
});

test('suggestApplyOrder: returns proceed-with-caution for low-risk only', () => {
  const fakeResult = {
    conflict_count: 1,
    high_risk_count: 0,
    medium_risk_count: 0,
    low_risk_count: 1,
    conflicts: [{ against_intent_id: 'INT-D', risk: 'low', score: 1, signals: {} }],
  };
  const result = suggestApplyOrder(fakeResult);
  assert.equal(result.strategy, 'proceed-with-caution');
});

// ---------------------------------------------------------------------------
// Phase 2: generateLessonCandidates
// ---------------------------------------------------------------------------

function mkTmp2() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-lesson-'));
}

function mkArchiveRecord(contentRoot, intentId, changeType, appliedFiles) {
  const archiveDir = path.join(contentRoot, 'intents', '_archive', `${intentId}--2026-01-01T00-00-00`);
  fs.mkdirSync(archiveDir, { recursive: true });
  const record = {
    intent_id: intentId,
    change_type: changeType,
    applied_at: '2026-01-01T00:00:00.000Z',
    applied_files: appliedFiles,
  };
  fs.writeFileSync(path.join(archiveDir, 'apply-record.json'), JSON.stringify(record), 'utf8');
}

test('generateLessonCandidates: returns empty when no archive dir', () => {
  const tmp = mkTmp2();
  const contentRoot = path.join(tmp, 'knowledge-base');
  fs.mkdirSync(contentRoot, { recursive: true });
  const candidates = generateLessonCandidates(contentRoot);
  assert.deepEqual(candidates, []);
});

test('generateLessonCandidates: returns empty when archive dir exists but no records', () => {
  const tmp = mkTmp2();
  const contentRoot = path.join(tmp, 'knowledge-base');
  fs.mkdirSync(path.join(contentRoot, 'intents', '_archive'), { recursive: true });
  const candidates = generateLessonCandidates(contentRoot);
  assert.deepEqual(candidates, []);
});

test('generateLessonCandidates: detects recurring change_type pattern in same domain', () => {
  const tmp = mkTmp2();
  const contentRoot = path.join(tmp, 'knowledge-base');
  mkArchiveRecord(contentRoot, 'INT-001', 'docs', ['01-product/a.md']);
  mkArchiveRecord(contentRoot, 'INT-002', 'docs', ['01-product/b.md']);
  const candidates = generateLessonCandidates(contentRoot);
  assert.ok(candidates.length >= 1);
  const pattern = candidates.find(c => c.pattern_type === 'recurring-change-type');
  assert.ok(pattern, 'should find recurring-change-type candidate');
  assert.ok(typeof pattern.rule === 'string');
  assert.ok(Array.isArray(pattern.evidence));
  assert.ok(pattern.evidence.includes('INT-001'));
  assert.ok(pattern.evidence.includes('INT-002'));
});

test('generateLessonCandidates: no candidate when only one intent per domain/type', () => {
  const tmp = mkTmp2();
  const contentRoot = path.join(tmp, 'knowledge-base');
  mkArchiveRecord(contentRoot, 'INT-001', 'docs', ['01-product/a.md']);
  mkArchiveRecord(contentRoot, 'INT-002', 'feature', ['03-architecture/b.md']);
  const candidates = generateLessonCandidates(contentRoot);
  // No recurring-change-type because each (domain, change_type) pair has only 1 intent
  const recType = candidates.filter(c => c.pattern_type === 'recurring-change-type');
  assert.equal(recType.length, 0);
});

test('generateLessonCandidates: detects high-churn file pattern (>=3 intents)', () => {
  const tmp = mkTmp2();
  const contentRoot = path.join(tmp, 'knowledge-base');
  mkArchiveRecord(contentRoot, 'INT-001', 'docs', ['01-product/a.md']);
  mkArchiveRecord(contentRoot, 'INT-002', 'docs', ['01-product/a.md']);
  mkArchiveRecord(contentRoot, 'INT-003', 'feature', ['01-product/a.md']);
  const candidates = generateLessonCandidates(contentRoot);
  const churn = candidates.find(c => c.pattern_type === 'high-churn-file');
  assert.ok(churn, 'should find high-churn-file candidate');
  assert.ok(churn.rule.includes('01-product/a.md'));
  assert.ok(churn.evidence.length >= 3);
});

test('generateLessonCandidates: candidate has required fields', () => {
  const tmp = mkTmp2();
  const contentRoot = path.join(tmp, 'knowledge-base');
  mkArchiveRecord(contentRoot, 'INT-001', 'docs', ['01-product/a.md']);
  mkArchiveRecord(contentRoot, 'INT-002', 'docs', ['01-product/b.md']);
  const candidates = generateLessonCandidates(contentRoot);
  assert.ok(candidates.length >= 1);
  for (const c of candidates) {
    assert.ok(c.id, 'has id');
    assert.ok(c.domain, 'has domain');
    assert.ok(c.rule, 'has rule');
    assert.ok(c.reason, 'has reason');
    assert.ok(Array.isArray(c.evidence), 'has evidence array');
    assert.ok(c.pattern_type, 'has pattern_type');
  }
});
