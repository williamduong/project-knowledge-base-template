'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  DEBT_TYPES,
  ENTROPY_TYPES,
  computeDebtScore,
  computeEntropyScore,
  debtScoreToTier,
  entropyScoreToTier,
  buildDebtItem,
  buildEntropyItem,
  parseDebtIndex,
  parseEntropyIndex,
  readDebtIndex,
  readEntropyIndex,
  summariseDebt,
  summariseEntropy,
  buildLessonItem,
  parseLessonsIndex,
  readLessonsIndex,
  summariseLessons,
  LESSON_DOMAINS,
  LESSON_LIFECYCLES,
  runDebtGate,
  runEntropyGate,
  runLessonContradictionGate,
  runVersionScopeGate,
  runAllGates,
  buildDecisionRecord,
  appendDecisionRecord,
  parseDecisionRecords,
  readDecisionRecords,
  DECISION_ACTIONS,
  RECONSTRUCTION_TRIGGERS,
  evaluateReconstructionTriggers,
  buildReconstructionIntentStub,
  CHAOS_LEVELS,
  CHAOS_SPIKE_THRESHOLD,
  computeChaosCoefficient,
  estimateDeltaChaos,
  compareChaosSnapshots,
  buildChaosSnapshot,
  appendChaosSnapshot,
  parseChaosHistory,
  readChaosHistory,
} = require('../../src/lib/observation');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-observation-'));
}

// ---------------------------------------------------------------------------
// computeDebtScore
// ---------------------------------------------------------------------------

test('computeDebtScore: correct formula', () => {
  const score = computeDebtScore({ severity: 4, urgency: 3, frequency: 4, strategic_value: 5, effort: 3 });
  assert.equal(score, (4 * 3 * 4 * 5) / 3); // 80
});

test('computeDebtScore: returns null for out-of-range value', () => {
  assert.equal(computeDebtScore({ severity: 6, urgency: 3, frequency: 3, strategic_value: 3, effort: 3 }), null);
  assert.equal(computeDebtScore({ severity: 3, urgency: 0, frequency: 3, strategic_value: 3, effort: 3 }), null);
});

test('computeDebtScore: returns null for missing field', () => {
  assert.equal(computeDebtScore({ severity: 3, urgency: 3, frequency: 3, strategic_value: 3 }), null);
});

// ---------------------------------------------------------------------------
// computeEntropyScore
// ---------------------------------------------------------------------------

test('computeEntropyScore: correct formula', () => {
  const score = computeEntropyScore({ severity: 5, spread: 4, coupling: 3, reversibility: 3 });
  assert.equal(score, (5 * 4 * 3) / 3); // 20
});

test('computeEntropyScore: returns null for out-of-range value', () => {
  assert.equal(computeEntropyScore({ severity: 5, spread: 4, coupling: 6, reversibility: 3 }), null);
});

test('computeEntropyScore: returns null for missing field', () => {
  assert.equal(computeEntropyScore({ severity: 5, spread: 4, coupling: 3 }), null);
});

// ---------------------------------------------------------------------------
// debtScoreToTier
// ---------------------------------------------------------------------------

test('debtScoreToTier: tiers', () => {
  assert.equal(debtScoreToTier(10), 'low');
  assert.equal(debtScoreToTier(19.9), 'low');
  assert.equal(debtScoreToTier(20), 'medium');
  assert.equal(debtScoreToTier(59.9), 'medium');
  assert.equal(debtScoreToTier(60), 'high');
  assert.equal(debtScoreToTier(119.9), 'high');
  assert.equal(debtScoreToTier(120), 'red');
  assert.equal(debtScoreToTier(500), 'red');
});

test('debtScoreToTier: null input returns null', () => {
  assert.equal(debtScoreToTier(null), null);
  assert.equal(debtScoreToTier(undefined), null);
});

// ---------------------------------------------------------------------------
// entropyScoreToTier
// ---------------------------------------------------------------------------

test('entropyScoreToTier: tiers', () => {
  assert.equal(entropyScoreToTier(1), 'low');
  assert.equal(entropyScoreToTier(2.9), 'low');
  assert.equal(entropyScoreToTier(3), 'medium');
  assert.equal(entropyScoreToTier(9.9), 'medium');
  assert.equal(entropyScoreToTier(10), 'high');
  assert.equal(entropyScoreToTier(24.9), 'high');
  assert.equal(entropyScoreToTier(25), 'red');
});

test('entropyScoreToTier: null input returns null', () => {
  assert.equal(entropyScoreToTier(null), null);
});

// ---------------------------------------------------------------------------
// buildDebtItem
// ---------------------------------------------------------------------------

test('buildDebtItem: valid item', () => {
  const { item, errors } = buildDebtItem({
    id: 'D01', type: 'knowledge', severity: 4, urgency: 3,
    frequency: 4, strategic_value: 5, effort: 3,
    source: 'v1.7-I5', current_gap: 'no boundary rule',
  });
  assert.equal(errors, undefined);
  assert.equal(item.id, 'D01');
  assert.equal(item.type, 'knowledge');
  assert.equal(item.status, 'open');
  assert.equal(item.debt_score, 80);
  assert.equal(item.debt_tier, 'high');
  assert.equal(item.source, 'v1.7-I5');
});

test('buildDebtItem: defaults status to open', () => {
  const { item } = buildDebtItem({
    id: 'D02', type: 'technical', severity: 2, urgency: 2,
    frequency: 2, strategic_value: 2, effort: 2,
  });
  assert.equal(item.status, 'open');
});

test('buildDebtItem: invalid type returns errors', () => {
  const { errors } = buildDebtItem({
    id: 'D03', type: 'bogus', severity: 2, urgency: 2,
    frequency: 2, strategic_value: 2, effort: 2,
  });
  assert.ok(errors.some(e => e.includes('type must be')));
});

test('buildDebtItem: missing id returns errors', () => {
  const { errors } = buildDebtItem({
    type: 'technical', severity: 2, urgency: 2,
    frequency: 2, strategic_value: 2, effort: 2,
  });
  assert.ok(errors.some(e => e.includes('id required')));
});

test('buildDebtItem: out-of-range score field returns errors', () => {
  const { errors } = buildDebtItem({
    id: 'D04', type: 'technical', severity: 6, urgency: 2,
    frequency: 2, strategic_value: 2, effort: 2,
  });
  assert.ok(errors.some(e => e.includes('1–5')));
});

// ---------------------------------------------------------------------------
// buildEntropyItem
// ---------------------------------------------------------------------------

test('buildEntropyItem: valid item', () => {
  const { item, errors } = buildEntropyItem({
    id: 'E01', type: 'naming', severity: 5, spread: 4,
    coupling: 3, reversibility: 3,
    description: 'catalog vs release ledger',
  });
  assert.equal(errors, undefined);
  assert.equal(item.id, 'E01');
  assert.equal(item.type, 'naming');
  assert.equal(item.entropy_score, 20);
  assert.equal(item.entropy_tier, 'high');
});

test('buildEntropyItem: invalid type returns errors', () => {
  const { errors } = buildEntropyItem({
    id: 'E02', type: 'bogus', severity: 3, spread: 3,
    coupling: 3, reversibility: 3,
  });
  assert.ok(errors.some(e => e.includes('type must be')));
});

