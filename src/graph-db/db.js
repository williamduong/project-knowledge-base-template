'use strict';

/**
 * Database Connection Factory — Lazy-initialized connection for graph APIs
 *
 * Provides getDatabase() for API routes to get a connected ArangoDB instance.
 * Reuses the standard connection logic from code/client.js.
 */

const { connect } = require('./code/client');

let cachedDb = null;

/**
 * Get database connection (lazy-initialized, cached)
 * @returns {Promise<Database>} Connected ArangoDB database instance
 */
async function getDatabase() {
  if (!cachedDb) {
    cachedDb = await connect();
  }
  return cachedDb;
}

module.exports = { getDatabase };
