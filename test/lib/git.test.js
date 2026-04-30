'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseDiffNameStatus } = require('../../src/lib/git');

test('parseDiffNameStatus: returns [] for empty/null/non-string', () => {
  assert.deepEqual(parseDiffNameStatus(''), []);
  assert.deepEqual(parseDiffNameStatus(null), []);
  assert.deepEqual(parseDiffNameStatus(undefined), []);
  assert.deepEqual(parseDiffNameStatus(123), []);
});

test('parseDiffNameStatus: parses Modify/Add/Delete with single tab', () => {
  const raw = 'M\tsrc/a.js\nA\tsrc/b.js\nD\tdocs/old.md';
  assert.deepEqual(parseDiffNameStatus(raw), [
    { status: 'M', path: 'src/a.js' },
    { status: 'A', path: 'src/b.js' },
    { status: 'D', path: 'docs/old.md' },
  ]);
});

test('parseDiffNameStatus: rename keeps oldPath and strips similarity score', () => {
  const raw = 'R100\told/path.js\tnew/path.js';
  assert.deepEqual(parseDiffNameStatus(raw), [
    { status: 'R', path: 'new/path.js', oldPath: 'old/path.js' },
  ]);
});

test('parseDiffNameStatus: copy treated like rename', () => {
  const raw = 'C75\tsrc/source.js\tsrc/copy.js';
  assert.deepEqual(parseDiffNameStatus(raw), [
    { status: 'C', path: 'src/copy.js', oldPath: 'src/source.js' },
  ]);
});

test('parseDiffNameStatus: normalizes Windows backslash to forward slash', () => {
  const raw = 'M\tsrc\\win\\file.js';
  assert.deepEqual(parseDiffNameStatus(raw), [
    { status: 'M', path: 'src/win/file.js' },
  ]);
});

test('parseDiffNameStatus: handles CRLF line endings', () => {
  const raw = 'M\tsrc/a.js\r\nA\tsrc/b.js\r\n';
  assert.equal(parseDiffNameStatus(raw).length, 2);
});

test('parseDiffNameStatus: skips malformed lines (single column)', () => {
  const raw = 'M\tsrc/a.js\ngarbage\nA\tsrc/b.js';
  assert.deepEqual(parseDiffNameStatus(raw), [
    { status: 'M', path: 'src/a.js' },
    { status: 'A', path: 'src/b.js' },
  ]);
});
