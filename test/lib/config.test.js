'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  loadConfig,
  getConfigValue,
  writeConfig,
  configFilePath,
  DEFAULTS,
} = require('../../src/lib/config');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-cfg-'));
}

test('loadConfig: returns {} when file missing', () => {
  const root = tmpRoot();
  assert.deepEqual(loadConfig(root), {});
});

test('loadConfig: parses valid JSON object', () => {
  const root = tmpRoot();
  const fp = configFilePath(root);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify({ impact: { defaultDepth: 3 } }));
  assert.deepEqual(loadConfig(root), { impact: { defaultDepth: 3 } });
});

test('loadConfig: returns {} on invalid JSON', () => {
  const root = tmpRoot();
  const fp = configFilePath(root);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, '{not valid');
  assert.deepEqual(loadConfig(root), {});
});

test('loadConfig: returns {} when JSON is array (not object)', () => {
  const root = tmpRoot();
  const fp = configFilePath(root);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, '[1,2,3]');
  assert.deepEqual(loadConfig(root), {});
});

test('getConfigValue: dotted path returns nested value', () => {
  const cfg = { impact: { defaultDepth: 4, maxDepth: 10 } };
  assert.equal(getConfigValue(cfg, 'impact.defaultDepth', 0), 4);
  assert.equal(getConfigValue(cfg, 'impact.maxDepth', 0), 10);
});

test('getConfigValue: returns default when path missing', () => {
  const cfg = { impact: {} };
  assert.equal(getConfigValue(cfg, 'impact.missing', 'fallback'), 'fallback');
  assert.equal(getConfigValue(cfg, 'estimator.tokenRatio', 4), 4);
  assert.equal(getConfigValue({}, 'a.b.c', null), null);
});

test('getConfigValue: empty/invalid path returns default', () => {
  assert.equal(getConfigValue({}, '', 'd'), 'd');
  assert.equal(getConfigValue({}, null, 'd'), 'd');
});

test('writeConfig: round-trip', () => {
  const root = tmpRoot();
  const cfg = { estimator: { tokenRatio: 3 }, impact: { defaultDepth: 1 } };
  writeConfig(root, cfg);
  assert.deepEqual(loadConfig(root), cfg);
});

test('DEFAULTS: schema present', () => {
  assert.equal(typeof DEFAULTS.estimator.tokenRatio, 'number');
  assert.equal(typeof DEFAULTS.impact.defaultDepth, 'number');
  assert.equal(typeof DEFAULTS.impact.maxDepth, 'number');
  assert.ok(DEFAULTS.impact.maxDepth >= DEFAULTS.impact.defaultDepth);
});
