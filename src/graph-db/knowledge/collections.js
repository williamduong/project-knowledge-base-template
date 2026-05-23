'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Collection initialization
//
// Creates KG vertex collections (kg_*), edge collections, indexes, and
// the named graph 'knowledge_graph'.
//
// Idempotent: safe to re-run. Uses ensureCollection() which returns existing
// if already present.
// ---------------------------------------------------------------------------

const { COLLECTIONS, EDGE_COLLECTIONS, INDEXES, GRAPH_DEFINITION } = require('./schema');

// Vertex collection types
const VERTEX_COLLECTION_TYPE = 2;
// Edge collection type
const EDGE_COLLECTION_TYPE = 3;

async function ensureSchema(db) {
  const created = { vertexCollections: [], edgeCollections: [], graphs: [] };
  const existing = { vertexCollections: [], edgeCollections: [], graphs: [] };

  // 1. Create vertex collections
  for (const [key, name] of Object.entries(COLLECTIONS)) {
    try {
      const col = db.collection(name);
      const info = await col.get();
      existing.vertexCollections.push(name);
    } catch (err) {
      if (err.isArangoError && err.code === 404) {
        await db.createCollection(name, { type: VERTEX_COLLECTION_TYPE });
        created.vertexCollections.push(name);
      } else {
        throw err;
      }
    }
  }

  // 2. Create edge collections
  for (const [key, name] of Object.entries(EDGE_COLLECTIONS)) {
    try {
      const col = db.collection(name);
      const info = await col.get();
      existing.edgeCollections.push(name);
    } catch (err) {
      if (err.isArangoError && err.code === 404) {
        await db.createCollection(name, { type: EDGE_COLLECTION_TYPE });
        created.edgeCollections.push(name);
      } else {
        throw err;
      }
    }
  }

  // 3. Create indexes
  for (const idx of INDEXES) {
    try {
      const col = db.collection(idx.collection);
      await col.ensureIndex({
        type: idx.type,
        fields: idx.fields,
      });
    } catch (err) {
      // Index might already exist — continue
      if (!err.isArangoError || err.code !== 1210) throw err;
    }
  }

  // 4. Create named graph
  try {
    const graphName = GRAPH_DEFINITION.name;
    const graph = db.graph(graphName);
    await graph.get();
    existing.graphs.push(graphName);
  } catch (err) {
    if (err.isArangoError && err.code === 404) {
      const graphName = GRAPH_DEFINITION.name;
      await db.createGraph(graphName, GRAPH_DEFINITION.edgeDefinitions);
      created.graphs.push(graphName);
    } else {
      throw err;
    }
  }

  return { created, existing };
}

// Get collection statistics
async function getCollectionStats(db) {
  const allCollections = [
    ...Object.values(COLLECTIONS),
    ...Object.values(EDGE_COLLECTIONS),
  ];

  const stats = [];
  for (const name of allCollections) {
    try {
      const col = db.collection(name);
      const info = await col.get();
      const count = await col.count();
      stats.push({
        label: name,
        collection: name,
        exists: true,
        count: count.count,
      });
    } catch (err) {
      if (err.isArangoError && err.code === 404) {
        stats.push({
          label: name,
          collection: name,
          exists: false,
          count: 0,
        });
      } else {
        throw err;
      }
    }
  }

  return stats;
}

module.exports = { ensureSchema, getCollectionStats };
