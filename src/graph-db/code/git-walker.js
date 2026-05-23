'use strict';

// ---------------------------------------------------------------------------
// Code Graph — Git walker (Phase 2)
//
// Runs `git log --patch --unified=0` and parses the output into:
//   commits  — hash, author, timestamp, subject
//   files    — which files changed per commit (for cg_changed_in edges)
//   hunks    — individual @@ sections per file per commit (for cg_hunks)
//
// No DB calls here. Returns plain objects; git-ingester writes to ArangoDB.
// ---------------------------------------------------------------------------

const { spawnSync } = require('child_process');

// ---------------------------------------------------------------------------
// Separators used to split git log output.
// 0x1E (Record Separator) splits commits; 0x1F (Unit Separator) splits fields.
// Both are non-NUL ASCII control chars — safe for spawnSync and rare in text.
// ---------------------------------------------------------------------------

const COMMIT_SEP = '\x1e'; // ASCII Record Separator
const FIELD_SEP  = '\x1f'; // ASCII Unit Separator

// ---------------------------------------------------------------------------
// Run git log and return raw output buffer
// ---------------------------------------------------------------------------

function runGitLog(repoRoot, options) {
  const args = [
    'log',
    `--format=${COMMIT_SEP}%H${FIELD_SEP}%h${FIELD_SEP}%an${FIELD_SEP}%ae${FIELD_SEP}%aI${FIELD_SEP}%s`,
    '--patch',
    '--unified=0',
    '--diff-filter=ACMRD',
  ];

  if (options.limit)  args.push(`--max-count=${options.limit}`);
  if (options.since)  args.push(`--since=${options.since}`);
  if (options.branch) args.push(options.branch);

  const result = spawnSync('git', args, {
    cwd: repoRoot,
    maxBuffer: 200 * 1024 * 1024,
    encoding: 'buffer',
  });

  if (result.error) throw new Error(`git spawn error: ${result.error.message}`);
  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString('utf8') : '';
    throw new Error(`git log exited ${result.status}: ${stderr.trim()}`);
  }

  return result.stdout.toString('utf8');
}

// ---------------------------------------------------------------------------
// Parse the @@ hunk header line
// Returns { linesRemoved, linesAdded } or null
// Format: @@ -startA[,countA] +startB[,countB] @@ [context]
// When count is omitted it defaults to 1.
// ---------------------------------------------------------------------------

function parseHunkHeader(line) {
  const m = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
  if (!m) return null;
  return {
    linesRemoved: m[2] !== undefined ? parseInt(m[2], 10) : 1,
    linesAdded:   m[4] !== undefined ? parseInt(m[4], 10) : 1,
  };
}

// ---------------------------------------------------------------------------
// Parse a single diff block (everything after the commit meta line)
// Returns { files: [{path, linesAdded, linesRemoved}], hunks: [...] }
// ---------------------------------------------------------------------------

function parseDiff(diffText, commitHash) {
  // fileStats: filePath → { linesAdded, linesRemoved }
  const fileStats = new Map();
  const hunks = [];

  let currentFile = null;
  let hunkIndex   = 0;

  for (const line of diffText.split('\n')) {
    // diff --git a/src/foo.js b/src/foo.js
    if (line.startsWith('diff --git ')) {
      const m = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      if (m) {
        // Use the b/ path (destination — handles renames correctly)
        currentFile = m[2];
        hunkIndex   = 0;
        if (!fileStats.has(currentFile)) {
          fileStats.set(currentFile, { linesAdded: 0, linesRemoved: 0 });
        }
      }
      continue;
    }

    // @@ hunk header
    if (line.startsWith('@@') && currentFile) {
      const parsed = parseHunkHeader(line);
      if (!parsed) continue;

      const stats = fileStats.get(currentFile);
      stats.linesAdded   += parsed.linesAdded;
      stats.linesRemoved += parsed.linesRemoved;

      const hunkKey = `${commitHash.slice(0, 7)}_${currentFile.replace(/[^a-zA-Z0-9]/g, '_')}_${hunkIndex}`;
      hunks.push({
        key:          hunkKey,
        commit_hash:  commitHash,
        file_path:    currentFile,
        hunk_index:   hunkIndex,
        lines_added:  parsed.linesAdded,
        lines_removed: parsed.linesRemoved,
      });
      hunkIndex++;
    }
  }

  const files = [];
  for (const [filePath, stats] of fileStats) {
    files.push({ path: filePath, ...stats });
  }

  return { files, hunks };
}

// ---------------------------------------------------------------------------
// Parse full git log output into an array of commit objects
// ---------------------------------------------------------------------------

function parseGitLog(raw) {
  // Split on sentinel — first element before any sentinel is empty or preamble
  const blocks = raw.split(COMMIT_SEP);
  const commits = [];

  for (const block of blocks) {
    if (!block.trim()) continue;

    // First line (up to first \n): commit metadata fields separated by \x00
    const nlIdx = block.indexOf('\n');
    const metaLine = nlIdx >= 0 ? block.slice(0, nlIdx) : block;
    const diffText = nlIdx >= 0 ? block.slice(nlIdx + 1) : '';

    // Fields: hash FIELD_SEP short_hash FIELD_SEP author FIELD_SEP email FIELD_SEP timestamp FIELD_SEP subject
    const fields = metaLine.split(FIELD_SEP);
    if (fields.length < 6) continue;

    const [hash, shortHash, author, email, timestamp, ...subjectParts] = fields;
    const subject = subjectParts.join(FIELD_SEP).trim();

    if (!hash || hash.length !== 40) continue; // sanity check

    const { files, hunks } = parseDiff(diffText, hash);

    commits.push({
      hash,
      short_hash: shortHash,
      author:     author,
      email:      email,
      timestamp:  timestamp,
      subject:    subject,
      files,      // [{ path, linesAdded, linesRemoved }]
      hunks,      // [{ key, commit_hash, file_path, hunk_index, lines_added, lines_removed }]
    });
  }

  return commits;
}

// ---------------------------------------------------------------------------
// Public entry point
//
// repoRoot  — absolute path to git repo root
// options   — { limit?: number, since?: string, branch?: string }
//
// Returns: commit[]
// ---------------------------------------------------------------------------

function walkGitLog(repoRoot, options = {}) {
  const raw = runGitLog(repoRoot, options);
  return parseGitLog(raw);
}

// ---------------------------------------------------------------------------
// Exports (also export parse helpers for testing without git)
// ---------------------------------------------------------------------------

module.exports = { walkGitLog, parseGitLog, parseDiff, parseHunkHeader };
