'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs } = require('../../src/commands/baseline');

test('parseArgs: show', () => {
  const o = parseArgs(['show']);
  assert.equal(o.sub, 'show');
});

test('parseArgs: show --json', () => {
  const o = parseArgs(['show', '--json']);
  assert.equal(o.sub, 'show');
  assert.equal(o.json, true);
});

test('parseArgs: show with extra arg throws', () => {
  assert.throws(() => parseArgs(['show', 'extra']), /takes no arguments/);
});

test('parseArgs: set <sha>', () => {
  const o = parseArgs(['set', 'abc123']);
  assert.equal(o.sub, 'set');
  assert.equal(o.sha, 'abc123');
  assert.equal(o.toHead, false);
});

test('parseArgs: set --to-head', () => {
  const o = parseArgs(['set', '--to-head']);
  assert.equal(o.sub, 'set');
  assert.equal(o.toHead, true);
  assert.equal(o.sha, null);
});

test('parseArgs: set --yes <sha>', () => {
  const o = parseArgs(['set', '--yes', 'abc']);
  assert.equal(o.sha, 'abc');
  assert.equal(o.yes, true);
});

test('parseArgs: set without sha or --to-head throws', () => {
  assert.throws(() => parseArgs(['set']), /requires <sha> or --to-head/);
});

test('parseArgs: missing subcommand throws', () => {
  assert.throws(() => parseArgs([]), /requires a subcommand/);
});

test('parseArgs: unknown subcommand throws', () => {
  assert.throws(() => parseArgs(['delete']), /unknown subcommand/);
});

test('parseArgs: unknown option throws', () => {
  assert.throws(() => parseArgs(['show', '--bogus']), /Unknown baseline option/);
});
