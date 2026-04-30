'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs } = require('../../src/commands/impact');

test('parseArgs: target only, defaults', () => {
  const o = parseArgs(['my-doc.md']);
  assert.equal(o.target, 'my-doc.md');
  assert.equal(o.json, false);
  assert.equal(o.depth, null);
});

test('parseArgs: --depth=N parses integer', () => {
  const o = parseArgs(['x.md', '--depth=3']);
  assert.equal(o.depth, 3);
});

test('parseArgs: --json flag', () => {
  const o = parseArgs(['x.md', '--json']);
  assert.equal(o.json, true);
});

test('parseArgs: rejects --depth=NaN', () => {
  assert.throws(() => parseArgs(['x.md', '--depth=abc']), /non-negative integer/);
});

test('parseArgs: rejects --depth=-1', () => {
  assert.throws(() => parseArgs(['x.md', '--depth=-1']), /non-negative integer/);
});

test('parseArgs: rejects unknown option', () => {
  assert.throws(() => parseArgs(['x.md', '--bogus']), /Unknown impact option/);
});

test('parseArgs: requires exactly 1 target', () => {
  assert.throws(() => parseArgs([]), /requires exactly 1 target/);
  assert.throws(() => parseArgs(['a', 'b']), /requires exactly 1 target/);
});
