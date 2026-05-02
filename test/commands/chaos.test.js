'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const {
  parseArgs,
  scanModuleStats,
  LANG_CONFIG,
  deepScanModule,
  detectLanguage,
  deriveScanConfidence,
  deriveChaosContextSignals,
  scanKbDocQuality,
} = require('../../src/commands/chaos');

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

test('parseArgs: defaults', () => {
  const o = parseArgs([]);
  assert.equal(o.json, false);
  assert.equal(o.noSave, false);
  assert.equal(o.quiet, false);
  assert.equal(o.scanSrc, null);
});

test('parseArgs: --json', () => {
  assert.equal(parseArgs(['--json']).json, true);
});

test('parseArgs: --no-save', () => {
  assert.equal(parseArgs(['--no-save']).noSave, true);
});

test('parseArgs: --quiet', () => {
  assert.equal(parseArgs(['--quiet']).quiet, true);
});

test('parseArgs: --scan-src sets scanSrc', () => {
  assert.equal(parseArgs(['--scan-src', './src']).scanSrc, './src');
});

test('parseArgs: --scan-src missing dir throws', () => {
  assert.throws(() => parseArgs(['--scan-src']), /requires a directory/);
});

test('parseArgs: unknown flag throws', () => {
  assert.throws(() => parseArgs(['--unknown']), /Unknown chaos option/);
});

// ---------------------------------------------------------------------------
// scanModuleStats
// ---------------------------------------------------------------------------

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-chaos-test-'));
}

test('scanModuleStats: returns empty for non-existent dir', () => {
  const stats = scanModuleStats('/nonexistent-xyz', null);
  assert.equal(stats.length, 0);
});

test('scanModuleStats: scans js files and counts LOC', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'a.js'), 'const x = 1;\nconst y = 2;\n');
  fs.writeFileSync(path.join(dir, 'b.js'), 'module.exports = {};\n');
  const stats = scanModuleStats(dir, null);
  assert.equal(stats.length, 2);
  const a = stats.find(s => s.file === 'a.js');
  assert.ok(a.loc >= 2);
});

test('scanModuleStats: counts require calls', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'c.js'), "const a = require('./a');\nconst b = require('./b');\n");
  const stats = scanModuleStats(dir, null);
  assert.equal(stats[0].requireCount, 2);
});

test('scanModuleStats: hasTests true when test file exists', () => {
  const srcDir  = tmpDir();
  const testDir = tmpDir();
  fs.writeFileSync(path.join(srcDir, 'util.js'), 'module.exports = {};\n');
  fs.writeFileSync(path.join(testDir, 'util.test.js'), 'test("x", () => {});\n');
  const stats = scanModuleStats(srcDir, testDir);
  assert.equal(stats[0].file, 'util.js');
  assert.equal(stats[0].hasTests, true);
});

test('scanModuleStats: hasTests false when no test file exists', () => {
  const srcDir  = tmpDir();
  const testDir = tmpDir();
  fs.writeFileSync(path.join(srcDir, 'helper.js'), 'module.exports = {};\n');
  const stats = scanModuleStats(srcDir, testDir);
  assert.equal(stats[0].hasTests, false);
});

test('scanModuleStats: churnCount from churnData param', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'hot.js'), 'module.exports = {};\n');
  const stats = scanModuleStats(dir, null, { 'hot.js': 6 });
  assert.equal(stats[0].churnCount, 6);
});

test('scanModuleStats: walks subdirectories', () => {
  const dir = tmpDir();
  const sub = path.join(dir, 'sub');
  fs.mkdirSync(sub);
  fs.writeFileSync(path.join(dir, 'root.js'), '');
  fs.writeFileSync(path.join(sub, 'nested.js'), '');
  const stats = scanModuleStats(dir, null);
  assert.equal(stats.length, 2);
});

