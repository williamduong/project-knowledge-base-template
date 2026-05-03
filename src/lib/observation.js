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
// Chaos coefficient — AI agent confidence model
// ---------------------------------------------------------------------------

/**
 * Levels: stable (0-25) → manageable (26-50) → unstable (51-75) → chaotic (76-100).
 * Semantics: how confident can an AI agent be when working in this repo?
 *   stable     = every area can be explained; AI works with high confidence
 *   manageable = minor blind spots; AI needs extra verification per change
 *   unstable   = significant blind spots + structural issues; AI likely to regress
 *   chaotic    = pervasive issues; AI should not attempt unguided changes
 */
const CHAOS_LEVELS = [
  { max: 25,  level: 'stable',     label: 'Stable',     aiNote: 'AI can work with high confidence' },
  { max: 50,  level: 'manageable', label: 'Manageable', aiNote: 'AI needs extra verification per change' },
  { max: 75,  level: 'unstable',   label: 'Unstable',   aiNote: 'AI likely to introduce regressions' },
  { max: 100, level: 'chaotic',    label: 'Chaotic',    aiNote: 'AI should not attempt changes without human review' },
];

const CHAOS_SPIKE_THRESHOLD = 10;

function _chaosLevelFor(score) {
  return CHAOS_LEVELS.find(l => score <= l.max) || CHAOS_LEVELS[CHAOS_LEVELS.length - 1];
}

