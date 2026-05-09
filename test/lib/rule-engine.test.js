'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Import the real rule engine (auto-loads built-in rules including metadata)
const { loadRules, runRules, runRule, registerRules } = require('../../src/lib/rule-engine');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeTmpKb(files = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-rule-engine-test-'));
  for (const [relPath, content] of Object.entries(files)) {
    const abs = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
  return tmpDir;
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

// ─── loadRules ──────────────────────────────────────────────────────────────

describe('loadRules', () => {
  it('returns an array of rule definitions', () => {
    const rules = loadRules();
    assert.ok(Array.isArray(rules));
    assert.ok(rules.length >= 4, `Expected at least 4 rules, got ${rules.length}`);
  });

  it('each rule has id, severity, description, check function', () => {
    for (const rule of loadRules()) {
      assert.ok(typeof rule.id === 'string' && rule.id.length > 0, `rule.id missing: ${JSON.stringify(rule)}`);
      assert.ok(['error', 'warn'].includes(rule.severity), `Invalid severity on ${rule.id}: ${rule.severity}`);
      assert.ok(typeof rule.description === 'string', `rule.description missing: ${rule.id}`);
      assert.ok(typeof rule.check === 'function', `rule.check missing: ${rule.id}`);
    }
  });

  it('rules are sorted by id', () => {
    const rules = loadRules();
    const sorted = [...rules].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < rules.length; i++) {
      assert.equal(rules[i].id, sorted[i].id, 'loadRules should return sorted rules');
    }
  });

  it('built-in metadata rules are present: KBX-M001 through KBX-M004', () => {
    const ids = loadRules().map(r => r.id);
    for (const expected of ['KBX-M001', 'KBX-M002', 'KBX-M003', 'KBX-M004']) {
      assert.ok(ids.includes(expected), `Missing built-in rule: ${expected}`);
    }
  });
});

// ─── registerRules validation ────────────────────────────────────────────────

describe('registerRules', () => {
  it('throws if rule is missing required fields', () => {
    assert.throws(
      () => registerRules([{ id: 'TEST-BAD', description: 'no check' }]),
      /missing id, severity, or check/
    );
  });
});

// ─── runRules on empty KB ────────────────────────────────────────────────────

describe('runRules', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpKb({}); });
  after(() => cleanup(tmpDir));

  it('returns { violations, rulesRun } shape', () => {
    const result = runRules(tmpDir);
    assert.ok('violations' in result);
    assert.ok('rulesRun' in result);
    assert.ok(Array.isArray(result.violations));
    assert.ok(typeof result.rulesRun === 'number');
  });

  it('returns 0 violations for empty KB (no governed docs)', () => {
    const result = runRules(tmpDir);
    assert.equal(result.violations.length, 0, 'empty KB should have 0 violations');
  });

  it('rulesRun equals total number of registered rules', () => {
    const result = runRules(tmpDir);
    assert.equal(result.rulesRun, loadRules().length);
  });
});

// ─── KBX-M001 — required frontmatter fields ──────────────────────────────────

describe('KBX-M001: required frontmatter fields', () => {
  let tmpDir;
  after(() => cleanup(tmpDir));

  it('no violation when all required fields present', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/overview.md': [
        '---',
        'title: Product Overview',
        'type: doc',
        'status: active',
        'owner: team',
        '---',
        '# Overview',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-M001']);
    const v = violations.filter(v => v.rule_id === 'KBX-M001');
    assert.equal(v.length, 0);
  });

  it('violation when title is missing', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/overview.md': [
        '---',
        'type: doc',
        'status: active',
        'owner: team',
        '---',
        '# Overview',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-M001']);
    const v = violations.filter(x => x.rule_id === 'KBX-M001');
    assert.equal(v.length, 1);
    assert.ok(v[0].message.includes('title'));
  });

  it('violation when multiple required fields missing', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/overview.md': [
        '---',
        'title: Something',
        '---',
        '# Doc',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-M001']);
    const v = violations.filter(x => x.rule_id === 'KBX-M001');
    assert.equal(v.length, 1);
    assert.ok(v[0].message.includes('type'));
    assert.ok(v[0].message.includes('status'));
    assert.ok(v[0].message.includes('owner'));
  });

  it('skips docs without frontmatter block', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/no-frontmatter.md': '# Just a heading\n\nNo frontmatter here.',
    });
    const { violations } = runRules(tmpDir, ['KBX-M001']);
    const v = violations.filter(x => x.rule_id === 'KBX-M001');
    assert.equal(v.length, 0, 'docs without frontmatter should not be flagged');
  });

  it('includes relative file path in violation', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/03-architecture/adr.md': [
        '---',
        'type: adr',
        '---',
        '# ADR',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-M001']);
    const v = violations.filter(x => x.rule_id === 'KBX-M001');
    assert.ok(v.length > 0);
    assert.ok(v[0].file.includes('knowledge-base'), `file should be relative, got: ${v[0].file}`);
    assert.ok(!path.isAbsolute(v[0].file), `file should not be absolute, got: ${v[0].file}`);
  });
});

