'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { matchAny, matchPaths, normalizePath, toPatternList } = require('../../src/lib/binding-matcher');

test('normalizePath: backslash → forward, strips ./, returns string', () => {
  assert.equal(normalizePath('a\\b\\c.js'), 'a/b/c.js');
  assert.equal(normalizePath('./x/y.js'), 'x/y.js');
  assert.equal(normalizePath(123), '');
  assert.equal(normalizePath(null), '');
});

test('toPatternList: array, string, filter empty/non-string', () => {
  assert.deepEqual(toPatternList(['a/**', 'b.js']), ['a/**', 'b.js']);
  assert.deepEqual(toPatternList('single/**'), ['single/**']);
  assert.deepEqual(toPatternList(['', '  ', 'x', null, 1]), ['x']);
  assert.deepEqual(toPatternList(null), []);
});

test('matchAny: glob ** match nested', () => {
  assert.equal(matchAny('src/middleware/auth.js', ['src/middleware/**']), true);
  assert.equal(matchAny('src/auth.js', ['src/middleware/**']), false);
});

test('matchAny: multiple patterns, OR logic', () => {
  assert.equal(matchAny('src/auth.js', ['src/middleware/**', 'src/auth.js']), true);
});

test('matchAny: dot files default skipped', () => {
  assert.equal(matchAny('docs/.hidden', ['docs/**']), false);
  assert.equal(matchAny('docs/.hidden', ['docs/**'], { dot: true }), true);
});

test('matchAny: case-sensitive by default, opt-in nocase', () => {
  assert.equal(matchAny('Src/CLI.JS', ['src/cli.js']), false);
  assert.equal(matchAny('Src/CLI.JS', ['src/cli.js'], { nocase: true }), true);
});

test('matchAny: empty inputs are safe', () => {
  assert.equal(matchAny('', ['**']), false);
  assert.equal(matchAny('a', []), false);
  assert.equal(matchAny('a', null), false);
});

test('matchAny: backslash file path normalized before match', () => {
  assert.equal(matchAny('src\\commands\\init.js', ['src/commands/*']), true);
});

test('matchPaths: returns intersection only', () => {
  const files = ['src/cli.js', 'src/lib/git.js', 'test/x.js', 'README.md'];
  assert.deepEqual(matchPaths(files, ['src/**']), ['src/cli.js', 'src/lib/git.js']);
});

test('matchPaths: empty inputs return []', () => {
  assert.deepEqual(matchPaths([], ['**']), []);
  assert.deepEqual(matchPaths(['a'], []), []);
});
