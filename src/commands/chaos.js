'use strict';

const fs   = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { readImpactFile, deriveVerdict: deriveImpactVerdict } = require('../lib/impact');
const { buildGraph, findStrongCycles } = require('../lib/impact-graph');
const { readCatalog } = require('../lib/catalog');
const { listActiveIntentIds, readIntentMeta, listStagedFiles, loadForwardEstimatesFromBacklog } = require('../lib/intent');
const {
  readDebtIndex,
  readEntropyIndex,
  readLessonsIndex,
  computeChaosCoefficient,
  estimateDeltaChaos,
  compareChaosSnapshots,
  buildChaosSnapshot,
  appendChaosSnapshot,
  readChaosHistory,
  CHAOS_LEVELS,
  CHAOS_SPIKE_THRESHOLD,
} = require('../lib/observation');

// ---------------------------------------------------------------------------
// Module scanner (optional, activated via --scan-src <dir>)
// ---------------------------------------------------------------------------

function countLines(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').split('\n').length;
  } catch (_) {
    return 0;
  }
}

function countRequires(filePath) {
  try {
    return (fs.readFileSync(filePath, 'utf8').match(/require\(/g) || []).length;
  } catch (_) {
    return 0;
  }
}

const LANG_CONFIG = {
  js: {
    ext: ['.js', '.mjs', '.cjs'],
    importRe: /require\(\s*['"][^'"]+['"]\s*\)|\bimport\s+[^;]+?\s+from\s+['"][^'"]+['"]|\bimport\s*\(\s*['"][^'"]+['"]\s*\)/g,
    localImportRe: /require\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+[^;]+?\s+from\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    testPattern: /\.test\.|\.spec\./,
  },
  ts: {
    ext: ['.ts', '.tsx'],
    importRe: /require\(\s*['"][^'"]+['"]\s*\)|\bimport\s+[^;]+?\s+from\s+['"][^'"]+['"]|\bimport\s*\(\s*['"][^'"]+['"]\s*\)/g,
    localImportRe: /require\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+[^;]+?\s+from\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    testPattern: /\.test\.|\.spec\./,
  },
  python: {
    ext: ['.py'],
    importRe: /(^|\n)\s*(import\s+[\w.]+|from\s+[\w.]+\s+import\s+)/g,
    localImportRe: /(^|\n)\s*from\s+\.?([\w.]+)\s+import\s+/g,
    testPattern: /^test_|_test\.py$/,
  },
  kotlin: {
    ext: ['.kt'],
    importRe: /(^|\n)\s*import\s+[\w.]+/g,
    localImportRe: null,
    testPattern: /Test\.kt$/,
  },
  go: {
    ext: ['.go'],
    importRe: /(^|\n)\s*import\s+(\(|["])/g,
    localImportRe: null,
    testPattern: /_test\.go$/,
  },
  unknown: {
    ext: [],
    importRe: null,
    localImportRe: null,
    testPattern: null,
  },
};

const SCANNABLE_EXTRA_EXTENSIONS = new Set([
  '.java', '.swift', '.rs', '.rb', '.php', '.cs', '.cpp', '.c', '.h', '.hpp', '.scala', '.lua', '.ipynb',
]);

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '__pycache__']);

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  for (const [lang, cfg] of Object.entries(LANG_CONFIG)) {
    if (cfg.ext.includes(ext)) return lang;
  }
  return 'unknown';
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const knownExts = Object.values(LANG_CONFIG).flatMap(cfg => cfg.ext);
  return knownExts.includes(ext) || SCANNABLE_EXTRA_EXTENSIONS.has(ext);
}

function walkCodeFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkCodeFiles(full));
    } else if (shouldScanFile(full)) {
      results.push(full);
    }
  }
  return results;
}

function countMatches(src, re) {
  if (!re) return 0;
  const m = src.match(re);
  return m ? m.length : 0;
}

function parseLocalImports(src, langConfig) {
  if (!langConfig || !langConfig.localImportRe) return [];
  const imports = [];
  let m;
  const re = new RegExp(langConfig.localImportRe.source, langConfig.localImportRe.flags);
  while ((m = re.exec(src)) !== null) {
    const spec = m[1] || m[2] || m[3] || null;
    if (!spec) continue;
    if (spec.startsWith('.')) imports.push(spec);
  }
  return imports;
}

