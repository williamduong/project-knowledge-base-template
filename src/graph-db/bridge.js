'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Bridge Layer (Phase 5.5)
//
// Semantic links between Code Graph and Knowledge Graph.
// Enables impact analysis: "What does Intent X affect in the codebase?"
// ---------------------------------------------------------------------------

// Bridge relationship definitions
const BRIDGE_EDGES = {
  INTENT_DESCRIBES_FILE:     'kg_intent_describes_file',      // Intent → cg_files
  DECISION_CONSTRAINS_SYMBOL: 'kg_decision_constrains_symbol', // Decision → cg_symbols
  GOAL_INVOLVES_FILE:        'kg_goal_involves_file',         // Goal → cg_files
  PRINCIPLE_APPLIES_TO_SYMBOL: 'kg_principle_applies_to_symbol', // Principle → cg_symbols
  LESSON_REFERENCES_COMMIT:  'kg_lesson_references_commit',   // Lesson → cg_commits
  DOCUMENT_DOCUMENTS_FILE:   'kg_document_documents_file',    // Document → cg_files
};

// Create bridge edge collections in ArangoDB
async function ensureBridgeEdges(db) {
  const created = [];
  const existing = [];

  for (const [name, collectionName] of Object.entries(BRIDGE_EDGES)) {
    try {
      await db.createCollection(collectionName, { type: 2 }); // type 2 = edge collection
      created.push(collectionName);
    } catch (err) {
      if (err.code === 409) {
        // Already exists
        existing.push(collectionName);
      } else {
        throw err;
      }
    }
  }

  return { created, existing };
}

// Create bridge edge (Intent → File)
async function linkIntentToFile(db, intentId, filePath, metadata = {}) {
  const col = db.collection(BRIDGE_EDGES.INTENT_DESCRIBES_FILE);
  const edge = {
    _from: `kg_intents/${intentId}`,
    _to: `cg_files/${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
    created_at: new Date().toISOString(),
    provenance: metadata.provenance || 'manual',
    confidence: metadata.confidence || 1.0,
    ...metadata,
  };

  return await col.save(edge);
}

// Create bridge edge (Decision → Symbol)
async function linkDecisionToSymbol(db, decisionId, symbolName, metadata = {}) {
  const col = db.collection(BRIDGE_EDGES.DECISION_CONSTRAINS_SYMBOL);
  const edge = {
    _from: `kg_decisions/${decisionId}`,
    _to: `cg_symbols/${symbolName}`,
    created_at: new Date().toISOString(),
    provenance: metadata.provenance || 'manual',
    confidence: metadata.confidence || 1.0,
    ...metadata,
  };

  return await col.save(edge);
}

// Create bridge edge (Goal → File)
async function linkGoalToFile(db, goalId, filePath, metadata = {}) {
  const col = db.collection(BRIDGE_EDGES.GOAL_INVOLVES_FILE);
  const edge = {
    _from: `kg_goals/${goalId}`,
    _to: `cg_files/${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
    created_at: new Date().toISOString(),
    provenance: metadata.provenance || 'manual',
    confidence: metadata.confidence || 1.0,
    ...metadata,
  };

  return await col.save(edge);
}

// Create bridge edge (Principle → Symbol)
async function linkPrincipleToSymbol(db, principleId, symbolName, metadata = {}) {
  const col = db.collection(BRIDGE_EDGES.PRINCIPLE_APPLIES_TO_SYMBOL);
  const edge = {
    _from: `kg_principles/${principleId}`,
    _to: `cg_symbols/${symbolName}`,
    created_at: new Date().toISOString(),
    provenance: metadata.provenance || 'manual',
    confidence: metadata.confidence || 1.0,
    ...metadata,
  };

  return await col.save(edge);
}

// Create bridge edge (Lesson → Commit)
async function linkLessonToCommit(db, lessonId, commitSha, metadata = {}) {
  const col = db.collection(BRIDGE_EDGES.LESSON_REFERENCES_COMMIT);
  const edge = {
    _from: `kg_lessons/${lessonId}`,
    _to: `cg_commits/${commitSha}`,
    created_at: new Date().toISOString(),
    provenance: metadata.provenance || 'manual',
    confidence: metadata.confidence || 1.0,
    ...metadata,
  };

  return await col.save(edge);
}

// Create bridge edge (Document → File)
async function linkDocumentToFile(db, documentId, filePath, metadata = {}) {
  const col = db.collection(BRIDGE_EDGES.DOCUMENT_DOCUMENTS_FILE);
  const edge = {
    _from: `kg_documents/${documentId}`,
    _to: `cg_files/${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
    created_at: new Date().toISOString(),
    provenance: metadata.provenance || 'manual',
    confidence: metadata.confidence || 1.0,
    ...metadata,
  };

  return await col.save(edge);
}

// Get all bridges FROM a KG entity
async function getBridgesFromEntity(db, entityId) {
  const aql = `
    FOR edge IN OUTBOUND @entityId
      ${Object.values(BRIDGE_EDGES).map(e => e).join(', ')}
    RETURN {
      type: SPLIT(edge._id, '/')[0],
      source: edge._from,
      target: edge._to,
      created_at: edge.created_at,
      provenance: edge.provenance,
      confidence: edge.confidence
    }
  `;

  try {
    const cursor = await db.query(aql, { entityId });
    return await cursor.all();
  } catch (err) {
    console.error(`Error getting bridges:`, err.message);
    return [];
  }
}

// Get all bridges TO a Code Graph entity
async function getBridgesToCodeEntity(db, codeEntityId) {
  const aql = `
    FOR edge IN INBOUND @codeEntityId
      ${Object.values(BRIDGE_EDGES).map(e => e).join(', ')}
    RETURN {
      type: SPLIT(edge._id, '/')[0],
      source: edge._from,
      target: edge._to,
      created_at: edge.created_at,
      provenance: edge.provenance,
      confidence: edge.confidence
    }
  `;

  try {
    const cursor = await db.query(aql, { codeEntityId });
    return await cursor.all();
  } catch (err) {
    console.error(`Error getting bridges:`, err.message);
    return [];
  }
}

module.exports = {
  BRIDGE_EDGES,
  ensureBridgeEdges,
  linkIntentToFile,
  linkDecisionToSymbol,
  linkGoalToFile,
  linkPrincipleToSymbol,
  linkLessonToCommit,
  linkDocumentToFile,
  getBridgesFromEntity,
  getBridgesToCodeEntity,
};
