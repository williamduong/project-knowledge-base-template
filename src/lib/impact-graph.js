'use strict';

const fs = require('fs');
const path = require('path');

const Graph = require('graphology');

const { parseFrontmatter } = require('./kb-analysis');
const { listAllDocBindings, normalizeDocPath } = require('./bindings');

const EDGE_KIND_STRONG = 'strong';
const EDGE_KIND_WEAK = 'weak';
const EDGE_KIND_BINDS = 'binds_to';

const NODE_KIND_DOC = 'doc';
const NODE_KIND_CODE = 'code';

function collectMarkdownFiles(root, output = []) {
  if (!fs.existsSync(root)) return output;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.kb') continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(full, output);
      continue;
    }
    if (entry.name.toLowerCase().endsWith('.md')) {
      output.push(full);
    }
  }
  return output;
}

/**
 * Parse a frontmatter list field that may be either:
 *   - block list: `key:\n  - a\n  - b`
 *   - inline list: `key: [a, b]`
 *   - single string: `key: foo`
 * Always returns string[] (possibly empty).
 */
function coerceListField(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((part) => part.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return [trimmed];
}

function readDocFrontmatterFile(absolutePath) {
  if (!fs.existsSync(absolutePath)) return null;
  let raw;
  try {
    raw = fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return null;
  }
  return parseFrontmatter(raw);
}

/**
 * Resolve a related path declared inside a doc relative to that doc's directory,
 * then re-express as relative-from-contentRoot using forward slashes.
 * Returns null if resolved path escapes contentRoot.
 */
function resolveRelatedPath({ contentRoot, fromDocAbsolute, target }) {
  if (typeof target !== 'string' || !target.trim()) return null;
  const docDir = path.dirname(fromDocAbsolute);
  const resolved = path.resolve(docDir, target);
  const rel = path.relative(contentRoot, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.replace(/\\/g, '/');
}

/**
 * Build an in-memory graph from KB content.
 *
 * Nodes:
 *   - Doc node id: relative-from-contentRoot path (forward slashes)
 *     attrs: { kind: 'doc', exists, frontmatter }
 *   - Code node id: prefixed `code:` + path (only if a binding declares it)
 *     attrs: { kind: 'code' }
 *
 * Edges (undirected for relates_*; directed for binds_to):
 *   - related_strong: kind = 'strong'   (BFS traverse)
 *   - related_weak  : kind = 'weak'     (display only; legacy `related:` aliased here)
 *   - bindings.json : kind = 'binds_to' (Doc → Code, directed)
 */
function buildGraph({ contentRoot }) {
  const graph = new Graph({ type: 'mixed', multi: false, allowSelfLoops: false });

  const stats = {
    docs: 0,
    edgesStrong: 0,
    edgesWeak: 0,
    edgesBindsTo: 0,
    legacyRelatedDocs: 0,
    conflictPairs: 0,
  };

  const mdFiles = collectMarkdownFiles(contentRoot);

  // Pass 1: register all doc nodes (so dangling targets become detectable as missing).
  for (const abs of mdFiles) {
    const rel = path.relative(contentRoot, abs).replace(/\\/g, '/');
    if (!graph.hasNode(rel)) {
      graph.addNode(rel, { kind: NODE_KIND_DOC, exists: true, frontmatter: null });
    }
  }

  // Pass 2: parse frontmatter, add edges.
  for (const abs of mdFiles) {
    const rel = path.relative(contentRoot, abs).replace(/\\/g, '/');
    const fm = readDocFrontmatterFile(abs);
    graph.setNodeAttribute(rel, 'frontmatter', fm);
    stats.docs += 1;

    if (!fm) continue;

    const strongList = coerceListField(fm.related_strong);
    const weakList = coerceListField(fm.related_weak);
    const legacyList = coerceListField(fm.related);

    if (legacyList.length > 0 && weakList.length === 0 && strongList.length === 0) {
      stats.legacyRelatedDocs += 1;
    } else if (legacyList.length > 0) {
      stats.legacyRelatedDocs += 1;
    }

    // Legacy `related:` is treated as alias of related_weak.
    const effectiveWeak = weakList.concat(legacyList);

    const strongResolved = new Set();
    for (const target of strongList) {
      const resolved = resolveRelatedPath({ contentRoot, fromDocAbsolute: abs, target });
      if (!resolved) continue;
      strongResolved.add(resolved);
      ensureDocNode(graph, resolved);
      addUndirectedEdge(graph, rel, resolved, EDGE_KIND_STRONG, stats);
    }

    for (const target of effectiveWeak) {
      const resolved = resolveRelatedPath({ contentRoot, fromDocAbsolute: abs, target });
      if (!resolved) continue;
      ensureDocNode(graph, resolved);
      if (strongResolved.has(resolved)) {
        // Same doc declared target as both strong and weak in its own frontmatter.
        stats.conflictPairs += 1;
        continue;
      }
      addUndirectedEdge(graph, rel, resolved, EDGE_KIND_WEAK, stats);
    }
  }

  // Pass 3: bindings.
  const bindings = listAllDocBindings(contentRoot);
  for (const b of bindings) {
    const docId = normalizeDocPath(b.doc);
    ensureDocNode(graph, docId);
    for (const codePath of b.paths) {
      const codeId = `code:${codePath}`;
      if (!graph.hasNode(codeId)) {
        graph.addNode(codeId, { kind: NODE_KIND_CODE });
      }
      addDirectedEdge(graph, docId, codeId, EDGE_KIND_BINDS);
    }
  }

  // Recount edges.
  graph.forEachEdge((_edge, attrs) => {
    if (attrs.kind === EDGE_KIND_STRONG) stats.edgesStrong += 1;
    else if (attrs.kind === EDGE_KIND_WEAK) stats.edgesWeak += 1;
    else if (attrs.kind === EDGE_KIND_BINDS) stats.edgesBindsTo += 1;
  });

  return { graph, stats };
}

function ensureDocNode(graph, id) {
  if (!graph.hasNode(id)) {
    graph.addNode(id, { kind: NODE_KIND_DOC, exists: false, frontmatter: null });
  }
}

function addUndirectedEdge(graph, a, b, kind, stats) {
  if (a === b) return;
  let edgeId = null;
  if (graph.hasEdge(a, b)) edgeId = graph.edge(a, b);
  else if (graph.hasEdge(b, a)) edgeId = graph.edge(b, a);

  if (!edgeId) {
    graph.addUndirectedEdge(a, b, { kind });
    return;
  }

  const existingKind = graph.getEdgeAttribute(edgeId, 'kind');
  if (existingKind === kind) return;
  // Strong wins on kind conflict between strong and weak.
  if (existingKind === EDGE_KIND_WEAK && kind === EDGE_KIND_STRONG) {
    graph.setEdgeAttribute(edgeId, 'kind', EDGE_KIND_STRONG);
    if (stats) stats.conflictPairs += 1;
  } else if (existingKind === EDGE_KIND_STRONG && kind === EDGE_KIND_WEAK) {
    if (stats) stats.conflictPairs += 1;
  }
}

function addDirectedEdge(graph, from, to, kind) {
  if (from === to) return;
  if (!graph.hasDirectedEdge(from, to)) {
    graph.addDirectedEdge(from, to, { kind });
  }
}

/**
 * Find code nodes matching a glob/path; for now, exact-match or "code:" prefix.
 * Returns matched node ids (may include zero).
 */
function findCodeNodes(graph, codePath) {
  const id = codePath.startsWith('code:') ? codePath : `code:${codePath}`;
  return graph.hasNode(id) ? [id] : [];
}

/**
 * BFS with depth limit. Traverses ONLY edges of the allowed kinds.
 * Returns: { depthMap: Map<depth, Set<nodeId>>, totalNodes: number }
 */
function bfsLimited(graph, startNode, maxDepth, allowedEdgeKinds) {
  const allowed = new Set(allowedEdgeKinds);
  const depthMap = new Map();
  if (!graph.hasNode(startNode)) {
    return { depthMap, totalNodes: 0 };
  }

  const visited = new Map(); // nodeId -> depth
  visited.set(startNode, 0);
  depthMap.set(0, new Set([startNode]));

  const queue = [{ node: startNode, depth: 0 }];

  while (queue.length > 0) {
    const { node, depth } = queue.shift();
    if (depth >= maxDepth) continue;

    graph.forEachNeighbor(node, (neighbor) => {
      if (visited.has(neighbor)) return;
      // Check at least one connecting edge is of allowed kind.
      let allowedEdgeFound = false;
      graph.forEachEdge(node, neighbor, (_e, attrs) => {
        if (allowed.has(attrs.kind)) allowedEdgeFound = true;
      });
      if (!allowedEdgeFound) return;

      const nextDepth = depth + 1;
      visited.set(neighbor, nextDepth);
      if (!depthMap.has(nextDepth)) depthMap.set(nextDepth, new Set());
      depthMap.get(nextDepth).add(neighbor);
      queue.push({ node: neighbor, depth: nextDepth });
    });
  }

  let total = 0;
  for (const set of depthMap.values()) total += set.size;
  return { depthMap, totalNodes: total };
}

/**
 * Traverse impact graph starting at one or more roots.
 * For doc roots: BFS via 'strong' edges (and binds_to from doc → code at depth 1 only).
 * For code roots: 1-hop find docs that bind to this code, then BFS on docs via strong.
 */
function traverseFrom({ graph, target, depth }) {
  if (!graph.hasNode(target)) {
    return { depthMap: new Map(), totalNodes: 0, weakNeighbors: [] };
  }

  const attrs = graph.getNodeAttributes(target);
  let docRoot = target;
  if (attrs.kind === NODE_KIND_CODE) {
    // Find docs that bind to this code, treat as roots; BFS each.
    const docRoots = [];
    graph.forEachInboundNeighbor(target, (neighbor) => {
      const a = graph.getNodeAttributes(neighbor);
      if (a.kind === NODE_KIND_DOC) docRoots.push(neighbor);
    });
    if (docRoots.length === 0) {
      return { depthMap: new Map([[0, new Set([target])]]), totalNodes: 1, weakNeighbors: [] };
    }
    // Combine BFS from each doc root.
    const combined = new Map();
    combined.set(0, new Set([target]));
    for (const root of docRoots) {
      if (!combined.has(1)) combined.set(1, new Set());
      combined.get(1).add(root);
      const sub = bfsLimited(graph, root, depth, [EDGE_KIND_STRONG]);
      for (const [d, set] of sub.depthMap.entries()) {
        if (d === 0) continue;
        const adjusted = d + 1;
        if (!combined.has(adjusted)) combined.set(adjusted, new Set());
        for (const n of set) combined.get(adjusted).add(n);
      }
    }
    let total = 0;
    for (const s of combined.values()) total += s.size;
    return { depthMap: combined, totalNodes: total, weakNeighbors: [] };
  }

  // Doc root: BFS via strong edges only.
  const result = bfsLimited(graph, docRoot, depth, [EDGE_KIND_STRONG]);

  // Collect weak neighbors at depth 1 (display only).
  const weakNeighbors = [];
  graph.forEachNeighbor(docRoot, (neighbor) => {
    let isWeak = false;
    let isStrong = false;
    graph.forEachEdge(docRoot, neighbor, (_e, a) => {
      if (a.kind === EDGE_KIND_WEAK) isWeak = true;
      if (a.kind === EDGE_KIND_STRONG) isStrong = true;
    });
    if (isWeak && !isStrong) weakNeighbors.push(neighbor);
  });

  // Also collect bound code paths at depth 1.
  graph.forEachOutboundNeighbor(docRoot, (neighbor) => {
    const a = graph.getNodeAttributes(neighbor);
    if (a.kind !== NODE_KIND_CODE) return;
    const d = 1;
    if (!result.depthMap.has(d)) result.depthMap.set(d, new Set());
    if (!result.depthMap.get(d).has(neighbor)) {
      result.depthMap.get(d).add(neighbor);
      result.totalNodes += 1;
    }
  });

  return { ...result, weakNeighbors };
}

/**
 * Heuristic estimator. Reads file sizes from disk if needed.
 */
function estimate({ nodes, contentRoot, workspaceRoot, config }) {
  const tokenRatio = (config && config.tokenRatio) || 4;
  const timeCfg = (config && config.time) || { md: 5, codeSmall: 15, codeLarge: 30, config: 3 };

  let bytes = 0;
  let timeMin = 0;
  let timeMax = 0;

  for (const nodeId of nodes) {
    let absolute = null;
    if (nodeId.startsWith('code:')) {
      absolute = path.resolve(workspaceRoot, nodeId.slice('code:'.length));
    } else {
      absolute = path.resolve(contentRoot, nodeId);
    }

    let size = 0;
    let loc = 0;
    try {
      const stat = fs.statSync(absolute);
      if (stat.isFile()) {
        size = stat.size;
        // Quick LOC estimate: bytes / 50 average
        loc = Math.max(1, Math.round(size / 50));
      }
    } catch {
      // missing file → contribute nothing
      continue;
    }

    bytes += size;

    const lower = absolute.toLowerCase();
    if (lower.endsWith('.md')) {
      timeMin += timeCfg.md;
      timeMax += timeCfg.md * 2;
    } else if (lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml') || lower.endsWith('.toml')) {
      timeMin += timeCfg.config;
      timeMax += timeCfg.config * 2;
    } else if (loc >= 500) {
      timeMin += timeCfg.codeLarge;
      timeMax += timeCfg.codeLarge * 2;
    } else {
      timeMin += timeCfg.codeSmall;
      timeMax += timeCfg.codeSmall * 2;
    }
  }

  const tokens = Math.round(bytes / Math.max(1, tokenRatio));
  return {
    bytes,
    tokens,
    timeMinutesMin: timeMin,
    timeMinutesMax: timeMax,
  };
}

module.exports = {
  EDGE_KIND_STRONG,
  EDGE_KIND_WEAK,
  EDGE_KIND_BINDS,
  NODE_KIND_DOC,
  NODE_KIND_CODE,
  coerceListField,
  resolveRelatedPath,
  buildGraph,
  bfsLimited,
  traverseFrom,
  estimate,
  findCodeNodes,
  collectMarkdownFiles,
};
