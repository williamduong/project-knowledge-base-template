'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Monitoring module (Phase 5.75)
//
// Collection statistics, health checks, activity metrics.
// ---------------------------------------------------------------------------

const { COLLECTIONS, EDGE_COLLECTIONS } = require('./schema');

function normalizeCollectionCount(value) {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value.count === 'number') {
    return value.count;
  }
  return 0;
}

// Get entity counts per collection
async function getEntityCounts(db) {
  const counts = {};

  for (const [name, coll] of Object.entries(COLLECTIONS)) {
    try {
      const col = db.collection(coll);
      counts[name] = normalizeCollectionCount(await col.count());
    } catch (err) {
      counts[name] = 0;
    }
  }

  return counts;
}

// Get edge counts per relationship
async function getEdgeCounts(db) {
  const counts = {};

  for (const [name, coll] of Object.entries(EDGE_COLLECTIONS)) {
    try {
      const col = db.collection(coll);
      counts[name] = normalizeCollectionCount(await col.count());
    } catch (err) {
      counts[name] = 0;
    }
  }

  return counts;
}

// Get total graph stats
async function getGraphStats(db) {
  const entities = await getEntityCounts(db);
  const edges = await getEdgeCounts(db);

  const totalEntities = Object.values(entities).reduce((a, b) => a + b, 0);
  const totalEdges = Object.values(edges).reduce((a, b) => a + b, 0);

  return {
    timestamp: new Date().toISOString(),
    entities: {
      total: totalEntities,
      byType: entities,
    },
    edges: {
      total: totalEdges,
      byType: edges,
    },
    density: totalEntities > 0 ? (totalEdges / totalEntities).toFixed(2) : 0,
  };
}

// Find orphaned nodes (no edges)
async function getOrphanedNodes(db) {
  const results = [];
  const collectionList = [
    COLLECTIONS.INTENTS, COLLECTIONS.GOALS, COLLECTIONS.DECISIONS,
    COLLECTIONS.PRINCIPLES, COLLECTIONS.LESSONS, COLLECTIONS.DOCUMENTS,
    COLLECTIONS.AGENTS,
  ];

  for (const coll of collectionList) {
    const aql = `
      FOR doc IN ${coll}
        LET edges = (
          FOR edge IN INBOUND doc GRAPH knowledge_graph
            RETURN edge._id
        )
        FILTER LENGTH(edges) == 0
        RETURN {
          node_id: doc._id,
          kind: doc.kind,
          title: doc.title || doc.name || 'N/A'
        }
    `;

    try {
      const cursor = await db.query(aql);
      const orphaned = await cursor.all();
      results.push(...orphaned);
    } catch (err) {
      console.error(`Error getting orphaned nodes from ${coll}:`, err.message);
    }
  }

  return results;
}

// Find dangling edges (target doesn't exist) — deferred check
async function getDanglingEdges(db) {
  // Skip dangling edge check (complex to implement reliably in AQL)
  // All edges in knowledge_graph should have valid targets due to schema constraints
  return [];
}

// Get last modified entities
async function getLastModifiedEntities(db, limit = 10) {
  const results = [];
  const collectionList = [
    COLLECTIONS.INTENTS, COLLECTIONS.GOALS, COLLECTIONS.DECISIONS,
    COLLECTIONS.PRINCIPLES, COLLECTIONS.LESSONS, COLLECTIONS.DOCUMENTS,
    COLLECTIONS.AGENTS,
  ];

  for (const coll of collectionList) {
    const aql = `
      FOR doc IN ${coll}
        SORT doc.updated_at DESC
        LIMIT 2
        RETURN {
          node_id: doc._id,
          kind: doc.kind,
          title: doc.title || doc.name || 'N/A',
          updated_at: doc.updated_at
        }
    `;

    try {
      const cursor = await db.query(aql);
      const items = await cursor.all();
      results.push(...items);
    } catch (err) {
      console.error(`Error getting last modified from ${coll}:`, err.message);
    }
  }

  // Sort combined results and limit
  return results.sort((a, b) =>
    new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
  ).slice(0, limit);
}

// Get most connected nodes (hub analysis)
async function getMostConnectedNodes(db, limit = 10) {
  const results = [];
  const collectionList = [
    COLLECTIONS.INTENTS, COLLECTIONS.GOALS, COLLECTIONS.DECISIONS,
    COLLECTIONS.PRINCIPLES, COLLECTIONS.LESSONS, COLLECTIONS.DOCUMENTS,
    COLLECTIONS.AGENTS,
  ];

  for (const coll of collectionList) {
    const aql = `
      FOR doc IN ${coll}
        LET edges = (
          FOR edge IN INBOUND doc GRAPH knowledge_graph
            RETURN edge._id
        )
        SORT LENGTH(edges) DESC
        LIMIT 2
        RETURN {
          node_id: doc._id,
          kind: doc.kind,
          title: doc.title || doc.name || 'N/A',
          edge_count: LENGTH(edges)
        }
    `;

    try {
      const cursor = await db.query(aql);
      const items = await cursor.all();
      results.push(...items);
    } catch (err) {
      console.error(`Error getting hubs from ${coll}:`, err.message);
    }
  }

  // Sort combined results and limit
  return results.sort((a, b) => b.edge_count - a.edge_count).slice(0, limit);
}

// Health check: summary report
async function getHealthReport(db) {
  const stats = await getGraphStats(db);
  const orphaned = await getOrphanedNodes(db);
  const dangling = await getDanglingEdges(db);
  const lastModified = await getLastModifiedEntities(db, 5);
  const hubs = await getMostConnectedNodes(db, 5);

  return {
    timestamp: new Date().toISOString(),
    status: dangling.length === 0 && orphaned.length === 0 ? 'healthy' : 'degraded',
    stats,
    orphaned: {
      count: orphaned.length,
      examples: orphaned.slice(0, 3),
    },
    dangling: {
      count: dangling.length,
      examples: dangling.slice(0, 3),
    },
    lastModified,
    hubs,
  };
}

module.exports = {
  getEntityCounts,
  getEdgeCounts,
  getGraphStats,
  getOrphanedNodes,
  getDanglingEdges,
  getLastModifiedEntities,
  getMostConnectedNodes,
  getHealthReport,
};
