'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEBT_TYPES = [
  'technical', 'knowledge', 'product', 'world', 'ux',
  'automation', 'integration', 'governance', 'test', 'learning',
];

const ENTROPY_TYPES = [
  'naming', 'version/scope', 'workflow', 'state',
  'docs-code mismatch', 'lesson', 'cli', 'decision',
];

const DEBT_STATUSES = ['open', 'in-progress', 'resolved', 'deferred'];
const ENTROPY_STATUSES = ['open', 'in-progress', 'resolved', 'deferred'];

const LESSON_DOMAINS = [
  'technical', 'knowledge', 'ux', 'governance', 'process',
  'testing', 'documentation', 'security', 'learning',
];
const LESSON_LEVELS = ['repo', 'module', 'global'];
const LESSON_LIFECYCLES = ['proposed', 'accepted', 'enforced', 'measured', 'deprecated'];
const LESSON_ENFORCEMENT = ['none', 'manual', 'gate', 'automated'];

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function metaRoot(contentRoot) {
  return path.join(contentRoot, 'intents', '_meta');
}

function debtIndexPath(contentRoot) {
  return path.join(metaRoot(contentRoot), 'debt-index.md');
}

function entropyIndexPath(contentRoot) {
  return path.join(metaRoot(contentRoot), 'entropy-index.md');
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Compute debt score.
 * score = (severity × urgency × frequency × strategic_value) / effort
 * All inputs must be integers 1–5.
 * Returns null if any input is missing or out of range.
 */
function computeDebtScore({ severity, urgency, frequency, strategic_value, effort }) {
  const vals = [severity, urgency, frequency, strategic_value, effort];
  if (vals.some(v => typeof v !== 'number' || v < 1 || v > 5)) return null;
  return (severity * urgency * frequency * strategic_value) / effort;
}

/**
 * Compute entropy score.
 * score = (severity × spread × coupling) / reversibility
 * All inputs must be integers 1–5.
 * Returns null if any input is missing or out of range.
 */
function computeEntropyScore({ severity, spread, coupling, reversibility }) {
  const vals = [severity, spread, coupling, reversibility];
  if (vals.some(v => typeof v !== 'number' || v < 1 || v > 5)) return null;
  return (severity * spread * coupling) / reversibility;
}

/**
 * Normalise a debt_score to tier label.
 * Thresholds from v1.8 calibration dataset (provisional).
 */
function debtScoreToTier(score) {
  if (score === null || score === undefined) return null;
  if (score < 20)  return 'low';
  if (score < 60)  return 'medium';
  if (score < 120) return 'high';
  return 'red';
}

/**
 * Normalise an entropy_score to tier label.
 * Thresholds from v1.8 calibration dataset (provisional).
 */
function entropyScoreToTier(score) {
  if (score === null || score === undefined) return null;
  if (score < 3)  return 'low';
  if (score < 10) return 'medium';
  if (score < 25) return 'high';
  return 'red';
}

// ---------------------------------------------------------------------------
// Debt item schema
// ---------------------------------------------------------------------------

/**
 * Build a validated debt item object.
 * Returns { item } on success or { errors: string[] } on validation failure.
 */
function buildDebtItem({
  id, type, status = 'open', severity, urgency, frequency, strategic_value, effort,
  source = '', current_gap = '', expected_capability = '', proposed_resolution = '',
  linked_intent = null, linked_lesson = null, review_after = null,
}) {
  const errors = [];
  if (!id || typeof id !== 'string') errors.push('id required');
  if (!DEBT_TYPES.includes(type)) errors.push(`type must be one of: ${DEBT_TYPES.join(', ')}`);
  if (!DEBT_STATUSES.includes(status)) errors.push(`status must be one of: ${DEBT_STATUSES.join(', ')}`);
  const score = computeDebtScore({ severity, urgency, frequency, strategic_value, effort });
  if (score === null) errors.push('severity, urgency, frequency, strategic_value, effort must be integers 1–5');

  if (errors.length) return { errors };

  return {
    item: {
      id, type, status, severity, urgency, frequency, strategic_value, effort,
      debt_score: score,
      debt_tier: debtScoreToTier(score),
      source, current_gap, expected_capability, proposed_resolution,
      linked_intent, linked_lesson, review_after,
    },
  };
}

/**
 * Build a validated entropy item object.
 * Returns { item } on success or { errors: string[] } on validation failure.
 */
function buildEntropyItem({
  id, type, status = 'open', severity, spread, coupling, reversibility,
  affected_files = [], affected_modules = [], description = '', resolution = '',
  linked_intent = null, linked_lesson = null, review_after = null,
}) {
  const errors = [];
  if (!id || typeof id !== 'string') errors.push('id required');
  if (!ENTROPY_TYPES.includes(type)) errors.push(`type must be one of: ${ENTROPY_TYPES.join(', ')}`);
  if (!ENTROPY_STATUSES.includes(status)) errors.push(`status must be one of: ${ENTROPY_STATUSES.join(', ')}`);
  const score = computeEntropyScore({ severity, spread, coupling, reversibility });
  if (score === null) errors.push('severity, spread, coupling, reversibility must be integers 1–5');

  if (errors.length) return { errors };

  return {
    item: {
      id, type, status, severity, spread, coupling, reversibility,
      entropy_score: score,
      entropy_tier: entropyScoreToTier(score),
      affected_files, affected_modules, description, resolution,
      linked_intent, linked_lesson, review_after,
    },
  };
}

// ---------------------------------------------------------------------------
// Markdown index parsers
// ---------------------------------------------------------------------------

/**
 * Parse debt-index.md.
 * Format: YAML frontmatter block per item, delimited by `---`.
 *
 * Returns { items: DebtItem[], parseErrors: string[] }
 */
function parseDebtIndex(raw) {
  return _parseIndexFile(raw, 'debt');
}

/**
 * Parse entropy-index.md.
 * Returns { items: EntropyItem[], parseErrors: string[] }
 */
function parseEntropyIndex(raw) {
  return _parseIndexFile(raw, 'entropy');
}

function _parseIndexFile(raw, kind) {
  const items = [];
  const parseErrors = [];

  // Split on YAML blocks delimited by --- lines
  const blocks = raw.split(/^---$/m).map(b => b.trim()).filter(Boolean);

  for (const block of blocks) {
    // Skip title / comment blocks (no key: value pairs)
    if (!block.includes(':')) continue;

    const obj = {};
    for (const line of block.split('\n')) {
      const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (!m) continue;
      const [, key, val] = m;
      // Coerce numeric fields
      const numFields = kind === 'debt'
        ? ['severity', 'urgency', 'frequency', 'strategic_value', 'effort', 'debt_score']
        : ['severity', 'spread', 'coupling', 'reversibility', 'entropy_score'];
      if (numFields.includes(key)) {
        const n = parseFloat(val);
        obj[key] = isNaN(n) ? val : n;
      } else if (val === 'null' || val === '') {
        obj[key] = null;
      } else {
        obj[key] = val.trim();
      }
    }

    if (!obj.id) continue;
    items.push(obj);
  }

  return { items, parseErrors };
}

// ---------------------------------------------------------------------------
// File readers
// ---------------------------------------------------------------------------

/**
 * Read and parse debt-index.md from contentRoot.
 * Returns { items, parseErrors } or { items: [], parseErrors: [] } if file missing.
 */
function readDebtIndex(contentRoot) {
  const fp = debtIndexPath(contentRoot);
  if (!fs.existsSync(fp)) return { items: [], parseErrors: [] };
  const raw = fs.readFileSync(fp, 'utf8');
  return parseDebtIndex(raw);
}

/**
 * Read and parse entropy-index.md from contentRoot.
 * Returns { items, parseErrors } or { items: [], parseErrors: [] } if file missing.
 */
function readEntropyIndex(contentRoot) {
  const fp = entropyIndexPath(contentRoot);
  if (!fs.existsSync(fp)) return { items: [], parseErrors: [] };
  const raw = fs.readFileSync(fp, 'utf8');
  return parseEntropyIndex(raw);
}

// ---------------------------------------------------------------------------
// Summary helpers
// ---------------------------------------------------------------------------

/**
 * Summarise a list of debt items into tier counts.
 * Returns { total, byTier: { low, medium, high, red }, openCount }
 */
function summariseDebt(items) {
  const byTier = { low: 0, medium: 0, high: 0, red: 0 };
  let openCount = 0;
  for (const item of items) {
    const tier = item.debt_tier || debtScoreToTier(item.debt_score);
    if (tier && byTier[tier] !== undefined) byTier[tier]++;
    if (item.status === 'open' || item.status === 'in-progress') openCount++;
  }
  return { total: items.length, byTier, openCount };
}

/**
 * Summarise a list of entropy items into tier counts.
 * Returns { total, byTier: { low, medium, high, red }, openCount }
 */
function summariseEntropy(items) {
  const byTier = { low: 0, medium: 0, high: 0, red: 0 };
  let openCount = 0;
  for (const item of items) {
    const tier = item.entropy_tier || entropyScoreToTier(item.entropy_score);
    if (tier && byTier[tier] !== undefined) byTier[tier]++;
    if (item.status === 'open' || item.status === 'in-progress') openCount++;
  }
  return { total: items.length, byTier, openCount };
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

function lessonsIndexPath(contentRoot) {
  return path.join(metaRoot(contentRoot), 'lessons-index.md');
}

/**
 * Build a validated lesson item object.
 * Returns { item } on success or { errors: string[] } on validation failure.
 */
function buildLessonItem({
  id, status = 'proposed', level = 'repo', domain, source = '',
  rule, applies_to = '',
  linked_debt = null, linked_entropy = null,
  enforcement = 'none', review_after = null,
}) {
  const errors = [];
  if (!id || typeof id !== 'string') errors.push('id required');
  if (!LESSON_LIFECYCLES.includes(status)) errors.push(`status must be one of: ${LESSON_LIFECYCLES.join(', ')}`);
  if (!LESSON_LEVELS.includes(level)) errors.push(`level must be one of: ${LESSON_LEVELS.join(', ')}`);
  if (!LESSON_DOMAINS.includes(domain)) errors.push(`domain must be one of: ${LESSON_DOMAINS.join(', ')}`);
  if (!rule || typeof rule !== 'string' || !rule.trim()) errors.push('rule required');
  if (!LESSON_ENFORCEMENT.includes(enforcement)) errors.push(`enforcement must be one of: ${LESSON_ENFORCEMENT.join(', ')}`);

  if (errors.length) return { errors };

  return {
    item: {
      id, status, level, domain, source,
      rule: rule.trim(), applies_to,
      linked_debt, linked_entropy,
      enforcement, review_after,
    },
  };
}

/**
 * Parse lessons-index.md.
 * Returns { items: LessonItem[], parseErrors: string[] }
 */
function parseLessonsIndex(raw) {
  return _parseIndexFile(raw, 'lesson');
}

/**
 * Read and parse lessons-index.md from contentRoot.
 * Returns { items, parseErrors } or { items: [], parseErrors: [] } if file missing.
 */
function readLessonsIndex(contentRoot) {
  const fp = lessonsIndexPath(contentRoot);
  if (!fs.existsSync(fp)) return { items: [], parseErrors: [] };
  const raw = fs.readFileSync(fp, 'utf8');
  return parseLessonsIndex(raw);
}

/**
 * Summarise lessons by lifecycle status.
 * Returns { total, byStatus: { proposed, accepted, enforced, measured, deprecated } }
 */
function summariseLessons(items) {
  const byStatus = { proposed: 0, accepted: 0, enforced: 0, measured: 0, deprecated: 0 };
  for (const item of items) {
    if (byStatus[item.status] !== undefined) byStatus[item.status]++;
  }
  return { total: items.length, byStatus };
}

// ---------------------------------------------------------------------------
// Gates
// ---------------------------------------------------------------------------

/**
 * Gate: debt threshold warning.
 * Warns when any open debt item reaches high or red tier.
 * Returns { status, evidence, recommendedAction }
 */
function runDebtGate(debtItems) {
  const triggers = debtItems.filter(item => {
    if (item.status === 'resolved' || item.status === 'deferred') return false;
    const tier = item.debt_tier || debtScoreToTier(item.debt_score);
    return tier === 'high' || tier === 'red';
  });
  if (triggers.length === 0) {
    return { status: 'pass', evidence: [], recommendedAction: null };
  }
  return {
    status: 'warn',
    evidence: triggers.map(i => ({ id: i.id, debt_tier: i.debt_tier || debtScoreToTier(i.debt_score), debt_score: i.debt_score })),
    recommendedAction: `${triggers.length} open debt item(s) at high/red tier. Review and create resolution intents.`,
  };
}

/**
 * Gate: entropy threshold warning.
 * Warns when any open entropy item reaches high or red tier.
 */
function runEntropyGate(entropyItems) {
  const triggers = entropyItems.filter(item => {
    if (item.status === 'resolved' || item.status === 'deferred') return false;
    const tier = item.entropy_tier || entropyScoreToTier(item.entropy_score);
    return tier === 'high' || tier === 'red';
  });
  if (triggers.length === 0) {
    return { status: 'pass', evidence: [], recommendedAction: null };
  }
  return {
    status: 'warn',
    evidence: triggers.map(i => ({ id: i.id, entropy_tier: i.entropy_tier || entropyScoreToTier(i.entropy_score), entropy_score: i.entropy_score })),
    recommendedAction: `${triggers.length} open entropy item(s) at high/red tier. Create cleanup or refactor intent.`,
  };
}

/**
 * Gate: lesson contradiction check.
 * Warns when two accepted/enforced lessons from the same domain have conflicting rules
 * (heuristic: same domain + different enforcement levels = potential conflict).
 * Returns { status, evidence, recommendedAction }
 */
function runLessonContradictionGate(lessonItems) {
  const active = lessonItems.filter(l => l.status === 'accepted' || l.status === 'enforced');
  const byDomain = {};
  for (const l of active) {
    if (!byDomain[l.domain]) byDomain[l.domain] = [];
    byDomain[l.domain].push(l);
  }
  const conflicts = [];
  for (const [domain, lessons] of Object.entries(byDomain)) {
    const enforcements = new Set(lessons.map(l => l.enforcement));
    if (enforcements.size > 1) {
      conflicts.push({ domain, lesson_ids: lessons.map(l => l.id), enforcements: [...enforcements] });
    }
  }
  if (conflicts.length === 0) {
    return { status: 'pass', evidence: [], recommendedAction: null };
  }
  return {
    status: 'warn',
    evidence: conflicts,
    recommendedAction: 'Review lessons with mixed enforcement levels in same domain. Align or promote to consistent enforcement.',
  };
}

/**
 * Gate: docs/runtime version scope consistency check.
 * Warns when debt or entropy items reference version numbers inconsistently
 * (items resolved but referenced version still open, or vice versa).
 * In v1.8 this is a lightweight check: warns if any item has `status: resolved`
 * but `review_after` is set to a past date (suggesting stale resolved items).
 */
function runVersionScopeGate(items) {
  const today = new Date().toISOString().slice(0, 10);
  const stale = items.filter(i =>
    i.status === 'resolved' &&
    i.review_after &&
    typeof i.review_after === 'string' &&
    i.review_after < today
  );
  if (stale.length === 0) {
    return { status: 'pass', evidence: [], recommendedAction: null };
  }
  return {
    status: 'warn',
    evidence: stale.map(i => ({ id: i.id, review_after: i.review_after })),
    recommendedAction: `${stale.length} resolved item(s) have passed their review_after date. Confirm still resolved or re-open.`,
  };
}

/**
 * Run all gates on a full observation snapshot.
 * Returns { gateResults: { debt, entropy, lessonContradiction, versionScope }, overallStatus }
 */
function runAllGates({ debtItems = [], entropyItems = [], lessonItems = [] }) {
  const debt = runDebtGate(debtItems);
  const entropy = runEntropyGate(entropyItems);
  const lessonContradiction = runLessonContradictionGate(lessonItems);
  const versionScope = runVersionScopeGate([...debtItems, ...entropyItems]);

  const anyWarn = [debt, entropy, lessonContradiction, versionScope].some(r => r.status !== 'pass');
  return {
    gateResults: { debt, entropy, lessonContradiction, versionScope },
    overallStatus: anyWarn ? 'warn' : 'pass',
  };
}

// ---------------------------------------------------------------------------
// Decision records
// ---------------------------------------------------------------------------

function decisionRecordsPath(contentRoot) {
  return path.join(metaRoot(contentRoot), 'decision-records.md');
}

const DECISION_ACTIONS = [
  'continue-incremental',
  'build-capability',
  'refactor-cleanup',
  'create-reconstruction-intent',
];

/**
 * Build a decision record from a debt+entropy matrix snapshot.
 * action is determined by plan §6.1 rules:
 *   debt low  + entropy low  → continue-incremental
 *   debt high + entropy low  → build-capability
 *   debt low  + entropy high → refactor-cleanup
 *   debt high + entropy high → create-reconstruction-intent
 *
 * debtLevel and entropyLevel are 'low' | 'medium' | 'high' | 'red'.
 * Returns { record } always (no validation errors — all fields have defaults).
 */
function buildDecisionRecord({
  id, debtLevel, entropyLevel, rationale = '', followUpDate = null, decidedAt = null,
}) {
  const isHigh = l => l === 'high' || l === 'red';
  let action;
  if (!isHigh(debtLevel) && !isHigh(entropyLevel))  action = 'continue-incremental';
  else if (isHigh(debtLevel) && !isHigh(entropyLevel)) action = 'build-capability';
  else if (!isHigh(debtLevel) && isHigh(entropyLevel)) action = 'refactor-cleanup';
  else action = 'create-reconstruction-intent';

  return {
    record: {
      id: id || `DR-${Date.now()}`,
      action,
      debtLevel,
      entropyLevel,
      rationale,
      followUpDate,
      decidedAt: decidedAt || new Date().toISOString(),
    },
  };
}

/**
 * Append a decision record to decision-records.md.
 * Creates the file if it does not exist.
 */
function appendDecisionRecord(contentRoot, record) {
  const fp = decisionRecordsPath(contentRoot);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const block = [
    '',
    '---',
    `id: ${record.id}`,
    `action: ${record.action}`,
    `debtLevel: ${record.debtLevel}`,
    `entropyLevel: ${record.entropyLevel}`,
    `decidedAt: ${record.decidedAt}`,
    `followUpDate: ${record.followUpDate || 'null'}`,
    `rationale: ${record.rationale || ''}`,
    '',
  ].join('\n');

  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, '# Decision Records\n\n> Managed by KB Observer (v1.8+).\n');
  }
  fs.appendFileSync(fp, block);
}

