'use strict';

const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { loadConfig, getConfigValue, DEFAULTS } = require('../lib/config');
const {
  buildGraph,
  traverseFrom,
  estimate,
  NODE_KIND_DOC,
  NODE_KIND_CODE,
} = require('../lib/impact-graph');
const { normalizeDocPath } = require('../lib/bindings');

function parseArgs(args) {
  const options = {
    json: false,
    target: null,
    depth: null,
  };
  const rest = [];
  for (const arg of args || []) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg.startsWith('--depth=')) {
      const v = Number(arg.slice('--depth='.length));
      if (!Number.isFinite(v) || v < 0) {
        throw new Error(`kb impact: --depth must be a non-negative integer (got "${arg}")`);
      }
      options.depth = v;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown impact option "${arg}". Supported: --json, --depth=N`);
    }
    rest.push(arg);
  }
  if (rest.length !== 1) {
    throw new Error('kb impact requires exactly 1 target: <doc-path | code-path>');
  }
  options.target = rest[0];
  return options;
}

function classifyTarget({ contentRoot, workspaceRoot, target }) {
  // Try doc path: normalize against contentRoot.
  const normalizedDoc = normalizeDocPath(target);
  return {
    docCandidate: normalizedDoc,
    codeCandidate: target.replace(/\\/g, '/'),
  };
}

function resolveTargetNode(graph, { docCandidate, codeCandidate }) {
  if (graph.hasNode(docCandidate)) {
    return { id: docCandidate, kind: NODE_KIND_DOC };
  }
  const codeId = codeCandidate.startsWith('code:') ? codeCandidate : `code:${codeCandidate}`;
  if (graph.hasNode(codeId)) {
    return { id: codeId, kind: NODE_KIND_CODE };
  }
  return null;
}

function runImpact({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const ctx = resolveExistingState({ workspaceRoot });

  const cfg = loadConfig(ctx.contentRoot);
  const defaultDepth = getConfigValue(cfg, 'impact.defaultDepth', DEFAULTS.impact.defaultDepth);
  const maxDepth = getConfigValue(cfg, 'impact.maxDepth', DEFAULTS.impact.maxDepth);
  const estimatorCfg = {
    tokenRatio: getConfigValue(cfg, 'estimator.tokenRatio', DEFAULTS.estimator.tokenRatio),
    time: getConfigValue(cfg, 'estimator.time', DEFAULTS.estimator.time),
  };

  let depth = options.depth === null ? defaultDepth : options.depth;
  if (depth > maxDepth) {
    process.stderr.write(`kb impact: --depth=${depth} exceeds maxDepth=${maxDepth}; clamping.\n`);
    depth = maxDepth;
  }

  const { graph, stats } = buildGraph({ contentRoot: ctx.contentRoot });
  const candidates = classifyTarget({ contentRoot: ctx.contentRoot, workspaceRoot, target: options.target });
  const resolvedTarget = resolveTargetNode(graph, candidates);

  if (!resolvedTarget) {
    const msg = `kb impact: target not found in graph: "${options.target}". `
      + `Tried doc node "${candidates.docCandidate}" and code node "code:${candidates.codeCandidate}".`;
    if (options.json) {
      console.log(JSON.stringify({
        command: 'kb impact',
        target: options.target,
        error: 'target-not-found',
        graph_stats: stats,
      }, null, 2));
    } else {
      console.log(msg);
    }
    process.exit(1);
  }

  const { depthMap, totalNodes, weakNeighbors } = traverseFrom({
    graph,
    target: resolvedTarget.id,
    depth,
  });

  // Flatten depth map to ordered structure.
  const groups = [];
  const allNodes = [];
  const sortedDepths = Array.from(depthMap.keys()).sort((a, b) => a - b);
  for (const d of sortedDepths) {
    const items = Array.from(depthMap.get(d)).sort();
    if (d > 0) {
      for (const n of items) allNodes.push(n);
    }
    groups.push({ depth: d, count: items.length, nodes: items });
  }

  // Estimator only on impacted (depth > 0) nodes.
  const est = estimate({
    nodes: allNodes,
    contentRoot: ctx.contentRoot,
    workspaceRoot,
    config: estimatorCfg,
  });

  const strongAtDepth1 = (depthMap.get(1) ? depthMap.get(1).size : 0)
    - countCodeNodes(graph, depthMap.get(1));

  const promoteHint = (resolvedTarget.kind === NODE_KIND_DOC && strongAtDepth1 === 0 && weakNeighbors.length > 0);

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kb impact',
      target: options.target,
      resolved: resolvedTarget,
      depth_used: depth,
      default_depth: defaultDepth,
      max_depth: maxDepth,
      total_impacted: totalNodes - 1,
      groups,
      weak_mentions: weakNeighbors,
      promote_hint: promoteHint,
      estimate: est,
      graph_stats: stats,
    }, null, 2));
    return;
  }

  console.log(`kb impact: ${options.target}  (depth=${depth}, max=${maxDepth})`);
  console.log(`  resolved as: ${resolvedTarget.kind}  [${resolvedTarget.id}]`);
  for (const g of groups) {
    if (g.depth === 0) continue;
    console.log(`  depth ${g.depth} (${g.count}):`);
    for (const n of g.nodes) {
      console.log(`    - ${n}`);
    }
  }
  if (weakNeighbors.length > 0) {
    console.log(`  mentions (related_weak / legacy related, not traversed) (${weakNeighbors.length}):`);
    for (const n of weakNeighbors) {
      console.log(`    - ${n}`);
    }
  }
  if (promoteHint) {
    console.log('');
    console.log('  hint: target has 0 related_strong neighbors. To traverse mentions above,');
    console.log('        promote them by renaming `related:` / `related_weak:` → `related_strong:` in frontmatter.');
    console.log('        See template/15-governance/related-semantic.md.');
  }
  console.log('');
  console.log('  estimate:');
  console.log(`    bytes : ${est.bytes}`);
  console.log(`    tokens: ${est.tokens}`);
  console.log(`    time  : ${est.timeMinutesMin}-${est.timeMinutesMax} minutes`);
  console.log(`  graph: ${stats.docs} docs, ${stats.edgesStrong} strong, ${stats.edgesWeak} weak, ${stats.edgesBindsTo} binds_to`);
}

function countCodeNodes(graph, set) {
  if (!set) return 0;
  let n = 0;
  for (const id of set) {
    const a = graph.getNodeAttributes(id);
    if (a.kind === NODE_KIND_CODE) n += 1;
  }
  return n;
}

module.exports = {
  runImpact,
  parseArgs,
};