test('buildEntropyItem: missing id returns errors', () => {
  const { errors } = buildEntropyItem({
    type: 'naming', severity: 3, spread: 3, coupling: 3, reversibility: 3,
  });
  assert.ok(errors.some(e => e.includes('id required')));
});

// ---------------------------------------------------------------------------
// parseDebtIndex
// ---------------------------------------------------------------------------

const DEBT_INDEX_SAMPLE = `# Debt Index

---
id: D01
type: knowledge
status: open
severity: 4
urgency: 3
frequency: 4
strategic_value: 5
effort: 3
debt_score: 80.0
debt_tier: high
source: v1.7-I5
current_gap: no boundary rule
expected_capability: explicit cutoff
proposed_resolution: implement lastReleasedAt
linked_intent: null
linked_lesson: null
review_after: null
---
id: D02
type: technical
status: resolved
severity: 2
urgency: 2
frequency: 2
strategic_value: 2
effort: 2
debt_score: 8.0
debt_tier: low
source: general
current_gap: some gap
expected_capability: some cap
proposed_resolution: done
linked_intent: null
linked_lesson: null
review_after: null
---
`;

test('parseDebtIndex: parses two items', () => {
  const { items, parseErrors } = parseDebtIndex(DEBT_INDEX_SAMPLE);
  assert.equal(parseErrors.length, 0);
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'D01');
  assert.equal(items[0].severity, 4);
  assert.equal(items[0].debt_score, 80);
  assert.equal(items[0].debt_tier, 'high');
  assert.equal(items[1].id, 'D02');
  assert.equal(items[1].status, 'resolved');
});

test('parseDebtIndex: empty file returns empty items', () => {
  const { items } = parseDebtIndex('# Debt Index\n');
  assert.equal(items.length, 0);
});

// ---------------------------------------------------------------------------
// parseEntropyIndex
// ---------------------------------------------------------------------------

const ENTROPY_INDEX_SAMPLE = `# Entropy Index

---
id: E01
type: naming
status: open
severity: 5
spread: 4
coupling: 3
reversibility: 3
entropy_score: 20.0
entropy_tier: high
description: catalog vs release ledger
resolution: terminology correction
affected_files: null
affected_modules: null
linked_intent: null
linked_lesson: null
review_after: null
---
`;

test('parseEntropyIndex: parses one item', () => {
  const { items } = parseEntropyIndex(ENTROPY_INDEX_SAMPLE);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'E01');
  assert.equal(items[0].type, 'naming');
  assert.equal(items[0].entropy_score, 20);
  assert.equal(items[0].entropy_tier, 'high');
});

// ---------------------------------------------------------------------------
// readDebtIndex / readEntropyIndex
// ---------------------------------------------------------------------------

test('readDebtIndex: returns empty when file missing', () => {
  const { items, parseErrors } = readDebtIndex('/nonexistent-path-xyz');
  assert.equal(items.length, 0);
  assert.equal(parseErrors.length, 0);
});

test('readDebtIndex: reads and parses from disk', () => {
  const root = tmpRoot();
  const metaDir = path.join(root, 'intents', '_meta');
  fs.mkdirSync(metaDir, { recursive: true });
  fs.writeFileSync(path.join(metaDir, 'debt-index.md'), DEBT_INDEX_SAMPLE, 'utf8');
  const { items } = readDebtIndex(root);
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'D01');
});

test('readEntropyIndex: returns empty when file missing', () => {
  const { items } = readEntropyIndex('/nonexistent-path-xyz');
  assert.equal(items.length, 0);
});

test('readEntropyIndex: reads and parses from disk', () => {
  const root = tmpRoot();
  const metaDir = path.join(root, 'intents', '_meta');
  fs.mkdirSync(metaDir, { recursive: true });
  fs.writeFileSync(path.join(metaDir, 'entropy-index.md'), ENTROPY_INDEX_SAMPLE, 'utf8');
  const { items } = readEntropyIndex(root);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'E01');
});

// ---------------------------------------------------------------------------
// summariseDebt
// ---------------------------------------------------------------------------

test('summariseDebt: counts tiers and open items', () => {
  const items = [
    { id: 'D01', debt_score: 80, debt_tier: 'high', status: 'open' },
    { id: 'D02', debt_score: 30, debt_tier: 'medium', status: 'resolved' },
    { id: 'D03', debt_score: 10, debt_tier: 'low', status: 'in-progress' },
    { id: 'D04', debt_score: 150, debt_tier: 'red', status: 'open' },
  ];
  const s = summariseDebt(items);
  assert.equal(s.total, 4);
  assert.equal(s.byTier.high, 1);
  assert.equal(s.byTier.medium, 1);
  assert.equal(s.byTier.low, 1);
  assert.equal(s.byTier.red, 1);
  assert.equal(s.openCount, 3); // D01 open, D02 resolved, D03 in-progress, D04 open
});

test('summariseDebt: empty items', () => {
  const s = summariseDebt([]);
  assert.equal(s.total, 0);
  assert.equal(s.openCount, 0);
});

test('summariseDebt: computes tier from debt_score when debt_tier absent', () => {
  const items = [{ id: 'D01', debt_score: 80, status: 'open' }];
  const s = summariseDebt(items);
  assert.equal(s.byTier.high, 1);
});

// ---------------------------------------------------------------------------
// summariseEntropy
// ---------------------------------------------------------------------------

test('summariseEntropy: counts tiers and open items', () => {
  const items = [
    { id: 'E01', entropy_score: 20, entropy_tier: 'high', status: 'open' },
    { id: 'E02', entropy_score: 1, entropy_tier: 'low', status: 'resolved' },
    { id: 'E03', entropy_score: 30, entropy_tier: 'red', status: 'open' },
  ];
  const s = summariseEntropy(items);
  assert.equal(s.total, 3);
  assert.equal(s.byTier.high, 1);
  assert.equal(s.byTier.low, 1);
  assert.equal(s.byTier.red, 1);
  assert.equal(s.openCount, 2);
});

test('summariseEntropy: computes tier from entropy_score when entropy_tier absent', () => {
  const items = [{ id: 'E01', entropy_score: 30, status: 'open' }];
  const s = summariseEntropy(items);
  assert.equal(s.byTier.red, 1);
});

// ---------------------------------------------------------------------------
// DEBT_TYPES / ENTROPY_TYPES constants
// ---------------------------------------------------------------------------

test('DEBT_TYPES includes all required domains', () => {
  const required = ['technical', 'knowledge', 'ux', 'governance', 'test'];
  for (const t of required) assert.ok(DEBT_TYPES.includes(t), `missing: ${t}`);
});

test('ENTROPY_TYPES includes all required domains', () => {
  const required = ['naming', 'workflow', 'state', 'decision'];
  for (const t of required) assert.ok(ENTROPY_TYPES.includes(t), `missing: ${t}`);
});

// ---------------------------------------------------------------------------
// buildLessonItem
// ---------------------------------------------------------------------------

test('buildLessonItem: valid item', () => {
  const { item, errors } = buildLessonItem({
    id: 'L01', domain: 'governance',
    rule: 'Always set decision_summary before apply',
    source: 'D01',
  });
  assert.equal(errors, undefined);
  assert.equal(item.id, 'L01');
  assert.equal(item.status, 'proposed');
  assert.equal(item.level, 'repo');
  assert.equal(item.enforcement, 'none');
  assert.equal(item.rule, 'Always set decision_summary before apply');
});

