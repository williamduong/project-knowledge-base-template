'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCHEMA_VERSION = 1;
const SOURCE_INDEX_PATH = '.kb/source-index.json';

// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------

function sourceIndexPath(contentRoot) {
  return path.join(contentRoot, SOURCE_INDEX_PATH);
}

// ---------------------------------------------------------------------------
// Hash
// ---------------------------------------------------------------------------

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha1').update(content).digest('hex').slice(0, 12);
}

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

function readSourceIndex(contentRoot) {
  const indexPath = sourceIndexPath(contentRoot);
  if (!fs.existsSync(indexPath)) {
    return {
      schema_version: SCHEMA_VERSION,
      generated_at: null,
      workspace_root: null,
      entries: [],
      summary: { total_source_files: 0, covered: 0, partial: 0, uncovered: 0, stale: 0 },
    };
  }
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
    return {
      schema_version: SCHEMA_VERSION,
      generated_at: null,
      workspace_root: null,
      entries: [],
      summary: { total_source_files: 0, covered: 0, partial: 0, uncovered: 0, stale: 0 },
    };
  }
}

function writeSourceIndex(contentRoot, index) {
  const indexPath = sourceIndexPath(contentRoot);
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Summary computation
// ---------------------------------------------------------------------------

function computeSummary(entries) {
  const summary = { total_source_files: entries.length, covered: 0, partial: 0, uncovered: 0, stale: 0 };
  for (const e of entries) {
    const s = e.kb_coverage;
    if (s === 'covered') summary.covered += 1;
    else if (s === 'partial') summary.partial += 1;
    else if (s === 'uncovered') summary.uncovered += 1;
    else if (s === 'stale') summary.stale += 1;
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Coverage status for a single entry
// ---------------------------------------------------------------------------

function deriveCoverage(entry, workspaceRoot) {
  if (!entry.kb_docs || entry.kb_docs.length === 0) return 'uncovered';
  const currentHash = hashFile(path.join(workspaceRoot, entry.source_path));
  const hasStale = entry.kb_docs.some((doc) => doc.extraction_hash !== currentHash);
  if (hasStale) return 'stale';
  if (entry.kb_docs.length > 1) return 'partial';
  return 'covered';
}

// ---------------------------------------------------------------------------
// Upsert: add or update a source entry after extraction
// ---------------------------------------------------------------------------

function upsertEntry(contentRoot, workspaceRoot, { sourcePath, docPath }) {
  const index = readSourceIndex(contentRoot);
  const now = new Date().toISOString();
  const currentHash = hashFile(path.join(workspaceRoot, sourcePath));
  const statResult = (() => {
    try { return fs.statSync(path.join(workspaceRoot, sourcePath)); } catch { return null; }
  })();
  const lastMod = statResult ? statResult.mtime.toISOString().slice(0, 10) : null;

  let entry = index.entries.find((e) => e.source_path === sourcePath);
  if (!entry) {
    entry = { source_path: sourcePath, source_hash: currentHash, source_last_modified: lastMod, kb_docs: [], kb_coverage: 'uncovered' };
    index.entries.push(entry);
  } else {
    entry.source_hash = currentHash;
    entry.source_last_modified = lastMod;
  }

  if (docPath) {
    const existing = entry.kb_docs.find((d) => d.doc_path === docPath);
    if (existing) {
      existing.extracted_at = now.slice(0, 10);
      existing.extraction_hash = currentHash;
      existing.status = 'current';
    } else {
      entry.kb_docs.push({ doc_path: docPath, extracted_at: now.slice(0, 10), extraction_hash: currentHash, status: 'current' });
    }
  }

  entry.kb_coverage = deriveCoverage(entry, workspaceRoot);
  index.generated_at = now;
  index.workspace_root = workspaceRoot;
  index.summary = computeSummary(index.entries);
  writeSourceIndex(contentRoot, index);
  return entry;
}

// ---------------------------------------------------------------------------
// Refresh: recompute coverage for all entries (detect stale)
// ---------------------------------------------------------------------------

function refreshIndex(contentRoot, workspaceRoot) {
  const index = readSourceIndex(contentRoot);
  if (index.entries.length === 0) return index;

  for (const entry of index.entries) {
    const currentHash = hashFile(path.join(workspaceRoot, entry.source_path));
    entry.source_hash = currentHash;
    // Update doc statuses
    for (const doc of (entry.kb_docs || [])) {
      doc.status = doc.extraction_hash === currentHash ? 'current' : 'stale';
    }
    entry.kb_coverage = deriveCoverage(entry, workspaceRoot);
  }

  index.generated_at = new Date().toISOString();
  index.summary = computeSummary(index.entries);
  writeSourceIndex(contentRoot, index);
  return index;
}

// ---------------------------------------------------------------------------
// Query: get stale entries
// ---------------------------------------------------------------------------

function getStaleEntries(contentRoot) {
  const index = readSourceIndex(contentRoot);
  return index.entries.filter((e) => e.kb_coverage === 'stale');
}

function getUncoveredEntries(contentRoot) {
  const index = readSourceIndex(contentRoot);
  return index.entries.filter((e) => e.kb_coverage === 'uncovered');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  sourceIndexPath,
  hashFile,
  readSourceIndex,
  writeSourceIndex,
  computeSummary,
  upsertEntry,
  refreshIndex,
  getStaleEntries,
  getUncoveredEntries,
};
