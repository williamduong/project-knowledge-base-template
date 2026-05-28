'use strict';

const { COLLECTIONS, EDGE_COLLECTIONS } = require('./schema');
const { synchronizePlanningWorkspace } = require('./sync');

async function fetchAll(collection) {
  const cursor = await collection.all();
  return cursor.all();
}

function buildObjectiveTree(objectives, keyResults) {
  const objectiveMap = new Map(objectives.map((objective) => [objective.id, {
    ...objective,
    children: [],
    key_results: [],
  }]));

  for (const objective of objectiveMap.values()) {
    if (objective.parent_objective_id && objectiveMap.has(objective.parent_objective_id)) {
      objectiveMap.get(objective.parent_objective_id).children.push(objective);
    }
  }

  for (const keyResult of keyResults) {
    if (objectiveMap.has(keyResult.parent_objective_id)) {
      objectiveMap.get(keyResult.parent_objective_id).key_results.push(keyResult);
    }
  }

  return [...objectiveMap.values()]
    .filter((objective) => !objective.parent_objective_id)
    .sort((left, right) => String(left.code).localeCompare(String(right.code), undefined, { numeric: true }));
}

function enrichReleaseDocs(releases, intents) {
  return releases.map((release) => {
    const releaseIntents = intents.filter((intent) => intent.release_bucket === release.release_bucket || (release.intent_ids || []).includes(intent.id));
    const completed = releaseIntents.filter((intent) => intent.lifecycle === 'closed' || intent.lifecycle === 'done' || intent.lifecycle === 'archived').length;
    const progress = releaseIntents.length ? Math.round((completed / releaseIntents.length) * 100) : 0;
    return {
      ...release,
      progress,
      intents: releaseIntents,
    };
  });
}

function buildGraphNodes({ workspace, objectives, keyResults, releases, intents, tasks, warnings }) {
  const warningIds = new Set(warnings.flatMap((warning) => warning.entity_ids || []));
  return [
    {
      id: workspace.id,
      kind: 'workspace',
      label: workspace.title,
      state: 'active',
      detail: workspace.description,
      metrics: [`${objectives.length} objectives`, `${keyResults.length} key results`],
      warning: false,
    },
    ...objectives.map((objective) => ({
      id: objective.id,
      kind: 'objective',
      label: `${objective.code} — ${objective.title}`,
      state: objective.state,
      detail: objective.success_criteria,
      metrics: [objective.success_criteria],
      warning: warningIds.has(objective.id),
    })),
    ...keyResults.map((keyResult) => ({
      id: keyResult.id,
      kind: 'key_result',
      label: `${keyResult.code} — ${keyResult.title}`,
      state: keyResult.state,
      detail: keyResult.success_criteria,
      metrics: [keyResult.metric || 'metric pending', keyResult.target || 'target pending'],
      warning: warningIds.has(keyResult.id),
    })),
    ...releases.map((release) => ({
      id: release.id,
      kind: 'release',
      label: release.title,
      state: release.state,
      detail: release.description,
      metrics: [`${release.intents.length} intents`, `${release.progress}% complete`],
      warning: false,
    })),
    ...intents.map((intent) => ({
      id: intent.id,
      kind: 'intent',
      label: intent.title,
      state: intent.validation_state === 'linked' ? intent.lifecycle : 'warning',
      detail: intent.summary,
      metrics: [
        `${intent.task_count} tasks`,
        intent.validation_state === 'linked'
          ? `${intent.linked_key_result_ids.length} key result`
          : intent.validation_state === 'proposed-new-key-result'
            ? 'new O/KR proposed'
            : intent.validation_state === 'out-of-scope'
              ? 'out of current goals'
              : 'key result required',
      ],
      warning: warningIds.has(intent.id),
    })),
    ...tasks.map((task) => ({
      id: task.id,
      kind: 'task',
      label: task.title,
      state: task.state,
      detail: task.description,
      metrics: [task.section, task.source],
      warning: false,
    })),
  ];
}

function buildGraphEdges(edgesByCollection) {
  return Object.values(edgesByCollection)
    .flat()
    .map((edge) => ({
      id: edge._key,
      kind: edge.kind,
      source: String(edge._from || '').split('/')[1],
      target: String(edge._to || '').split('/')[1],
    }));
}

