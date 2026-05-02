'use strict';

const fs   = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
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

function walkJs(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJs(full));
    } else if (entry.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Scan a source directory and a test directory.
 * Returns moduleStats: [ { file, loc, requireCount, hasTests, churnCount } ]
 */
function scanModuleStats(srcDir, testDir, churnData = {}) {
  const files = walkJs(srcDir);
  return files.map(fp => {
    const rel      = path.relative(srcDir, fp);
    const basename = path.basename(fp, '.js');
    // Check if any test file mentions this basename
    const hasTests = testDir && fs.existsSync(testDir)
      ? walkJs(testDir).some(tf => path.basename(tf).replace('.test.js', '').replace('.spec.js', '') === basename)
      : false;
    return {
      file:         rel,
      loc:          countLines(fp),
      requireCount: countRequires(fp),
      hasTests,
      churnCount:   churnData[rel] || 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Built-in forward estimate plans
// ---------------------------------------------------------------------------

const DEFAULT_FORWARD_ESTIMATES = [
  {
    plan: 'v1.9 add kb graph check/export (2 commands, ~600 LOC)',
    factors: { newUncoveredModules: 0, addedUncoveredLOC: 0, addedHighCoupling: 1, addedTests: 40 },
  },
  {
    plan: 'v1.8.1 refactor status.js (resolve E01 + D01)',
    factors: { resolvedHighEntropy: 1, resolvedHighDebt: 1, addedTests: 0 },
  },
  {
    plan: 'v1.8.2 add tests for bootstrap+init (resolve D03)',
    factors: { resolvedCoverageDebt: 1, addedTests: 4 },
  },
];

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = { json: false, noSave: false, quiet: false, scanSrc: null };
  const remaining = [];
  let i = 0;
  while (i < (args || []).length) {
    const a = args[i];
    if (a === '--json')    { options.json    = true; i++; continue; }
    if (a === '--no-save') { options.noSave  = true; i++; continue; }
    if (a === '--quiet')   { options.quiet   = true; i++; continue; }
    if (a === '--scan-src') {
      if (!args[i + 1]) throw new Error('--scan-src requires a directory argument');
      options.scanSrc = args[i + 1]; i += 2; continue;
    }
    remaining.push(a); i++;
  }
  if (remaining.length) throw new Error(`Unknown chaos option(s): ${remaining.join(', ')}. Supported: --json, --no-save, --quiet, --scan-src <dir>`);
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
    ['structural entropy',  '30%', breakdown.structural],
    ['debt pressure',       '25%', breakdown.debtPressure],
    ['coverage gap',        '20%', breakdown.coverageGap],
    ['cognitive load',      '15%', breakdown.cognitiveLoad],
    ['instability',         '10%', breakdown.instability],
  ];
  const weights = [0.30, 0.25, 0.20, 0.15, 0.10];
  const lines = [];
  lines.push('  Breakdown (AI agent confidence model):');
  lines.push('  ' + '─'.repeat(44));
  for (let i = 0; i < rows.length; i++) {
    const [name, weight, val] = rows[i];
    const contrib = Math.round(val * weights[i] * 10) / 10;
    lines.push(`    ${pad(name, 22)} ${pad(weight, 5)} val=${pad(val.toFixed(1), 5, true)}  contrib=${pad(contrib.toFixed(1), 5, true)}`);
  }
  lines.push('  ' + '─'.repeat(44));
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
  const lines = ['  Forward estimates:'];
  for (const e of estimates) {
    const sign   = e.delta >= 0 ? '+' : '';
    const badge  = LEVEL_BADGE[e.projectedLevel] || e.projectedLevel.toUpperCase();
    const warn   = e.warning ? '  ← ' + e.warning : '';
    lines.push(`    ${pad(e.plan, 45)}  ${sign}${e.delta.toFixed(1)}  → ${e.projected.toFixed(1)}  ${badge}${warn}`);
  }
  return lines.join('\n');
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
  const result = computeChaosCoefficient({ debtItems, entropyItems, lessonItems, moduleStats });

  // History + trend
  const { snapshots } = readChaosHistory(context.contentRoot);
  const previous = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const trend    = compareChaosSnapshots(result, previous);

  // Forward estimates
  const estimates = DEFAULT_FORWARD_ESTIMATES.map(e => ({
    plan: e.plan,
    ...estimateDeltaChaos(result.score, e.factors),
  }));

  // Save snapshot
  let saved = false;
  if (!options.noSave) {
    const { snapshot } = buildChaosSnapshot({ ...result });
    appendChaosSnapshot(context.contentRoot, snapshot);
    saved = true;
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

module.exports = { runChaos, scanModuleStats, parseArgs };
