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
 * Dimensions (all signals convert to chaos — technical debt, docs, context, difficulty, time):
 *   structural    (30%): coupling/spread entropy → AI cannot isolate a change
 *   debtPressure  (25%): accumulated shortcuts → AI encounters unexpected behaviour
 *   coverageGap   (20%): missing tests/docs → AI cannot verify its own changes
 *   cognitiveLoad (15%): LOC/coupling complexity → AI context overflow → hallucination
 *   instability   (10%): urgency/frequency of open issues → AI model goes stale
 *
 * Optional `moduleStats` enhances accuracy using real LOC data:
 *   [ { file, loc, requireCount, hasTests, churnCount? } ]
 * Optional `contextSignals` feeds phase-2 cross-feature state:
 *   {
 *     statusVerdict, statusUnboundCount,
 *     graphStrongCycleCount, graphOrphanDocCount,
 *     intentActiveCount, intentStaleCount, intentMissingDecisionSummaryCount,
 *     releaseDaysSinceLast, releaseHasCurrent,
 *   }
 *
 * Returns { score, level, breakdown, drivers, aiNote }
 */
function computeChaosCoefficient({ debtItems = [], entropyItems = [], lessonItems = [], moduleStats = [], contextSignals = {}, docQualitySignals = {} }) {
  const effectiveDebt = debtItems.filter(d => _statusWeight(d.status) > 0);
  const effectiveEntropy = entropyItems.filter(e => _statusWeight(e.status) > 0);

  const highRedEntropy = effectiveEntropy.filter(e => {
    const tier = e.entropy_tier || entropyScoreToTier(e.entropy_score);
    return tier === 'high' || tier === 'red';
  });
  const highRedDebt = effectiveDebt.filter(d => {
    const tier = d.debt_tier || debtScoreToTier(d.debt_score);
    return tier === 'high' || tier === 'red';
  });

  // --- 1. Structural entropy (30%) ---
  // Max entropy score among open high/red items.  Red tier ceiling = ~50, normalize there.
  // When moduleStats provided, blend with deep code signals.
  let structural;
  const maxEntropyScore = _weightedMax(effectiveEntropy, 'entropy_score', 'entropy_tier', entropyScoreToTier);
  const kbStructural = Math.min(100, maxEntropyScore / 50 * 100);
  if (moduleStats.length > 0) {
    const deepStructural = _deepStructuralScore(moduleStats);
    structural = kbStructural * 0.55 + deepStructural * 0.45;
  } else {
    structural = kbStructural;
  }

  // --- 2. Debt pressure (25%) ---
  // Max debt score among open high/red items.  Normalize at 200 (above red threshold of 120).
  const maxDebtScore = _weightedMax(effectiveDebt, 'debt_score', 'debt_tier', debtScoreToTier);
  let debtPressure = Math.min(100, maxDebtScore / 200 * 100);

  // --- 3. Coverage gap (20%) ---
  // Measures AI's ability to verify changes.  Sources: test-coverage + knowledge type debts,
  // lesson debt (proposed but not yet accepted = unlearned patterns),
  // and — when moduleStats provided — actual untested LOC ratio.
  let coverageGap;
  if (moduleStats.length > 0) {
    const totalLoc     = moduleStats.reduce((s, m) => s + (m.loc || 0), 0);
    const uncoveredLoc = moduleStats.filter(m => !m.hasTests).reduce((s, m) => s + (m.loc || 0), 0);
    coverageGap = totalLoc > 0 ? (uncoveredLoc / totalLoc) * 100 : 0;
  } else {
    const coverageDebts = effectiveDebt.filter(d => d.type === 'test-coverage' || d.type === 'knowledge');
    const proposedCount = lessonItems.filter(l => l.status === 'proposed').length;
    const acceptedNotEnforcedCount = lessonItems.filter(l => l.status === 'accepted' && l.enforcement !== 'enforced').length;
    const lessonTotal = lessonItems.length || 1;
    const lessonGap = (proposedCount / lessonTotal) * 40;
    const acceptedGap = (acceptedNotEnforcedCount / lessonTotal) * 30;
    const weightedCoverageSeverity = coverageDebts.reduce((s, d) => s + ((d.severity || 1) * _statusWeight(d.status)), 0);
    const weightedCoverageCount = coverageDebts.reduce((s, d) => s + _statusWeight(d.status), 0);
    const debtGap = weightedCoverageCount > 0
      ? (weightedCoverageSeverity / weightedCoverageCount) / 5 * 60
      : 0;
    coverageGap = Math.min(100, debtGap + lessonGap + acceptedGap);
  }

  // --- 4. Cognitive load (15%) ---
  // Measures context size AI needs to hold for any safe change.
  // Sources: module-size + api-design open debts (effort + severity as proxy for complexity).
  // When moduleStats provided: oversized files + deep nesting + long functions.
  let cognitiveLoad;
  if (moduleStats.length > 0) {
    cognitiveLoad = _deepCognitiveScore(moduleStats);
  } else {
    const loadDebts = effectiveDebt.filter(d => d.type === 'module-size' || d.type === 'api-design');
    cognitiveLoad = loadDebts.length > 0
      ? Math.min(100, (loadDebts.reduce((s, d) => s + ((d.severity || 1) * _statusWeight(d.status)), 0)
        / loadDebts.reduce((s, d) => s + _statusWeight(d.status), 0)) / 5 * 100)
      : 0;
  }

  // Deep scan hygiene debt pressure bump (TODO/FIXME density) — only when scan exists.
  if (moduleStats.length > 0) {
    const todoFactor = _deepTodoScore(moduleStats);
    const combinedDebt = debtPressure * 0.80 + todoFactor * 0.20;
    debtPressure = Math.min(100, combinedDebt);

    // Gap 1: accepted but not enforced lessons still leave practical blind spots.
    const lessonTotal = lessonItems.length || 1;
    const acceptedNotEnforcedCount = lessonItems.filter(l => l.status === 'accepted' && l.enforcement !== 'enforced').length;
    const acceptedGap = (acceptedNotEnforcedCount / lessonTotal) * 30;
    coverageGap = Math.min(100, coverageGap + acceptedGap);
  }

  // --- 5. Instability (10%) ---
  // How fast is this repo changing?  AI model of the system goes stale faster under churn.
  // Sources: urgency + frequency (debt) or urgency + spread (entropy) of open high/red items.
  // When moduleStats: churnCount-weighted LOC ratio supplements KB signal.
  const unstableItems = [...highRedDebt, ...highRedEntropy];
  let instability = 0;
  if (unstableItems.length > 0) {
    let weightedSum = 0;
    let weightedCount = 0;
    for (const i of unstableItems) {
      const w = _statusWeight(i.status);
      if (w <= 0) continue;
      const u = i.urgency || i.severity || 1;
      const f = i.frequency || i.spread || 1;
      weightedSum += ((u + f) / 2) * w;
      weightedCount += w;
    }
    const avgUrgency = weightedCount > 0 ? weightedSum / weightedCount : 0;
    instability = Math.min(100, avgUrgency / 5 * 100);
  }
  if (moduleStats.length > 0) {
    const totalLoc  = moduleStats.reduce((s, m) => s + (m.loc || 0), 0);
    const churnLoc  = moduleStats.filter(m => (m.churnCount || 0) >= 3).reduce((s, m) => s + (m.loc || 0), 0);
    const churnFactor = totalLoc > 0 ? Math.min(100, (churnLoc / totalLoc) * 100 * 2) : 0;
    instability = instability * 0.5 + churnFactor * 0.5;
  }

  // Phase 2 (Gap 5): blend in cross-feature KB signals.
  if (contextSignals && typeof contextSignals === 'object') {
    const {
      statusVerdict = 'clean',
      statusUnboundCount = 0,
      graphStrongCycleCount = 0,
      graphOrphanDocCount = 0,
      intentActiveCount = 0,
      intentStaleCount = 0,
      intentMissingDecisionSummaryCount = 0,
      releaseDaysSinceLast = null,
      releaseHasCurrent = true,
    } = contextSignals;

    let structuralBoost = 0;
    structuralBoost += Math.min(30, graphStrongCycleCount * 6);
    structuralBoost += Math.min(20, graphOrphanDocCount * 1.5);
    structuralBoost += Math.min(20, intentMissingDecisionSummaryCount * 4);
    structural = Math.min(100, structural + structuralBoost);

    let coverageBoost = 0;
    coverageBoost += Math.min(35, statusUnboundCount * 3);
    if (!releaseHasCurrent) coverageBoost += 20;
    coverageGap = Math.min(100, coverageGap + coverageBoost);

    let cognitiveBoost = 0;
    if (intentActiveCount >= 8) cognitiveBoost += 20;
    else if (intentActiveCount >= 5) cognitiveBoost += 12;
    else if (intentActiveCount >= 3) cognitiveBoost += 6;
    cognitiveLoad = Math.min(100, cognitiveLoad + cognitiveBoost);

    let instabilityBoost = 0;
    if (statusVerdict === 'blocked') instabilityBoost += 30;
    else if (statusVerdict === 'attention') instabilityBoost += 15;
    instabilityBoost += Math.min(25, intentStaleCount * 5);
    if (typeof releaseDaysSinceLast === 'number') {
      if (releaseDaysSinceLast >= 90) instabilityBoost += 25;
      else if (releaseDaysSinceLast >= 60) instabilityBoost += 15;
      else if (releaseDaysSinceLast >= 30) instabilityBoost += 8;
    }
    instability = Math.min(100, instability + instabilityBoost);
  }

  // Phase 3 (Gap 3): KB doc quality — placeholder ratio widens coverage gap.
  if (docQualitySignals && typeof docQualitySignals === 'object') {
    const { contentPlaceholderRatio = 0 } = docQualitySignals;
    coverageGap = Math.min(100, coverageGap + contentPlaceholderRatio * 30);
  }

  const raw = structural * 0.30 + debtPressure * 0.25 + coverageGap * 0.20 + cognitiveLoad * 0.15 + instability * 0.10;
  const score = Math.min(100, Math.round(raw * 10) / 10);
  const chaosLevel = _chaosLevelFor(score);

  const breakdown = {
    structural:   Math.round(structural * 10)    / 10,
    debtPressure: Math.round(debtPressure * 10)  / 10,
    coverageGap:  Math.round(coverageGap * 10)   / 10,
    cognitiveLoad: Math.round(cognitiveLoad * 10) / 10,
    instability:  Math.round(instability * 10)   / 10,
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

  return { score, level: chaosLevel.level, breakdown, drivers, aiNote: chaosLevel.aiNote };
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
function buildChaosSnapshot({ score, level, breakdown, drivers, measuredAt = null }) {
  return {
    snapshot: {
      score,
      level,
      structural:   breakdown.structural,
      debtPressure: breakdown.debtPressure,
      coverageGap:  breakdown.coverageGap,
      cognitiveLoad: breakdown.cognitiveLoad,
      instability:  breakdown.instability,
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
    `structural: ${snapshot.structural}`,
    `debtPressure: ${snapshot.debtPressure}`,
    `coverageGap: ${snapshot.coverageGap}`,
    `cognitiveLoad: ${snapshot.cognitiveLoad}`,
    `instability: ${snapshot.instability}`,
    `topDriverIds: ${snapshot.topDriverIds || ''}`,
    `measuredAt: ${snapshot.measuredAt}`,
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
  const numFields = ['score', 'structural', 'debtPressure', 'coverageGap', 'cognitiveLoad', 'instability'];
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
