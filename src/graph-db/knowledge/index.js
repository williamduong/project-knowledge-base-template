'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Public API (Phase 3)
// ---------------------------------------------------------------------------

const schema      = require('./schema');
const { connect, ping, resolveConfig } = require('../code/client');
const { ensureSchema, getCollectionStats } = require('./collections');

module.exports = {
  // Schema constants
  ...schema,

  // Connection (reuse from code-graph)
  connect,
  ping,
  resolveConfig,

  // Initializer
  ensureSchema,
  getCollectionStats,
};
