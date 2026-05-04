'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findFrontmatterBounds,
  removeFrontmatterFields,
  updateFrontmatterFields,
} = require('../../src/lib/frontmatter');

test('findFrontmatterBounds: detects valid block', () => {
  const text = '---\ntitle: x\n---\nbody';
  const b = findFrontmatterBounds(text);
  assert.ok(b);
  assert.equal(b.endLine, 2);
});

test('findFrontmatterBounds: returns null when missing', () => {
  assert.equal(findFrontmatterBounds('# no frontmatter'), null);
});

test('updateFrontmatterFields: updates existing field, preserves others', () => {
  const text = '---\ntitle: x\nlast_verified: 2025-01-01\n---\nbody';
  const out = updateFrontmatterFields(text, { last_verified: '2026-05-01' });
  assert.match(out, /last_verified: 2026-05-01/);
  assert.match(out, /title: x/);
  assert.match(out, /\nbody$/);
});

test('updateFrontmatterFields: inserts new field when missing', () => {
  const text = '---\ntitle: x\n---\nbody';
  const out = updateFrontmatterFields(text, { last_verified_commit: 'abc123' });
  assert.match(out, /last_verified_commit: abc123/);
  const idx = out.indexOf('last_verified_commit: abc123');
  const closing = out.indexOf('\n---\nbody');
  assert.ok(idx < closing);
});

test('removeFrontmatterFields: removes targeted keys only', () => {
  const text = '---\ntitle: x\ndowngraded_at: 2026-05-04\ndowngrade_reason: binding\n---\nbody';
  const out = removeFrontmatterFields(text, ['downgraded_at', 'downgrade_reason']);
  assert.doesNotMatch(out, /downgraded_at:/);
  assert.doesNotMatch(out, /downgrade_reason:/);
  assert.match(out, /title: x/);
});