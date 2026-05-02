'use strict';

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

module.exports = {
  buildIntentContext,
  analyzeIntentConflicts,
};
