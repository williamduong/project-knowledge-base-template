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
  // Inserted before closing ---
  const idx = out.indexOf('last_verified_commit: abc123');
  const closing = out.indexOf('\n---\nbody');
  assert.ok(idx < closing);
});

test('updateFrontmatterFields: updates one + inserts another', () => {
  const text = '---\ntitle: x\nlast_verified: 2025-01-01\n---\nbody';
  const out = updateFrontmatterFields(text, {
    last_verified: '2026-05-01',
    last_verified_commit: 'sha',
  });
  assert.match(out, /last_verified: 2026-05-01/);
  assert.match(out, /last_verified_commit: sha/);
});

test('updateFrontmatterFields: throws when no frontmatter', () => {
  assert.throws(() => updateFrontmatterFields('plain text', { x: 'y' }), /No frontmatter block/);
});
