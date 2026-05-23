'use strict';

// ---------------------------------------------------------------------------
// Code Graph — public API (Phase 0)
// ---------------------------------------------------------------------------

const schema      = require('./schema');
const { connect, ping, resolveConfig } = require('./client');
const { ensureSchema, getCollectionStats } = require('./collections');
const { ingestDirectory }  = require('./ingester');
const { ingestGit }        = require('./git-ingester');

module.exports = {
  // Schema constants
  ...schema,

  // Connection
  connect,
  ping,
  resolveConfig,

  // Initializer
  ensureSchema,
  getCollectionStats,

  // Ingesters
  ingestDirectory,
  ingestGit,
};
