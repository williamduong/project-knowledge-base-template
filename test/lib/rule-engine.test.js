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
    assert.ok(rules.length >= 9, `Expected at least 9 rules (Phase 1.0 + Phase 2), got ${rules.length}`);
  });

  it('each rule has id, severity, description, check function', () => {
    for (const rule of loadRules()) {
      assert.ok(typeof rule.id === 'string' && rule.id.length > 0, `rule.id missing: ${JSON.stringify(rule)}`);
      assert.ok(['error', 'warn', 'info'].includes(rule.severity), `Invalid severity on ${rule.id}: ${rule.severity}`);
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

  it('Phase 2 verification rules are present: KBX-V001, KBX-V002', () => {
    const ids = loadRules().map(r => r.id);
    for (const expected of ['KBX-V001', 'KBX-V002']) {
      assert.ok(ids.includes(expected), `Missing Phase 2 rule: ${expected}`);
    }
  });

  it('Phase 2 intent rules are present: KBX-I001, KBX-I002', () => {
    const ids = loadRules().map(r => r.id);
    for (const expected of ['KBX-I001', 'KBX-I002']) {
      assert.ok(ids.includes(expected), `Missing Phase 2 rule: ${expected}`);
    }
  });

  it('Phase 2 git-binding rules are present: KBX-GB001, KBX-GB002', () => {
    const ids = loadRules().map(r => r.id);
    assert.ok(ids.includes('KBX-GB001'), `Missing Phase 2 rule: KBX-GB001`);
    assert.ok(ids.includes('KBX-GB002'), `Missing Phase 2 rule: KBX-GB002`);
  });
});

// ─── registerRules validation ────────────────────────────────────────────────

describe('registerRules', () => {
  it('throws if rule is missing required fields', () => {
    assert.throws(
      () => registerRules([{ id: 'TEST-BAD', description: 'no check' }]),
      /Invalid rule ID format|title missing|severity must be one of|check must be a function/
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

// ─── KBX-V001 — time_state required when code-verified ──────────────────────

describe('KBX-V001: time_state required when code-verified', () => {
  let tmpDir;
  after(() => cleanup(tmpDir));

  it('no violation when code-verified + time_state present', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', 'status: active', 'owner: me',
        'verification: code-verified', 'time_state: current', '---', '# T',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-V001']);
    const v = violations.filter(x => x.rule_id === 'KBX-V001');
    assert.equal(v.length, 0);
  });

  it('violation when code-verified + time_state missing', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', 'status: active', 'owner: me',
        'verification: code-verified', '---', '# T',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-V001']);
    const v = violations.filter(x => x.rule_id === 'KBX-V001');
    assert.equal(v.length, 1);
    assert.ok(v[0].message.includes('time_state'));
  });

  it('no violation when verification != code-verified (time_state optional)', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', 'status: active', 'owner: me',
        'verification: design-only', '---', '# T',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-V001']);
    const v = violations.filter(x => x.rule_id === 'KBX-V001');
    assert.equal(v.length, 0);
  });
});

// ─── KBX-V002 — time_state allowed values ─────────────────────────────────

describe('KBX-V002: time_state allowed values', () => {
  let tmpDir;
  after(() => cleanup(tmpDir));

  it('no violation if time_state absent', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', 'status: active', 'owner: me', '---', '# T',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-V002']);
    const v = violations.filter(x => x.rule_id === 'KBX-V002');
    assert.equal(v.length, 0);
  });

  it('no violation for valid time_state values', async () => {
    for (const val of ['current', 'point-in-time', 'evergreen', 'historical', '2026-current', 'future']) {
      const dir = makeTmpKb({
        'knowledge-base/01-product/doc.md': [
          '---', 'title: T', 'type: doc', 'status: active', 'owner: me', `time_state: ${val}`, '---', '# T',
        ].join('\n'),
      });
      const { violations } = runRules(dir, ['KBX-V002']);
      const v = violations.filter(x => x.rule_id === 'KBX-V002');
      assert.equal(v.length, 0, `time_state "${val}" should be valid`);
      cleanup(dir);
    }
  });

  it('error violation for invalid time_state', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', 'status: active', 'owner: me', 'time_state: sometimes', '---', '# T',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-V002']);
    const v = violations.filter(x => x.rule_id === 'KBX-V002');
    assert.equal(v.length, 1);
    assert.equal(v[0].severity, 'error');
    assert.ok(v[0].message.includes('sometimes'));
  });
});

// ─── KBX-I001 — active intents must have next_action ───────────────────────

describe('KBX-I001: active intents must have next_action', () => {
  let tmpDir;
  after(() => cleanup(tmpDir));

  it('no violation for active intent with next_action', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/intents/_active/v2-7-test/intent.md': [
        '---',
        'id: v2-7-test',
        'lifecycle: active',
        'focus:',
        '  next_action: "Build rule engine"',
        '---',
        '# Intent',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-I001']);
    const v = violations.filter(x => x.rule_id === 'KBX-I001');
    assert.equal(v.length, 0);
  });

  it('violation for active intent with empty next_action', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/intents/_active/v2-7-test/intent.md': [
        '---',
        'id: v2-7-test',
        'lifecycle: active',
        'focus:',
        '  next_action: ""',
        '---',
        '# Intent',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-I001']);
    const v = violations.filter(x => x.rule_id === 'KBX-I001');
    assert.equal(v.length, 1);
    assert.ok(v[0].message.includes('next_action'));
  });

  it('no violation for closed intent without next_action', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/intents/_closed/released/v2-6-test/intent.md': [
        '---',
        'id: v2-6-test',
        'lifecycle: closed',
        '---',
        '# Intent',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-I001']);
    const v = violations.filter(x => x.rule_id === 'KBX-I001');
    assert.equal(v.length, 0, 'closed intents should not be flagged');
  });
});

