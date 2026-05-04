'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseArgs,
  updateFrontmatterFields,
  findFrontmatterBounds,
} = require('../../src/commands/verify');

test('parseArgs: single target', () => {
  const o = parseArgs(['doc.md']);
  assert.equal(o.target, 'doc.md');
  assert.equal(o.all, false);
});

test('parseArgs: --all without target', () => {
  const o = parseArgs(['--all']);
  assert.equal(o.all, true);
  assert.equal(o.target, null);
});

test('parseArgs: --all with target throws', () => {
  assert.throws(() => parseArgs(['--all', 'doc.md']), /does not accept a target/);
});

test('parseArgs: missing target throws', () => {
  assert.throws(() => parseArgs([]), /requires exactly 1 target/);
});

test('parseArgs: unknown option throws', () => {
  assert.throws(() => parseArgs(['doc.md', '--bogus']), /Unknown verify option/);
});

test('verify re-exports frontmatter helpers', () => {
  assert.equal(typeof findFrontmatterBounds, 'function');
  assert.equal(typeof updateFrontmatterFields, 'function');
});