test('buildLessonItem: accepts accepted status', () => {
  const { item } = buildLessonItem({
    id: 'L02', domain: 'governance', status: 'accepted',
    rule: 'Use timestamp suffix in archive folder names',
  });
  assert.equal(item.status, 'accepted');
});

test('buildLessonItem: invalid domain returns errors', () => {
  const { errors } = buildLessonItem({
    id: 'L03', domain: 'bogus', rule: 'some rule',
  });
  assert.ok(errors.some(e => e.includes('domain must be')));
});

test('buildLessonItem: missing rule returns errors', () => {
  const { errors } = buildLessonItem({ id: 'L04', domain: 'governance', rule: '' });
  assert.ok(errors.some(e => e.includes('rule required')));
});

test('buildLessonItem: missing id returns errors', () => {
  const { errors } = buildLessonItem({ domain: 'governance', rule: 'a rule' });
  assert.ok(errors.some(e => e.includes('id required')));
});

test('buildLessonItem: invalid enforcement returns errors', () => {
  const { errors } = buildLessonItem({
    id: 'L05', domain: 'governance', rule: 'some rule', enforcement: 'robot',
  });
  assert.ok(errors.some(e => e.includes('enforcement must be')));
});

// ---------------------------------------------------------------------------
// parseLessonsIndex
// ---------------------------------------------------------------------------

const LESSONS_INDEX_SAMPLE = `# Lessons Index

---
id: L01
status: accepted
level: repo
domain: governance
source: D01
rule: Always set decision_summary before apply
applies_to: all intents
linked_debt: D01
linked_entropy: null
enforcement: manual
review_after: null
---
id: L02
status: proposed
level: repo
domain: process
source: E01
rule: Use terminology-guard before naming a new concept
applies_to: naming decisions
linked_debt: null
linked_entropy: E01
enforcement: none
review_after: null
---
`;

test('parseLessonsIndex: parses two items', () => {
  const { items, parseErrors } = parseLessonsIndex(LESSONS_INDEX_SAMPLE);
  assert.equal(parseErrors.length, 0);
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'L01');
  assert.equal(items[0].status, 'accepted');
  assert.equal(items[0].enforcement, 'manual');
  assert.equal(items[1].id, 'L02');
  assert.equal(items[1].status, 'proposed');
});

test('parseLessonsIndex: empty file returns empty items', () => {
  const { items } = parseLessonsIndex('# Lessons Index\n');
  assert.equal(items.length, 0);
});

// ---------------------------------------------------------------------------
// readLessonsIndex
// ---------------------------------------------------------------------------

test('readLessonsIndex: returns empty when file missing', () => {
  const { items } = readLessonsIndex('/nonexistent-path-xyz');
  assert.equal(items.length, 0);
});

test('readLessonsIndex: reads and parses from disk', () => {
  const root = tmpRoot();
  const metaDir = path.join(root, 'intents', '_meta');
  fs.mkdirSync(metaDir, { recursive: true });
  fs.writeFileSync(path.join(metaDir, 'lessons-index.md'), LESSONS_INDEX_SAMPLE, 'utf8');
  const { items } = readLessonsIndex(root);
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'L01');
});

// ---------------------------------------------------------------------------
// summariseLessons
// ---------------------------------------------------------------------------

test('summariseLessons: counts by lifecycle status', () => {
  const items = [
    { id: 'L01', status: 'proposed' },
    { id: 'L02', status: 'accepted' },
    { id: 'L03', status: 'accepted' },
    { id: 'L04', status: 'enforced' },
    { id: 'L05', status: 'deprecated' },
  ];
  const s = summariseLessons(items);
  assert.equal(s.total, 5);
  assert.equal(s.byStatus.proposed, 1);
  assert.equal(s.byStatus.accepted, 2);
  assert.equal(s.byStatus.enforced, 1);
  assert.equal(s.byStatus.deprecated, 1);
  assert.equal(s.byStatus.measured, 0);
});

test('summariseLessons: empty items', () => {
  const s = summariseLessons([]);
  assert.equal(s.total, 0);
});

// ---------------------------------------------------------------------------
// LESSON_DOMAINS / LESSON_LIFECYCLES constants
// ---------------------------------------------------------------------------

test('LESSON_DOMAINS includes required domains', () => {
  const required = ['technical', 'governance', 'process', 'documentation'];
  for (const d of required) assert.ok(LESSON_DOMAINS.includes(d), `missing: ${d}`);
});

test('LESSON_LIFECYCLES has all 5 stages', () => {
  assert.equal(LESSON_LIFECYCLES.length, 5);
  assert.ok(LESSON_LIFECYCLES.includes('proposed'));
  assert.ok(LESSON_LIFECYCLES.includes('deprecated'));
});

// ---------------------------------------------------------------------------
// runDebtGate
// ---------------------------------------------------------------------------

test('runDebtGate: pass when no high/red open items', () => {
  const items = [
    { id: 'D01', debt_score: 30, debt_tier: 'medium', status: 'open' },
    { id: 'D02', debt_score: 80, debt_tier: 'high', status: 'resolved' },
  ];
  const r = runDebtGate(items);
  assert.equal(r.status, 'pass');
  assert.equal(r.evidence.length, 0);
});

test('runDebtGate: warn when open high item exists', () => {
  const items = [{ id: 'D01', debt_score: 80, debt_tier: 'high', status: 'open' }];
  const r = runDebtGate(items);
  assert.equal(r.status, 'warn');
  assert.equal(r.evidence.length, 1);
  assert.equal(r.evidence[0].id, 'D01');
  assert.ok(r.recommendedAction);
});

test('runDebtGate: warn when open red item exists', () => {
  const items = [{ id: 'D02', debt_score: 200, debt_tier: 'red', status: 'in-progress' }];
  const r = runDebtGate(items);
  assert.equal(r.status, 'warn');
});

test('runDebtGate: computes tier from debt_score when debt_tier absent', () => {
  const items = [{ id: 'D03', debt_score: 80, status: 'open' }];
  const r = runDebtGate(items);
  assert.equal(r.status, 'warn');
});

// ---------------------------------------------------------------------------
// runEntropyGate
// ---------------------------------------------------------------------------

test('runEntropyGate: pass when no high/red open items', () => {
  const items = [{ id: 'E01', entropy_score: 5, entropy_tier: 'medium', status: 'open' }];
  const r = runEntropyGate(items);
  assert.equal(r.status, 'pass');
});

test('runEntropyGate: warn when open high entropy item', () => {
  const items = [{ id: 'E01', entropy_score: 20, entropy_tier: 'high', status: 'open' }];
  const r = runEntropyGate(items);
  assert.equal(r.status, 'warn');
  assert.ok(r.recommendedAction.includes('entropy'));
});

// ---------------------------------------------------------------------------
// runLessonContradictionGate
// ---------------------------------------------------------------------------

test('runLessonContradictionGate: pass when all same enforcement per domain', () => {
  const items = [
    { id: 'L01', status: 'accepted', domain: 'governance', enforcement: 'manual' },
    { id: 'L02', status: 'accepted', domain: 'governance', enforcement: 'manual' },
  ];
  assert.equal(runLessonContradictionGate(items).status, 'pass');
});

