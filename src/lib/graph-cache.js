'use strict';

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

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.expirations++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttlMs = null) {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttlMs ?? this.ttlMs),
      created_at: Date.now(),
    });
  }

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

  clear() {
    const count = this.cache.size;
    this.cache.clear();
    this.stats.invalidations += count;
    return count;
  }

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

function patternToRegex(pattern) {
  let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  escaped = escaped.replace(/\*/g, '.*');
  escaped = escaped.replace(/\?/g, '.');

  if (!pattern.includes('*') && !pattern.includes('?')) {
    return new RegExp(`^${escaped}$`);
  }

  return new RegExp(`^${escaped}`);
}

function estimateSizeBytes(cache) {
  let bytes = 0;
  for (const [key, entry] of cache.cache.entries()) {
    bytes += key.length * 2;
    bytes += JSON.stringify(entry.value).length;
  }
  return bytes;
}

const graphCache = new GraphCache();

module.exports = { GraphCache, graphCache };
