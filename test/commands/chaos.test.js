'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const { parseArgs, scanModuleStats } = require('../../src/commands/chaos');

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
