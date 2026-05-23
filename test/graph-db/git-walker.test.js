'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { parseGitLog, parseDiff, parseHunkHeader } = require('../../src/graph-db/code/git-walker');

// ---------------------------------------------------------------------------
// Fixtures — synthetic git log output (no git binary needed)
// ---------------------------------------------------------------------------

const FIELD_SEP  = '\x1f';
const COMMIT_SEP = '\x1e';

function makeCommitBlock(hash, shortHash, author, email, ts, subject, diffText) {
  const meta = [hash, shortHash, author, email, ts, subject].join(FIELD_SEP);
  return `${meta}\n${diffText}`;
}

const HASH_A = 'a'.repeat(40);
const HASH_B = 'b'.repeat(40);

const DIFF_A = `
diff --git a/src/foo.js b/src/foo.js
index 000..111 100644
--- a/src/foo.js
+++ b/src/foo.js
@@ -1,1 +1,2 @@
+added1
+added2
-removed1
diff --git a/src/bar.js b/src/bar.js
new file mode 100644
index 000..222
--- /dev/null
+++ b/src/bar.js
@@ -0,0 +1,10 @@
+new file content
`.trim();

const DIFF_B = `
diff --git a/src/foo.js b/src/foo.js
index 111..333 100644
--- a/src/foo.js
+++ b/src/foo.js
@@ -10,2 +10,0 @@
-line1
-line2
`.trim();

const RAW_LOG = [
  COMMIT_SEP + makeCommitBlock(HASH_A, 'aaaaaaa', 'Alice', 'alice@ex.com', '2026-05-01T10:00:00+07:00', 'feat: add bar', DIFF_A),
  COMMIT_SEP + makeCommitBlock(HASH_B, 'bbbbbbb', 'Bob',   'bob@ex.com',   '2026-05-02T11:00:00+07:00', 'fix: remove lines', DIFF_B),
].join('');

// ---------------------------------------------------------------------------
// parseHunkHeader
// ---------------------------------------------------------------------------

describe('parseHunkHeader', () => {
  it('parses standard @@ -a,b +c,d @@', () => {
    const r = parseHunkHeader('@@ -10,3 +10,5 @@ context');
    assert.deepEqual(r, { linesRemoved: 3, linesAdded: 5 });
  });

  it('defaults count to 1 when omitted', () => {
    const r = parseHunkHeader('@@ -10 +10 @@');
    assert.deepEqual(r, { linesRemoved: 1, linesAdded: 1 });
  });

  it('parses new-file hunk @@ -0,0 +1,N @@', () => {
    const r = parseHunkHeader('@@ -0,0 +1,10 @@');
    assert.deepEqual(r, { linesRemoved: 0, linesAdded: 10 });
  });

  it('returns null for non-hunk line', () => {
    assert.equal(parseHunkHeader('diff --git a/foo b/foo'), null);
    assert.equal(parseHunkHeader('--- a/foo'), null);
  });
});

// ---------------------------------------------------------------------------
// parseDiff
// ---------------------------------------------------------------------------

describe('parseDiff', () => {
  it('extracts file paths from diff --git headers', () => {
    const { files } = parseDiff(DIFF_A, HASH_A);
    const paths = files.map(f => f.path);
    assert.ok(paths.includes('src/foo.js'));
    assert.ok(paths.includes('src/bar.js'));
  });

  it('aggregates lines_added and lines_removed per file', () => {
    const { files } = parseDiff(DIFF_A, HASH_A);
    const foo = files.find(f => f.path === 'src/foo.js');
    assert.ok(foo);
    assert.equal(foo.linesAdded, 2);
    assert.equal(foo.linesRemoved, 1);
    const bar = files.find(f => f.path === 'src/bar.js');
    assert.ok(bar);
    assert.equal(bar.linesAdded, 10);
    assert.equal(bar.linesRemoved, 0);
  });

  it('creates one hunk per @@ section', () => {
    const { hunks } = parseDiff(DIFF_A, HASH_A);
    assert.equal(hunks.length, 2); // one for foo.js, one for bar.js
    assert.ok(hunks.every(h => h.commit_hash === HASH_A));
  });

  it('assigns sequential hunk_index per file', () => {
    // DIFF_B has one hunk in foo.js
    const { hunks } = parseDiff(DIFF_B, HASH_B);
    assert.equal(hunks.length, 1);
    assert.equal(hunks[0].hunk_index, 0);
    assert.equal(hunks[0].file_path, 'src/foo.js');
  });

  it('hunk key includes short hash, file, and index', () => {
    const { hunks } = parseDiff(DIFF_A, HASH_A);
    for (const h of hunks) {
      assert.ok(h.key.includes(HASH_A.slice(0, 7)), 'key should include short hash');
    }
  });

  it('returns empty arrays for empty diff', () => {
    const { files, hunks } = parseDiff('', HASH_A);
    assert.equal(files.length, 0);
    assert.equal(hunks.length, 0);
  });
});

// ---------------------------------------------------------------------------
// parseGitLog
// ---------------------------------------------------------------------------

describe('parseGitLog', () => {
  it('parses the correct number of commits', () => {
    const commits = parseGitLog(RAW_LOG);
    assert.equal(commits.length, 2);
  });

  it('extracts commit metadata correctly', () => {
    const commits = parseGitLog(RAW_LOG);
    const a = commits[0];
    assert.equal(a.hash,       HASH_A);
    assert.equal(a.short_hash, 'aaaaaaa');
    assert.equal(a.author,     'Alice');
    assert.equal(a.email,      'alice@ex.com');
    assert.equal(a.subject,    'feat: add bar');
    assert.ok(a.timestamp.startsWith('2026-05-01'));
  });

  it('attaches parsed files and hunks to each commit', () => {
    const commits = parseGitLog(RAW_LOG);
    const a = commits[0];
    assert.equal(a.files.length, 2);
    assert.equal(a.hunks.length, 2);
  });

  it('skips empty blocks', () => {
    const commits = parseGitLog(COMMIT_SEP + COMMIT_SEP + RAW_LOG);
    assert.equal(commits.length, 2); // empty blocks discarded
  });

  it('handles subject containing | without corruption', () => {
    const raw = COMMIT_SEP + makeCommitBlock(
      HASH_A, 'aaaaaaa', 'Alice', 'alice@ex.com',
      '2026-05-01T10:00:00+07:00',
      'fix: handle a|b|c case', ''
    );
    const commits = parseGitLog(raw);
    assert.equal(commits[0].subject, 'fix: handle a|b|c case');
  });

  it('returns empty array for empty input', () => {
    assert.deepEqual(parseGitLog(''), []);
  });
});
