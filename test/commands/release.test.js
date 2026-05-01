'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs, getReleaseContentPaths } = require('../../src/commands/release');
const { writeConfig } = require('../../src/lib/config');
const fs = require('fs');
const os = require('os');
const path = require('path');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-release-'));
}

test('release parseArgs: init defaults', () => {
  const o = parseArgs(['init']);
  assert.equal(o.sub, 'init');
  assert.equal(o.json, false);
});

test('release parseArgs: init with prerelease override', () => {
  const o = parseArgs(['init', '--include-prerelease', '--json']);
  assert.equal(o.sub, 'init');
  assert.equal(o.ignorePrerelease, false);
  assert.equal(o.json, true);
});

test('release parseArgs: tag requires summary', () => {
  assert.throws(() => parseArgs(['tag', 'v1.5.0']), /requires --summary/);
  const ok = parseArgs(['tag', 'v1.5.0', '--summary=ship']);
  assert.equal(ok.version, 'v1.5.0');
  assert.equal(ok.summary, 'ship');
});

test('release parseArgs: list/show forms', () => {
  const list = parseArgs(['list']);
  assert.equal(list.sub, 'list');

  const show = parseArgs(['show', 'v1.5.0']);
  assert.equal(show.sub, 'show');
  assert.equal(show.version, 'v1.5.0');
});

test('release parseArgs: notes defaults and options', () => {
  const defaults = parseArgs(['notes', 'v1.5.0']);
  assert.equal(defaults.sub, 'notes');
  assert.equal(defaults.version, 'v1.5.0');
  assert.equal(defaults.format, 'md');

  const jsonFmt = parseArgs([
    'notes',
    'v1.5.0',
    '--from=v1.4.0',
    '--output=notes.md',
    '--format=json',
  ]);
  assert.equal(jsonFmt.from, 'v1.4.0');
  assert.equal(jsonFmt.output, 'notes.md');
  assert.equal(jsonFmt.format, 'json');
});

test('release parseArgs: notes invalid format throws', () => {
  assert.throws(() => parseArgs(['notes', 'v1.5.0', '--format=xml']), /--format must be md or json/);
});

test('release parseArgs: ignores bare -- separator', () => {
  const parsed = parseArgs(['notes', 'v1.5.0', '--', '--from=v1.4.0', '--format=json']);
  assert.equal(parsed.sub, 'notes');
  assert.equal(parsed.version, 'v1.5.0');
  assert.equal(parsed.from, 'v1.4.0');
  assert.equal(parsed.format, 'json');
});

test('release parseArgs: unknown option throws', () => {
  assert.throws(() => parseArgs(['init', '--bogus']), /Unknown release option/);
});

test('getReleaseContentPaths: returns defaults when config missing', () => {
  const root = tmpRoot();
  const paths = getReleaseContentPaths(root);
  assert.deepEqual(paths, ['knowledge-base/', 'template/']);
});

test('getReleaseContentPaths: reads configured values', () => {
  const root = tmpRoot();
  writeConfig(root, {
    release: {
      contentPaths: ['docs', 'template/'],
    },
  });

  const paths = getReleaseContentPaths(root);
  assert.deepEqual(paths, ['docs/', 'template/']);
});