function maxBraceNesting(src) {
  let depth = 0;
  let maxDepth = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      depth += 1;
      if (depth > maxDepth) maxDepth = depth;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
    }
  }
  return maxDepth;
}

function maxIndentNesting(lines) {
  let maxDepth = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const leading = (line.match(/^(\s*)/) || [null, ''])[1];
    const spaces = leading.replace(/\t/g, '    ').length;
    const depth = Math.floor(spaces / 4);
    if (depth > maxDepth) maxDepth = depth;
  }
  return maxDepth;
}

function extractBraceFunctionBlocks(src) {
  const blocks = [];
  const starts = [];
  const startRe = /\bfunction\s+\w+\s*\(|\bfunction\s*\(|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|\b\w+\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = startRe.exec(src)) !== null) starts.push(m.index);

  for (const start of starts) {
    const open = src.indexOf('{', start);
    if (open === -1) continue;
    let depth = 0;
    let end = -1;
    for (let i = open; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') depth += 1;
      if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) blocks.push(src.slice(open, end + 1));
  }
  return blocks;
}

function extractPythonFunctionBlocks(src) {
  const lines = src.split('\n');
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\s*def\s+\w+\s*\(/.test(line)) continue;
    const indent = (line.match(/^(\s*)/) || [null, ''])[1].length;
    const block = [line];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (!next.trim()) {
        block.push(next);
        continue;
      }
      const nextIndent = (next.match(/^(\s*)/) || [null, ''])[1].length;
      if (nextIndent <= indent && /^\s*(def\s+\w+\s*\(|class\s+\w+)/.test(next)) {
        break;
      }
      if (nextIndent <= indent && next.trim() && !next.trim().startsWith('#')) {
        break;
      }
      block.push(next);
    }
    blocks.push(block.join('\n'));
  }
  return blocks;
}

function countCyclomaticTokens(src) {
  return countMatches(src, /\bif\b|\belse\s+if\b|\bswitch\b|\bcase\b|\bcatch\b|\bfor\b|\bwhile\b|\?\s*[^:\s]|&&|\|\|/g);
}

function deepScanModule(filePath, langConfig) {
  const language = detectLanguage(filePath);
  let source = '';
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    source = '';
  }

  const lines = source.split('\n');
  const loc = source ? lines.length : 0;
  const isNotebook = path.extname(filePath).toLowerCase() === '.ipynb';
  const effectiveConfig = langConfig || LANG_CONFIG[language] || LANG_CONFIG.unknown;

  const importCount = isNotebook ? 0 : countMatches(source, effectiveConfig.importRe);
  const todoCount = isNotebook ? 0 : countMatches(source, /\b(TODO|FIXME|HACK|XXX|WORKAROUND)\b/g);
  const exportCount = isNotebook ? 0 : countMatches(source, /\bmodule\.exports\b|\bexport\s+(default|function|class|const|let|var|\{)/g);

  let functionBlocks = [];
  if (!isNotebook) {
    if (language === 'python') functionBlocks = extractPythonFunctionBlocks(source);
    else functionBlocks = extractBraceFunctionBlocks(source);
  }

  let maxCyclomaticPerFunction = 0;
  let longFunctionCount = 0;
  for (const block of functionBlocks) {
    const blockCyclo = countCyclomaticTokens(block);
    if (blockCyclo > maxCyclomaticPerFunction) maxCyclomaticPerFunction = blockCyclo;
    const blockLoc = block.split('\n').length;
    if (blockLoc > 80) longFunctionCount += 1;
  }

  if (functionBlocks.length === 0 && !isNotebook) {
    maxCyclomaticPerFunction = countCyclomaticTokens(source);
  }

  const maxNestingDepth = isNotebook
    ? 0
    : (language === 'python' ? maxIndentNesting(lines) : maxBraceNesting(source));

  const localImports = isNotebook ? [] : parseLocalImports(source, effectiveConfig);

  return {
    file: '', // filled by scanModuleStats with relative path
    loc,
    requireCount: importCount, // backward-compatible field name
    hasTests: false,
    churnCount: 0,
    language,
    maxCyclomaticPerFunction,
    maxNestingDepth,
    longFunctionCount,
    todoCount,
    exportCount,
    fanIn: 0,
    hasCircularDep: false,
    isNotebook,
    _localImports: localImports,
  };
}

