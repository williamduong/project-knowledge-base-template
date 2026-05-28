'use strict';

const { COLLECTIONS, EDGE_COLLECTIONS } = require('./schema');
const { ensureSchema, replaceCollectionDocuments } = require('./collections');
const { buildWorkspaceSnapshot } = require('./snapshot');

async function synchronizePlanningWorkspace(db, { workspaceRoot }) {
  const snapshot = buildWorkspaceSnapshot({ workspaceRoot });
  await ensureSchema(db);

  await replaceCollectionDocuments(db, COLLECTIONS.WORKSPACES, [snapshot.documents.workspace]);
  await replaceCollectionDocuments(db, COLLECTIONS.OBJECTIVES, snapshot.documents.objectives);
  await replaceCollectionDocuments(db, COLLECTIONS.KEY_RESULTS, snapshot.documents.keyResults);
  await replaceCollectionDocuments(db, COLLECTIONS.INTENTS, snapshot.documents.intents);
  await replaceCollectionDocuments(db, COLLECTIONS.TASKS, snapshot.documents.tasks);
  await replaceCollectionDocuments(db, COLLECTIONS.RELEASES, snapshot.documents.releases);

  await replaceCollectionDocuments(db, EDGE_COLLECTIONS.CONTAINS, snapshot.documents.containsEdges);
  await replaceCollectionDocuments(db, EDGE_COLLECTIONS.HAS_KEY_RESULT, snapshot.documents.keyResultEdges);
  await replaceCollectionDocuments(db, EDGE_COLLECTIONS.ADVANCES, snapshot.documents.intentEdges);
  await replaceCollectionDocuments(db, EDGE_COLLECTIONS.HAS_TASK, snapshot.documents.taskEdges);
  await replaceCollectionDocuments(db, EDGE_COLLECTIONS.BELONGS_TO_RELEASE, snapshot.documents.releaseEdges);
  await replaceCollectionDocuments(db, EDGE_COLLECTIONS.DEPENDS_ON, []);

  return snapshot;
}

module.exports = {
  synchronizePlanningWorkspace,
};