// ─── KBX-I002 — feature intents must have change_scope ──────────────────────

describe('KBX-I002: feature intents must have change_scope', () => {
  let tmpDir;
  after(() => cleanup(tmpDir));

  it('no violation for feature intent with change_scope', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/intents/_active/v2-7-test/intent.md': [
        '---',
        'id: v2-7-test',
        'lifecycle: active',
        'change_type: feature',
        'change_scope: src/ + template/',
        '---',
        '# Intent',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-I002']);
    const v = violations.filter(x => x.rule_id === 'KBX-I002');
    assert.equal(v.length, 0);
  });

  it('violation for feature intent with missing change_scope field', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/intents/_active/v2-7-test/intent.md': [
        '---',
        'id: v2-7-test',
        'lifecycle: active',
        'change_type: feature',
        '---',
        '# Intent',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-I002']);
    const v = violations.filter(x => x.rule_id === 'KBX-I002');
    assert.equal(v.length, 1);
    assert.ok(v[0].message.includes('change_scope'));
  });

  it('no violation for breaking intent with change_scope', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/intents/_active/v2-0-breaking/intent.md': [
        '---',
        'id: v2-0-breaking',
        'lifecycle: active',
        'change_type: breaking',
        'change_scope: CLI API + KB schema',
        '---',
        '# Intent',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-I002']);
    const v = violations.filter(x => x.rule_id === 'KBX-I002');
    assert.equal(v.length, 0);
  });

  it('no violation for bugfix intent (change_scope optional)', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/intents/_active/v2-7-bugfix/intent.md': [
        '---',
        'id: v2-7-bugfix',
        'lifecycle: active',
        'change_type: bugfix',
        '---',
        '# Intent',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-I002']);
    const v = violations.filter(x => x.rule_id === 'KBX-I002');
    assert.equal(v.length, 0, 'bugfix intents should not require change_scope');
  });
});

// ─── KBX-GB001 — intent ID format (vX-Y-slug) ────────────────────────────────

describe('KBX-GB001: intent ID format', () => {
  let tmpDir;
  after(() => cleanup(tmpDir));

  it('no violation for valid vX-Y-slug format', async () => {
    for (const id of ['v2-7-nl-rules-to-cli', 'v1-3-git-binding', 'v3-0-monorepo-split', 'v2-5-rule-01']) {
      const dir = makeTmpKb({
        [`knowledge-base/intents/_active/${id}/intent.md`]: [
          '---',
          `id: ${id}`,
          'lifecycle: active',
          '---',
          '# Intent',
        ].join('\n'),
      });
      const { violations } = runRules(dir, ['KBX-GB001']);
      const v = violations.filter(x => x.rule_id === 'KBX-GB001');
      assert.equal(v.length, 0, `ID "${id}" should match vX-Y-slug`);
      cleanup(dir);
    }
  });

  it('violation for missing v prefix', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/intents/_active/2-7-rules/intent.md': [
        '---',
        'id: 2-7-rules',
        'lifecycle: active',
        '---',
        '# Intent',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-GB001']);
    const v = violations.filter(x => x.rule_id === 'KBX-GB001');
    assert.equal(v.length, 1);
    assert.ok(v[0].message.includes('2-7-rules'));
  });

  it('violation for underscore in slug', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/intents/_active/v2_7_rules/intent.md': [
        '---',
        'id: v2_7_rules',
        'lifecycle: active',
        '---',
        '# Intent',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-GB001']);
    const v = violations.filter(x => x.rule_id === 'KBX-GB001');
    assert.equal(v.length, 1);
    assert.ok(v[0].message.includes('v2_7_rules'));
  });

  it('violation for missing slug', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/intents/_active/v2-7/intent.md': [
        '---',
        'id: v2-7',
        'lifecycle: active',
        '---',
        '# Intent',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-GB001']);
    const v = violations.filter(x => x.rule_id === 'KBX-GB001');
    assert.equal(v.length, 1);
    assert.ok(v[0].message.includes('v2-7'));
  });
});

// ─── KBX-GB002 — focus checkpoint section ───────────────────────────────────

describe('KBX-GB002: focus checkpoint section', () => {
  let tmpDir;
  after(() => cleanup(tmpDir));

  it('no violation when svfactory/focus.md has checkpoint heading', () => {
    tmpDir = makeTmpKb({
      'svfactory/focus.md': [
        '# Focus',
        '',
        '## Intent Checkpoints',
        '',
        '- 2026-05-10T00:00:00.000Z | event=intent.status | branch=main',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-GB002']);
    const v = violations.filter(x => x.rule_id === 'KBX-GB002');
    assert.equal(v.length, 0);
  });

  it('warn violation when focus file exists without checkpoint heading', () => {
    tmpDir = makeTmpKb({
      'svfactory/focus.md': [
        '# Focus',
        '',
        'No checkpoint section yet.',
      ].join('\n'),
    });
    const { violations } = runRules(tmpDir, ['KBX-GB002']);
    const v = violations.filter(x => x.rule_id === 'KBX-GB002');
    assert.equal(v.length, 1);
    assert.ok(v[0].message.includes('Intent Checkpoints'));
  });

  it('no violation when no focus file exists', () => {
    tmpDir = makeTmpKb({
      'knowledge-base/01-product/doc.md': '# Doc',
    });
    const { violations } = runRules(tmpDir, ['KBX-GB002']);
    const v = violations.filter(x => x.rule_id === 'KBX-GB002');
    assert.equal(v.length, 0);
  });
});