/**
 * Parse decision-records.md.
 * Returns { records: DecisionRecord[] }
 */
function parseDecisionRecords(raw) {
  const { items } = _parseIndexFile(raw, 'decision');
  return { records: items };
}

/**
 * Read decision-records.md.
 * Returns { records } or { records: [] } if file missing.
 */
function readDecisionRecords(contentRoot) {
  const fp = decisionRecordsPath(contentRoot);
  if (!fs.existsSync(fp)) return { records: [] };
  const raw = fs.readFileSync(fp, 'utf8');
  return parseDecisionRecords(raw);
}

// ---------------------------------------------------------------------------
// Reconstruction triggers
// ---------------------------------------------------------------------------

const RECONSTRUCTION_TRIGGERS = [
  'debt-red',
  'entropy-red',
  'repeated-naming-conflict',
  'repeated-version-scope-overlap',
  'severe-lesson-contradiction',
  'docs-runtime-mismatch-blocks-release',
];

/**
 * Evaluate whether reconstruction triggers are fired from current gate results.
 * Returns { triggered: boolean, triggers: string[], rationale: string }
 */
function evaluateReconstructionTriggers(gateResults) {
  const { debt, entropy, lessonContradiction } = gateResults;
  const firedTriggers = [];

  // debt-red: any open item at red tier
  if (debt && debt.status === 'warn') {
    const hasRed = debt.evidence.some(e => (e.debt_tier || debtScoreToTier(e.debt_score)) === 'red');
    if (hasRed) firedTriggers.push('debt-red');
  }

  // entropy-red: any open item at red tier
  if (entropy && entropy.status === 'warn') {
    const hasRed = entropy.evidence.some(e => (e.entropy_tier || entropyScoreToTier(e.entropy_score)) === 'red');
    if (hasRed) firedTriggers.push('entropy-red');
  }

  // severe-lesson-contradiction: contradiction gate triggered with > 1 domain
  if (lessonContradiction && lessonContradiction.status === 'warn' && lessonContradiction.evidence.length > 1) {
    firedTriggers.push('severe-lesson-contradiction');
  }

  if (firedTriggers.length === 0) {
    return { triggered: false, triggers: [], rationale: '' };
  }

  const rationale = `Reconstruction triggers fired: ${firedTriggers.join(', ')}. Stop incremental patching for affected area. Create reconstruction intent.`;
  return { triggered: true, triggers: firedTriggers, rationale };
}