test('runLessonContradictionGate: warn on mixed enforcement in same domain', () => {
  const items = [
    { id: 'L01', status: 'accepted', domain: 'governance', enforcement: 'manual' },
    { id: 'L02', status: 'enforced', domain: 'governance', enforcement: 'gate' },
  ];
  const r = runLessonContradictionGate(items);
  assert.equal(r.status, 'warn');
  assert.equal(r.evidence[0].domain, 'governance');
});

test('runLessonContradictionGate: ignores proposed/deprecated lessons', () => {
  const items = [
    { id: 'L01', status: 'proposed', domain: 'governance', enforcement: 'none' },
    { id: 'L02', status: 'accepted', domain: 'governance', enforcement: 'gate' },
  ];
  assert.equal(runLessonContradictionGate(items).status, 'pass');
});

// ---------------------------------------------------------------------------
// runVersionScopeGate
// ---------------------------------------------------------------------------

test('runVersionScopeGate: pass when no stale resolved items', () => {
  const items = [{ id: 'D01', status: 'resolved', review_after: '2099-01-01' }];
  assert.equal(runVersionScopeGate(items).status, 'pass');
});

test('runVersionScopeGate: warn when resolved item review_after is past', () => {
  const items = [{ id: 'D01', status: 'resolved', review_after: '2020-01-01' }];
  const r = runVersionScopeGate(items);
  assert.equal(r.status, 'warn');
  assert.equal(r.evidence[0].id, 'D01');
});

test('runVersionScopeGate: open items ignored', () => {
  const items = [{ id: 'D01', status: 'open', review_after: '2020-01-01' }];
  assert.equal(runVersionScopeGate(items).status, 'pass');
});

// ---------------------------------------------------------------------------
// runAllGates
// ---------------------------------------------------------------------------

test('runAllGates: pass when all clear', () => {
  const r = runAllGates({
    debtItems: [{ id: 'D01', debt_tier: 'low', debt_score: 10, status: 'open' }],
    entropyItems: [],
    lessonItems: [],
  });
  assert.equal(r.overallStatus, 'pass');
});

test('runAllGates: warn when any gate triggers', () => {
  const r = runAllGates({
    debtItems: [{ id: 'D01', debt_tier: 'red', debt_score: 200, status: 'open' }],
    entropyItems: [],
    lessonItems: [],
  });
  assert.equal(r.overallStatus, 'warn');
  assert.equal(r.gateResults.debt.status, 'warn');
});

// ---------------------------------------------------------------------------
// buildDecisionRecord
// ---------------------------------------------------------------------------

test('buildDecisionRecord: continue-incremental when both low', () => {
  const { record } = buildDecisionRecord({ id: 'DR01', debtLevel: 'low', entropyLevel: 'low' });
  assert.equal(record.action, 'continue-incremental');
});

test('buildDecisionRecord: build-capability when debt high, entropy low', () => {
  const { record } = buildDecisionRecord({ id: 'DR02', debtLevel: 'high', entropyLevel: 'medium' });
  assert.equal(record.action, 'build-capability');
});

test('buildDecisionRecord: refactor-cleanup when debt low, entropy high', () => {
  const { record } = buildDecisionRecord({ id: 'DR03', debtLevel: 'medium', entropyLevel: 'high' });
  assert.equal(record.action, 'refactor-cleanup');
});

test('buildDecisionRecord: create-reconstruction-intent when both high', () => {
  const { record } = buildDecisionRecord({ id: 'DR04', debtLevel: 'red', entropyLevel: 'red' });
  assert.equal(record.action, 'create-reconstruction-intent');
});

test('buildDecisionRecord: auto-generates id when not provided', () => {
  const { record } = buildDecisionRecord({ debtLevel: 'low', entropyLevel: 'low' });
  assert.ok(record.id.startsWith('DR-'));
});

test('buildDecisionRecord: sets decidedAt to ISO string', () => {
  const { record } = buildDecisionRecord({ id: 'DR05', debtLevel: 'low', entropyLevel: 'low' });
  assert.ok(record.decidedAt.includes('T'));
});

// ---------------------------------------------------------------------------
// appendDecisionRecord / readDecisionRecords
// ---------------------------------------------------------------------------

test('appendDecisionRecord: creates file and appends record', () => {
  const root = tmpRoot();
  const { record } = buildDecisionRecord({ id: 'DR01', debtLevel: 'high', entropyLevel: 'low', rationale: 'test' });
  appendDecisionRecord(root, record);
  const { records } = readDecisionRecords(root);
  assert.equal(records.length, 1);
  assert.equal(records[0].id, 'DR01');
  assert.equal(records[0].action, 'build-capability');
});

test('appendDecisionRecord: appends multiple records', () => {
  const root = tmpRoot();
  const { record: r1 } = buildDecisionRecord({ id: 'DR01', debtLevel: 'low', entropyLevel: 'low' });
  const { record: r2 } = buildDecisionRecord({ id: 'DR02', debtLevel: 'red', entropyLevel: 'red' });
  appendDecisionRecord(root, r1);
  appendDecisionRecord(root, r2);
  const { records } = readDecisionRecords(root);
  assert.equal(records.length, 2);
});

test('readDecisionRecords: returns empty when file missing', () => {
  const { records } = readDecisionRecords('/nonexistent-xyz');
  assert.equal(records.length, 0);
});

// ---------------------------------------------------------------------------
// DECISION_ACTIONS constant
// ---------------------------------------------------------------------------

test('DECISION_ACTIONS has all 4 matrix actions', () => {
  assert.equal(DECISION_ACTIONS.length, 4);
  assert.ok(DECISION_ACTIONS.includes('continue-incremental'));
  assert.ok(DECISION_ACTIONS.includes('create-reconstruction-intent'));
});

// ---------------------------------------------------------------------------
// evaluateReconstructionTriggers
// ---------------------------------------------------------------------------

test('evaluateReconstructionTriggers: not triggered when all pass', () => {
  const r = evaluateReconstructionTriggers({
    debt: { status: 'pass', evidence: [] },
    entropy: { status: 'pass', evidence: [] },
    lessonContradiction: { status: 'pass', evidence: [] },
  });
  assert.equal(r.triggered, false);
  assert.equal(r.triggers.length, 0);
});

test('evaluateReconstructionTriggers: debt-red fired when red tier item in debt warn', () => {
  const r = evaluateReconstructionTriggers({
    debt: { status: 'warn', evidence: [{ id: 'D01', debt_tier: 'red', debt_score: 200 }] },
    entropy: { status: 'pass', evidence: [] },
    lessonContradiction: { status: 'pass', evidence: [] },
  });
  assert.equal(r.triggered, true);
  assert.ok(r.triggers.includes('debt-red'));
});

test('evaluateReconstructionTriggers: entropy-red fired when red tier in entropy warn', () => {
  const r = evaluateReconstructionTriggers({
    debt: { status: 'pass', evidence: [] },
    entropy: { status: 'warn', evidence: [{ id: 'E01', entropy_tier: 'red', entropy_score: 100 }] },
    lessonContradiction: { status: 'pass', evidence: [] },
  });
  assert.ok(r.triggers.includes('entropy-red'));
});

test('evaluateReconstructionTriggers: no debt-red when only high tier (not red)', () => {
  const r = evaluateReconstructionTriggers({
    debt: { status: 'warn', evidence: [{ id: 'D01', debt_tier: 'high', debt_score: 80 }] },
    entropy: { status: 'pass', evidence: [] },
    lessonContradiction: { status: 'pass', evidence: [] },
  });
  assert.equal(r.triggered, false);
});

