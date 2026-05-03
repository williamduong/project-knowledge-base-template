'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  readSourceIndex,
  writeSourceIndex,
  hashFile,
  computeSummary,
  upsertEntry,
  refreshIndex,
  getStaleEntries,
  getUncoveredEntries,
} = require('../../src/lib/source-index');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-source-index-'));
}

function makeKbDir(root) {
  const kbDir = path.join(root, '.kb');
  fs.mkdirSync(kbDir, { recursive: true });
  return kbDir;
}

// ---------------------------------------------------------------------------
// readSourceIndex — returns empty structure when file missing
// ---------------------------------------------------------------------------

test('readSourceIndex returns empty structure when file missing', () => {
  const root = makeTmpDir();
  makeKbDir(root);
  const index = readSourceIndex(root);
  assert.equal(index.schema_version, 1);
  assert.deepEqual(index.entries, []);
  assert.equal(index.summary.total_source_files, 0);
});

// ---------------------------------------------------------------------------
// hashFile — consistent sha1 for same content
// ---------------------------------------------------------------------------

test('hashFile returns consistent sha1 for same content', () => {
  const root = makeTmpDir();
  const filePath = path.join(root, 'src.js');
  fs.writeFileSync(filePath, 'const x = 1;', 'utf8');
  const h1 = hashFile(filePath);
  const h2 = hashFile(filePath);
  assert.equal(typeof h1, 'string');
  assert.equal(h1.length, 12);
  assert.equal(h1, h2);
});

test('hashFile returns null when file missing', () => {
  const h = hashFile('/nonexistent/path/file.js');
  assert.equal(h, null);
});

test('hashFile returns different hash for different content', () => {
  const root = makeTmpDir();
  const f1 = path.join(root, 'a.js');
  const f2 = path.join(root, 'b.js');
  fs.writeFileSync(f1, 'const x = 1;', 'utf8');
  fs.writeFileSync(f2, 'const y = 2;', 'utf8');
  assert.notEqual(hashFile(f1), hashFile(f2));
});

// ---------------------------------------------------------------------------
// computeSummary
// ---------------------------------------------------------------------------

test('computeSummary counts coverage states correctly', () => {
  const entries = [
    { kb_coverage: 'covered' },
    { kb_coverage: 'covered' },
    { kb_coverage: 'partial' },
    { kb_coverage: 'stale' },
    { kb_coverage: 'uncovered' },
  ];
  const summary = computeSummary(entries);
  assert.equal(summary.total_source_files, 5);
  assert.equal(summary.covered, 2);
  assert.equal(summary.partial, 1);
  assert.equal(summary.stale, 1);
  assert.equal(summary.uncovered, 1);
});

// ---------------------------------------------------------------------------
// upsertEntry — creates entry when new
// ---------------------------------------------------------------------------

test('upsertEntry creates new entry when source not tracked', () => {
  const root = makeTmpDir();
  makeKbDir(root);
  const srcFile = path.join(root, 'src.js');
  fs.writeFileSync(srcFile, 'module.exports = {};', 'utf8');

  upsertEntry(root, root, { sourcePath: 'src.js', docPath: null });
  const index = readSourceIndex(root);
  assert.equal(index.entries.length, 1);
  assert.equal(index.entries[0].source_path, 'src.js');
  assert.equal(index.entries[0].kb_coverage, 'uncovered');
});

test('upsertEntry sets kb_coverage to covered when docPath provided', () => {
  const root = makeTmpDir();
  makeKbDir(root);
  const srcFile = path.join(root, 'src.js');
  fs.writeFileSync(srcFile, 'module.exports = {};', 'utf8');

  upsertEntry(root, root, { sourcePath: 'src.js', docPath: 'docs/src.md' });
  const index = readSourceIndex(root);
  const entry = index.entries[0];
  assert.equal(entry.kb_coverage, 'covered');
  assert.equal(entry.kb_docs.length, 1);
  assert.equal(entry.kb_docs[0].doc_path, 'docs/src.md');
  assert.equal(entry.kb_docs[0].status, 'current');
});

// ---------------------------------------------------------------------------
// refreshIndex — detects stale when file changes
// ---------------------------------------------------------------------------

test('refreshIndex marks entry as stale when source file changes', () => {
  const root = makeTmpDir();
  makeKbDir(root);
  const srcFile = path.join(root, 'auth.js');
  fs.writeFileSync(srcFile, 'const auth = true;', 'utf8');

  // Initial upsert
  upsertEntry(root, root, { sourcePath: 'auth.js', docPath: 'docs/auth.md' });

  // Modify source after extraction
  fs.writeFileSync(srcFile, 'const auth = false; // changed', 'utf8');

  const refreshed = refreshIndex(root, root);
  const entry = refreshed.entries.find((e) => e.source_path === 'auth.js');
  assert.equal(entry.kb_coverage, 'stale');
  assert.equal(entry.kb_docs[0].status, 'stale');
});

// ---------------------------------------------------------------------------
// getStaleEntries / getUncoveredEntries
// ---------------------------------------------------------------------------

test('getStaleEntries returns entries with kb_coverage === stale', () => {
  const root = makeTmpDir();
  makeKbDir(root);

  const idxPath = path.join(root, '.kb', 'source-index.json');
  const mockIndex = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    workspace_root: root,
    entries: [
      { source_path: 'a.js', kb_coverage: 'stale', kb_docs: [] },
      { source_path: 'b.js', kb_coverage: 'covered', kb_docs: [] },
    ],
    summary: { total_source_files: 2, covered: 1, partial: 0, uncovered: 0, stale: 1 },
  };
  fs.writeFileSync(idxPath, JSON.stringify(mockIndex), 'utf8');

  const stale = getStaleEntries(root);
  assert.equal(stale.length, 1);
  assert.equal(stale[0].source_path, 'a.js');
});

test('getUncoveredEntries returns entries with kb_coverage === uncovered', () => {
  const root = makeTmpDir();
  makeKbDir(root);

  const idxPath = path.join(root, '.kb', 'source-index.json');
  const mockIndex = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    workspace_root: root,
    entries: [
      { source_path: 'a.js', kb_coverage: 'uncovered', kb_docs: [] },
      { source_path: 'b.js', kb_coverage: 'covered', kb_docs: [] },
      { source_path: 'c.js', kb_coverage: 'uncovered', kb_docs: [] },
    ],
    summary: { total_source_files: 3, covered: 1, partial: 0, uncovered: 2, stale: 0 },
  };
  fs.writeFileSync(idxPath, JSON.stringify(mockIndex), 'utf8');

  const uncovered = getUncoveredEntries(root);
  assert.equal(uncovered.length, 2);
});

// ---------------------------------------------------------------------------
// writeSourceIndex / readSourceIndex round-trip
// ---------------------------------------------------------------------------

test('writeSourceIndex + readSourceIndex round-trip preserves data', () => {
  const root = makeTmpDir();
  makeKbDir(root);

  const data = {
    schema_version: 1,
    generated_at: '2026-05-10T00:00:00.000Z',
    workspace_root: root,
    entries: [
      {
        source_path: 'src/app.js',
        source_hash: 'aabbcc001122',
        source_last_modified: '2026-05-10',
        kb_docs: [{ doc_path: 'docs/app.md', extracted_at: '2026-05-10', extraction_hash: 'aabbcc001122', status: 'current' }],
        kb_coverage: 'covered',
      },
    ],
    summary: { total_source_files: 1, covered: 1, partial: 0, uncovered: 0, stale: 0 },
  };

  writeSourceIndex(root, data);
  const read = readSourceIndex(root);
  assert.deepEqual(read, data);
});
