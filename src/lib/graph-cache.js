'use strict';

/**
 * Graph Cache — In-memory query result caching layer
 *
 * Phase 6 Task 1.2: Cache frequent graph queries to prevent database hammering.
 * Essential to prevent performance regression when migrating from file→graph endpoints.
 *
 * Features:
 * - TTL-based expiration (default 5-10 min)
 * - Pattern-based cache invalidation (e.g., invalidate('goals/*'))
 * - Simple in-memory Map (sufficient for single maintainer workspace)
 *
 * Use case:
 *   - `/api/graph/goals/tree` cached for 5 min
 *   - `/api/graph/decisions/list` cached for 5 min
 *   - Mutations (POST/PATCH/DELETE) invalidate related cache keys
 */

class GraphCache {
  constructor(ttlMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      expirations: 0,
    };
  }

  /**
   * Get cached value if exists and not expired.
   *
   * @param {string} key — cache key (e.g., 'goals:tree', 'decisions:list')
   * @returns {any} cached value or null
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.expirations++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set cache value with TTL.
   *
   * @param {string} key — cache key
   * @param {any} value — value to cache
   * @param {number} ttlMs — optional TTL override
   */
  set(key, value, ttlMs = null) {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttlMs ?? this.ttlMs),
      created_at: Date.now(),
    });
  }

  /**
   * Invalidate cache entries matching a pattern.
   *
   * Examples:
   *   invalidate('goals/*')        → clear all goal-related caches
   *   invalidate('goals:tree')     → clear exact key
   *   invalidate('decisions:*')    → clear all decision caches
   *
   * @param {string} pattern — glob-like pattern
   * @returns {number} number of keys invalidated
   */
  invalidate(pattern) {
    let count = 0;
    const regex = patternToRegex(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    this.stats.invalidations += count;
    return count;
  }

  /**
   * Clear entire cache.
   */
  clear() {
    const count = this.cache.size;
    this.cache.clear();
    this.stats.invalidations += count;
    return count;
  }

  /**
   * Get cache statistics.
   *
   * @returns {object} { hits, misses, hit_rate: 0-100, size, ttl_ms }
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? Math.round((this.stats.hits / total) * 100) : 0;

    return {
      ...this.stats,
      total_queries: total,
      hit_rate_percent: hitRate,
      size_bytes: estimateSizeBytes(this),
      ttl_ms: this.ttlMs,
    };
  }
}

/**
 * Convert glob pattern to regex.
 *
 * Examples:
 *   'goals:*' → /^goals:.*/
 *   'goals:tree' → /^goals:tree$/
 *   'decisions/*' → /^decisions\/.*/
 */
function patternToRegex(pattern) {
  // Escape special regex chars except * and ?
  let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // * → .* (any chars)
  escaped = escaped.replace(/\*/g, '.*');
  // ? → . (single char)
  escaped = escaped.replace(/\?/g, '.');

  // If no wildcards, add ^ and $ for exact match
  if (!pattern.includes('*') && !pattern.includes('?')) {
    return new RegExp(`^${escaped}$`);
  }

  return new RegExp(`^${escaped}`);
}

/**
 * Rough estimate of cache size in bytes (for monitoring).
 */
function estimateSizeBytes(cache) {
  let bytes = 0;
  for (const [key, entry] of cache.cache.entries()) {
    bytes += key.length * 2; // rough string size
    bytes += JSON.stringify(entry.value).length; // rough JSON size
  }
  return bytes;
}

// Singleton instance for graph cache
const graphCache = new GraphCache();

module.exports = { GraphCache, graphCache };
