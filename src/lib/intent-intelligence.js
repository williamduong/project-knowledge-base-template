'use strict';

const fs = require('fs');
const path = require('path');

const { listActiveIntentIds, listStagedFiles } = require('./intent');
const { buildGraphData } = require('./graph');

function normalizeRel(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function parentDir(rel) {
  const n = normalizeRel(rel);
  const idx = n.lastIndexOf('/');
  return idx <= 0 ? '' : n.slice(0, idx);
}

function topDomain(rel) {
  const n = normalizeRel(rel);
  const first = n.split('/')[0] || '';
  return first;
}

function intersectCount(a, b) {
  const s = new Set(a);
  let c = 0;
  for (const x of b) {
    if (s.has(x)) c += 1;
  }
  return c;
}

function buildIntentContext(contentRoot, intentId) {
  const staged = listStagedFiles(contentRoot, intentId).map(normalizeRel);
  const stagedSet = new Set(staged);
  const stagedDirs = [...new Set(staged.map(parentDir).filter(Boolean))];
  const domains = [...new Set(staged.map(topDomain).filter(Boolean))];

  let graph = { entities: [], relations: [] };
  try {
    graph = buildGraphData(contentRoot);
  } catch (_) {
    // Keep graph context optional; conflict detection must still work on paths.
  }

  // Graph-neighbor docs touched by staged docs (outbound+inbound on link relations)
  const neighbors = new Set();
  for (const r of graph.relations || []) {
    if (r.type !== 'links') continue;
    if (stagedSet.has(r.from_id)) neighbors.add(r.to_id);
    if (stagedSet.has(r.to_id)) neighbors.add(r.from_id);
  }

  return {
    intent_id: intentId,
    staged_files: staged,
    staged_dirs: stagedDirs,
    domains,
    link_neighbors: [...neighbors].sort(),
  };
}

function analyzeIntentConflicts(contentRoot, intentId) {
  const ids = listActiveIntentIds(contentRoot);
  if (!ids.includes(intentId)) {
    throw new Error(`Intent "${intentId}" not found in active intent set.`);
  }

  const base = buildIntentContext(contentRoot, intentId);
  const conflicts = [];

  for (const otherId of ids) {
    if (otherId === intentId) continue;
    const other = buildIntentContext(contentRoot, otherId);

    const exactOverlap = intersectCount(base.staged_files, other.staged_files);
    const dirOverlap = intersectCount(base.staged_dirs, other.staged_dirs);
    const domainOverlap = intersectCount(base.domains, other.domains);
    const graphNeighborOverlap = intersectCount(base.link_neighbors, other.staged_files)
      + intersectCount(other.link_neighbors, base.staged_files);

    if (exactOverlap === 0 && dirOverlap === 0 && domainOverlap === 0 && graphNeighborOverlap === 0) {
      continue;
    }

    let risk = 'low';
    if (exactOverlap > 0) risk = 'high';
    else if (dirOverlap > 0 || graphNeighborOverlap > 0) risk = 'medium';

    const score = (exactOverlap * 5) + (dirOverlap * 3) + (graphNeighborOverlap * 2) + domainOverlap;

    conflicts.push({
      against_intent_id: otherId,
      risk,
      score,
      signals: {
        exact_file_overlap: exactOverlap,
        same_directory_overlap: dirOverlap,
        same_domain_overlap: domainOverlap,
        graph_neighbor_overlap: graphNeighborOverlap,
      },
    });
  }

  conflicts.sort((a, b) => b.score - a.score || a.against_intent_id.localeCompare(b.against_intent_id));

  return {
    intent_id: intentId,
    total_active_intents: ids.length,
    compared_intents: Math.max(ids.length - 1, 0),
    conflict_count: conflicts.length,
    high_risk_count: conflicts.filter(c => c.risk === 'high').length,
    medium_risk_count: conflicts.filter(c => c.risk === 'medium').length,
    low_risk_count: conflicts.filter(c => c.risk === 'low').length,
    conflicts,
  };
}

/**
 * Given an analyzeIntentConflicts result, suggest a concrete apply strategy.
 * Returns { strategy, reason, steps }.
 * Strategies: 'proceed' | 'proceed-with-caution' | 'review-order' | 'resolve-first'
 */
function suggestApplyOrder(conflictResult) {
  if (!conflictResult || conflictResult.conflict_count === 0) {
    return {
      strategy: 'proceed',
      reason: 'No overlaps detected with other active intents.',
      steps: [],
    };
  }

  const { high_risk_count, medium_risk_count, conflicts } = conflictResult;

  if (high_risk_count > 0) {
    const highRiskIds = conflicts
      .filter(c => c.risk === 'high')
      .map(c => c.against_intent_id);
    return {
      strategy: 'resolve-first',
      reason: `Exact file overlap with: ${highRiskIds.join(', ')}. Applying without coordination risks overwriting concurrent changes.`,
      steps: [
        `Review files shared with: ${highRiskIds.join(', ')}.`,
        'Decide which intent should be applied first.',
        'Apply the higher-priority intent and validate the result.',
        'Then apply or rebase this intent against the updated KB state.',
      ],
    };
  }

  if (medium_risk_count > 0) {
    const mediumIds = conflicts
      .filter(c => c.risk === 'medium')
      .map(c => c.against_intent_id);
    return {
      strategy: 'review-order',
      reason: `Directory-level overlap with: ${mediumIds.join(', ')}. Different files but same folders may interact.`,
      steps: [
        `Apply the higher-priority intent first (${mediumIds[0]}).`,
        'Review resulting KB state before applying this intent.',
      ],
    };
  }

  return {
    strategy: 'proceed-with-caution',
    reason: 'Only domain-level overlap detected. Risk is low but monitor for unexpected interactions.',
    steps: ['Proceed. Review apply results to confirm no unintended interactions.'],
  };
}

// ---------------------------------------------------------------------------
// Lesson candidate generator (v2.0 Phase 2)
// ---------------------------------------------------------------------------

/**
 * Scan all archived intents and detect recurring patterns that suggest lessons.
 * Returns array of candidate objects: { id, domain, rule, reason, evidence, pattern_type }
 * Candidates are human-reviewable suggestions, not yet written to lessons-index.
 */
function generateLessonCandidates(contentRoot) {
  const archiveRoot = path.join(contentRoot, 'intents', '_archive');
  if (!fs.existsSync(archiveRoot)) return [];

  const dirs = fs.readdirSync(archiveRoot, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  // Collect records
  const records = [];
  for (const dir of dirs) {
    const recPath = path.join(archiveRoot, dir, 'apply-record.json');
    if (!fs.existsSync(recPath)) continue;
    let rec;
    try { rec = JSON.parse(fs.readFileSync(recPath, 'utf8')); } catch { continue; }
    const files = (rec.applied_files || []).map(normalizeRel);
    const domains = [...new Set(files.map(topDomain).filter(Boolean))];
    records.push({
      intent_id: rec.intent_id || dir,
      change_type: rec.change_type || null,
      applied_at: rec.applied_at || null,
      files,
      domains,
    });
  }

  if (records.length === 0) return [];

  const candidates = [];
  let candidateSeq = 1;

  // Pattern 1: same change_type repeated ≥ 2 times in same domain
  // Group by (domain, change_type)
  const domainTypeMap = new Map(); // key: `${domain}::${change_type}` → [intent_ids]
  for (const rec of records) {
    if (!rec.change_type) continue;
    for (const domain of rec.domains) {
      const key = `${domain}::${rec.change_type}`;
      if (!domainTypeMap.has(key)) domainTypeMap.set(key, []);
      domainTypeMap.get(key).push(rec.intent_id);
    }
  }
  for (const [key, intentIds] of domainTypeMap) {
    if (intentIds.length < 2) continue;
    const [domain, changeType] = key.split('::');
    candidates.push({
      id: `lesson-candidate-${String(candidateSeq++).padStart(3, '0')}`,
      domain: _mapTechDomain(domain),
      rule: `Recurring "${changeType}" changes in domain "${domain}" suggest a standing pattern. Consider documenting it as an accepted lesson.`,
      reason: `Detected ${intentIds.length} intents with change_type="${changeType}" in domain "${domain}".`,
      evidence: [...new Set(intentIds)],
      pattern_type: 'recurring-change-type',
    });
  }

  // Pattern 2: same file touched by ≥ 3 different intents
  const fileIntentMap = new Map(); // file → Set<intent_id>
  for (const rec of records) {
    for (const f of rec.files) {
      if (!fileIntentMap.has(f)) fileIntentMap.set(f, new Set());
      fileIntentMap.get(f).add(rec.intent_id);
    }
  }
  for (const [file, intentSet] of fileIntentMap) {
    if (intentSet.size < 3) continue;
    const domain = _mapTechDomain(topDomain(file));
    candidates.push({
      id: `lesson-candidate-${String(candidateSeq++).padStart(3, '0')}`,
      domain,
      rule: `File "${file}" has been modified by ${intentSet.size} intents. Consider ownership or governance policy for high-churn files.`,
      reason: `High-churn file: modified by ${intentSet.size} distinct intents.`,
      evidence: [...intentSet].sort(),
      pattern_type: 'high-churn-file',
    });
  }

  return candidates;
}

// Map directory name prefixes to LESSON_DOMAINS values
function _mapTechDomain(dirName) {
  const dn = String(dirName || '').toLowerCase();
  if (/arch|infra|tech/.test(dn)) return 'technical';
  if (/test/.test(dn)) return 'testing';
  if (/doc|knowledge|00-|11-|12-/.test(dn)) return 'documentation';
  if (/governance|15-/.test(dn)) return 'governance';
  if (/security|08-/.test(dn)) return 'security';
  if (/process|workflow/.test(dn)) return 'process';
  if (/product|01-/.test(dn)) return 'knowledge';
  return 'knowledge'; // default
}

module.exports = {
  buildIntentContext,
  analyzeIntentConflicts,
  suggestApplyOrder,
  generateLessonCandidates,
};
