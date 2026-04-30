'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs, addTransitiveImpact } = require('../../src/commands/scan');

test('scan parseArgs: --recursive flag', () => {
  const o = parseArgs(['--recursive']);
  assert.equal(o.recursive, true);
  assert.equal(o.depth, null);
});

test('scan parseArgs: --recursive + --depth=3', () => {
  const o = parseArgs(['--recursive', '--depth=3']);
  assert.equal(o.recursive, true);
  assert.equal(o.depth, 3);
});

test('scan parseArgs: --depth=invalid throws', () => {
  assert.throws(() => parseArgs(['--depth=abc']), /non-negative integer/);
  assert.throws(() => parseArgs(['--depth=-1']), /non-negative integer/);
});

test('scan parseArgs: unknown flag throws', () => {
  assert.throws(() => parseArgs(['--bogus']), /Unknown scan option/);
});

test('addTransitiveImpact: skipped impactData passes through unchanged', () => {
  const data = { skipped_reason: 'no-baseline' };
  const out = addTransitiveImpact({ impactData: data, ctx: null, depth: 2 });
  assert.equal(out, data);
  assert.equal(out.transitive_impacted, undefined);
});

test('addTransitiveImpact: zero impacted roots → empty transitive_impacted with depth set', () => {
  const data = { impacted: [], skipped_reason: null };
  const out = addTransitiveImpact({ impactData: data, ctx: { contentRoot: '/nope' }, depth: 2 });
  assert.deepEqual(out.transitive_impacted, []);
  assert.equal(out.transitive_depth, 2);
});