test('LANG_CONFIG: has JS/TS/Python entries', () => {
  assert.ok(LANG_CONFIG.js);
  assert.ok(LANG_CONFIG.ts);
  assert.ok(LANG_CONFIG.python);
});

test('detectLanguage: recognizes js/ts/python and unknown', () => {
  assert.equal(detectLanguage('a.js'), 'js');
  assert.equal(detectLanguage('a.ts'), 'ts');
  assert.equal(detectLanguage('a.py'), 'python');
  assert.equal(detectLanguage('a.swift'), 'unknown');
});

test('deepScanModule: extracts deep metrics for JS', () => {
  const dir = tmpDir();
  const fp = path.join(dir, 'mod.js');
  fs.writeFileSync(
    fp,
    [
      "const x = require('./dep');",
      'function run(a) {',
      '  if (a) {',
      '    for (let i = 0; i < 3; i++) {',
      '      if (i % 2) return i;',
      '    }',
      '  }',
      '  return 0;',
      '}',
      'module.exports = { run };',
      '// TODO: cleanup',
      '',
    ].join('\n')
  );
  const r = deepScanModule(fp, LANG_CONFIG.js);
  assert.equal(r.language, 'js');
  assert.ok(r.loc >= 10);
  assert.ok(r.requireCount >= 1);
  assert.ok(r.maxCyclomaticPerFunction >= 2);
  assert.ok(r.maxNestingDepth >= 1);
  assert.equal(r.todoCount, 1);
  assert.ok(r.exportCount >= 1);
});

test('deepScanModule: marks notebook as notebook', () => {
  const dir = tmpDir();
  const fp = path.join(dir, 'nb.ipynb');
  fs.writeFileSync(fp, '{"cells": []}\n');
  const r = deepScanModule(fp, LANG_CONFIG.unknown);
  assert.equal(r.isNotebook, true);
  assert.equal(r.language, 'unknown');
});

test('scanModuleStats: supports TypeScript files', () => {
  const srcDir = tmpDir();
  const testDir = tmpDir();
  fs.writeFileSync(path.join(srcDir, 'service.ts'), "import { x } from './dep';\nexport const a = 1;\n");
  fs.writeFileSync(path.join(srcDir, 'dep.ts'), 'export const x = 1;\n');
  fs.writeFileSync(path.join(testDir, 'service.test.ts'), 'test("x", () => {});\n');
  const stats = scanModuleStats(srcDir, testDir);
  assert.equal(stats.length, 2);
  const service = stats.find(s => s.file === 'service.ts');
  assert.ok(service);
  assert.equal(service.language, 'ts');
  assert.equal(service.hasTests, true);
});

test('scanModuleStats: computes fanIn for local imports', () => {
  const srcDir = tmpDir();
  fs.writeFileSync(path.join(srcDir, 'a.js'), "const b = require('./b');\nmodule.exports = b;\n");
  fs.writeFileSync(path.join(srcDir, 'c.js'), "const b = require('./b');\nmodule.exports = b;\n");
  fs.writeFileSync(path.join(srcDir, 'b.js'), 'module.exports = 1;\n');
  const stats = scanModuleStats(srcDir, null);
  const b = stats.find(s => s.file === 'b.js');
  assert.equal(b.fanIn, 2);
});

test('scanModuleStats: detects simple circular dependency', () => {
  const srcDir = tmpDir();
  fs.writeFileSync(path.join(srcDir, 'a.js'), "const b = require('./b');\nmodule.exports = b;\n");
  fs.writeFileSync(path.join(srcDir, 'b.js'), "const a = require('./a');\nmodule.exports = a;\n");
  const stats = scanModuleStats(srcDir, null);
  const a = stats.find(s => s.file === 'a.js');
  const b = stats.find(s => s.file === 'b.js');
  assert.equal(a.hasCircularDep, true);
  assert.equal(b.hasCircularDep, true);
});

