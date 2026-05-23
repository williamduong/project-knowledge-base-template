'use strict';

// ---------------------------------------------------------------------------
// Code Graph — Git ingester (Phase 2)
//
// Takes parsed commit data from git-walker and upserts into ArangoDB:
//   cg_commits       — one node per commit
//   cg_hunks         — one node per @@ section per file per commit
//   cg_changed_in    — edge: cg_files → cg_commits  (file changed in commit)
//   cg_contains_hunk — edge: cg_commits → cg_hunks  (commit contains hunk)
//
// Files that have no matching cg_files node (deleted/renamed) are upserted
// as minimal stub nodes so the graph stays internally consistent.
//
// All operations use overwriteMode='update' — idempotent, safe to re-run.
// ---------------------------------------------------------------------------

const { COLLECTIONS, EDGE_COLLECTIONS } = require('./schema');
const { walkGitLog }  = require('./git-walker');
const { fileKey }     = require('./ast-walker');

const BATCH_SIZE = 200;

// ---------------------------------------------------------------------------
// Batch upsert helper (shared with ingester.js pattern)
// ---------------------------------------------------------------------------

async function upsertBatch(collection, docs) {
  if (docs.length === 0) return;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await collection.saveAll(docs.slice(i, i + BATCH_SIZE), { overwriteMode: 'update' });
  }
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

function commitKey(hash)   { return hash; } // 40-char hex — valid ArangoDB key
function hunkKey(hunk)     { return hunk.key; }
function changedInKey(fileK, commitHash) {
  return `${fileK}__CHANGED_IN__${commitHash.slice(0, 7)}`.replace(/[^a-zA-Z0-9_]/g, '_');
}
function containsHunkKey(commitHash, hunkK) {
  return `${commitHash.slice(0, 7)}__CONTAINS__${hunkK}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

// ---------------------------------------------------------------------------
// Build ArangoDB documents from parsed commits
// ---------------------------------------------------------------------------

function buildCommitDocs(commits) {
  return commits.map(c => ({
    _key:       commitKey(c.hash),
    hash:       c.hash,
    short_hash: c.short_hash,
    author:     c.author,
    email:      c.email,
    timestamp:  c.timestamp,
    subject:    c.subject,
    kind:       'commit',
  }));
}

function buildHunkDocs(commits) {
  const docs = [];
  for (const c of commits) {
    for (const h of c.hunks) {
      docs.push({
        _key:          hunkKey(h),
        commit_hash:   h.commit_hash,
        file_path:     h.file_path,
        hunk_index:    h.hunk_index,
        lines_added:   h.lines_added,
        lines_removed: h.lines_removed,
        kind:          'hunk',
      });
    }
  }
  return docs;
}

// Files that appear in git history but have no cg_files node (deleted/moved)
// are upserted as minimal stubs so edges don't dangle.
function buildMissingFileStubs(commits, existingFileKeys) {
  const stubs = new Map();
  for (const c of commits) {
    for (const f of c.files) {
      const k = fileKey(f.path);
      if (!existingFileKeys.has(k) && !stubs.has(k)) {
        stubs.set(k, {
          _key:     k,
          path:     f.path,
          language: null,
          size:     null,
          kind:     'file',
          stub:     true, // marks as git-history-only node
        });
      }
    }
  }
  return [...stubs.values()];
}

function buildChangedInEdges(commits) {
  const edges = [];
  const seen  = new Set();
  for (const c of commits) {
    for (const f of c.files) {
      const fKey = fileKey(f.path);
      const eKey = changedInKey(fKey, c.hash);
      if (seen.has(eKey)) continue;
      seen.add(eKey);
      edges.push({
        _key:          eKey,
        _from:         `${COLLECTIONS.FILES}/${fKey}`,
        _to:           `${COLLECTIONS.COMMITS}/${commitKey(c.hash)}`,
        type:          'CHANGED_IN',
        lines_added:   f.linesAdded,
        lines_removed: f.linesRemoved,
      });
    }
  }
  return edges;
}

function buildContainsHunkEdges(commits) {
  const edges = [];
  for (const c of commits) {
    for (const h of c.hunks) {
      const hKey = hunkKey(h);
      edges.push({
        _key:  containsHunkKey(c.hash, hKey),
        _from: `${COLLECTIONS.COMMITS}/${commitKey(c.hash)}`,
        _to:   `${COLLECTIONS.HUNKS}/${hKey}`,
        type:  'CONTAINS_HUNK',
      });
    }
  }
  return edges;
}

// ---------------------------------------------------------------------------
// Main: ingestGit
//
// db           — arangojs Database handle
// repoRoot     — absolute path to git repo root
// options      — { limit?, since?, branch?, onProgress? }
//
// Returns: { stats: { commits, hunks, changedIn, containsHunk, fileStubs } }
// ---------------------------------------------------------------------------

async function ingestGit({ db, repoRoot, options = {} }) {
  const { onProgress } = options;

  // 1. Parse git log
  const commits = walkGitLog(repoRoot, options);
  if (onProgress) onProgress({ step: 'parsed', commits: commits.length });

  if (commits.length === 0) {
    return { stats: { commits: 0, hunks: 0, changedIn: 0, containsHunk: 0, fileStubs: 0 } };
  }

  // 2. Fetch existing cg_files keys so we know which stubs to create
  const filesCol = db.collection(COLLECTIONS.FILES);
  const existingCursor = await db.query(
    'FOR f IN @@col RETURN f._key',
    { '@col': COLLECTIONS.FILES }
  );
  const existingFileKeys = new Set(await existingCursor.all());

  // 3. Build documents
  const commitDocs       = buildCommitDocs(commits);
  const hunkDocs         = buildHunkDocs(commits);
  const fileStubs        = buildMissingFileStubs(commits, existingFileKeys);
  const changedInEdges   = buildChangedInEdges(commits);
  const containsHunkEdges = buildContainsHunkEdges(commits);

  // 4. Upsert in dependency order
  if (fileStubs.length > 0) {
    await upsertBatch(filesCol, fileStubs);
  }
  await upsertBatch(db.collection(COLLECTIONS.COMMITS),              commitDocs);
  await upsertBatch(db.collection(COLLECTIONS.HUNKS),                hunkDocs);
  await upsertBatch(db.collection(EDGE_COLLECTIONS.CHANGED_IN),      changedInEdges);
  await upsertBatch(db.collection(EDGE_COLLECTIONS.CONTAINS_HUNK),   containsHunkEdges);

  return {
    stats: {
      commits:     commitDocs.length,
      hunks:       hunkDocs.length,
      changedIn:   changedInEdges.length,
      containsHunk: containsHunkEdges.length,
      fileStubs:   fileStubs.length,
    },
  };
}

module.exports = { ingestGit };
