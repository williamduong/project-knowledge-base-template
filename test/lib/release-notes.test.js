'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  buildReleaseNotes,
  parseConventionalCommit,
} = require('../../src/lib/release-notes');

const workspaceRoot = path.resolve(__dirname, '..', '..');
const snapshotsDir = path.join(workspaceRoot, 'test', 'snapshots');

function readSnapshot(fileName) {
  return fs.readFileSync(path.join(snapshotsDir, fileName), 'utf8');
}

function hasTag(tag) {
  const { execSync } = require('child_process');
  try {
    const out = execSync(`git rev-parse --verify ${tag}`, {
      cwd: workspaceRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
    return Boolean(out);
  } catch {
    return false;
  }
}

test('parseConventionalCommit: conventional feat', () => {
  const parsed = parseConventionalCommit('feat(release): generate notes');
  assert.equal(parsed.isConventional, true);
  assert.equal(parsed.type, 'feat');
  assert.equal(parsed.scope, 'release');
  assert.equal(parsed.group, 'features');
  assert.equal(parsed.description, 'generate notes');
});

test('parseConventionalCommit: fallback misc for non-conventional subject', () => {
  const parsed = parseConventionalCommit('update notes quickly');
  assert.equal(parsed.isConventional, false);
  assert.equal(parsed.group, 'misc');
  assert.equal(parsed.description, 'update notes quickly');
});

test('buildReleaseNotes snapshot: v1.3.0..v1.4.0 (md + json)', { skip: !hasTag('v1.3.0') || !hasTag('v1.4.0') }, () => {
  const result = buildReleaseNotes({
    workspaceRoot,
    fromTag: 'v1.3.0',
    toTag: 'v1.4.0',
    version: 'v1.4.0',
    summary: null,
    contentPaths: ['knowledge-base/', 'template/'],
  });

  assert.equal(result.markdown, readSnapshot('release-notes-v1.4.0.md.snap'));
  assert.equal(
    `${JSON.stringify(result.json, null, 2)}\n`,
    readSnapshot('release-notes-v1.4.0.json.snap')
  );
});

test('buildReleaseNotes snapshot: v1.4.0..v1.4.1 (md + json)', { skip: !hasTag('v1.4.0') || !hasTag('v1.4.1') }, () => {
  const result = buildReleaseNotes({
    workspaceRoot,
    fromTag: 'v1.4.0',
    toTag: 'v1.4.1',
    version: 'v1.4.1',
    summary: null,
    contentPaths: ['knowledge-base/', 'template/'],
  });

  assert.equal(result.markdown, readSnapshot('release-notes-v1.4.1.md.snap'));
  assert.equal(
    `${JSON.stringify(result.json, null, 2)}\n`,
    readSnapshot('release-notes-v1.4.1.json.snap')
  );
});
