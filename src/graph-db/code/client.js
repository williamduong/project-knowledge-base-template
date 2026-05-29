'use strict';

// ---------------------------------------------------------------------------
// Code Graph — ArangoDB connection client (Phase 0)
// ---------------------------------------------------------------------------

const { Database } = require('arangojs');

// ---------------------------------------------------------------------------
// Config resolution (env vars with defaults)
// ---------------------------------------------------------------------------

function resolveConfig(overrides) {
  return {
    url:      (overrides && overrides.url)      || process.env.KBX_ARANGODB_URL  || 'http://localhost:8529',
    database: (overrides && overrides.database) || process.env.KBX_ARANGODB_DB   || 'kbx_code_graph',
    username: (overrides && overrides.username) || process.env.KBX_ARANGODB_USER || 'root',
    password: (overrides && overrides.password) || process.env.KBX_ARANGODB_PASS || '',
  };
}

// ---------------------------------------------------------------------------
// Connect — returns an authenticated arangojs Database handle.
// Does NOT create the database if it doesn't exist; call ensureDatabase() first.
// ---------------------------------------------------------------------------

async function connect(overrides) {
  const cfg = resolveConfig(overrides);

  let systemDb;
  try {
    systemDb = new Database({
      url: cfg.url,
      auth: { username: cfg.username, password: cfg.password },
    });

    // Ensure the named database exists (create if missing).
    const databases = await systemDb.listDatabases();
    if (!databases.includes(cfg.database)) {
      await systemDb.createDatabase(cfg.database);
    }
  } catch (error) {
    const message = error.message || String(error);
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || message.includes('connect')) {
      throw new Error(`ArangoDB is not reachable at ${cfg.url}. Make sure ArangoDB is running.`);
    }
    if (error.code === 401 || message.includes('authentication')) {
      throw new Error(`ArangoDB authentication failed for user '${cfg.username}'. Check KBX_ARANGODB_USER / KBX_ARANGODB_PASS.`);
    }
    throw new Error(`ArangoDB connection failed (${cfg.url}): ${message || 'unknown error'}`);
  }

  const db = systemDb.database(cfg.database);
  return db;
}

// ---------------------------------------------------------------------------
// Ping — verify connectivity, return { ok, url, database, latencyMs }
// ---------------------------------------------------------------------------

async function ping(overrides) {
  const cfg = resolveConfig(overrides);
  const start = Date.now();

  try {
    const db = await connect(overrides);
    await db.version();
    return {
      ok: true,
      url: cfg.url,
      database: cfg.database,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      ok: false,
      url: cfg.url,
      database: cfg.database,
      latencyMs: Date.now() - start,
      error: err.message,
    };
  }
}

module.exports = { resolveConfig, connect, ping };
