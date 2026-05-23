'use strict';

// ---------------------------------------------------------------------------
// Code Graph — Collection + index + named graph initializer (Phase 0)
// All operations are idempotent: safe to call on an already-initialized DB.
// ---------------------------------------------------------------------------

const { COLLECTIONS, EDGE_COLLECTIONS, GRAPH_DEFINITION, INDEXES } = require('./schema');

// ---------------------------------------------------------------------------
// Ensure a single vertex collection exists
// ---------------------------------------------------------------------------

async function ensureVertexCollection(db, name) {
  const col = db.collection(name);
  const exists = await col.exists();
  if (!exists) {
    await col.create({ type: 2 }); // type 2 = document collection
  }
  return col;
}

// ---------------------------------------------------------------------------
// Ensure a single edge collection exists
// ---------------------------------------------------------------------------

async function ensureEdgeCollection(db, name) {
  const col = db.collection(name);
  const exists = await col.exists();
  if (!exists) {
    await col.create({ type: 3 }); // type 3 = edge collection
  }
  return col;
}

// ---------------------------------------------------------------------------
// Ensure indexes for a collection
// Skips creation if an index with the same name already exists.
// ---------------------------------------------------------------------------

async function ensureIndexes(db, collectionName, indexDefs) {
  if (!indexDefs || indexDefs.length === 0) return;
  const col = db.collection(collectionName);
  const existing = await col.indexes();
  const existingNames = new Set(existing.map(i => i.name));

  for (const def of indexDefs) {
    if (existingNames.has(def.name)) continue;
    await col.ensureIndex({
      type:   def.type,
      fields: def.fields,
      unique: def.unique || false,
      name:   def.name,
    });
  }
}

// ---------------------------------------------------------------------------
// Ensure the ArangoDB named graph exists.
// If it already exists, verifies edge definitions match (no mutation on diff —
// caller must drop + recreate manually to change definitions).
// ---------------------------------------------------------------------------

async function ensureNamedGraph(db) {
  const graph = db.graph(GRAPH_DEFINITION.name);
  const exists = await graph.exists();
  if (!exists) {
    await graph.create(GRAPH_DEFINITION.edgeDefinitions, {
      orphanCollections: GRAPH_DEFINITION.orphanCollections,
    });
  }
  return graph;
}

// ---------------------------------------------------------------------------
// ensureSchema — main entry point
// Creates all vertex collections, edge collections, indexes, and named graph.
// Returns a summary of what was created vs already existing.
// ---------------------------------------------------------------------------

async function ensureSchema(db) {
  const created = { vertexCollections: [], edgeCollections: [], graphs: [] };
  const existing = { vertexCollections: [], edgeCollections: [], graphs: [] };

  // Vertex collections
  for (const name of Object.values(COLLECTIONS)) {
    const col = db.collection(name);
    const alreadyExists = await col.exists();
    await ensureVertexCollection(db, name);
    if (alreadyExists) {
      existing.vertexCollections.push(name);
    } else {
      created.vertexCollections.push(name);
    }
  }

  // Edge collections
  for (const name of Object.values(EDGE_COLLECTIONS)) {
    const col = db.collection(name);
    const alreadyExists = await col.exists();
    await ensureEdgeCollection(db, name);
    if (alreadyExists) {
      existing.edgeCollections.push(name);
    } else {
      created.edgeCollections.push(name);
    }
  }

  // Indexes
  for (const [collectionName, defs] of Object.entries(INDEXES)) {
    await ensureIndexes(db, collectionName, defs);
  }

  // Named graph
  const graph = db.graph(GRAPH_DEFINITION.name);
  const graphExists = await graph.exists();
  await ensureNamedGraph(db);
  if (graphExists) {
    existing.graphs.push(GRAPH_DEFINITION.name);
  } else {
    created.graphs.push(GRAPH_DEFINITION.name);
  }

  return { created, existing };
}

// ---------------------------------------------------------------------------
// getCollectionStats — lightweight summary for `kbx code-graph status`
// ---------------------------------------------------------------------------

async function getCollectionStats(db) {
  const stats = [];

  for (const [label, name] of Object.entries({ ...COLLECTIONS, ...EDGE_COLLECTIONS })) {
    const col = db.collection(name);
    const exists = await col.exists();
    if (!exists) {
      stats.push({ label, collection: name, exists: false, count: null });
      continue;
    }
    const info = await col.count();
    stats.push({ label, collection: name, exists: true, count: info.count });
  }

  return stats;
}

module.exports = { ensureSchema, getCollectionStats };
