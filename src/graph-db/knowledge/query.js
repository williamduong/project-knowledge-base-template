'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Query module (Phase 5)
//
// Read operations: fetch entities, relationships, traversals, search.
// All queries are read-only; no mutations.
// ---------------------------------------------------------------------------

// Get single entity by ID
async function getEntity(db, type, id) {
  const collection = db.collection(`kg_${type}s`);
  try {
    const result = await collection.document(id);
    return result;
  } catch (err) {
    if (err.code === 404) return null;
    throw err;
  }
}

// List entities of a type with pagination
async function listEntities(db, type, options = {}) {
  const { limit = 100, offset = 0 } = options;
  const collection = db.collection(`kg_${type}s`);

  const aql = `
    FOR doc IN ${collection.name}
    SORT doc.created_at DESC
    LIMIT ${offset}, ${limit}
    RETURN doc
  `;

  const cursor = await db.query(aql);
  const entities = await cursor.all();
  return entities;
}

// Count entities of a type
async function countEntities(db, type) {
  const collection = db.collection(`kg_${type}s`);
  return await collection.count();
}

// Get relationships (incoming/outgoing edges) for an entity
async function getRelationships(db, entityId, direction = 'both', relationshipType = null) {
  const aql = `
    ${direction === 'out' || direction === 'both' ? `
    FOR edge IN ${direction === 'out' ? '' : ''}OUTBOUND @entityId GRAPH knowledge_graph
      ${relationshipType ? 'FILTER edge._from LIKE @entityId' : ''}
      RETURN {
        type: 'outbound',
        relationship: edge._id,
        target: edge._to,
        label: SPLIT(edge._id, '/')[0],
        properties: edge
      }
    ` : ''}
    ${direction === 'in' || direction === 'both' ? `
    FOR edge IN INBOUND @entityId GRAPH knowledge_graph
      RETURN {
        type: 'inbound',
        relationship: edge._id,
        source: edge._from,
        label: SPLIT(edge._id, '/')[0],
        properties: edge
      }
    ` : ''}
  `.trim();

  try {
    const cursor = await db.query(aql, { entityId: `kg_${entityId.split('/')[0]}s/${entityId.split('/')[1]}` });
    const edges = await cursor.all();
    return edges;
  } catch (err) {
    console.error(`Error querying relationships for ${entityId}:`, err.message);
    return [];
  }
}

// Find shortest path between two entities (impact chain)
async function traversePath(db, startId, targetId, maxDepth = 5) {
  const aql = `
    FOR path IN 1..${maxDepth} ANY SHORTEST_PATH
      @start TO @target
      GRAPH knowledge_graph
    RETURN {
      path: path,
      length: LENGTH(path.vertices),
      edges: path.edges
    }
  `;

  try {
    const cursor = await db.query(aql, { start: startId, target: targetId });
    const results = await cursor.all();
    return results.length > 0 ? results[0] : null;
  } catch (err) {
    console.error(`Error finding path:`, err.message);
    return null;
  }
}

// Get impact chain — all entities N hops away
async function getImpactChain(db, entityId, depth = 3) {
  const aql = `
    FOR vertex, edge, path IN 0..${depth} ANY @entityId GRAPH knowledge_graph
      RETURN DISTINCT {
        entity: vertex,
        distance: LENGTH(path.edges),
        path: path.vertices[*]._id
      }
  `;

  try {
    const cursor = await db.query(aql, { entityId });
    const results = await cursor.all();
    return results;
  } catch (err) {
    console.error(`Error getting impact chain:`, err.message);
    return [];
  }
}

// Search entities by title/description (simple substring match)
async function searchEntities(db, query, types = []) {
  const collectionNames = types.length > 0
    ? types.map(t => `kg_${t}s`)
    : ['kg_intents', 'kg_goals', 'kg_decisions', 'kg_principles', 'kg_lessons', 'kg_documents', 'kg_agents'];

  const results = [];

  // Query each collection separately and combine
  for (const coll of collectionNames) {
    const aql = `
      FOR doc IN ${coll}
        FILTER CONTAINS(LOWER(doc.title), LOWER(@query)) OR CONTAINS(LOWER(doc.description || ''), LOWER(@query))
        RETURN doc
    `;

    try {
      const cursor = await db.query(aql, { query });
      const collResults = await cursor.all();
      results.push(...collResults);
    } catch (err) {
      // Skip collections that have errors
      console.error(`[Search] error querying ${coll}:`, err.message);
    }
  }

  return results;
}

// Get collection statistics
async function getCollectionStats(db) {
  const types = ['intent', 'goal', 'decision', 'principle', 'lesson', 'document', 'agent'];
  const stats = {};

  for (const type of types) {
    try {
      stats[type] = await countEntities(db, type);
    } catch (err) {
      stats[type] = 0;
    }
  }

  return stats;
}

module.exports = {
  getEntity,
  listEntities,
  countEntities,
  getRelationships,
  traversePath,
  getImpactChain,
  searchEntities,
  getCollectionStats,
};