// ─── KBX-M002 — status allowed values ────────────────────────────────────────

describe('KBX-M002: status allowed values', () => {
  let tmpDir;
  after(() => cleanup(tmpDir));

  it('no violation for valid status values', async () => {
    for (const status of ['active', 'draft', 'deprecated', 'archived']) {
      const dir = makeTmpKb({
        'knowledge-base/01-product/doc.md': [
          '---', `title: T`, `type: doc`, `status: ${status}`, `owner: me`, '---', '# T',
        ].join('\n'),
      });
      const { violations } = runRules(dir, ['KBX-M002']);
      const v = violations.filter(x => x.rule_id === 'KBX-M002');
      assert.equal(v.length, 0, `status "${status}" should be valid`);
      cleanup(dir);
    }
  });

  it('violation for invalid status', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', 'status: published', 'owner: me', '---', '# T',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-M002']);
    const v = violations.filter(x => x.rule_id === 'KBX-M002');
    assert.equal(v.length, 1);
    assert.ok(v[0].message.includes('published'));
  });
});

// ─── KBX-M003 — verification allowed values ──────────────────────────────────

describe('KBX-M003: verification allowed values', () => {
  let tmpDir;
  after(() => cleanup(tmpDir));

  it('no violation if verification is absent', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', 'status: active', 'owner: me', '---', '# T',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-M003']);
    const v = violations.filter(x => x.rule_id === 'KBX-M003');
    assert.equal(v.length, 0);
  });

  it('no violation for valid verification values', async () => {
    for (const val of ['code-verified', 'design-only', 'unverified', 'outdated']) {
      const dir = makeTmpKb({
        'knowledge-base/01-product/doc.md': [
          '---', 'title: T', 'type: doc', 'status: active', 'owner: me', `verification: ${val}`, '---', '# T',
        ].join('\n'),
      });
      const { violations } = runRules(dir, ['KBX-M003']);
      const v = violations.filter(x => x.rule_id === 'KBX-M003');
      assert.equal(v.length, 0, `verification "${val}" should be valid`);
      cleanup(dir);
    }
  });

  it('warn violation for invalid verification', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', 'status: active', 'owner: me', 'verification: partially-verified', '---', '# T',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-M003']);
    const v = violations.filter(x => x.rule_id === 'KBX-M003');
    assert.equal(v.length, 1);
    assert.equal(v[0].severity, 'warn');
  });
});

// ─── KBX-M004 — time_state allowed values ────────────────────────────────────

describe('KBX-M004: time_state allowed values', () => {
  let tmpDir;
  after(() => cleanup(tmpDir));

  it('no violation if time_state is absent', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', 'status: active', 'owner: me', '---', '# T',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-M004']);
    const v = violations.filter(x => x.rule_id === 'KBX-M004');
    assert.equal(v.length, 0);
  });

  it('warn violation for invalid time_state', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', 'status: active', 'owner: me', 'time_state: sometimes', '---', '# T',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-M004']);
    const v = violations.filter(x => x.rule_id === 'KBX-M004');
    assert.equal(v.length, 1);
    assert.equal(v[0].severity, 'warn');
    assert.ok(v[0].message.includes('sometimes'));
  });
});

// ─── runRule (single rule) ────────────────────────────────────────────────────

describe('runRule', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpKb({}); });
  after(() => cleanup(tmpDir));

  it('found: false for unknown rule id', () => {
    const result = runRule(tmpDir, 'NOT-REAL-999');
    assert.equal(result.found, false);
    assert.deepEqual(result.violations, []);
  });

  it('found: true for known rule id', () => {
    const result = runRule(tmpDir, 'KBX-M001');
    assert.equal(result.found, true);
    assert.ok(Array.isArray(result.violations));
  });
});

// ─── ruleIds filter ──────────────────────────────────────────────────────────

describe('runRules with ruleIds filter', () => {
  let tmpDir;
  before(() => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', 'status: bad-status', 'owner: me', '---', '# T',
      ].join('\n'),
    });
  });
  after(() => cleanup(tmpDir));

  it('runs only the specified rules', () => {
    const { violations, rulesRun } = runRules(tmpDir, ['KBX-M002']);
    assert.equal(rulesRun, 1);
    assert.ok(violations.every(v => v.rule_id === 'KBX-M002'));
  });

  it('returns 0 rulesRun for empty ruleIds list', () => {
    const { rulesRun } = runRules(tmpDir, []);
    assert.equal(rulesRun, 0);
  });
});