async function readPlanningWorkspaceFromGraph(db) {
  const workspace = (await fetchAll(db.collection(COLLECTIONS.WORKSPACES)))[0] || null;
  const objectives = await fetchAll(db.collection(COLLECTIONS.OBJECTIVES));
  const keyResults = await fetchAll(db.collection(COLLECTIONS.KEY_RESULTS));
  const intents = await fetchAll(db.collection(COLLECTIONS.INTENTS));
  const tasks = await fetchAll(db.collection(COLLECTIONS.TASKS));
  const releases = await fetchAll(db.collection(COLLECTIONS.RELEASES));
  const edgesByCollection = {
    contains: await fetchAll(db.collection(EDGE_COLLECTIONS.CONTAINS)),
    hasKeyResult: await fetchAll(db.collection(EDGE_COLLECTIONS.HAS_KEY_RESULT)),
    advances: await fetchAll(db.collection(EDGE_COLLECTIONS.ADVANCES)),
    hasTask: await fetchAll(db.collection(EDGE_COLLECTIONS.HAS_TASK)),
    belongsToRelease: await fetchAll(db.collection(EDGE_COLLECTIONS.BELONGS_TO_RELEASE)),
  };

  const keyResultIntentCount = new Map();
  for (const edge of edgesByCollection.advances) {
    const keyResultId = String(edge._to || '').split('/')[1];
    keyResultIntentCount.set(keyResultId, (keyResultIntentCount.get(keyResultId) || 0) + 1);
  }

  const warnings = [
    ...intents
      .filter((intent) => intent.validation_state !== 'linked')
      .map((intent) => {
        if (intent.validation_state === 'proposed-new-key-result') {
          return {
            id: `proposed-kr:${intent.id}`,
            code: 'intent-proposed-new-key-result',
            level: 'info',
            message: `Intent ${intent.id} has a pending new O/KR proposal instead of an existing key result link.`,
            entity_ids: [intent.id],
          };
        }

        if (intent.validation_state === 'out-of-scope') {
          return {
            id: `out-of-scope:${intent.id}`,
            code: 'intent-out-of-scope',
            level: 'info',
            message: `Intent ${intent.id} is marked outside the current OKR scope.`,
            entity_ids: [intent.id],
          };
        }

        return {
          id: `missing-kr:${intent.id}`,
          code: 'intent-missing-key-result',
          level: 'warning',
          message: `Intent ${intent.id} is not linked to any key result yet.`,
          entity_ids: [intent.id],
        };
      }),
    ...keyResults
      .filter((keyResult) => !keyResultIntentCount.get(keyResult.id))
      .map((keyResult) => ({
        id: `kr-without-intent:${keyResult.id}`,
        code: 'key-result-without-intent',
        level: 'info',
        message: `${keyResult.code} has no intent mapped yet.`,
        entity_ids: [keyResult.id],
      })),
  ];

  const releaseDocs = enrichReleaseDocs(releases, intents);
  const objectiveTree = buildObjectiveTree(objectives, keyResults);

  return {
    checkedAt: workspace?.checked_at || new Date().toISOString(),
    source: {
      seedPath: workspace?.seed_path || null,
      reviewPath: workspace?.review_path || null,
    },
    workspace: {
      id: workspace?.id || 'svfactory',
      title: workspace?.title || 'Planning Workspace',
      description: workspace?.description || '',
      mode: workspace?.mode || 'svfactory-only',
    },
    northStar: {
      id: workspace?.north_star_id || 'north-star',
      title: workspace?.title || 'Planning Workspace',
      description: workspace?.description || '',
    },
    summary: {
      objectives: objectives.length,
      keyResults: keyResults.length,
      intents: intents.length,
      tasks: tasks.length,
      releases: releases.length,
      intentsWithoutKeyResult: intents.filter((intent) => intent.validation_state === 'missing-key-result').length,
      mappedIntents: intents.filter((intent) => intent.validation_state === 'linked').length,
    },
    validation: {
      warnings,
      missingKeyResultIntentIds: intents.filter((intent) => intent.validation_state === 'missing-key-result').map((intent) => intent.id),
    },
    objectives: objectiveTree,
    keyResults,
    intents: intents.map((intent) => ({
      ...intent,
      tasks: tasks.filter((task) => task.intent_id === intent.id),
    })),
    releases: releaseDocs,
    graph: {
      nodes: buildGraphNodes({
        workspace: {
          id: workspace?.id || 'svfactory',
          title: workspace?.title || 'Planning Workspace',
          description: workspace?.description || '',
        },
        objectives,
        keyResults,
        releases: releaseDocs,
        intents,
        tasks,
        warnings,
      }),
      edges: buildGraphEdges(edgesByCollection),
    },
  };
}

async function getPlanningWorkspace(db, { workspaceRoot, forceRefresh = false } = {}) {
  if (forceRefresh) {
    await synchronizePlanningWorkspace(db, { workspaceRoot });
  } else {
    const existing = await fetchAll(db.collection(COLLECTIONS.WORKSPACES)).catch(() => []);
    if (!existing.length) {
      await synchronizePlanningWorkspace(db, { workspaceRoot });
    } else {
      await synchronizePlanningWorkspace(db, { workspaceRoot });
    }
  }
  return readPlanningWorkspaceFromGraph(db);
}

module.exports = {
  getPlanningWorkspace,
  readPlanningWorkspaceFromGraph,
};