test('evaluateReconstructionTriggers: lesson contradiction fires when > 1 domain', () => {
  const r = evaluateReconstructionTriggers({
    debt: { status: 'pass', evidence: [] },
    entropy: { status: 'pass', evidence: [] },
    lessonContradiction: {
      status: 'warn',
      evidence: [{ domain: 'governance' }, { domain: 'testing' }],
    },
  });
  assert.ok(r.triggers.includes('severe-lesson-contradiction'));
});

// ---------------------------------------------------------------------------
// buildReconstructionIntentStub
// ---------------------------------------------------------------------------

test('buildReconstructionIntentStub: returns stub with required fields', () => {
  const { stub } = buildReconstructionIntentStub({ triggers: ['debt-red'], rationale: 'Red tier debt.' });
  assert.ok(stub.id.startsWith('reconstruct-'));
  assert.equal(stub.changeType, 'refactor');
  assert.ok(stub.decisionSummary.includes('Red tier debt'));
  assert.deepEqual(stub.triggers, ['debt-red']);
  assert.ok(stub.createdAt.includes('T'));
});

test('buildReconstructionIntentStub: fallback decisionSummary when no rationale', () => {
  const { stub } = buildReconstructionIntentStub({ triggers: [], rationale: '' });
  assert.ok(stub.decisionSummary.length > 0);
});

// ---------------------------------------------------------------------------
// RECONSTRUCTION_TRIGGERS constant
// ---------------------------------------------------------------------------

test('RECONSTRUCTION_TRIGGERS contains debt-red and entropy-red', () => {
  assert.ok(RECONSTRUCTION_TRIGGERS.includes('debt-red'));
  assert.ok(RECONSTRUCTION_TRIGGERS.includes('entropy-red'));
});

// ---------------------------------------------------------------------------
// CHAOS_LEVELS constant
// ---------------------------------------------------------------------------

test('CHAOS_LEVELS has 4 levels in order', () => {
  assert.equal(CHAOS_LEVELS.length, 4);
  assert.equal(CHAOS_LEVELS[0].level, 'stable');
  assert.equal(CHAOS_LEVELS[3].level, 'chaotic');
});

test('CHAOS_SPIKE_THRESHOLD is 10', () => {
  assert.equal(CHAOS_SPIKE_THRESHOLD, 10);
});

// ---------------------------------------------------------------------------
// computeChaosCoefficient
// ---------------------------------------------------------------------------

test('computeChaosCoefficient: empty input returns score ~50 and manageable (unknown risk, not zero)', () => {
  const r = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [] });
  assert.equal(r.score, 50);
  assert.equal(r.level, 'manageable');
  assert.equal(r.formula_version, 'subtractive-v2');
  assert.ok(r.aiNote.length > 0);
});

test('computeChaosCoefficient: entropy-red item raises structural signal, score > stable', () => {
  const entropyItems = [{ id: 'E01', entropy_score: 40, entropy_tier: 'red', status: 'open' }];
  const r = computeChaosCoefficient({ debtItems: [], entropyItems, lessonItems: [] });
  assert.ok(r.score > 25, 'Should exceed stable threshold');
  assert.ok(r.breakdown.structural_reduction < 20, 'High entropy reduces structural_reduction below max');
});

test('computeChaosCoefficient: high debt item reduces testing_reduction below max', () => {
  const debtItems = [{ id: 'D01', debt_score: 80, debt_tier: 'high', status: 'open' }];
  const r = computeChaosCoefficient({ debtItems, entropyItems: [], lessonItems: [] });
  assert.ok(r.breakdown.testing_reduction < 15);
});

test('computeChaosCoefficient: resolved items do not contribute (same as baseline)', () => {
  const debtItems = [{ id: 'D01', debt_score: 200, debt_tier: 'red', status: 'resolved' }];
  const entropyItems = [{ id: 'E01', entropy_score: 50, entropy_tier: 'red', status: 'resolved' }];
  const r = computeChaosCoefficient({ debtItems, entropyItems, lessonItems: [] });
  const baseline = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [] });
  assert.equal(r.score, baseline.score);
  assert.equal(r.level, baseline.level);
});

test('computeChaosCoefficient: draft/in-review contributes partially vs open', () => {
  const openDebt  = [{ id: 'D01', debt_score: 120, debt_tier: 'red', status: 'open' }];
  const draftDebt = [{ id: 'D01', debt_score: 120, debt_tier: 'red', status: 'draft' }];
  const open  = computeChaosCoefficient({ debtItems: openDebt,  entropyItems: [], lessonItems: [] });
  const draft = computeChaosCoefficient({ debtItems: draftDebt, entropyItems: [], lessonItems: [] });
  // Draft debt is less bad → higher testing_reduction (more health evidence)
  assert.ok(draft.breakdown.testing_reduction > open.breakdown.testing_reduction);
  assert.ok(open.breakdown.testing_reduction > 0);
});

test('computeChaosCoefficient: test-coverage debt reduces testing health', () => {
  const debtItems = [{ id: 'D03', type: 'test-coverage', status: 'open', severity: 4, debt_score: 48, debt_tier: 'medium' }];
  const r = computeChaosCoefficient({ debtItems, entropyItems: [], lessonItems: [] });
  assert.ok(r.breakdown.testing_reduction < 15);
});

test('computeChaosCoefficient: proposed lessons reduce testing health', () => {
  const lessonItems = [
    { id: 'L01', status: 'proposed' },
    { id: 'L02', status: 'proposed' },
    { id: 'L03', status: 'accepted' },
  ];
  const r = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems });
  assert.ok(r.breakdown.testing_reduction < 15);
});

test('computeChaosCoefficient: module-size debt reduces testing health', () => {
  const debtItems = [{ id: 'D02', type: 'module-size', status: 'open', severity: 4, debt_score: 48, debt_tier: 'medium' }];
  const r = computeChaosCoefficient({ debtItems, entropyItems: [], lessonItems: [] });
  assert.ok(r.breakdown.testing_reduction < 15);
});

test('computeChaosCoefficient: moduleStats coverage gap calculated from LOC', () => {
  const moduleStats = [
    { file: 'a.js', loc: 200, requireCount: 3, hasTests: false },
    { file: 'b.js', loc: 100, requireCount: 2, hasTests: true },
  ];
  const r = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [], moduleStats });
  // 200/300 untested → high bad factor → coverage_reduction should be low
  assert.ok(r.breakdown.coverage_reduction < 10);
  assert.ok(r.breakdown.coverage_reduction >= 0);
});

test('computeChaosCoefficient: moduleStats all tested = full coverage_reduction (20)', () => {
  const moduleStats = [
    { file: 'a.js', loc: 300, requireCount: 5, hasTests: true },
    { file: 'b.js', loc: 200, requireCount: 3, hasTests: true },
  ];
  const r = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [], moduleStats });
  assert.equal(r.breakdown.coverage_reduction, 20);
});

test('computeChaosCoefficient: moduleStats high coupling detected in structural', () => {
  const moduleStats = [{ file: 'a.js', loc: 500, requireCount: 14, hasTests: true }];
  const r1 = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [], moduleStats: [] });
  const r2 = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [], moduleStats });
  // Having moduleStats data gives structural signal; high coupling makes structural_reduction < max
  assert.ok(r2.breakdown.structural_reduction >= r1.breakdown.structural_reduction,
    'Having structural data should give at least as much reduction as no data');
});

