'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  CATALOG_SCHEMA_VERSION,
  appendReleaseEntry,
  catalogFilePath,
  createEmptyCatalog,
  isPrereleaseVersion,
  readCatalog,
  validateCatalog,
  writeCatalog,
} = require('../../src/lib/catalog');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-catalog-'));
}

function sampleEntry(version) {
  return {
    version,
    released_at: '2026-05-01',
    git_tag: version,
    git_commit: 'abc1234',
    template_version: version,
    summary: 'sample',
    prerelease: false,
    stats: {
      intents_applied: 0,
      docs_changed: 2,
      ad_hoc_commits: 3,
    },
    intents_applied: [],
  };
}

test('createEmptyCatalog: defaults are valid', () => {
  const catalog = createEmptyCatalog();
  assert.equal(catalog.schemaVersion, CATALOG_SCHEMA_VERSION);
  assert.equal(catalog.current, null);
  assert.deepEqual(catalog.releases, []);
  assert.equal(validateCatalog(catalog).ok, true);
});

test('isPrereleaseVersion: detects semantic prerelease tags', () => {
  assert.equal(isPrereleaseVersion('v1.5.0-rc.1'), true);
  assert.equal(isPrereleaseVersion('1.5.0-beta'), true);
  assert.equal(isPrereleaseVersion('v1.5.0'), false);
  assert.equal(isPrereleaseVersion('release-1.5.0'), false);
});

test('writeCatalog/readCatalog: round-trip', () => {
  const root = tmpRoot();
  const catalog = createEmptyCatalog();
  catalog.current = 'v1.5.0';
  catalog.releases = [sampleEntry('v1.5.0')];

  const fp = writeCatalog(root, catalog);
  assert.equal(fp, catalogFilePath(root));

  const loaded = readCatalog(root);
  assert.deepEqual(loaded, catalog);
});

test('appendReleaseEntry: prepends and updates current', () => {
  const root = tmpRoot();
  writeCatalog(root, {
    schemaVersion: 1,
    current: 'v1.4.0',
    releases: [sampleEntry('v1.4.0')],
  });

  appendReleaseEntry(root, sampleEntry('v1.5.0'));

  const loaded = readCatalog(root);
  assert.equal(loaded.current, 'v1.5.0');
  assert.equal(loaded.releases[0].version, 'v1.5.0');
  assert.equal(loaded.releases[1].version, 'v1.4.0');
});

test('appendReleaseEntry: duplicate version throws', () => {
  const root = tmpRoot();
  writeCatalog(root, {
    schemaVersion: 1,
    current: 'v1.5.0',
    releases: [sampleEntry('v1.5.0')],
  });

  assert.throws(() => appendReleaseEntry(root, sampleEntry('v1.5.0')), /already exists/);
});

test('validateCatalog: rejects malformed structures', () => {
  const bad = {
    schemaVersion: 1,
    current: 'v1.0.0',
    releases: [
      {
        version: 'v1.0.0',
      },
    ],
  };

  const result = validateCatalog(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('released_at')));
  assert.ok(result.errors.some((e) => e.includes('stats')));
});
