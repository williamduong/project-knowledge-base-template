'use strict';

/**
 * Graph Query Metrics — Performance tracking for graph queries
 *
 * Phase 6 Track C: Measure query performance, cache hit rates, and entity counts.
 * Used by `kbx doctor` to report graph health baseline.
 */

class GraphMetricsCollector {
  constructor() {
    this.operations = {};
    this.cacheStats = { hits: 0, misses: 0, invalidations: 0 };
    this.startTime = Date.now();
  }

  /**
   * Record a query operation's metrics.
   *
   * @param {string} operation — 'goals:tree' | 'goals:create' | 'decisions:list' etc.
   * @param {number} durationMs — Elapsed time
   * @param {string} source — 'graph' | 'file' | 'fallback'
   * @param {number} entityCount — Entities returned/affected
   * @param {boolean} cacheHit — Whether result came from cache
   */
  recordOperation(operation, durationMs, source, entityCount = 0, cacheHit = false) {
    if (!this.operations[operation]) {
      this.operations[operation] = {
        count: 0,
        graph: { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 },
        file: { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 },
        fallback: { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 },
        totalEntityCount: 0,
      };
    }

    const op = this.operations[operation];
    const sourceStats = op[source];

    sourceStats.count++;
    sourceStats.totalMs += durationMs;
    sourceStats.minMs = Math.min(sourceStats.minMs, durationMs);
    sourceStats.maxMs = Math.max(sourceStats.maxMs, durationMs);

    op.count++;
    op.totalEntityCount += entityCount;

    if (cacheHit) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }
  }

  /**
   * Record cache invalidation event.
   */
  recordInvalidation() {
    this.cacheStats.invalidations++;
  }

  /**
   * Get aggregated metrics.
   *
   * @returns {object} Aggregated stats with averages, hit rates
   */
  getMetrics() {
    const totalQueries = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalQueries > 0 ? (this.cacheStats.hits / totalQueries) * 100 : 0;

    const normalized = {};
    for (const [op, stats] of Object.entries(this.operations)) {
      normalized[op] = {
        count: stats.count,
        graph: stats.graph.count > 0 ? {
          count: stats.graph.count,
          avgMs: Math.round(stats.graph.totalMs / stats.graph.count),
          minMs: stats.graph.minMs,
          maxMs: stats.graph.maxMs,
        } : null,
        file: stats.file.count > 0 ? {
          count: stats.file.count,
          avgMs: Math.round(stats.file.totalMs / stats.file.count),
          minMs: stats.file.minMs,
          maxMs: stats.file.maxMs,
        } : null,
        fallback: stats.fallback.count > 0 ? {
          count: stats.fallback.count,
          avgMs: Math.round(stats.fallback.totalMs / stats.fallback.count),
          minMs: stats.fallback.minMs,
          maxMs: stats.fallback.maxMs,
        } : null,
        totalEntityCount: stats.totalEntityCount,
      };
    }

    return {
      operations: normalized,
      cacheStats: {
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        hit_rate_percent: Math.round(hitRate * 10) / 10,
        invalidations: this.cacheStats.invalidations,
      },
      startTime: new Date(this.startTime).toISOString(),
      duration_ms: Date.now() - this.startTime,
    };
  }

  /**
   * Format metrics for human-readable report.
   */
  formatReport() {
    const metrics = this.getMetrics();
    const lines = [];

    lines.push('\nGraph Query Metrics');
    lines.push('===================');
    lines.push(`Time Period: ${metrics.startTime} (${metrics.duration_ms}ms)`);
    lines.push('');

    lines.push('Cache Statistics:');
    lines.push(`  Hits: ${metrics.cacheStats.hits}`);
    lines.push(`  Misses: ${metrics.cacheStats.misses}`);
    lines.push(`  Hit Rate: ${metrics.cacheStats.hit_rate_percent}%`);
    lines.push(`  Invalidations: ${metrics.cacheStats.invalidations}`);
    lines.push('');

    lines.push('Operations by Query Time:');
    for (const [op, stats] of Object.entries(metrics.operations)) {
      lines.push(`  ${op}:`);
      if (stats.graph) {
        lines.push(`    Graph (${stats.graph.count}x): avg ${stats.graph.avgMs}ms [${stats.graph.minMs}–${stats.graph.maxMs}ms]`);
      }
      if (stats.file) {
        lines.push(`    File (${stats.file.count}x): avg ${stats.file.avgMs}ms [${stats.file.minMs}–${stats.file.maxMs}ms]`);
      }
      if (stats.fallback) {
        lines.push(`    Fallback (${stats.fallback.count}x): avg ${stats.fallback.avgMs}ms [${stats.fallback.minMs}–${stats.fallback.maxMs}ms]`);
      }
      lines.push(`    Entities: ${stats.totalEntityCount}`);
    }

    return lines.join('\n');
  }

  /**
   * Reset metrics for new session.
   */
  reset() {
    this.operations = {};
    this.cacheStats = { hits: 0, misses: 0, invalidations: 0 };
    this.startTime = Date.now();
  }
}

// Global singleton instance
const metricsCollector = new GraphMetricsCollector();

module.exports = { GraphMetricsCollector, metricsCollector };