test('computeChaosCoefficient: deep scan complexity reduces testing_reduction', () => {
  const moduleStats = [
    {
      file: 'a.js',
      loc: 420,
      requireCount: 9,
      hasTests: true,
      maxCyclomaticPerFunction: 22,
      maxNestingDepth: 9,
      longFunctionCount: 2,
      todoCount: 0,
      fanIn: 3,
      hasCircularDep: false,
    },
  ];
  const r = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [], moduleStats });
  assert.ok(r.breakdown.testing_reduction < 15);
});

test('computeChaosCoefficient: cyclomatic inflation guarded for tiny files (large file has more structural impact)', () => {
  const tiny = computeChaosCoefficient({
    debtItems: [],
    entropyItems: [],
    lessonItems: [],
    moduleStats: [{ file: 'tiny.js', loc: 20, requireCount: 1, hasTests: true, maxCyclomaticPerFunction: 120 }],
  });
  const large = computeChaosCoefficient({
    debtItems: [],
    entropyItems: [],
    lessonItems: [],
    moduleStats: [{ file: 'large.js', loc: 220, requireCount: 1, hasTests: true, maxCyclomaticPerFunction: 120 }],
  });
  // Large file with high cyclomatic → more structural bad → lower structural_reduction
  assert.ok(large.breakdown.structural_reduction <= tiny.breakdown.structural_reduction);
});

test('computeChaosCoefficient: import threshold contributes to structural (high coupling → higher score)', () => {
  const low = computeChaosCoefficient({
    debtItems: [],
    entropyItems: [],
    lessonItems: [],
    moduleStats: [{ file: 'a.js', loc: 180, requireCount: 5, hasTests: true }],
  });
  const high = computeChaosCoefficient({
    debtItems: [],
    entropyItems: [],
    lessonItems: [],
    moduleStats: [{ file: 'a.js', loc: 180, requireCount: 12, hasTests: true }],
  });
  // High coupling → worse structural → lower structural_reduction → higher score
  assert.ok(high.score >= low.score);
});

test('computeChaosCoefficient: todo threshold uses per-file density bands (high todo → less testing health)', () => {
  const mild = computeChaosCoefficient({
    debtItems: [],
    entropyItems: [],
    lessonItems: [],
    moduleStats: [{ file: 'a.js', loc: 200, requireCount: 1, hasTests: true, todoCount: 3 }],
  });
  const high = computeChaosCoefficient({
    debtItems: [],
    entropyItems: [],
    lessonItems: [],
    moduleStats: [{ file: 'a.js', loc: 200, requireCount: 1, hasTests: true, todoCount: 12 }],
  });
  assert.ok(high.breakdown.testing_reduction < mild.breakdown.testing_reduction);
});

test('computeChaosCoefficient: accepted-not-enforced lessons reduce testing health', () => {
  const none = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [] });
  const accepted = computeChaosCoefficient({
    debtItems: [],
    entropyItems: [],
    lessonItems: [{ id: 'L01', status: 'accepted', enforcement: 'manual' }],
  });
  assert.ok(accepted.breakdown.testing_reduction < none.breakdown.testing_reduction);
});

test('computeChaosCoefficient: context signals affect score and dimensions', () => {
  const base = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [], moduleStats: [] });
  const boosted = computeChaosCoefficient({
    debtItems: [],
    entropyItems: [],
    lessonItems: [],
    moduleStats: [],
    contextSignals: {
      statusVerdict: 'attention',
      statusUnboundCount: 3,
      graphStrongCycleCount: 2,
      graphOrphanDocCount: 4,
      intentActiveCount: 5,
      intentStaleCount: 2,
      intentMissingDecisionSummaryCount: 1,
      releaseDaysSinceLast: 45,
      releaseHasCurrent: false,
    },
  });
  // Stale intents → lower intent_reduction; cycles give structural data (higher structural_reduction than no-data)
  assert.ok(boosted.breakdown.structural_reduction > base.breakdown.structural_reduction,
    'Graph cycles provide structural evidence — more reduction than no-data baseline');
  assert.ok(boosted.breakdown.intent_reduction < base.breakdown.intent_reduction,
    'Stale intents lower intent health');
  assert.ok(boosted.breakdown.release_reduction > base.breakdown.release_reduction,
    'Recent release (45d) gives some release evidence');
  assert.ok(boosted.breakdown.coverage_reduction < base.breakdown.coverage_reduction,
    'Orphan docs and unbound reduce coverage health');
});

test('computeChaosCoefficient: todo density from deep scan reduces testing health', () => {
  const moduleStatsClean = [{ file: 'a.js', loc: 400, requireCount: 2, hasTests: true, todoCount: 0 }];
  const moduleStatsTodo  = [{ file: 'a.js', loc: 400, requireCount: 2, hasTests: true, todoCount: 20 }];
  const clean = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [], moduleStats: moduleStatsClean });
  const todo  = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [], moduleStats: moduleStatsTodo });
  assert.ok(todo.breakdown.testing_reduction < clean.breakdown.testing_reduction);
});

test('computeChaosCoefficient: circular dependencies reduce structural_reduction', () => {
  const moduleStatsNoCycle = [{ file: 'a.js', loc: 200, requireCount: 4, hasTests: true, fanIn: 1, hasCircularDep: false }];
  const moduleStatsCycle   = [{ file: 'a.js', loc: 200, requireCount: 4, hasTests: true, fanIn: 1, hasCircularDep: true }];
  const base = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [], moduleStats: moduleStatsNoCycle });
  const cyc  = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [], moduleStats: moduleStatsCycle });
  // Circular dep → more structural bad → lower structural_reduction
  assert.ok(cyc.breakdown.structural_reduction <= base.breakdown.structural_reduction);
});

test('computeChaosCoefficient: returns drivers sorted by score desc', () => {
  const debtItems = [
    { id: 'D01', debt_score: 80, debt_tier: 'high', status: 'open' },
    { id: 'D02', debt_score: 140, debt_tier: 'red', status: 'open' },
  ];
  const r = computeChaosCoefficient({ debtItems, entropyItems: [], lessonItems: [] });
  assert.ok(r.drivers.length >= 1);
  if (r.drivers.length >= 2) {
    assert.ok(r.drivers[0].score >= r.drivers[1].score);
  }
});

test('computeChaosCoefficient: chaotic level when many red items', () => {
  const debtItems = [{ id: 'D01', debt_score: 500, debt_tier: 'red', status: 'open' }];
  const entropyItems = [{ id: 'E01', entropy_score: 100, entropy_tier: 'red', status: 'open' }];
  const moduleStats = Array.from({ length: 10 }, (_, i) => ({
    file: `f${i}.js`, loc: 500, requireCount: 18, hasTests: false,
  }));
  const r = computeChaosCoefficient({ debtItems, entropyItems, lessonItems: [], moduleStats });
  assert.ok(r.score >= 60, 'Expected severe instability with heavy signals');
  assert.equal(r.level, 'chaotic');
});

// ---------------------------------------------------------------------------
// estimateDeltaChaos
// ---------------------------------------------------------------------------

test('estimateDeltaChaos: no factors = zero delta', () => {
  const r = estimateDeltaChaos(50, {});
  assert.equal(r.delta, 0);
  assert.equal(r.projected, 50);
});