test('deriveScanConfidence: KB-only when scan not requested', () => {
  const c = deriveScanConfidence({ scanRequested: false, moduleStats: [] });
  assert.equal(c.badge, 'KB-only');
});

test('deriveScanConfidence: partial-scan when scan requested but no files', () => {
  const c = deriveScanConfidence({ scanRequested: true, moduleStats: [] });
  assert.equal(c.badge, 'partial-scan');
});

test('deriveScanConfidence: partial-scan when unknown/notebook exists', () => {
  const c = deriveScanConfidence({
    scanRequested: true,
    moduleStats: [
      { language: 'js', isNotebook: false },
      { language: 'unknown', isNotebook: false },
    ],
  });
  assert.equal(c.badge, 'partial-scan');
});

test('deriveScanConfidence: full-scan when all files are known', () => {
  const c = deriveScanConfidence({
    scanRequested: true,
    moduleStats: [
      { language: 'js', isNotebook: false },
      { language: 'ts', isNotebook: false },
    ],
  });
  assert.equal(c.badge, 'full-scan');
});

test('deriveChaosContextSignals: reads impact, intents, graph and release signals', () => {
  const root = tmpDir();

  // impact.json with unbound changes -> attention
  const kbDir = path.join(root, '.kb');
  fs.mkdirSync(kbDir, { recursive: true });
  fs.writeFileSync(path.join(kbDir, 'impact.json'), JSON.stringify({
    version: 1,
    impacted: [],
    unbound_changes: [{ file: 'src/a.js' }, { file: 'src/b.js' }],
  }, null, 2));

  // intents: one stale + missing decision summary
  const intentDir = path.join(root, 'intents', '_active', 'i1');
  fs.mkdirSync(path.join(intentDir, 'proposed-changes'), { recursive: true });
  fs.writeFileSync(path.join(intentDir, 'intent.md'), [
    '---',
    'id: i1',
    'mode: quick',
    'status: open',
    'decision_summary: ""',
    '---',
    '',
  ].join('\n'));

  // catalog with old current release
  fs.writeFileSync(path.join(kbDir, 'catalog.json'), JSON.stringify({
    schemaVersion: 1,
    current: 'v1.0.0',
    releases: [{
      version: 'v1.0.0',
      released_at: '2025-01-01T00:00:00.000Z',
      git_tag: 'v1.0.0',
      git_commit: 'abc',
      template_version: '1.0.0',
      summary: 'old',
      prerelease: false,
      stats: { intents_applied: 0, docs_changed: 0, ad_hoc_commits: 0 },
      intents_applied: [],
    }],
  }, null, 2));

  // minimal docs for graph (one orphan)
  const docDir = path.join(root, 'docs');
  fs.mkdirSync(docDir, { recursive: true });
  fs.writeFileSync(path.join(docDir, 'a.md'), ['---', 'related_strong: []', '---', '', '# A'].join('\n'));

  const s = deriveChaosContextSignals(root);
  assert.equal(s.statusVerdict, 'attention');
  assert.equal(s.statusUnboundCount, 2);
  assert.equal(s.intentActiveCount, 1);
  assert.equal(s.intentStaleCount, 1);
  assert.equal(s.intentMissingDecisionSummaryCount, 1);
  assert.equal(typeof s.graphOrphanDocCount, 'number');
  assert.equal(typeof s.releaseDaysSinceLast, 'number');
});


// ---------------------------------------------------------------------------
// scanKbDocQuality (Phase 3)
// ---------------------------------------------------------------------------

test('scanKbDocQuality: empty dir returns zero ratio', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-dq-'));
  const r = scanKbDocQuality(root);
  assert.equal(r.totalDocs, 0);
  assert.equal(r.placeholderDocs, 0);
  assert.equal(r.contentPlaceholderRatio, 0);
});

