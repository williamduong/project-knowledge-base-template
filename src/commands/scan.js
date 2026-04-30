const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { computeImpact, deriveVerdict, writeImpactFile } = require('../lib/impact');
const { buildGraph, findRecursiveImpact } = require('../lib/impact-graph');
const { loadConfig, getConfigValue } = require('../lib/config');

function parseArgs(args) {
  const options = { json: false, quiet: false, recursive: false, depth: null };
  for (const arg of args || []) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--quiet') {
      options.quiet = true;
      continue;
    }
    if (arg === '--recursive') {
      options.recursive = true;
      continue;
    }
    const depthMatch = /^--depth=(.+)$/.exec(arg);
    if (depthMatch) {
      const n = Number(depthMatch[1]);
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(`--depth must be a non-negative integer (got "${depthMatch[1]}")`);
      }
      options.depth = n;
      continue;
    }
    throw new Error(`Unknown scan option "${arg}". Supported: --json, --quiet, --recursive, --depth=N`);
  }
  return options;
}

/**
 * Augment impactData with transitive_impacted[] when --recursive set.
 * Backward-compatible: field added only if recursive=true; readers that don't know
 * it should ignore unknown keys (P3).
 */
function addTransitiveImpact({ impactData, ctx, depth }) {
  if (!impactData || impactData.skipped_reason) return impactData;
  const roots = (impactData.impacted || []).map((it) => it.doc);
  if (roots.length === 0) {
    impactData.transitive_impacted = [];
    impactData.transitive_depth = depth;
    return impactData;
  }
  const { graph } = buildGraph({ contentRoot: ctx.contentRoot });
  const map = findRecursiveImpact({ graph, roots, depth });
  const transitive = [];
  const sortedDocs = Array.from(map.keys()).sort();
  for (const doc of sortedDocs) {
    const entry = map.get(doc);
    transitive.push({ doc, depth: entry.depth, from: entry.from });
  }
  impactData.transitive_impacted = transitive;
  impactData.transitive_depth = depth;
  return impactData;
}

function printHumanReport(impactData, verdict, filePath, options) {
  console.log(`kb scan: ${verdict.label}${verdict.reason ? ` (${verdict.reason})` : ''}`);
  console.log(`  baseline: ${impactData.baseline || 'NOT_AVAILABLE'}`);
  console.log(`  head    : ${impactData.head || 'NOT_AVAILABLE'}`);
  console.log(`  scanned : ${impactData.scanned_at}`);
  console.log(`  written : ${filePath}`);

  if (impactData.skipped_reason) {
    console.log(`  skipped : ${impactData.skipped_reason}`);
    return;
  }

  console.log(`  impacted docs   : ${impactData.impacted.length}`);
  for (const item of impactData.impacted) {
    console.log(`    - ${item.doc}  (${item.matched_changes.length} match, source=${item.binding_source})`);
  }

  if (options.recursive) {
    const t = impactData.transitive_impacted || [];
    console.log(`  recursive impact: ${t.length} doc(s) (depth ${impactData.transitive_depth})`);
    for (const entry of t.slice(0, 10)) {
      console.log(`    - ${entry.doc}  (depth=${entry.depth}, via ${entry.from.slice(0, 3).join(', ')}${entry.from.length > 3 ? ', ...' : ''})`);
    }
    if (t.length > 10) {
      console.log(`    ... +${t.length - 10} more`);
    }
  }

  console.log(`  unbound changes : ${impactData.unbound_changes.length}`);
  for (const p of impactData.unbound_changes.slice(0, 10)) {
    console.log(`    - ${p}`);
  }
  if (impactData.unbound_changes.length > 10) {
    console.log(`    ... +${impactData.unbound_changes.length - 10} more`);
  }

  console.log(`  KB self-edits   : ${impactData.self_edits.length}`);
}

function runScan({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });

  const impactData = computeImpact({ workspaceRoot, ctx: context });

  if (options.recursive) {
    const cfg = loadConfig(context.contentRoot);
    const defaultDepth = getConfigValue(cfg, 'impact.defaultDepth', 2);
    const maxDepth = getConfigValue(cfg, 'impact.maxDepth', 5);
    let depth = options.depth !== null ? options.depth : defaultDepth;
    if (depth > maxDepth) {
      process.stderr.write(`kb scan: requested --depth=${depth} exceeds impact.maxDepth=${maxDepth}; clamping.\n`);
      depth = maxDepth;
    }
    addTransitiveImpact({ impactData, ctx: context, depth });
  }

  const filePath = writeImpactFile(context.contentRoot, impactData);
  const verdict = deriveVerdict(impactData);

  if (options.quiet) {
    console.log(verdict.label);
  } else if (options.json) {
    console.log(JSON.stringify({
      command: 'kb scan',
      written: filePath,
      verdict,
      impact: impactData,
    }, null, 2));
  } else {
    printHumanReport(impactData, verdict, filePath, options);
  }

  if (verdict.code !== 0) {
    process.exit(verdict.code);
  }
}

module.exports = {
  runScan,
  parseArgs,
  addTransitiveImpact,
};