test('estimateDeltaChaos: adding uncovered LOC raises projected', () => {
  const r = estimateDeltaChaos(40, { addedUncoveredLOC: 200 });
  assert.ok(r.delta > 0);
  assert.ok(r.projected > 40);
});

test('estimateDeltaChaos: resolving high entropy lowers projected', () => {
  const r = estimateDeltaChaos(60, { resolvedHighEntropy: 1 });
  assert.ok(r.delta < 0);
  assert.ok(r.projected < 60);
});

test('estimateDeltaChaos: spike riskBand when delta >= 10', () => {
  const r = estimateDeltaChaos(40, { addedHighCoupling: 5 });
  assert.ok(r.delta >= 10);
  assert.equal(r.riskBand, 'spike');
});

test('estimateDeltaChaos: safe riskBand when delta < 5 same level', () => {
  const r = estimateDeltaChaos(40, { addedUncoveredLOC: 100 });
  assert.equal(r.riskBand, 'safe');
});

test('estimateDeltaChaos: adding tests reduces delta', () => {
  const r1 = estimateDeltaChaos(50, { newUncoveredModules: 2 });
  const r2 = estimateDeltaChaos(50, { newUncoveredModules: 2, addedTests: 2 });
  assert.ok(r2.projected < r1.projected);
});

test('estimateDeltaChaos: projected capped at 100', () => {
  const r = estimateDeltaChaos(95, { addedHighCoupling: 10 });
  assert.equal(r.projected, 100);
});

test('estimateDeltaChaos: projected floored at 0', () => {
  const r = estimateDeltaChaos(5, { resolvedHighEntropy: 10 });
  assert.equal(r.projected, 0);
});

test('estimateDeltaChaos: projectedLevel matches score thresholds', () => {
  const r = estimateDeltaChaos(20, { resolvedHighEntropy: 2 });
  assert.equal(r.projectedLevel, 'stable');
  const r2 = estimateDeltaChaos(60, {});
  assert.equal(r2.projectedLevel, 'unstable');
});

// ---------------------------------------------------------------------------
// compareChaosSnapshots
// ---------------------------------------------------------------------------

test('compareChaosSnapshots: no previous → hasPrevious false', () => {
  const r = compareChaosSnapshots({ score: 45, level: 'manageable' }, null);
  assert.equal(r.hasPrevious, false);
  assert.equal(r.spikeDetected, false);
  assert.equal(r.delta, null);
});

test('compareChaosSnapshots: positive delta computed correctly', () => {
  const r = compareChaosSnapshots({ score: 55, level: 'unstable' }, { score: 40, level: 'manageable', measuredAt: '2026-04-01' });
  assert.equal(r.hasPrevious, true);
  assert.equal(r.delta, 15);
  assert.equal(r.spikeDetected, true);
});

test('compareChaosSnapshots: spike threshold exactly 10', () => {
  const r = compareChaosSnapshots({ score: 50 }, { score: 40 });
  assert.equal(r.spikeDetected, true);
});

test('compareChaosSnapshots: delta 9 is not a spike', () => {
  const r = compareChaosSnapshots({ score: 49 }, { score: 40 });
  assert.equal(r.spikeDetected, false);
});

test('compareChaosSnapshots: negative delta (improving)', () => {
  const r = compareChaosSnapshots({ score: 30 }, { score: 55 });
  assert.ok(r.delta < 0);
  assert.equal(r.spikeDetected, false);
});

// ---------------------------------------------------------------------------
// buildChaosSnapshot
// ---------------------------------------------------------------------------

test('buildChaosSnapshot: produces snapshot with all breakdown fields', () => {
  const breakdown = { structural_reduction: 12, coverage_reduction: 15, testing_reduction: 8, intent_reduction: 6, release_reduction: 4, other: 0 };
  const { snapshot } = buildChaosSnapshot({ score: 45.5, level: 'manageable', breakdown, drivers: [{ id: 'E01' }] });
  assert.equal(snapshot.score, 45.5);
  assert.equal(snapshot.level, 'manageable');
  assert.equal(snapshot.structural_reduction, 12);
  assert.equal(snapshot.formula_version, 'subtractive-v1');
  assert.equal(snapshot.topDriverIds, 'E01');
  assert.ok(snapshot.measuredAt.includes('T'));
});

test('buildChaosSnapshot: accepts custom measuredAt', () => {
  const breakdown = { structural_reduction: 0, coverage_reduction: 0, testing_reduction: 0, intent_reduction: 0, release_reduction: 0, other: 0 };
  const { snapshot } = buildChaosSnapshot({ score: 10, level: 'stable', breakdown, drivers: [], measuredAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(snapshot.measuredAt, '2026-01-01T00:00:00.000Z');
});

// ---------------------------------------------------------------------------
// appendChaosSnapshot / readChaosHistory
// ---------------------------------------------------------------------------

test('appendChaosSnapshot: creates file and reads back one snapshot', () => {
  const root = tmpRoot();
  const breakdown = { structural_reduction: 12, coverage_reduction: 15, testing_reduction: 8, intent_reduction: 6, release_reduction: 4, other: 0 };
  const { snapshot } = buildChaosSnapshot({ score: 52.3, level: 'unstable', breakdown, drivers: [{ id: 'E01' }, { id: 'D01' }] });
  appendChaosSnapshot(root, snapshot);
  const { snapshots } = readChaosHistory(root);
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].score, 52.3);
  assert.equal(snapshots[0].level, 'unstable');
  assert.equal(snapshots[0].structural_reduction, 12);
});

test('appendChaosSnapshot: appends multiple snapshots', () => {
  const root = tmpRoot();
  const breakdown = { structural_reduction: 10, coverage_reduction: 12, testing_reduction: 8, intent_reduction: 9, release_reduction: 3, other: 0 };
  const { snapshot: s1 } = buildChaosSnapshot({ score: 40, level: 'manageable', breakdown, drivers: [] });
  const { snapshot: s2 } = buildChaosSnapshot({ score: 55, level: 'unstable', breakdown, drivers: [] });
  appendChaosSnapshot(root, s1);
  appendChaosSnapshot(root, s2);
  const { snapshots } = readChaosHistory(root);
  assert.equal(snapshots.length, 2);
});

test('readChaosHistory: returns empty when file missing', () => {
  const { snapshots } = readChaosHistory('/nonexistent-xyz');
  assert.equal(snapshots.length, 0);
});

// ---------------------------------------------------------------------------
// parseChaosHistory
// ---------------------------------------------------------------------------

test('parseChaosHistory: parses numeric fields correctly', () => {
  const raw = `# Chaos History\n\n---\nscore: 45.2\nlevel: manageable\nstructural_reduction: 12.0\ncoverage_reduction: 15.0\ntesting_reduction: 8.0\nintent_reduction: 6.0\nrelease_reduction: 4.0\nformula_version: subtractive-v1\ntopDriverIds: E01, D01\nmeasuredAt: 2026-05-01T10:00:00.000Z\n`;
  const { snapshots } = parseChaosHistory(raw);
  assert.equal(snapshots.length, 1);
  assert.equal(typeof snapshots[0].score, 'number');
  assert.equal(snapshots[0].score, 45.2);
  assert.equal(snapshots[0].structural_reduction, 12);
});



// ---------------------------------------------------------------------------
// Phase 3: docQualitySignals blending into coverageGap
// ---------------------------------------------------------------------------