function _avg(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function _normalize(value, ceiling) {
  if (!ceiling || ceiling <= 0) return 0;
  return Math.min(100, (value / ceiling) * 100);
}

function _deepStructuralScore(moduleStats) {
  let points = 0;
  for (const m of moduleStats) {
    const requireCount = m.requireCount || 0;
    const cyclo = m.maxCyclomaticPerFunction || 0;
    const fanIn = m.fanIn || 0;
    const loc = m.loc || 0;

    if (requireCount > 20) points += 1.5;
    else if (requireCount >= 10) points += 0.5;

    // Avoid small-file inflation from tiny mappers/helpers.
    if (loc >= 50) {
      if (cyclo > 100) points += 2.0;
      else if (cyclo >= 51) points += 1.0;
      else if (cyclo >= 20) points += 0.5;
    }

    if (fanIn >= 8) points += 1.0;
    if (m.hasCircularDep) points += 2.0;
  }
  return Math.min(100, points * 5);
}

function _deepCognitiveScore(moduleStats) {
  let points = 0;
  for (const m of moduleStats) {
    const nesting = m.maxNestingDepth || 0;
    const longFunctions = m.longFunctionCount || 0;
    const loc = m.loc || 0;

    if (nesting >= 8) points += 2.0;
    else if (nesting >= 6) points += 1.0;

    if (longFunctions >= 2) points += 3.0;
    else if (longFunctions === 1) points += 1.5;

    if (loc > 300) points += 0.5;
  }
  return Math.min(100, points * 5);
}

function _deepTodoScore(moduleStats) {
  let points = 0;
  for (const m of moduleStats) {
    const loc = m.loc || 0;
    const todoCount = m.todoCount || 0;
    if (loc <= 0) continue;
    const todoPer100Loc = (todoCount / loc) * 100;

    if (todoPer100Loc > 3) points += 1.5;
    else if (todoPer100Loc >= 1) points += 0.5;
  }
  return Math.min(100, points * 5);
}

function _statusWeight(status) {
  if (status === 'resolved' || status === 'deferred') return 0;
  if (status === 'draft' || status === 'in-review') return 0.5;
  return 1;
}

function _weightedMax(items, scoreField, tierField, tierFn) {
  let max = 0;
  for (const item of items || []) {
    const tier = item[tierField] || tierFn(item[scoreField]);
    if (tier !== 'high' && tier !== 'red') continue;
    const weight = _statusWeight(item.status);
    if (weight <= 0) continue;
    const weightedScore = (item[scoreField] || 0) * weight;
    if (weightedScore > max) max = weightedScore;
  }
  return max;
}
/**
 * Compute a unified chaos coefficient (0–100) for an AI agent working in this repo.
 *
 * Formula: subtractive-v1 (score = 100 − Σ reductions)
 *   score starts at 100 (maximum uncertainty / unknown risk).
 *   Each group reduces the score when there is positive evidence of health.
 *   Unknown = worst-case, not best-case.
 *
 * Groups and max reductions:
 *   structural    (−20): graph cycles, entropy spread, orphan docs
 *   coverage      (−20): placeholder ratio, unbound docs, untested LOC
 *   testing       (−15): open debt items, lesson gaps, code complexity
 *   intent        (−15): stale intents, missing decision summaries
 *   release       (−10): release cadence, catalog currency
 *   other         (  0): reserved — unknown risks, never reduces
 *
 * Minimum possible score = 20 (other group always held back).
 * Score 100 = fully unknown. Score 20 = fully verified.
 *
 * Optional `moduleStats` enhances accuracy using real LOC data:
 *   [ { file, loc, requireCount, hasTests, churnCount?,
 *       maxCyclomaticPerFunction?, maxNestingDepth?, longFunctionCount?,
 *       todoCount?, fanIn?, hasCircularDep? } ]
 * Optional `contextSignals` feeds cross-feature KB state:
 *   {
 *     statusUnboundCount,
 *     graphStrongCycleCount, graphOrphanDocCount,
 *     intentActiveCount, intentStaleCount, intentMissingDecisionSummaryCount,
 *     releaseDaysSinceLast, releaseHasCurrent,
 *   }
 *
 * Returns { score, level, breakdown, drivers, aiNote, formula_version }
 */
function computeChaosCoefficient({ debtItems = [], entropyItems = [], lessonItems = [], moduleStats = [], contextSignals = {}, docQualitySignals = {} }) {
  const effectiveDebt    = debtItems.filter(d => _statusWeight(d.status) > 0);
  const effectiveEntropy = entropyItems.filter(e => _statusWeight(e.status) > 0);

  const highRedEntropy = effectiveEntropy.filter(e => {
    const tier = e.entropy_tier || entropyScoreToTier(e.entropy_score);
    return tier === 'high' || tier === 'red';
  });
  const highRedDebt = effectiveDebt.filter(d => {
    const tier = d.debt_tier || debtScoreToTier(d.debt_score);
    return tier === 'high' || tier === 'red';
  });

  const {
    statusUnboundCount = 0,
    graphStrongCycleCount = 0,
    graphOrphanDocCount = 0,
    intentStaleCount = 0,
    intentMissingDecisionSummaryCount = 0,
    releaseDaysSinceLast = null,
    releaseHasCurrent = true,
  } = (contextSignals && typeof contextSignals === 'object') ? contextSignals : {};

  const { contentPlaceholderRatio = 0 } =
    (docQualitySignals && typeof docQualitySignals === 'object') ? docQualitySignals : {};

  // --- 1. Structural (max −20) ---
  // r_structural = 0 when no data at all (unknown is not healthy).
  // With data: r = 1 − badFactor; badFactor rises with entropy score, graph cycles, orphan docs.
  let r_structural;
  const maxEntropyScore = _weightedMax(effectiveEntropy, 'entropy_score', 'entropy_tier', entropyScoreToTier);
  const maxEntropyNorm  = Math.min(1.0, maxEntropyScore / 50);
  const cycleNorm       = Math.min(1.0, graphStrongCycleCount * 0.15);
  const orphanNorm      = Math.min(0.3, graphOrphanDocCount / 100);

  if (effectiveEntropy.length === 0 && moduleStats.length === 0 && graphStrongCycleCount === 0) {
    r_structural = 0; // no structural evidence → score stays elevated
  } else {
    const kbBadFactor = maxEntropyNorm + cycleNorm + orphanNorm;
    let badFactor;
    if (moduleStats.length > 0) {
      const deepBad = _deepStructuralScore(moduleStats) / 100;
      badFactor = Math.min(1, kbBadFactor * 0.55 + deepBad * 0.45);
    } else {
      badFactor = Math.min(1, kbBadFactor);
    }
    r_structural = Math.max(0, 1 - badFactor);
  }
  const structural_reduction = Math.round(20 * r_structural * 10) / 10;

  // --- 2. Coverage (max −20) ---
  // r_coverage = 1 − badFactor; badFactor rises with placeholder ratio, unbound docs, untested LOC.
  let r_coverage;
  const graphOrphanNorm = Math.min(0.3, graphOrphanDocCount / 30);
  const unboundNorm     = Math.min(1.0, statusUnboundCount * 0.05);
  if (moduleStats.length > 0) {
    const totalLoc     = moduleStats.reduce((s, m) => s + (m.loc || 0), 0);
    const uncoveredLoc = moduleStats.filter(m => !m.hasTests).reduce((s, m) => s + (m.loc || 0), 0);
    const locRatio     = totalLoc > 0 ? uncoveredLoc / totalLoc : 0;
    r_coverage = Math.max(0, 1 - Math.min(1, locRatio + contentPlaceholderRatio * 0.5 + unboundNorm));
  } else {
    r_coverage = Math.max(0, 1 - Math.min(1, contentPlaceholderRatio + graphOrphanNorm + unboundNorm));
  }
  const coverage_reduction = Math.round(20 * r_coverage * 10) / 10;

  // --- 3. Testing (max −15) ---
  // Aggregates debt pressure, lesson gaps, and deep-scan code complexity signals.
  // r_testing = 1 − totalBad.
  const maxDebtBad = _weightedMax(effectiveDebt, 'debt_score', 'debt_tier', debtScoreToTier) / 200;
  const avgSeverityBad = effectiveDebt.length > 0
    ? Math.min(0.5, (effectiveDebt.reduce((s, d) => s + ((d.severity || 1) * _statusWeight(d.status)), 0)
        / effectiveDebt.reduce((s, d) => s + _statusWeight(d.status), 0)) / 5 * 0.6)
    : 0;
  const debtBadFactor = Math.min(0.9, maxDebtBad + avgSeverityBad);

  const lessonTotal = lessonItems.length || 1;
  const proposedCount             = lessonItems.filter(l => l.status === 'proposed').length;
  const acceptedNotEnforcedCount  = lessonItems.filter(l => l.status === 'accepted' && l.enforcement !== 'enforced').length;
  const lessonGapFactor = Math.min(0.4, (proposedCount / lessonTotal) * 0.4 + (acceptedNotEnforcedCount / lessonTotal) * 0.3);

  let deepCodeBadFactor = 0;
  if (moduleStats.length > 0) {
    const todoBad      = Math.min(0.3, _deepTodoScore(moduleStats) / 100 * 0.3);
    const cognitiveBad = Math.min(0.5, _deepCognitiveScore(moduleStats) / 100 * 0.5);
    deepCodeBadFactor  = Math.min(0.6, todoBad + cognitiveBad);
  }

  const r_testing = Math.max(0, 1 - Math.min(1, debtBadFactor + lessonGapFactor + deepCodeBadFactor));
  const testing_reduction = Math.round(15 * r_testing * 10) / 10;

  // --- 4. Intent (max −15) ---
  // r_intent = 1 − (staleFactor + missingDecisionFactor).
  // Fully healthy when no stale intents and no missing decision summaries.
  const staleFactor          = Math.min(1, intentStaleCount * 0.2);
  const missingDecisionFactor = Math.min(1, intentMissingDecisionSummaryCount * 0.15);
  const r_intent = Math.max(0, 1 - Math.min(1, staleFactor + missingDecisionFactor));
  const intent_reduction = Math.round(15 * r_intent * 10) / 10;

  // --- 5. Release (max −10) ---
  // r_release = 1 − (ageFactor + currentFactor).
  // null releaseDaysSinceLast = never released = worst case (ageFactor = 1.0).
  let ageFactor;
  if (typeof releaseDaysSinceLast !== 'number') {
    ageFactor = 1.0;
  } else if (releaseDaysSinceLast <= 30) {
    ageFactor = 0;
  } else if (releaseDaysSinceLast <= 60) {
    ageFactor = 0.3;
  } else if (releaseDaysSinceLast <= 90) {
    ageFactor = 0.6;
  } else {
    ageFactor = 1.0;
  }
  const currentFactor = releaseHasCurrent ? 0 : 0.3;
  const r_release = Math.max(0, 1 - Math.min(1, ageFactor + currentFactor));
  const release_reduction = Math.round(10 * r_release * 10) / 10;

  // --- 6. Other (always 0) ---
  // Reserved for unknown risks not yet measurable. Never reduces score.
  // Guarantees minimum score of 20 even for a fully verified codebase.
  const other_reduction = 0;

  // --- Final score ---
  const totalReduction = structural_reduction + coverage_reduction + testing_reduction
    + intent_reduction + release_reduction + other_reduction;
  const score      = Math.min(100, Math.max(0, Math.round((100 - totalReduction) * 10) / 10));
  const chaosLevel = _chaosLevelFor(score);

  const breakdown = {
    structural_reduction,
    coverage_reduction,
    testing_reduction,
    intent_reduction,
    release_reduction,
    other: other_reduction,
  };

  const drivers = [
    ...highRedEntropy.map(e => ({
      kind: 'entropy', id: e.id,
      tier: e.entropy_tier || entropyScoreToTier(e.entropy_score),
      score: e.entropy_score || 0,
    })),
    ...highRedDebt.map(d => ({
      kind: 'debt', id: d.id,
      tier: d.debt_tier || debtScoreToTier(d.debt_score),
      score: d.debt_score || 0,
    })),
  ].sort((a, b) => b.score - a.score).slice(0, 5);

  return { score, level: chaosLevel.level, breakdown, drivers, aiNote: chaosLevel.aiNote, formula_version: 'subtractive-v1' };
}

/**
 * Estimate delta chaos for a planned change, given factor adjustments.
 *
 * factors:
 *   addedUncoveredLOC     — LOC added without tests (+1.0 per 100 LOC, weight via coverageGap)
 *   newUncoveredModules   — new command/lib files without tests (+1.5 each)
 *   addedHighCoupling     — new high-coupling modules (requireCount > 8) (+3.0 each)
 *   resolvedHighEntropy   — entropy items resolved (-6.0 each — largest structural relief)
 *   resolvedHighDebt      — debt items resolved (-3.0 each)
 *   addedTests            — new test modules (-1.5 each — coverage improves)
 *   resolvedCoverageDebt  — test-coverage debt items closed (-2.5 each)
 *
 * Returns { delta, projected, projectedLevel, riskBand }
 * riskBand: 'safe' | 'watch' | 'spike'
 */
function estimateDeltaChaos(baseScore, factors = {}) {
  const {
    addedUncoveredLOC    = 0,
    newUncoveredModules  = 0,
    addedHighCoupling    = 0,
    resolvedHighEntropy  = 0,
    resolvedHighDebt     = 0,
    addedTests           = 0,
    resolvedCoverageDebt = 0,
  } = factors;

  let delta = 0;
  delta += (addedUncoveredLOC / 100) * 1.0;
  delta += newUncoveredModules * 1.5;
  delta += addedHighCoupling * 3.0;
  delta -= resolvedHighEntropy * 6.0;
  delta -= resolvedHighDebt * 3.0;
  delta -= addedTests * 1.5;
  delta -= resolvedCoverageDebt * 2.5;

  delta = Math.round(delta * 10) / 10;
  const projected       = Math.min(100, Math.max(0, Math.round((baseScore + delta) * 10) / 10));
  const projectedLevel  = _chaosLevelFor(projected).level;
  const baseLevel       = _chaosLevelFor(baseScore).level;

  const LEVEL_ORDER = ['stable', 'manageable', 'unstable', 'chaotic'];
  const baseIdx     = LEVEL_ORDER.indexOf(baseLevel);
  const projIdx     = LEVEL_ORDER.indexOf(projectedLevel);
  const levelDiff   = projIdx - baseIdx;

  let riskBand;
  if (projectedLevel === 'stable') {
    riskBand = 'safe';
  } else if (delta >= 10 || levelDiff >= 2 || projected >= 76) {
    riskBand = 'spike';
  } else if (levelDiff === 1 || (levelDiff === 0 && delta >= 5)) {
    riskBand = 'watch';
  } else {
    riskBand = 'safe';
  }

  return { delta, projected, projectedLevel, riskBand };
}

/**
 * Compare two chaos snapshots to detect spikes and trends.
 * Returns { hasPrevious, delta, spikeDetected, previousScore, previousLevel, previousMeasuredAt }
 */
function compareChaosSnapshots(current, previous) {
  if (!previous) return { hasPrevious: false, delta: null, spikeDetected: false };
  // Skip trend when formula changed — scores are not comparable across formula versions.
  const currentFormula  = current.formula_version  || 'additive-v1';
  const previousFormula = previous.formula_version || 'additive-v1';
  if (currentFormula !== previousFormula) {
    return { hasPrevious: false, delta: null, spikeDetected: false, formulaMismatch: true };
  }
  const delta = Math.round((current.score - previous.score) * 10) / 10;
  return {
    hasPrevious: true,
    delta,
    spikeDetected: delta >= CHAOS_SPIKE_THRESHOLD,
    previousScore: previous.score,
    previousLevel: previous.level,
    previousMeasuredAt: previous.measuredAt,
  };
}

// ---------------------------------------------------------------------------
// Chaos history persistence
// ---------------------------------------------------------------------------

function chaosHistoryPath(contentRoot) {
  return path.join(metaRoot(contentRoot), 'chaos-history.md');
}

/**
 * Build a chaos snapshot record for persistence.
 * Returns { snapshot }
 */
function buildChaosSnapshot({ score, level, breakdown, drivers, measuredAt = null, formula_version = 'subtractive-v1' }) {
  return {
    snapshot: {
      score,
      level,
      structural_reduction: breakdown.structural_reduction != null ? breakdown.structural_reduction : (breakdown.structural || 0),
      coverage_reduction:   breakdown.coverage_reduction   != null ? breakdown.coverage_reduction   : (breakdown.coverageGap || 0),
      testing_reduction:    breakdown.testing_reduction    != null ? breakdown.testing_reduction    : (breakdown.debtPressure || 0),
      intent_reduction:     breakdown.intent_reduction     != null ? breakdown.intent_reduction     : (breakdown.cognitiveLoad || 0),
      release_reduction:    breakdown.release_reduction    != null ? breakdown.release_reduction    : (breakdown.instability || 0),
      formula_version:      formula_version,
      topDriverIds: (drivers || []).map(d => d.id).join(', '),
      measuredAt: measuredAt || new Date().toISOString(),
    },
  };
}

/**
 * Append a chaos snapshot to chaos-history.md.
 * Creates the file if missing.
 */
function appendChaosSnapshot(contentRoot, snapshot) {
  const fp = chaosHistoryPath(contentRoot);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const block = [
    '',
    '---',
    `score: ${snapshot.score}`,
    `level: ${snapshot.level}`,
    `structural_reduction: ${snapshot.structural_reduction}`,
    `coverage_reduction: ${snapshot.coverage_reduction}`,
    `testing_reduction: ${snapshot.testing_reduction}`,
    `intent_reduction: ${snapshot.intent_reduction}`,
    `release_reduction: ${snapshot.release_reduction}`,
    `formula_version: ${snapshot.formula_version || 'subtractive-v1'}`,
    `topDriverIds: ${snapshot.topDriverIds || ''}`,
    `measuredAt: ${snapshot.measuredAt}`,
    // Legacy fields kept for human readability — parseChaosHistory reads new keys
    `structural: ${snapshot.structural_reduction}`,
    `debtPressure: ${snapshot.testing_reduction}`,
    `coverageGap: ${snapshot.coverage_reduction}`,
    `cognitiveLoad: ${snapshot.intent_reduction}`,
    `instability: ${snapshot.release_reduction}`,
    '',
  ].join('\n');
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, '# Chaos History\n\n> Managed by KB Observer (v1.8.1+). Do not edit manually.\n');
  }
  fs.appendFileSync(fp, block);
}

