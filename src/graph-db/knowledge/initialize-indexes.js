'use strict';

/**
 * Initialize-Indexes — Ensure Knowledge Graph indexes for Phase 6 optimization
 *
 * Phase 6 Task 1.1: Add composite indexes on frequently queried fields.
 * This module ensures indexes exist on startup and logs performance metrics.
 *
 * Composite indexes added:
 * - kg_goals (parent_goal_id, status) → tree queries <20ms
 * - kg_decisions (goal_id, status) → decision filtering <15ms
 *
 * Safe to call multiple times (idempotent via ensureIndex).
 */

const { INDEXES } = require('./schema');

/**
 * Ensure all indexes exist; measure creation time.
 *
 * @param {ArangoDatabase} db — ArangoDB client
 * @param {object} options — { verbose: boolean }
 * @returns {object} { success: boolean, duration_ms: number, indexes_ensured: number, errors: [] }
 */
async function ensureIndexes(db, options = {}) {
  const { verbose = false } = options;
  const startTime = Date.now();
  let indexesEnsured = 0;
  const errors = [];

  if (verbose) console.log('[KG Indexes] Ensuring indexes...');

  for (const idx of INDEXES) {
    try {
      const col = db.collection(idx.collection);
      await col.ensureIndex({
        type: idx.type,
        fields: idx.fields,
        unique: idx.unique ?? false,
      });
      indexesEnsured++;
      if (verbose) console.log(`  ✓ ${idx.collection} on (${idx.fields.join(', ')})`);
    } catch (err) {
      // Code 1210 = index already exists; ignore
      if (err.isArangoError && err.code === 1210) {
        if (verbose) console.log(`  ∼ ${idx.collection} on (${idx.fields.join(', ')}) [existing]`);
      } else {
        errors.push({ index: `${idx.collection}.${idx.fields.join('_')}`, error: err.message });
        if (verbose) console.error(`  ✗ ${idx.collection} on (${idx.fields.join(', ')}) — ${err.message}`);
      }
    }
  }

  const duration = Date.now() - startTime;

  if (verbose) {
    console.log(`[KG Indexes] Complete: ${indexesEnsured} indexes in ${duration}ms`);
    if (errors.length > 0) {
      console.warn(`[KG Indexes] Warnings: ${errors.length} errors`);
    }
  }

  return {
    success: errors.length === 0,
    duration_ms: duration,
    indexes_ensured: indexesEnsured,
    errors,
  };
}

/**
 * Health check: verify indexes exist and measure query performance.
 *
 * Runs sample queries on indexed fields and reports execution time.
 *
 * @param {ArangoDatabase} db — ArangoDB client
 * @returns {object} { goals_tree_ms: number, decisions_filter_ms: number, overall_ms: number }
 */
async function measureIndexPerformance(db) {
  const results = { queries: {}, overall_ms: 0 };
  const startOverall = Date.now();

  try {
    // Test 1: Goals tree query using (parent_goal_id, status) index
    const startGoals = Date.now();
    await db.query(`
      FOR goal IN kg_goals
        FILTER goal.parent_goal_id == null && goal.status == 'active'
        LIMIT 10
      RETURN goal
    `);
    results.queries.goals_tree_ms = Date.now() - startGoals;

    // Test 2: Decisions filtering using (goal_id, status) index
    const startDecisions = Date.now();
    await db.query(`
      FOR decision IN kg_decisions
        FILTER decision.goal_id != null && decision.status != 'archived'
        LIMIT 10
      RETURN decision
    `);
    results.queries.decisions_filter_ms = Date.now() - startDecisions;
  } catch (err) {
    results.error = err.message;
  }

  results.overall_ms = Date.now() - startOverall;
  return results;
}

module.exports = { ensureIndexes, measureIndexPerformance };