test('scanKbDocQuality: all clean docs returns zero ratio', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-dq-'));
  const docsDir = path.join(root, 'docs');
  fs.mkdirSync(docsDir);
  fs.writeFileSync(path.join(docsDir, 'a.md'), '# A\n\nThis is real content.\n');
  fs.writeFileSync(path.join(docsDir, 'b.md'), '# B\n\nAnother real doc.\n');
  const r = scanKbDocQuality(root);
  assert.equal(r.totalDocs, 2);
  assert.equal(r.placeholderDocs, 0);
  assert.equal(r.contentPlaceholderRatio, 0);
});

test('scanKbDocQuality: [Enter ...] bracket pattern detected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-dq-'));
  fs.writeFileSync(path.join(root, 'doc.md'), '# Title\n\n[Enter the purpose of this document here]\n');
  const r = scanKbDocQuality(root);
  assert.equal(r.totalDocs, 1);
  assert.equal(r.placeholderDocs, 1);
  assert.equal(r.contentPlaceholderRatio, 1);
});

test('scanKbDocQuality: TODO and TBD patterns detected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-dq-'));
  const docsDir = path.join(root, 'docs');
  fs.mkdirSync(docsDir);
  fs.writeFileSync(path.join(docsDir, 'todo.md'), '# Doc\n\nTODO: write this section.\n');
  fs.writeFileSync(path.join(docsDir, 'tbd.md'), '# Doc\n\nRelease date: TBD\n');
  fs.writeFileSync(path.join(docsDir, 'clean.md'), '# Doc\n\nAll good here.\n');
  const r = scanKbDocQuality(root);
  assert.equal(r.totalDocs, 3);
  assert.equal(r.placeholderDocs, 2);
  assert.ok(Math.abs(r.contentPlaceholderRatio - 2 / 3) < 0.001);
});

test('scanKbDocQuality: skips .kb, .git, node_modules dirs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-dq-'));
  const kbDir = path.join(root, '.kb');
  const gitDir = path.join(root, '.git');
  const nmDir  = path.join(root, 'node_modules');
  fs.mkdirSync(kbDir); fs.mkdirSync(gitDir); fs.mkdirSync(nmDir);
  fs.writeFileSync(path.join(kbDir, 'internal.md'), '# Internal\n\nTODO: ignore me.\n');
  fs.writeFileSync(path.join(gitDir, 'x.md'), '# X\n\nTODO: ignore me.\n');
  fs.writeFileSync(path.join(nmDir,  'y.md'), '# Y\n\nTODO: ignore me.\n');
  fs.writeFileSync(path.join(root, 'real.md'), '# Real\n\nClean content.\n');
  const r = scanKbDocQuality(root);
  assert.equal(r.totalDocs, 1);
  assert.equal(r.placeholderDocs, 0);
});


// ---------------------------------------------------------------------------
// Phase 4: --estimate flag
// ---------------------------------------------------------------------------

test('parseArgs: --estimate sets estimateOnly', () => {
  assert.equal(parseArgs(['--estimate']).estimateOnly, true);
});

test('parseArgs: defaults estimateOnly false', () => {
  assert.equal(parseArgs([]).estimateOnly, false);
});

test('parseArgs: --estimate combined with --no-save', () => {
  const o = parseArgs(['--estimate', '--no-save']);
  assert.equal(o.estimateOnly, true);
  assert.equal(o.noSave, true);
});


// ---------------------------------------------------------------------------
// Phase 4: --estimate flag
// ---------------------------------------------------------------------------

test('parseArgs: --estimate sets estimateOnly', () => {
  assert.equal(parseArgs(['--estimate']).estimateOnly, true);
});

test('parseArgs: defaults estimateOnly false', () => {
  assert.equal(parseArgs([]).estimateOnly, false);
});

test('parseArgs: --estimate combined with --no-save', () => {
  const o = parseArgs(['--estimate', '--no-save']);
  assert.equal(o.estimateOnly, true);
  assert.equal(o.noSave, true);
});