/**
 * Parse chaos-history.md into snapshot list.
 * Chaos snapshots use `measuredAt` (not `id`) as the required anchor field.
 * Returns { snapshots: ChaosSnapshot[] }
 */
function parseChaosHistory(raw) {
  const snapshots = [];
  const numFields = ['score', 'structural_reduction', 'coverage_reduction', 'testing_reduction', 'intent_reduction', 'release_reduction',
    'structural', 'debtPressure', 'coverageGap', 'cognitiveLoad', 'instability']; // legacy names kept for backward compat
  const blocks = raw.split(/^---$/m).map(b => b.trim()).filter(Boolean);
  for (const block of blocks) {
    if (!block.includes(':')) continue;
    const obj = {};
    for (const line of block.split('\n')) {
      const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (!m) continue;
      const [, key, val] = m;
      if (numFields.includes(key)) {
        const n = parseFloat(val);
        obj[key] = isNaN(n) ? val : n;
      } else if (val === 'null' || val === '') {
        obj[key] = null;
      } else {
        obj[key] = val.trim();
      }
    }
    // Require measuredAt to be a valid snapshot block
    if (!obj.measuredAt) continue;
    snapshots.push(obj);
  }
  return { snapshots };
}

/**
 * Read chaos-history.md.
 * Returns { snapshots } or { snapshots: [] } if file missing.
 */
function readChaosHistory(contentRoot) {
  const fp = chaosHistoryPath(contentRoot);
  if (!fs.existsSync(fp)) return { snapshots: [] };
  const raw = fs.readFileSync(fp, 'utf8');
  return parseChaosHistory(raw);
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
  CHAOS_LEVELS,
  CHAOS_SPIKE_THRESHOLD,
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
  computeChaosCoefficient,
  estimateDeltaChaos,
  compareChaosSnapshots,
  buildChaosSnapshot,
  appendChaosSnapshot,
  parseChaosHistory,
  readChaosHistory,
  lessonsIndexPath,
  debtIndexPath,
  entropyIndexPath,
  decisionRecordsPath,
  chaosHistoryPath,
  metaRoot,
};
