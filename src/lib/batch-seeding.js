'use strict';

/**
 * Batch Seeding Utility — Optimize bulk entity ingestion
 *
 * Phase 6 Task 1.3: Replace per-entity saves with batch operations.
 * Reduces N round-trips to 1-2 for large datasets.
 *
 * Usage:
 *   const batcher = new BatchSeeder(db.collection('cg_symbols'), { batchSize: 100 });
 *   for (const symbol of symbols) {
 *     await batcher.add(symbol);
 *   }
 *   await batcher.flush();
 *
 * Performance:
 * - Individual saves: 500 symbols = 500 requests
 * - Batch saves (size 100): 500 symbols = ~6 requests
 */

class BatchSeeder {
  constructor(collection, options = {}) {
    this.collection = collection;
    this.batchSize = options.batchSize ?? 100;
    this.overwriteMode = options.overwriteMode ?? 'update';
    this.verbose = options.verbose ?? false;

    this.batch = [];
    this.stats = {
      total_added: 0,
      batches_sent: 0,
      total_saved: 0,
      errors: [],
    };
  }

  /**
   * Add item to batch; flush if batch full.
   *
   * @param {object} doc — document to save
   */
  async add(doc) {
    this.batch.push(doc);
    this.stats.total_added++;

    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Send current batch to ArangoDB.
   *
   * Tries bulk API first (faster), falls back to loop if unavailable.
   */
  async flush() {
    if (this.batch.length === 0) return;

    const toFlush = [...this.batch];
    this.batch = [];

    try {
      // Try bulk insert (ArangoDB 3.8+)
      if (this.collection.import && typeof this.collection.import === 'function') {
        const options = { overwrite: this.overwriteMode === 'update' };
        await this.collection.import(toFlush, options);
        this.stats.batches_sent++;
        this.stats.total_saved += toFlush.length;

        if (this.verbose) {
          console.log(`  [Batch] Imported ${toFlush.length} docs (batch ${this.stats.batches_sent})`);
        }
      } else {
        // Fallback: loop with error handling
        for (const doc of toFlush) {
          try {
            await this.collection.save(doc, { overwriteMode: this.overwriteMode });
            this.stats.total_saved++;
          } catch (err) {
            this.stats.errors.push({
              doc_key: doc._key || doc.id,
              error: err.message,
            });
            if (this.verbose) {
              console.warn(`  [Batch] Error saving ${doc._key || doc.id}: ${err.message}`);
            }
          }
        }
        this.stats.batches_sent++;
      }
    } catch (err) {
      // Bulk import failed; fall back to individual saves
      this.stats.batches_sent++;
      for (const doc of toFlush) {
        try {
          await this.collection.save(doc, { overwriteMode: this.overwriteMode });
          this.stats.total_saved++;
        } catch (err) {
          this.stats.errors.push({
            doc_key: doc._key || doc.id,
            error: err.message,
          });
        }
      }
    }
  }

  /**
   * Get final stats and reset.
   */
  getStats() {
    return {
      ...this.stats,
      efficiency: this.stats.batches_sent > 0
        ? `${this.stats.total_added} docs in ${this.stats.batches_sent} batches`
        : '0 docs seeded',
    };
  }
}

/**
 * Batch seed array of entities (convenience wrapper).
 *
 * @param {Collection} collection — ArangoDB collection
 * @param {array} entities — entities to save
 * @param {object} options — { batchSize: 100, overwriteMode: 'update', verbose: false }
 * @returns {object} stats
 */
async function batchSeed(collection, entities, options = {}) {
  const batcher = new BatchSeeder(collection, options);

  for (const entity of entities) {
    await batcher.add(entity);
  }

  // Flush remaining
  await batcher.flush();

  return batcher.getStats();
}

module.exports = { BatchSeeder, batchSeed };
