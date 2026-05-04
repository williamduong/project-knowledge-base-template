'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldAutoDowngradeDoc } = require('../../src/lib/auto-downgrade');

test('shouldAutoDowngradeDoc: downgrades verified doc when binding changed since verify', () => {
  const out = shouldAutoDowngradeDoc({
    kbState: 'verified',
    lastVerifiedCommit: 'abc123',
    bindingPaths: ['src/auth.js'],
    changedPathsSinceVerify: ['src/auth.js'],
    isDirty: false,
  });
  assert.equal(out.shouldDowngrade, true);
  assert.deepEqual(out.matchedPaths, ['src/auth.js']);
  assert.equal(out.reason, 'binding-changed-after-verify');
});

test('shouldAutoDowngradeDoc: skips when not verified', () => {
  const out = shouldAutoDowngradeDoc({
    kbState: 'needs-review',
    lastVerifiedCommit: 'abc123',
    bindingPaths: ['src/auth.js'],
    changedPathsSinceVerify: ['src/auth.js'],
    isDirty: false,
  });
  assert.equal(out.shouldDowngrade, false);
  assert.equal(out.reason, 'not-verified');
});

test('shouldAutoDowngradeDoc: skips when missing verify commit', () => {
  const out = shouldAutoDowngradeDoc({
    kbState: 'verified',
    lastVerifiedCommit: null,
    bindingPaths: ['src/auth.js'],
    changedPathsSinceVerify: ['src/auth.js'],
    isDirty: false,
  });
  assert.equal(out.shouldDowngrade, false);
  assert.equal(out.reason, 'missing-last-verified-commit');
});

test('shouldAutoDowngradeDoc: skips dirty doc', () => {
  const out = shouldAutoDowngradeDoc({
    kbState: 'verified',
    lastVerifiedCommit: 'abc123',
    bindingPaths: ['src/auth.js'],
    changedPathsSinceVerify: ['src/auth.js'],
    isDirty: true,
  });
  assert.equal(out.shouldDowngrade, false);
  assert.equal(out.reason, 'doc-dirty');
});

test('shouldAutoDowngradeDoc: skips when changes since verify do not touch bindings', () => {
  const out = shouldAutoDowngradeDoc({
    kbState: 'verified',
    lastVerifiedCommit: 'abc123',
    bindingPaths: ['src/auth.js'],
    changedPathsSinceVerify: ['src/other.js'],
    isDirty: false,
  });
  assert.equal(out.shouldDowngrade, false);
  assert.equal(out.reason, 'binding-unchanged-since-verify');
});