'use strict';

// KB index database — SQLite (node:sqlite). Source of truth for the
// Knowledge Base UI in site/uiv2. Each KB doc and folder is a row; the
// filesystem is reconciled against the DB via drift/sync operations
// (slice C-2+). For now (C-1) the DB is populated from disk on import and
// reads serve UI tree, doc body, roots, and aggregate stats.
//
// Lives at svfactory/kb-index.db alongside focus-state.db. Separate file by
// design: focus-state is a singleton snapshot for the maintainer surface,
// kb-index grows with KB content and is owned by the UI runtime.

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA_VERSION = '1.0.0';

let dbInstance = null;
let dbPath = null;

function ensureSchema(db) {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS kb_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kb_roots (
      path        TEXT PRIMARY KEY,
      label       TEXT NOT NULL,
      active      INTEGER NOT NULL DEFAULT 1,
      added_at    TEXT NOT NULL,
      indexed_at  TEXT
    );
    CREATE TABLE IF NOT EXISTS kb_files (
      path                  TEXT PRIMARY KEY,
      root_path             TEXT NOT NULL,
      parent_path           TEXT NOT NULL,
      basename              TEXT NOT NULL,
      kind                  TEXT NOT NULL,          -- 'folder' | 'md' | 'html'
      size                  INTEGER,
      mtime_ms              INTEGER,
      content_hash          TEXT,
      title                 TEXT,
      type                  TEXT,
      status                TEXT,
      verification          TEXT,
      time_state            TEXT,
      owner                 TEXT,
      last_updated          TEXT,
      last_verified         TEXT,
      days_since_verified   INTEGER,
      tags                  TEXT,                   -- JSON array
      body                  TEXT,                   -- raw markdown / html source
      html                  TEXT,                   -- rendered HTML for fast doc reads
      indexed_at            TEXT NOT NULL,
      FOREIGN KEY (root_path) REFERENCES kb_roots(path) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_kb_files_parent           ON kb_files (parent_path);
    CREATE INDEX IF NOT EXISTS idx_kb_files_root             ON kb_files (root_path);
    CREATE INDEX IF NOT EXISTS idx_kb_files_root_status      ON kb_files (root_path, status);
    CREATE INDEX IF NOT EXISTS idx_kb_files_root_verif       ON kb_files (root_path, verification);
  `);
  db.prepare(`INSERT OR IGNORE INTO kb_meta (key, value) VALUES ('schema_version', ?)`).run(SCHEMA_VERSION);
}

function openKbDb(absDbPath) {
  if (dbInstance && dbPath === absDbPath) return dbInstance;
  if (dbInstance) { try { dbInstance.close(); } catch {} dbInstance = null; }
  fs.mkdirSync(path.dirname(absDbPath), { recursive: true });
  const db = new DatabaseSync(absDbPath);
  ensureSchema(db);
  dbInstance = db;
  dbPath = absDbPath;
  return db;
}

function closeKbDb() {
  if (dbInstance) { try { dbInstance.close(); } catch {} dbInstance = null; dbPath = null; }
}

// ───────────────────────── roots ─────────────────────────

function listRoots(db) {
  return db.prepare(`SELECT path, label, active, added_at, indexed_at FROM kb_roots ORDER BY added_at`).all();
}

function listActiveRoots(db) {
  return db.prepare(`SELECT path, label FROM kb_roots WHERE active = 1 ORDER BY added_at`).all();
}

function getRoot(db, rootPath) {
  return db.prepare(`SELECT path, label, active, added_at, indexed_at FROM kb_roots WHERE path = ?`).get(rootPath);
}

function upsertRoot(db, { path: rootPath, label, active = 1, addedAt = new Date().toISOString() }) {
  db.prepare(`
    INSERT INTO kb_roots (path, label, active, added_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET label = excluded.label, active = excluded.active
  `).run(rootPath, label, active ? 1 : 0, addedAt);
}

function setRootIndexed(db, rootPath, indexedAt = new Date().toISOString()) {
  db.prepare(`UPDATE kb_roots SET indexed_at = ? WHERE path = ?`).run(indexedAt, rootPath);
}

function deleteRoot(db, rootPath) {
  db.prepare(`DELETE FROM kb_roots WHERE path = ?`).run(rootPath);
  // ON DELETE CASCADE in kb_files removes content rows automatically.
}

// ───────────────────────── files ─────────────────────────

function upsertFileRow(db, row) {
  db.prepare(`
    INSERT INTO kb_files (
      path, root_path, parent_path, basename, kind, size, mtime_ms, content_hash,
      title, type, status, verification, time_state, owner,
      last_updated, last_verified, days_since_verified, tags,
      body, html, indexed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      root_path = excluded.root_path,
      parent_path = excluded.parent_path,
      basename = excluded.basename,
      kind = excluded.kind,
      size = excluded.size,
      mtime_ms = excluded.mtime_ms,
      content_hash = excluded.content_hash,
      title = excluded.title,
      type = excluded.type,
      status = excluded.status,
      verification = excluded.verification,
      time_state = excluded.time_state,
      owner = excluded.owner,
      last_updated = excluded.last_updated,
      last_verified = excluded.last_verified,
      days_since_verified = excluded.days_since_verified,
      tags = excluded.tags,
      body = excluded.body,
      html = excluded.html,
      indexed_at = excluded.indexed_at
  `).run(
    row.path, row.root_path, row.parent_path, row.basename, row.kind,
    row.size ?? null, row.mtime_ms ?? null, row.content_hash ?? null,
    row.title ?? null, row.type ?? null, row.status ?? null,
    row.verification ?? null, row.time_state ?? null, row.owner ?? null,
    row.last_updated ?? null, row.last_verified ?? null,
    row.days_since_verified ?? null,
    row.tags ? JSON.stringify(row.tags) : null,
    row.body ?? null, row.html ?? null, row.indexed_at,
  );
}

function deleteFilesUnderRoot(db, rootPath) {
  db.prepare(`DELETE FROM kb_files WHERE root_path = ?`).run(rootPath);
}

function countFilesByRoot(db, rootPath) {
  const r = db.prepare(`SELECT COUNT(*) AS c FROM kb_files WHERE root_path = ? AND kind != 'folder'`).get(rootPath);
  return r ? r.c : 0;
}

function getDoc(db, filePath) {
  return db.prepare(`
    SELECT path, basename, kind, title, type, status, verification, time_state, owner,
           last_updated, last_verified, days_since_verified, tags, body, html, indexed_at
    FROM kb_files WHERE path = ?
  `).get(filePath);
}

function listChildren(db, parentPath) {
  return db.prepare(`
    SELECT path, basename, kind, title, type, status, verification, time_state,
           last_updated, last_verified, days_since_verified, tags
    FROM kb_files WHERE parent_path = ?
    ORDER BY kind DESC, basename
  `).all(parentPath);
}

function listAllUnderRoot(db, rootPath) {
  return db.prepare(`
    SELECT path, parent_path, basename, kind, title, type, status, verification, time_state, owner,
           last_updated, last_verified, days_since_verified, tags
    FROM kb_files WHERE root_path = ?
    ORDER BY path
  `).all(rootPath);
}

function statsByRoot(db, rootPath) {
  return db.prepare(`
    SELECT
      COUNT(*) FILTER (WHERE kind != 'folder')                                          AS total,
      COUNT(*) FILTER (WHERE kind != 'folder' AND status = 'active')                    AS active,
      COUNT(*) FILTER (WHERE kind != 'folder' AND status = 'draft')                     AS draft,
      COUNT(*) FILTER (WHERE kind != 'folder' AND status = 'deprecated')                AS deprecated,
      COUNT(*) FILTER (WHERE kind != 'folder' AND status = 'archived')                  AS archived,
      COUNT(*) FILTER (WHERE kind != 'folder' AND verification = 'code-verified')       AS code_verified,
      COUNT(*) FILTER (WHERE kind != 'folder' AND verification = 'unverified')          AS unverified,
      COUNT(*) FILTER (WHERE kind != 'folder' AND verification = 'design-only')         AS design_only,
      COUNT(*) FILTER (WHERE kind != 'folder' AND verification = 'self-referential')    AS self_referential,
      COUNT(*) FILTER (WHERE kind != 'folder' AND days_since_verified >= 60)            AS stale60,
      COUNT(*) FILTER (WHERE kind != 'folder' AND days_since_verified >= 180)           AS stale180,
      COUNT(*) FILTER (WHERE kind != 'folder' AND time_state = 'mixed')                 AS mixed_time
    FROM kb_files WHERE root_path = ?
  `).get(rootPath);
}

// ───────────────────────── meta / migration ─────────────────────────

function readMeta(db, key) {
  const r = db.prepare(`SELECT value FROM kb_meta WHERE key = ?`).get(key);
  return r ? r.value : null;
}
function writeMeta(db, key, value) {
  db.prepare(`INSERT INTO kb_meta (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
}

module.exports = {
  SCHEMA_VERSION,
  openKbDb,
  closeKbDb,
  // roots
  listRoots,
  listActiveRoots,
  getRoot,
  upsertRoot,
  setRootIndexed,
  deleteRoot,
  // files
  upsertFileRow,
  deleteFilesUnderRoot,
  countFilesByRoot,
  getDoc,
  listChildren,
  listAllUnderRoot,
  statsByRoot,
  // meta
  readMeta,
  writeMeta,
};
