'use strict';

const { COLLECTIONS, EDGE_COLLECTIONS, INDEXES, GRAPH_DEFINITION } = require('./schema');

const VERTEX_COLLECTION_TYPE = 2;
const EDGE_COLLECTION_TYPE = 3;

async function ensureSchema(db) {
  const created = { vertexCollections: [], edgeCollections: [], graphs: [] };
  const existing = { vertexCollections: [], edgeCollections: [], graphs: [] };

  for (const name of Object.values(COLLECTIONS)) {
    try {
      await db.collection(name).get();
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

  for (const name of Object.values(EDGE_COLLECTIONS)) {
    try {
      await db.collection(name).get();
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

  for (const idx of INDEXES) {
    try {
      await db.collection(idx.collection).ensureIndex({
        type: idx.type,
        fields: idx.fields,
      });
    } catch (err) {
      if (!err.isArangoError || err.code !== 1210) {
        throw err;
      }
    }
  }

  try {
    await db.graph(GRAPH_DEFINITION.name).get();
    existing.graphs.push(GRAPH_DEFINITION.name);
  } catch (err) {
    if (err.isArangoError && err.code === 404) {
      await db.createGraph(GRAPH_DEFINITION.name, GRAPH_DEFINITION.edgeDefinitions);
      created.graphs.push(GRAPH_DEFINITION.name);
    } else {
      throw err;
    }
  }

  return { created, existing };
}

async function truncateCollection(db, collectionName) {
  await db.query(`FOR doc IN ${collectionName} REMOVE doc IN ${collectionName}`);
}

async function replaceCollectionDocuments(db, collectionName, documents) {
  await truncateCollection(db, collectionName);
  const collection = db.collection(collectionName);
  for (const document of documents) {
    await collection.save(document);
  }
}

module.exports = {
  ensureSchema,
  truncateCollection,
  replaceCollectionDocuments,
};