function normalizeModuleRef(ref) {
  return ref.replace(/\\/g, '/').replace(/\.(js|mjs|cjs|ts|tsx|py|kt|go|java|swift|rs|rb|php|cs|cpp|c|h|hpp|scala|lua)$/i, '');
}

function resolveLocalImport(fileRel, spec, allModules) {
  const fileDir = path.posix.dirname(fileRel.replace(/\\/g, '/'));
  const base = path.posix.normalize(path.posix.join(fileDir, spec));
  const candidates = [
    normalizeModuleRef(base),
    normalizeModuleRef(base + '/index'),
  ];
  for (const c of candidates) {
    if (allModules.has(c)) return c;
  }
  return null;
}

function detectCycleNodes(graph) {
  const visiting = new Set();
  const visited = new Set();
  const inCycle = new Set();

  function dfs(node, stack) {
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      if (idx !== -1) {
        for (let i = idx; i < stack.length; i++) inCycle.add(stack[i]);
      }
      inCycle.add(node);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of graph.get(node) || []) dfs(next, stack);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) dfs(node, []);
  return inCycle;
}

/**
 * Scan a source directory and a test directory.
 * Returns moduleStats: [ { file, loc, requireCount, hasTests, churnCount } ]
 */
function scanModuleStats(srcDir, testDir, churnData = {}) {
  const files = walkCodeFiles(srcDir);
  const testFiles = testDir && fs.existsSync(testDir) ? walkCodeFiles(testDir) : [];
  const stats = files.map(fp => {
    const rel = path.relative(srcDir, fp);
    const relPosix = rel.replace(/\\/g, '/');
    const basename = path.basename(fp, path.extname(fp));
    const lang = detectLanguage(fp);
    const langCfg = LANG_CONFIG[lang] || LANG_CONFIG.unknown;

    const hasTests = testFiles.some(tf => {
      const tfBase = path.basename(tf);
      if (langCfg.testPattern && langCfg.testPattern.test(tfBase)) {
        return tfBase.includes(basename);
      }
      const normalized = tfBase
        .replace('.test.js', '').replace('.spec.js', '')
        .replace('.test.ts', '').replace('.spec.ts', '')
        .replace('_test.py', '').replace('.py', '')
        .replace('Test.kt', '').replace('_test.go', '.go');
      return normalized === basename;
    });

    const deep = deepScanModule(fp, langCfg);
    return {
      ...deep,
      file: relPosix,
      hasTests,
      churnCount: churnData[relPosix] || churnData[rel] || 0,
    };
  });

  const moduleIds = new Set();
  const idToIndex = new Map();
  for (let i = 0; i < stats.length; i++) {
    const id = normalizeModuleRef(stats[i].file);
    moduleIds.add(id);
    idToIndex.set(id, i);
    const indexId = normalizeModuleRef(path.posix.join(path.posix.dirname(stats[i].file), 'index'));
    moduleIds.add(indexId);
    if (!idToIndex.has(indexId)) idToIndex.set(indexId, i);
  }

  const graph = new Map();
  const fanInCounter = new Map();
  for (const id of moduleIds) {
    graph.set(id, new Set());
    fanInCounter.set(id, 0);
  }

  for (const m of stats) {
    const fromId = normalizeModuleRef(m.file);
    const deps = m._localImports || [];
    for (const spec of deps) {
      const toId = resolveLocalImport(m.file, spec, moduleIds);
      if (!toId || toId === fromId) continue;
      if (!graph.has(fromId)) graph.set(fromId, new Set());
      if (!graph.get(fromId).has(toId)) {
        graph.get(fromId).add(toId);
        fanInCounter.set(toId, (fanInCounter.get(toId) || 0) + 1);
      }
    }
  }

  const cycleNodes = detectCycleNodes(graph);

  for (const m of stats) {
    const id = normalizeModuleRef(m.file);
    m.fanIn = fanInCounter.get(id) || 0;
    m.hasCircularDep = cycleNodes.has(id);
    delete m._localImports;
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Built-in forward estimate plans (fallback/reference)
// ---------------------------------------------------------------------------

const BUILTIN_FORWARD_ESTIMATES = [
  {
    plan: 'v1.9 add kb graph check/export (2 commands, ~600 LOC)',
    factors: { newUncoveredModules: 0, addedUncoveredLOC: 0, addedHighCoupling: 1, addedTests: 40 },
    source: 'builtin',
  },
  {
    plan: 'v1.8.1 refactor status.js (resolve E01 + D01)',
    factors: { resolvedHighEntropy: 1, resolvedHighDebt: 1, addedTests: 0 },
    source: 'builtin',
  },
  {
    plan: 'v1.8.2 add tests for bootstrap+init (resolve D03)',
    factors: { resolvedCoverageDebt: 1, addedTests: 4 },
    source: 'builtin',
  },
];

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = { json: false, noSave: false, quiet: false, scanSrc: null, estimateOnly: false };
  const remaining = [];
  let i = 0;
  while (i < (args || []).length) {
    const a = args[i];
    if (a === '--json')         { options.json         = true; i++; continue; }
    if (a === '--no-save')      { options.noSave        = true; i++; continue; }
    if (a === '--quiet')        { options.quiet         = true; i++; continue; }
    if (a === '--estimate')     { options.estimateOnly  = true; i++; continue; }
    if (a === '--scan-src') {
      if (!args[i + 1]) throw new Error('--scan-src requires a directory argument');
      options.scanSrc = args[i + 1]; i += 2; continue;
    }
    remaining.push(a); i++;
  }
  if (remaining.length) throw new Error(`Unknown chaos option(s): ${remaining.join(', ')}. Supported: --json, --no-save, --quiet, --estimate, --scan-src <dir>`);
  return options;
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

const BAR = '━'.repeat(46);
const LEVEL_BADGE = { stable: 'STABLE', manageable: 'MANAGEABLE', unstable: 'UNSTABLE ⚠', chaotic: 'CHAOTIC ⛔' };
const TIER_PAD = { low: 'low   ', medium: 'medium', high: 'high  ', red: 'red   ' };

function pad(str, len, right = false) {
  const s = String(str);
  return right ? s.padStart(len) : s.padEnd(len);
}

function renderBreakdown(breakdown) {
  const rows = [
    ['structural',  '−20', breakdown.structural_reduction],
    ['coverage',    '−20', breakdown.coverage_reduction],
    ['testing',     '−15', breakdown.testing_reduction],
    ['intent',      '−15', breakdown.intent_reduction],
    ['release',     '−10', breakdown.release_reduction],
    ['cognitive',   '−15', breakdown.cognitive_reduction],
    ['other',       '  0', breakdown.other],
  ];
  const lines = [];
  lines.push('  Breakdown (reductions from 100):');
  lines.push('  ' + '─'.repeat(44));
  for (const [name, weight, val] of rows) {
    const v = (val != null ? val : 0);
    lines.push(`    ${pad(name, 22)} max${pad(weight, 4)} reduction=${pad(v.toFixed(1), 5, true)}`);
  }
  lines.push('  ' + '─'.repeat(44));
  lines.push(`    formula: subtractive-v2  (100 − reductions = score)`);
  if (breakdown.cognitive_annotation) {
    lines.push(`    (cognitive drift detected — consider reviewing agent grounding)`);
  }
  return lines.join('\n');
}

function renderDrivers(drivers) {
  if (!drivers || drivers.length === 0) return '  Top drivers: (none)';
  const lines = ['  Top drivers:'];
  for (const d of drivers) {
    const tier = TIER_PAD[d.tier] || d.tier;
    lines.push(`    [${d.kind}-${tier}] ${d.id}  score=${d.score}`);
  }
  return lines.join('\n');
}

function renderEstimates(baseScore, estimates) {
  const BAND_LABEL = { safe: 'SAFE', watch: 'WATCH ⚠', spike: 'SPIKE ⛔' };
  const lines = ['  Forward estimates:'];
  for (const e of estimates) {
    const sign  = e.delta >= 0 ? '+' : '';
    const badge = LEVEL_BADGE[e.projectedLevel] || e.projectedLevel.toUpperCase();
    const band  = BAND_LABEL[e.riskBand] || e.riskBand;
    lines.push(`    ${pad(e.plan, 45)}  ${sign}${e.delta.toFixed(1)}  → ${e.projected.toFixed(1)}  ${badge}  [${band}]`);
  }
  return lines.join('\n');
}

function deriveScanConfidence({ scanRequested, moduleStats }) {
  if (!scanRequested) {
    return {
      badge: 'KB-only',
      note: 'scan not run; score may be underestimated',
      scannedModules: 0,
      unknownModules: 0,
      notebookModules: 0,
    };
  }

  const stats = moduleStats || [];
  const scannedModules = stats.length;
  const notebookModules = stats.filter(m => m.isNotebook).length;
  const unknownModules = stats.filter(m => m.language === 'unknown').length;

  if (scannedModules === 0) {
    return {
      badge: 'partial-scan',
      note: 'scan ran but no supported files were found',
      scannedModules,
      unknownModules,
      notebookModules,
    };
  }

  if (notebookModules > 0 || unknownModules > 0) {
    return {
      badge: 'partial-scan',
      note: 'some files are notebook/unknown and were scanned in limited mode',
      scannedModules,
      unknownModules,
      notebookModules,
    };
  }

  return {
    badge: 'full-scan',
    note: 'all scanned files contributed deep signals',
    scannedModules,
    unknownModules,
    notebookModules,
  };
}

function orphanDocCountFromGraph(graph) {
  let orphanCount = 0;
  graph.forEachNode((nodeId, attrs) => {
    if (!attrs || attrs.kind !== 'doc' || attrs.exists === false) return;
    let hasRelation = false;
    graph.forEachNeighbor(nodeId, (neighbor) => {
      graph.forEachEdge(nodeId, neighbor, (_e, edgeAttrs) => {
        if (edgeAttrs && (edgeAttrs.kind === 'strong' || edgeAttrs.kind === 'weak' || edgeAttrs.kind === 'binds_to')) {
          hasRelation = true;
        }
      });
    });
    if (!hasRelation) orphanCount += 1;
  });
  return orphanCount;
}

function deriveChaosContextSignals(contentRoot) {
  const signals = {
    statusVerdict: 'clean',
    statusUnboundCount: 0,
    graphStrongCycleCount: 0,
    graphOrphanDocCount: 0,
    intentActiveCount: 0,
    intentStaleCount: 0,
    intentMissingDecisionSummaryCount: 0,
    releaseDaysSinceLast: null,
    releaseHasCurrent: true,
    cognitiveAgreementDensity: 0,
    cognitiveGroundingGap: 0,
  };

  try {
    const impact = readImpactFile(contentRoot);
    if (impact) {
      const verdict = deriveImpactVerdict(impact);
      signals.statusVerdict = verdict && verdict.label ? verdict.label : 'clean';
      signals.statusUnboundCount = (impact.unbound_changes || []).length;
    }
  } catch (_) {
    // Keep defaults when impact data is missing or malformed.
  }

  try {
    const { graph } = buildGraph({ contentRoot });
    signals.graphStrongCycleCount = findStrongCycles(graph).length;
    signals.graphOrphanDocCount = orphanDocCountFromGraph(graph);
  } catch (_) {
    // Keep defaults when graph cannot be built.
  }

  try {
    const ids = listActiveIntentIds(contentRoot);
    signals.intentActiveCount = ids.length;
    let groundingGapCount = 0;
    for (const id of ids) {
      try {
        const meta = readIntentMeta(contentRoot, id);
        const staged = listStagedFiles(contentRoot, id);
        if (staged.length === 0) signals.intentStaleCount += 1;
        if (!meta.decision_summary || String(meta.decision_summary).trim() === '') {
          signals.intentMissingDecisionSummaryCount += 1;
        }
        // grounding-gap: proposed lifecycle + not promotion-ready
        if (meta.promotion_ready === false && (meta.lifecycle_state === 'proposed' || !meta.lifecycle_state)) {
          groundingGapCount += 1;
        }
      } catch (_) {
        signals.intentStaleCount += 1;
        signals.intentMissingDecisionSummaryCount += 1;
      }
    }
    if (signals.intentActiveCount > 0) {
      signals.cognitiveGroundingGap = Math.min(1, groundingGapCount / signals.intentActiveCount);
    }
  } catch (_) {
    // Keep defaults when intent data is unavailable.
  }

  // agreement-density: ratio of last 10 chaos snapshots where cognitive_reduction exceeded threshold.
  // Uses chaos-history.md (already written by kb chaos) — no new file needed.
  try {
    const { snapshots } = readChaosHistory(contentRoot);
    const recent = snapshots.slice(-10);
    if (recent.length > 0) {
      const driftCount = recent.filter(s => typeof s.cognitive_reduction === 'number' && s.cognitive_reduction > 6).length;
      signals.cognitiveAgreementDensity = Math.min(1, driftCount / recent.length);
    }
  } catch (_) {
    // cognitiveAgreementDensity stays 0
  }

  try {
    const catalog = readCatalog(contentRoot);
    if (!catalog || !catalog.current) {
      signals.releaseHasCurrent = false;
    } else {
      const current = (catalog.releases || []).find(r => r && r.version === catalog.current);
      if (!current || !current.released_at) {
        signals.releaseHasCurrent = false;
      } else {
        const releasedAt = new Date(current.released_at);
        if (!Number.isNaN(releasedAt.getTime())) {
          const dayMs = 24 * 60 * 60 * 1000;
          signals.releaseDaysSinceLast = Math.max(0, Math.floor((Date.now() - releasedAt.getTime()) / dayMs));
        }
      }
    }
  } catch (_) {
    signals.releaseHasCurrent = false;
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Phase 3: KB doc quality — placeholder ratio
// ---------------------------------------------------------------------------

const PLACEHOLDER_RE = /\[Enter\b|\bTODO\b|\bTBD\b|Fill in|>\s*TODO|>\s*TBD|\[placeholder\]/i;
const DOC_QUALITY_SKIP = new Set(['.kb', '.git', 'node_modules', '.github']);

function _walkMd(dir, results) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!DOC_QUALITY_SKIP.has(entry.name)) _walkMd(path.join(dir, entry.name), results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(path.join(dir, entry.name));
    }
  }
}

/**
 * Scan KB docs under contentRoot for placeholder / unfilled content.
 * Returns { totalDocs, placeholderDocs, contentPlaceholderRatio }.
 * contentPlaceholderRatio is 0.0–1.0 (fraction of docs with ≥1 placeholder line).
 */
function scanKbDocQuality(contentRoot) {
  const result = { totalDocs: 0, placeholderDocs: 0, contentPlaceholderRatio: 0 };
  const mdFiles = [];
  _walkMd(contentRoot, mdFiles);
  result.totalDocs = mdFiles.length;
  for (const filePath of mdFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      if (lines.some(l => PLACEHOLDER_RE.test(l))) result.placeholderDocs += 1;
    } catch (_) { /* skip unreadable file */ }
  }
  result.contentPlaceholderRatio = result.totalDocs > 0 ? result.placeholderDocs / result.totalDocs : 0;
  return result;
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

function runChaos({ args, cwd, packageJson }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);

  let context;
  try {
    context = resolveExistingState({ workspaceRoot });
  } catch (err) {
    console.error('kb chaos: no KB found in this workspace. Run "kb init" first.');
    process.exit(1);
  }

  // Read KB meta data
  const { items: debtItems    } = readDebtIndex(context.contentRoot);
  const { items: entropyItems } = readEntropyIndex(context.contentRoot);
  const { items: lessonItems  } = readLessonsIndex(context.contentRoot);

  // Optional module scan
  let moduleStats = [];
  if (options.scanSrc) {
    const srcDir  = path.resolve(cwd, options.scanSrc);
    const testDir = path.join(path.dirname(srcDir), 'test');
    moduleStats = scanModuleStats(srcDir, testDir);
  }

  // Compute
  const contextSignals = deriveChaosContextSignals(context.contentRoot);
  const docQualitySignals = scanKbDocQuality(context.contentRoot);
  const result = computeChaosCoefficient({ debtItems, entropyItems, lessonItems, moduleStats, contextSignals, docQualitySignals });
  const scanConfidence = deriveScanConfidence({ scanRequested: !!options.scanSrc, moduleStats });

  // History + trend
  const { snapshots } = readChaosHistory(context.contentRoot);
  const previous = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const trend    = compareChaosSnapshots(result, previous);

  // Forward estimates
  const backlogEstimates = loadForwardEstimatesFromBacklog(context.contentRoot);
  const allEstimates = [...backlogEstimates, ...BUILTIN_FORWARD_ESTIMATES];
  const estimates = allEstimates.map(e => ({
    plan: e.plan,
    source: e.source || 'builtin',
    ...estimateDeltaChaos(result.score, e.factors),
  }));

  // Save snapshot
  let saved = false;
  if (!options.noSave) {
    const { snapshot } = buildChaosSnapshot({ ...result });
    appendChaosSnapshot(context.contentRoot, snapshot);
    saved = true;
  }

  if (options.estimateOnly) {
    console.log(renderEstimates(result.score, estimates));
    return;
  }

  if (options.json) {
    const out = {
      command: 'kb chaos',
      cliVersion: packageJson && packageJson.version,
      score: result.score,
      level: result.level,
      aiNote: result.aiNote,
      breakdown: result.breakdown,
      drivers: result.drivers,
      scanConfidence,
      contextSignals,
      trend,
      estimates,
      snapshotSaved: saved,
    };
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (options.quiet) {
    console.log(`${result.score} ${result.level}`);
    if (trend.spikeDetected) {
      console.error(`SPIKE +${trend.delta} from ${trend.previousScore}`);
    }
    return;
  }

  // Human-readable
  const badge = LEVEL_BADGE[result.level] || result.level.toUpperCase();
  const trendStr = trend.hasPrevious
    ? `  Trend    : ${trend.delta >= 0 ? '↑' : '↓'} ${trend.delta >= 0 ? '+' : ''}${trend.delta}${trend.spikeDetected ? '  [SPIKE DETECTED — >' + CHAOS_SPIKE_THRESHOLD + ' pts]' : ''} vs ${String(trend.previousMeasuredAt || '').slice(0, 10)}`
    : '  Trend    : (first snapshot)';

  console.log(BAR);
  console.log('  KB Chaos Coefficient');
  console.log(BAR);
  console.log(`  Score    : ${result.score.toFixed(1)} / 100`);
  console.log(`  Level    : ${badge}`);
  console.log(`  AI note  : ${result.aiNote}`);
  console.log(`  Coverage : [${scanConfidence.badge}] ${scanConfidence.note}`);
  console.log(`  Snapshot : ${new Date().toISOString().slice(0, 16)}Z`);
  console.log(trendStr);
  if (trend.spikeDetected) {
    console.log(`  ⚠ Chaos spike! Previous=${trend.previousScore}, current=${result.score}. Stop and review before adding features.`);
  }
  console.log(BAR);
  console.log('');
  console.log(renderBreakdown(result.breakdown));
  console.log('');
  console.log(renderDrivers(result.drivers));
  console.log('');
  console.log(renderEstimates(result.score, estimates));
  console.log('');
  console.log(BAR);
  if (saved) {
    const fp = require('../lib/observation').chaosHistoryPath(context.contentRoot);
    console.log(`  Snapshot saved → ${path.relative(workspaceRoot, fp)}`);
  }
  console.log(BAR);
}

module.exports = {
  runChaos,
  scanModuleStats,
  parseArgs,
  LANG_CONFIG,
  deepScanModule,
  detectLanguage,
  deriveScanConfidence,
  deriveChaosContextSignals,
  scanKbDocQuality,
};
