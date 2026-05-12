'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs } = require('../../src/commands/gate');

test('gate parseArgs: defaults', () => {
  const o = parseArgs([]);
  assert.equal(o.json, false);
  assert.equal(o.release, false);
});

test('gate parseArgs: --json and --release', () => {
  const o = parseArgs(['--json', '--release']);
  assert.equal(o.json, true);
  assert.equal(o.release, true);
});

test('gate parseArgs: unknown option throws', () => {
  assert.throws(() => parseArgs(['--bad']), /Unknown gate option/);
});