test('computeChaosCoefficient: contentPlaceholderRatio 1.0 reduces coverage_reduction toward 0', () => {
  const base = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [] });
  const withPlaceholders = computeChaosCoefficient({
    debtItems: [], entropyItems: [], lessonItems: [],
    docQualitySignals: { contentPlaceholderRatio: 1.0 },
  });
  // Full placeholders → r_coverage near 0 → coverage_reduction near 0 (vs base of 20)
  assert.ok(withPlaceholders.breakdown.coverage_reduction < base.breakdown.coverage_reduction,
    `expected coverage_reduction to decrease, got ${withPlaceholders.breakdown.coverage_reduction} vs base ${base.breakdown.coverage_reduction}`);
});

test('computeChaosCoefficient: contentPlaceholderRatio 0.5 reduces coverage_reduction', () => {
  const base = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [] });
  const withPartial = computeChaosCoefficient({
    debtItems: [], entropyItems: [], lessonItems: [],
    docQualitySignals: { contentPlaceholderRatio: 0.5 },
  });
  // Half placeholders → coverage_reduction reduced from 20
  assert.ok(withPartial.breakdown.coverage_reduction < base.breakdown.coverage_reduction,
    `expected coverage_reduction to decrease, got ${withPartial.breakdown.coverage_reduction} vs base ${base.breakdown.coverage_reduction}`);
  assert.ok(withPartial.breakdown.coverage_reduction > 0, 'still some coverage evidence');
});

test('computeChaosCoefficient: zero contentPlaceholderRatio has no effect on coverage_reduction', () => {
  const base = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [] });
  const same = computeChaosCoefficient({
    debtItems: [], entropyItems: [], lessonItems: [],
    docQualitySignals: { contentPlaceholderRatio: 0 },
  });
  assert.equal(same.breakdown.coverage_reduction, base.breakdown.coverage_reduction);
});

test('computeChaosCoefficient: extreme placeholders + bad debt reduces coverage to 0', () => {
  const manyRed = Array.from({ length: 10 }, (_, i) => buildDebtItem({
    id: `D${i}`, type: 'duplication', status: 'open', severity: 'critical', notes: 'n',
  }));
  const result = computeChaosCoefficient({
    debtItems: manyRed, entropyItems: [], lessonItems: [],
    docQualitySignals: { contentPlaceholderRatio: 1.0 },
  });
  assert.ok(result.breakdown.coverage_reduction <= 1);
});


// ---------------------------------------------------------------------------
// Phase 4: riskBand detailed tests
// ---------------------------------------------------------------------------

test('estimateDeltaChaos: projected stable always safe', () => {
  // base = 24 (stable), tiny positive delta -> still stable -> safe
  const r = estimateDeltaChaos(24, { addedUncoveredLOC: 50 });
  assert.equal(r.riskBand, 'safe');
});

test('estimateDeltaChaos: level 1 step up triggers watch not spike', () => {
  // base = 24 (stable, max 25), +2 modules = +3.0 each = +6 -> 30 = manageable
  const r = estimateDeltaChaos(24, { newUncoveredModules: 2 });
  assert.equal(r.projectedLevel, 'manageable');
  assert.equal(r.riskBand, 'watch');
});

test('estimateDeltaChaos: level 2 steps up triggers spike', () => {
  // base = 20 (stable), +15 coupling = +45 -> 65 = unstable (2 levels up)
  const r = estimateDeltaChaos(20, { addedHighCoupling: 5 });
  assert.equal(r.riskBand, 'spike');
});

test('estimateDeltaChaos: projected >= 76 triggers spike', () => {
  const r = estimateDeltaChaos(74, { addedHighCoupling: 1 });
  // 74 + 3 = 77 >= 76 -> spike
  assert.equal(r.riskBand, 'spike');
});

test('estimateDeltaChaos: delta 5-9 same level triggers watch', () => {
  // base = 40 (manageable), +2 coupling = +6 -> 46 still manageable but delta=6 >= 5
  const r = estimateDeltaChaos(40, { addedHighCoupling: 2 });
  assert.equal(r.projectedLevel, 'manageable');
  assert.ok(r.delta >= 5 && r.delta < 10);
  assert.equal(r.riskBand, 'watch');
});

test('estimateDeltaChaos: no warning field in return', () => {
  const r = estimateDeltaChaos(50, {});
  assert.equal(r.warning, undefined);
});

// ---------------------------------------------------------------------------
// computeChaosCoefficient: cognitive drift signals
// ---------------------------------------------------------------------------

test('computeChaosCoefficient: cognitive signals absent → cognitive_reduction = 0, score unchanged vs baseline', () => {
  const base = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [] });
  assert.equal(base.breakdown.cognitive_reduction, 0);
  assert.equal(base.breakdown.cognitive_annotation, false);
  assert.equal(base.score, 50); // structural(0)+coverage(20)+testing(15)+intent(15)+release(0)+cognitive(0)=50
});

test('computeChaosCoefficient: high cognitiveDriftPressure increases cognitive_reduction', () => {
  // drift-pressure removed from formula; cognitiveAgreementDensity takes its place
  const r = computeChaosCoefficient({
    debtItems: [], entropyItems: [], lessonItems: [],
    contextSignals: { cognitiveAgreementDensity: 1.0, cognitiveGroundingGap: 0 },
  });
  // agreementDensity * 8 = 8.0
  assert.equal(r.breakdown.cognitive_reduction, 8.0);
  assert.equal(r.breakdown.cognitive_annotation, true);
  assert.ok(r.score < 50);
});

test('computeChaosCoefficient: all cognitive signals max → cognitive_reduction capped at 15', () => {
  const r = computeChaosCoefficient({
    debtItems: [], entropyItems: [], lessonItems: [],
    contextSignals: { cognitiveAgreementDensity: 1.0, cognitiveGroundingGap: 1.0 },
  });
  // 8 + 7 = 15 — exactly at cap
  assert.equal(r.breakdown.cognitive_reduction, 15);
  assert.equal(r.breakdown.cognitive_annotation, true);
});

test('computeChaosCoefficient: only grounding-gap → annotation true when gap = 1.0 (exceeds 0.6 threshold)', () => {
  const r = computeChaosCoefficient({
    debtItems: [], entropyItems: [], lessonItems: [],
    contextSignals: { cognitiveAgreementDensity: 0, cognitiveGroundingGap: 1.0 },
  });
  // grounding * 7 = 7.0; grounding > 0.6 → annotation true
  assert.equal(r.breakdown.cognitive_reduction, 7.0);
  assert.equal(r.breakdown.cognitive_annotation, true);
});

test('computeChaosCoefficient: low grounding-gap → annotation false (below threshold)', () => {
  const r = computeChaosCoefficient({
    debtItems: [], entropyItems: [], lessonItems: [],
    contextSignals: { cognitiveAgreementDensity: 0, cognitiveGroundingGap: 0.3 },
  });
  // grounding * 7 = 2.1; grounding <= 0.6 → annotation false
  assert.equal(r.breakdown.cognitive_reduction, 2.1);
  assert.equal(r.breakdown.cognitive_annotation, false);
});

test('computeChaosCoefficient: formula_version is subtractive-v2', () => {
  const r = computeChaosCoefficient({ debtItems: [], entropyItems: [], lessonItems: [] });
  assert.equal(r.formula_version, 'subtractive-v2');
});
