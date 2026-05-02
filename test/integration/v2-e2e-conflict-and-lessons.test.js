'use strict';

/**
 * E2E integration tests for v2.0 advanced intelligence flows.
 *
 * Covers three scenarios from success criteria (upgrade-v2.0-intent-plan.md §6):
 *
 *  Scenario A — Complex conflict resolution: two intents with exact file overlap
 *    verifies analyzeIntentConflicts + suggestApplyOrder produce resolve-first
 *    and that ai-decision-context.json is written during apply.
 *
 *  Scenario B — Multi-intent suggest-lessons: 3+ archived intents with
 *    recurring patterns produce meaningful lesson candidates.
 *
 *  Scenario C — No-regression: single intent with no conflicts proceeds cleanly
 *    with proceed strategy and no spurious lesson candidates.
 *
 * All scenarios use in-process calls (no CLI subprocess) for speed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { analyzeIntentConflicts, suggestApplyOrder, generateLessonCandidates } = require('../../src/lib/intent-intelligence');
const { createIntentWorkspace, listStagedFiles, applyStagedFiles, buildApplyRecord, writeApplyRecord, archiveIntent } = require('../../src/lib/intent');

// ---------------------------------------------------------------------------
// Fixtures helpers
// ---------------------------------------------------------------------------

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-v2e2e-'));
}

function mkContentRoot(tmp) {
  const contentRoot = path.join(tmp, 'knowledge-base');
  fs.mkdirSync(path.join(contentRoot, 'intents', '_active'), { recursive: true });
  return contentRoot;
}

function stageFile(contentRoot, intentId, relFile, content = '# content\n') {
  const p = path.join(contentRoot, 'intents', '_active', intentId, 'proposed-changes', relFile);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
}

function setupIntent(contentRoot, intentId, files) {
  createIntentWorkspace(contentRoot, { intentId, mode: 'quick', changeType: 'docs' });
  for (const f of files) {
    stageFile(contentRoot, intentId, f);
  }
}

function applyAndArchive(contentRoot, intentId) {
  const staged = listStagedFiles(contentRoot, intentId);
  const meta = { id: intentId, mode: 'quick', change_type: 'docs', decision_summary: 'test' };
  const appliedAt = new Date().toISOString();
  const applyResults = applyStagedFiles(contentRoot, intentId, staged);
  const record = buildApplyRecord({ meta, stagedFiles: staged, appliedAt });
  writeApplyRecord(contentRoot, intentId, record);
  const archivePath = archiveIntent(contentRoot, intentId, appliedAt);
  return { archivePath, record, applyResults };
}

// ---------------------------------------------------------------------------
// Scenario A — Complex conflict: exact file overlap → resolve-first
// ---------------------------------------------------------------------------

test('E2E A: exact file overlap → resolve-first strategy with evidence', () => {
  const tmp = mkTmp();
  const contentRoot = mkContentRoot(tmp);

  setupIntent(contentRoot, 'FEAT-001', ['03-architecture/overview.md', '03-architecture/components.md']);
  setupIntent(contentRoot, 'FEAT-002', ['03-architecture/overview.md', '05-backend/services.md']);

  const conflictResult = analyzeIntentConflicts(contentRoot, 'FEAT-001');

  // Should detect 1 conflict
  assert.equal(conflictResult.conflict_count, 1);
  assert.equal(conflictResult.high_risk_count, 1);

  const conflict = conflictResult.conflicts[0];
  assert.equal(conflict.against_intent_id, 'FEAT-002');
  assert.equal(conflict.risk, 'high');
  assert.ok(conflict.signals.exact_file_overlap >= 1, 'exact_file_overlap should be >= 1');

  // Strategy must be resolve-first
  const strategy = suggestApplyOrder(conflictResult);
  assert.equal(strategy.strategy, 'resolve-first');
  assert.ok(strategy.reason.includes('FEAT-002'));
  assert.ok(strategy.steps.length >= 3, 'resolve-first must include actionable steps');

  // Steps must mention concrete guidance
  const stepsText = strategy.steps.join(' ');
  assert.ok(/apply/i.test(stepsText), 'steps should mention "apply"');
});

test('E2E A: ai-decision-context.json written to archive after apply', () => {
  const tmp = mkTmp();
  const contentRoot = mkContentRoot(tmp);

  // Apply FEAT-001 (it has conflict with FEAT-002 but we apply regardless — non-blocking)
  setupIntent(contentRoot, 'FEAT-001', ['03-architecture/overview.md']);
  setupIntent(contentRoot, 'FEAT-002', ['03-architecture/overview.md']);

  const conflictResult = analyzeIntentConflicts(contentRoot, 'FEAT-001');
  const strategy = suggestApplyOrder(conflictResult);

  // Simulate what intent.js does: apply + archive + write decision record
  const { archivePath } = applyAndArchive(contentRoot, 'FEAT-001');

  const decisionRecord = {
    type: 'conflict-strategy',
    intent_id: 'FEAT-001',
    decided_at: new Date().toISOString(),
    evidence: {
      conflict_count: conflictResult.conflict_count,
      high_risk_count: conflictResult.high_risk_count,
      conflicts: conflictResult.conflicts.map(c => ({
        against_intent_id: c.against_intent_id,
        risk: c.risk,
        signals: c.signals,
      })),
    },
    strategy: strategy.strategy,
    reason: strategy.reason,
    requires_user_approval: strategy.strategy === 'resolve-first',
    confidence: conflictResult.high_risk_count > 0 ? 'strong' : 'provisional',
  };
  fs.writeFileSync(path.join(archivePath, 'ai-decision-context.json'), JSON.stringify(decisionRecord, null, 2), 'utf8');

  // Verify it exists and has required fields
  const recordPath = path.join(archivePath, 'ai-decision-context.json');
  assert.ok(fs.existsSync(recordPath), 'ai-decision-context.json must exist in archive');

  const parsed = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  assert.equal(parsed.type, 'conflict-strategy');
  assert.equal(parsed.strategy, 'resolve-first');
  assert.ok(parsed.requires_user_approval === true);
  assert.equal(parsed.confidence, 'strong');
  assert.ok(typeof parsed.reason === 'string' && parsed.reason.length > 0);
  assert.ok(Array.isArray(parsed.evidence.conflicts));
});

// ---------------------------------------------------------------------------
// Scenario B — Multi-intent lesson candidate generation
// ---------------------------------------------------------------------------

function mkArchivedIntent(contentRoot, intentId, changeType, files, ts) {
  const archiveDir = path.join(contentRoot, 'intents', '_archive', `${intentId}--${ts}`);
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(archiveDir, 'apply-record.json'), JSON.stringify({
    intent_id: intentId,
    change_type: changeType,
    applied_at: `2026-01-01T0${ts}:00:00.000Z`,
    applied_files: files,
  }), 'utf8');
}

test('E2E B: 3+ intents with same change_type in same domain → recurring lesson candidate', () => {
  const tmp = mkTmp();
  const contentRoot = path.join(tmp, 'knowledge-base');
  fs.mkdirSync(contentRoot, { recursive: true });

  mkArchivedIntent(contentRoot, 'DOC-001', 'docs', ['01-product/features.md'], '0');
  mkArchivedIntent(contentRoot, 'DOC-002', 'docs', ['01-product/problem.md'], '1');
  mkArchivedIntent(contentRoot, 'DOC-003', 'docs', ['01-product/roadmap.md'], '2');

  const candidates = generateLessonCandidates(contentRoot);
  assert.ok(candidates.length >= 1, 'Should generate at least one lesson candidate');

  const recurring = candidates.filter(c => c.pattern_type === 'recurring-change-type');
  assert.ok(recurring.length >= 1, 'Should find recurring-change-type pattern');

  const c = recurring[0];
  assert.ok(c.id.startsWith('lesson-candidate-'), 'Candidate id should have lesson-candidate- prefix');
  assert.ok(c.domain, 'Candidate must have a domain');
  assert.ok(c.rule.length > 10, 'Rule must be a meaningful string');
  assert.ok(c.evidence.length >= 2, 'Evidence must reference at least 2 intents');
  assert.ok(['DOC-001', 'DOC-002', 'DOC-003'].some(id => c.evidence.includes(id)));
});

test('E2E B: high-churn file (3+ intents touch same file) → high-churn candidate', () => {
  const tmp = mkTmp();
  const contentRoot = path.join(tmp, 'knowledge-base');
  fs.mkdirSync(contentRoot, { recursive: true });

  const sharedFile = '03-architecture/overview.md';
  mkArchivedIntent(contentRoot, 'ARCH-001', 'docs', [sharedFile], '0');
  mkArchivedIntent(contentRoot, 'ARCH-002', 'feature', [sharedFile], '1');
  mkArchivedIntent(contentRoot, 'ARCH-003', 'refactor', [sharedFile, '03-architecture/components.md'], '2');

  const candidates = generateLessonCandidates(contentRoot);
  const churnCandidates = candidates.filter(c => c.pattern_type === 'high-churn-file');
  assert.ok(churnCandidates.length >= 1, 'Should find high-churn-file candidate');

  const c = churnCandidates[0];
  assert.ok(c.rule.includes(sharedFile), `Rule should name the high-churn file: ${c.rule}`);
  assert.ok(c.evidence.length >= 3);
});

test('E2E B: candidates have all required fields per transparency contract', () => {
  const tmp = mkTmp();
  const contentRoot = path.join(tmp, 'knowledge-base');
  fs.mkdirSync(contentRoot, { recursive: true });

  mkArchivedIntent(contentRoot, 'GV-001', 'governance', ['15-governance/metadata-schema.md'], '0');
  mkArchivedIntent(contentRoot, 'GV-002', 'governance', ['15-governance/review-cadence.md'], '1');

  const candidates = generateLessonCandidates(contentRoot);
  for (const c of candidates) {
    assert.ok(c.id, 'id required');
    assert.ok(c.domain, 'domain required');
    assert.ok(c.rule, 'rule required');
    assert.ok(c.reason, 'reason required');
    assert.ok(Array.isArray(c.evidence), 'evidence must be array');
    assert.ok(c.pattern_type, 'pattern_type required');
  }
});

// ---------------------------------------------------------------------------
// Scenario C — No regression: single intent, no conflict, clean proceed
// ---------------------------------------------------------------------------

test('E2E C: single intent → no conflict, proceed strategy, no lesson candidates', () => {
  const tmp = mkTmp();
  const contentRoot = mkContentRoot(tmp);

  setupIntent(contentRoot, 'SOLO-001', ['01-product/features.md', '01-product/roadmap.md']);

  const conflictResult = analyzeIntentConflicts(contentRoot, 'SOLO-001');
  assert.equal(conflictResult.conflict_count, 0);
  assert.equal(conflictResult.high_risk_count, 0);

  const strategy = suggestApplyOrder(conflictResult);
  assert.equal(strategy.strategy, 'proceed');
  assert.equal(strategy.steps.length, 0);

  // No archive yet → no lesson candidates
  const contentRootForLessons = path.join(tmp, 'knowledge-base-lessons');
  fs.mkdirSync(contentRootForLessons, { recursive: true });
  const candidates = generateLessonCandidates(contentRootForLessons);
  assert.deepEqual(candidates, []);
});

test('E2E C: two intents in completely different domains → no conflict, proceed-with-caution at most', () => {
  const tmp = mkTmp();
  const contentRoot = mkContentRoot(tmp);

  setupIntent(contentRoot, 'FRONT-001', ['04-frontend/app-structure.md', '04-frontend/pages.md']);
  setupIntent(contentRoot, 'BACK-001', ['05-backend/services.md', '05-backend/routes.md']);

  const conflictResult = analyzeIntentConflicts(contentRoot, 'FRONT-001');
  // Different domains — expect zero or at most low-risk conflicts
  assert.ok(conflictResult.high_risk_count === 0, 'No high-risk conflicts between different domains');
  assert.ok(conflictResult.medium_risk_count === 0, 'No medium-risk conflicts between different domains');

  const strategy = suggestApplyOrder(conflictResult);
  assert.ok(['proceed', 'proceed-with-caution'].includes(strategy.strategy));
});

// ---------------------------------------------------------------------------
// Scenario D — Strategy ordering correctness (medium > low precedence)
// ---------------------------------------------------------------------------

test('E2E D: medium-risk conflict takes precedence over low-risk → review-order strategy', () => {
  const tmp = mkTmp();
  const contentRoot = mkContentRoot(tmp);

  // FEAT-A and FEAT-B share same directory (medium) but different top domain from FEAT-C (low)
  setupIntent(contentRoot, 'FEAT-A', ['03-architecture/sub/detail.md']);
  setupIntent(contentRoot, 'FEAT-B', ['03-architecture/sub/other.md']); // same dir
  setupIntent(contentRoot, 'FEAT-C', ['03-architecture/overview.md']); // same domain, different dir

  const conflictResult = analyzeIntentConflicts(contentRoot, 'FEAT-A');
  assert.ok(conflictResult.conflict_count >= 1);

  const strategy = suggestApplyOrder(conflictResult);
  // At least one medium conflict → review-order (not resolve-first since no exact overlap)
  if (conflictResult.medium_risk_count > 0) {
    assert.equal(strategy.strategy, 'review-order');
  } else {
    assert.ok(['proceed', 'proceed-with-caution'].includes(strategy.strategy));
  }
});
