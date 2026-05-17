const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs } = require('../../src/commands/test');

test('test parseArgs: defaults', () => {
  const options = parseArgs([]);
  assert.equal(options.sample, 5);
  assert.equal(options.all, false);
  assert.equal(options.stackMode, null);
});

test('test parseArgs: --stack defaults to full for compatibility', () => {
  const options = parseArgs(['--stack']);
  assert.equal(options.stackMode, 'full');
});

test('test parseArgs: --stack=quick supported', () => {
  const options = parseArgs(['--stack=quick']);
  assert.equal(options.stackMode, 'quick');
});

test('test parseArgs: --stack-mode full supported', () => {
  const options = parseArgs(['--all', '--stack-mode', 'full']);
  assert.equal(options.all, true);
  assert.equal(options.stackMode, 'full');
});

test('test parseArgs: invalid stack mode rejected', () => {
  assert.throws(() => parseArgs(['--stack=weird']), /quick or full/);
  assert.throws(() => parseArgs(['--stack-mode', 'weird']), /quick or full/);
});
