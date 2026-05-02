'use strict';
/**
 * v1.8.2 Phase 0 — Signal Calibration Script
 *
 * Scans a source directory and reports raw signal values to help calibrate
 * thresholds for deepScanModule() before implementing it in chaos.js.
 *
 * Usage:
 *   node tools/calibrate-signals.js <src-dir> [--ext .js,.ts,.py]
 *
 * Outputs a summary table of all detected signals per file, plus aggregate
 * stats (p50, p75, p90, max) to help decide "what counts as high".
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Language configs (extension → import regex, test pattern)
// ---------------------------------------------------------------------------
const LANG_CONFIGS = {
  js:     { exts: ['.js', '.mjs', '.cjs'], importRe: /require\(|import .+ from/,    testRe: /\.test\.|\.spec\./ },
  ts:     { exts: ['.ts'],                 importRe: /import .+ from|require\(/,      testRe: /\.test\.|\.spec\./ },
  python: { exts: ['.py'],                 importRe: /^import |^from .+ import/m,     testRe: /^test_|_test\.py$/ },
  kotlin: { exts: ['.kt'],                 importRe: /^import /m,                     testRe: /Test\.kt$/ },
  go:     { exts: ['.go'],                 importRe: /^import/m,                      testRe: /_test\.go$/ },
};

function detectLang(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  for (const [lang, cfg] of Object.entries(LANG_CONFIGS)) {
    if (cfg.exts.includes(ext)) return lang;
  }
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Per-file signal extraction
// ---------------------------------------------------------------------------

function extractSignals(filePath) {
  const lang = detectLang(filePath);
  let src;
  try { src = fs.readFileSync(filePath, 'utf8'); }
  catch (_) { return null; }

  const lines      = src.split('\n');
  const loc        = lines.length;
  const isNotebook = filePath.endsWith('.ipynb');

  // --- Cyclomatic complexity proxy (per-file sum of branch keywords) ---
  const branchKeywords = /\bif\b|\belse\s+if\b|\bswitch\b|\bcatch\b|\?\s*[^:]/g;
  const ternaryRe      = /\?\s*[^:\s]/g;
  // Use simpler: count if + else if + switch + catch + ? (ternary)
  const cycloRaw = (src.match(/\b(if|else if|switch|catch)\b/g) || []).length
                 + (src.match(/[^?]?\?[^?:><=!]/g) || []).length; // ternary approx

  // --- Nesting depth (max indent level in terms of 2-space or 4-space blocks) ---
  let maxNesting = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    // Count leading spaces/tabs
    const leading  = line.match(/^(\s*)/)[1];
    const spaces   = leading.replace(/\t/g, '  ').length;
    const indent   = Math.floor(spaces / 2);
    if (indent > maxNesting) maxNesting = indent;
  }

  // --- Function detection (JS/TS) ---
  // Detect function starts: function keyword or arrow functions assigned to var/const
  const funcDetectRe = /\bfunction\s+\w+|\bfunction\s*\(|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\(|[\w,]+\s*=>)/g;
  const funcStarts = [];
  let m;
  while ((m = funcDetectRe.exec(src)) !== null) {
    funcStarts.push(m.index);
  }

  // Approximate function LOC by finding brace-balanced blocks after each start
  // Simple heuristic: find next { ... } at same depth
  function approxFuncLoc(srcStr, startIdx) {
    const after = srcStr.slice(startIdx);
    const braceStart = after.indexOf('{');
    if (braceStart === -1) return 0;
    let depth = 0, inStr = false, i = braceStart;
    let lineCount = 0;
    for (; i < after.length; i++) {
      const ch = after[i];
      if (ch === '\n') lineCount++;
      if (inStr) { if (ch === inStr) inStr = false; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if (ch === '{') depth++;
      if (ch === '}') { depth--; if (depth === 0) break; }
    }
    return lineCount;
  }

  const funcLocs = funcStarts.map(si => approxFuncLoc(src, si));
  const longFunctionCount = funcLocs.filter(l => l > 80).length;
  const maxFuncLoc        = funcLocs.length ? Math.max(...funcLocs) : 0;

  // --- TODO/FIXME/HACK/WORKAROUND density ---
  const todoCount = (src.match(/\b(TODO|FIXME|HACK|XXX|WORKAROUND)\b/g) || []).length;

  // --- Import/require count ---
  const cfg         = LANG_CONFIGS[lang];
  const importCount = cfg ? (src.match(cfg.importRe) || []).length : 0;

  // --- Export count (JS/TS) ---
  const exportCount = (src.match(/\bmodule\.exports\b|\bexport\s+(default|function|class|const|let|var|\{)/g) || []).length;

  // --- Commented-out code (rough: lines starting with // that contain code-like chars) ---
  const commentedCodeLines = lines.filter(l => /^\s*\/\/.*[({;=]/.test(l)).length;

  // --- Magic values: numeric literals > 1 digit that aren't 0 or 1 ---
  const magicNumberCount = (src.match(/(?<!['\"`\w])\b\d{2,}\b(?!['\"`])/g) || []).length;

  return {
    file:              path.basename(filePath),
    lang,
    loc,
    cycloProxy:        cycloRaw,
    cycloPerKloc:      loc > 0 ? Math.round(cycloRaw / loc * 1000) : 0,
    maxNesting,
    longFunctionCount,
    maxFuncLoc,
    todoCount,
    todoPer100Loc:     loc > 0 ? +(todoCount / loc * 100).toFixed(2) : 0,
    importCount,
    exportCount,
    commentedCodeLines,
    magicNumberCount,
  };
}

// ---------------------------------------------------------------------------
// Walk (multi-lang)
// ---------------------------------------------------------------------------

const ALL_EXTS = new Set(Object.values(LANG_CONFIGS).flatMap(c => c.exts));
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', 'coverage']);

function walk(dir, allowedExts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, allowedExts));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (allowedExts ? allowedExts.has(ext) : ALL_EXTS.has(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Percentiles helper
// ---------------------------------------------------------------------------

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx    = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function stats(arr) {
  if (!arr.length) return { p50: 0, p75: 0, p90: 0, max: 0, mean: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    p50:  percentile(arr, 50),
    p75:  percentile(arr, 75),
    p90:  percentile(arr, 90),
    max:  Math.max(...arr),
    mean: +mean.toFixed(2),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args     = process.argv.slice(2);
  const srcDir   = args[0];
  if (!srcDir) {
    console.error('Usage: node tools/calibrate-signals.js <src-dir> [--label <name>]');
    process.exit(1);
  }
  const labelIdx = args.indexOf('--label');
  const label    = labelIdx !== -1 ? args[labelIdx + 1] : path.basename(srcDir);

  const files    = walk(srcDir);
  if (!files.length) {
    console.error(`No source files found in: ${srcDir}`);
    process.exit(1);
  }

  console.log(`\n=== Calibration: ${label} (${srcDir}) ===`);
  console.log(`Files found: ${files.length}`);

  const signals = files.map(f => extractSignals(f)).filter(Boolean);

  // Print per-file table (top 20 by cycloProxy desc)
  const sorted = [...signals].sort((a, b) => b.cycloProxy - a.cycloProxy);
  console.log('\n--- Top files by cyclomatic complexity proxy ---');
  console.log(
    'file'.padEnd(40) +
    'lang'.padEnd(8) +
    'loc'.padEnd(6) +
    'cyclo'.padEnd(7) +
    'cyc/kl'.padEnd(8) +
    'nest'.padEnd(6) +
    'longFn'.padEnd(8) +
    'todo'.padEnd(6) +
    'td/100'.padEnd(8) +
    'imp'.padEnd(5) +
    'exp'
  );
  console.log('-'.repeat(110));
  for (const s of sorted.slice(0, 30)) {
    console.log(
      s.file.slice(-38).padEnd(40) +
      s.lang.padEnd(8) +
      String(s.loc).padEnd(6) +
      String(s.cycloProxy).padEnd(7) +
      String(s.cycloPerKloc).padEnd(8) +
      String(s.maxNesting).padEnd(6) +
      String(s.longFunctionCount).padEnd(8) +
      String(s.todoCount).padEnd(6) +
      String(s.todoPer100Loc).padEnd(8) +
      String(s.importCount).padEnd(5) +
      s.exportCount
    );
  }

  // Aggregate stats
  console.log('\n--- Aggregate signal stats (all files) ---');
  const fields = ['loc', 'cycloProxy', 'cycloPerKloc', 'maxNesting', 'longFunctionCount', 'todoCount', 'todoPer100Loc', 'importCount', 'exportCount', 'commentedCodeLines', 'magicNumberCount'];
  console.log('signal'.padEnd(25) + 'p50'.padEnd(8) + 'p75'.padEnd(8) + 'p90'.padEnd(8) + 'max'.padEnd(8) + 'mean');
  console.log('-'.repeat(65));
  for (const f of fields) {
    const vals = signals.map(s => s[f]);
    const st   = stats(vals);
    console.log(f.padEnd(25) + String(st.p50).padEnd(8) + String(st.p75).padEnd(8) + String(st.p90).padEnd(8) + String(st.max).padEnd(8) + st.mean);
  }

  // Language distribution
  const langDist = {};
  for (const s of signals) langDist[s.lang] = (langDist[s.lang] || 0) + 1;
  console.log('\n--- Language distribution ---');
  for (const [lang, count] of Object.entries(langDist)) {
    console.log(`  ${lang}: ${count} files`);
  }

  // Files with high signals
  const highCyclo = signals.filter(s => s.cycloPerKloc > 30);
  const highNest  = signals.filter(s => s.maxNesting > 8);
  const highTodo  = signals.filter(s => s.todoPer100Loc > 2);
  const longFuncs = signals.filter(s => s.longFunctionCount > 0);

  console.log('\n--- Notable files ---');
  if (highCyclo.length) console.log(`  cyclo/kloc > 30: ${highCyclo.map(s => s.file).join(', ')}`);
  if (highNest.length)  console.log(`  nesting > 8:     ${highNest.map(s => s.file).join(', ')}`);
  if (highTodo.length)  console.log(`  todo/100loc > 2: ${highTodo.map(s => s.file).join(', ')}`);
  if (longFuncs.length) console.log(`  longFunctions:   ${longFuncs.map(s => `${s.file}(${s.longFunctionCount})`).join(', ')}`);

  console.log(`\nTotal files scanned: ${signals.length}`);
  console.log(`Total LOC: ${signals.reduce((a, s) => a + s.loc, 0)}`);
  console.log(`Total TODOs: ${signals.reduce((a, s) => a + s.todoCount, 0)}`);
  console.log('');
}

main();