/**
 * Build a reconstruction intent stub.
 * This is a plain object describing the intent to be passed to `createIntentWorkspace`
 * or written as a proposal artifact — not created on disk by this function.
 *
 * Returns { stub: { id, changeType, decisionSummary, triggers, rationale } }
 */
function buildReconstructionIntentStub({ triggers, rationale, areaDescription = '' }) {
  const id = `reconstruct-${Date.now()}`;
  return {
    stub: {
      id,
      changeType: 'refactor',
      decisionSummary: rationale || 'Reconstruction triggered by observation gates.',
      triggers,
      areaDescription,
      createdAt: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  DEBT_TYPES,
  ENTROPY_TYPES,
  DEBT_STATUSES,
  ENTROPY_STATUSES,
  LESSON_DOMAINS,
  LESSON_LEVELS,
  LESSON_LIFECYCLES,
  LESSON_ENFORCEMENT,
  DECISION_ACTIONS,
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
  runDebtGate,
  runEntropyGate,
  runLessonContradictionGate,
  runVersionScopeGate,
  runAllGates,
  buildDecisionRecord,
  appendDecisionRecord,
  parseDecisionRecords,
  readDecisionRecords,
  RECONSTRUCTION_TRIGGERS,
  evaluateReconstructionTriggers,
  buildReconstructionIntentStub,
  lessonsIndexPath,
  debtIndexPath,
  entropyIndexPath,
  decisionRecordsPath,
  metaRoot,
};
