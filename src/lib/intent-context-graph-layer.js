'use strict';

const { aql } = require('arangojs');
const { batchSeed } = require('./batch-seeding');

function normalizeLifecycle(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'unknown';
  if (text === 'closed' || text === 'released') return 'closed';
  if (text === 'archive' || text === 'archived') return 'archived';
  if (text === 'open') return 'backlog';
  return text.replace(/\s+/g, '-');
}

function deriveVersionBucket(intentId) {
  const match = String(intentId || '').match(/^(v\d+(?:-\d+)?)/i);
  return match?.[1]?.toLowerCase() ?? 'legacy';
}

function formatReleaseLineLabel(bucketId) {
  if (bucketId === 'legacy') return 'Legacy';
  return bucketId.replace(/^v(\d+)-(\d+)$/i, 'v$1.$2').toUpperCase();
}

function compactLabel(value, limit = 38) {
  const text = String(value || '').trim();
  if (!text) return 'Untitled';
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

function compactIntentLabel(intentId) {
  return String(intentId || '').replace(/^v/i, 'v').replace(/-/g, '.');
}

function buildEdgeKey(prefix, fromId, toId) {
  return `${prefix}__${fromId}__${toId}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

function buildReleaseCatalog(intents, officialReleaseLines) {
  const releaseMap = new Map();
  for (const releaseLine of officialReleaseLines || []) {
    const id = String(releaseLine?.id || '').toLowerCase();
    if (!id) continue;
    releaseMap.set(id, {
      id,
      label: releaseLine.label || formatReleaseLineLabel(id),
      sources: Array.isArray(releaseLine.sources) ? releaseLine.sources : [],
    });
  }

  for (const intent of intents || []) {
    const bucketId = deriveVersionBucket(intent.id);
    if (!releaseMap.has(bucketId)) {
      releaseMap.set(bucketId, {
        id: bucketId,
        label: formatReleaseLineLabel(bucketId),
        sources: ['computed'],
      });
    }
  }

  return [...releaseMap.values()];
}

function buildIntentGraphProjection({ intents, goalsState, officialReleaseLines }) {
  const releaseCatalog = buildReleaseCatalog(intents, officialReleaseLines);
  const milestoneMap = new Map();
  const releaseToIntentEdges = [];
  const intentToMilestoneEdges = [];
  const intentToGoalEdges = [];
  const milestoneToGoalEdges = [];
  const intentToTaskGoalEdges = [];

  const intentDocs = (intents || []).map((intent) => {
    const bucketId = deriveVersionBucket(intent.id);
    const current = milestoneMap.get(bucketId) ?? {
      _key: bucketId,
      id: bucketId,
      title: bucketId === 'legacy' ? 'Legacy' : bucketId.toUpperCase(),
      label: bucketId === 'legacy' ? 'Legacy' : bucketId.toUpperCase(),
      version_bucket: bucketId,
      status: 'closed',
      kind: 'milestone',
      intent_count: 0,
      extracted_at: new Date().toISOString(),
      projection_source: 'intent-context',
    };

    current.intent_count += 1;
    if (normalizeLifecycle(intent.lifecycle) === 'active') {
      current.status = 'active';
    } else if (normalizeLifecycle(intent.lifecycle) === 'backlog' && current.status !== 'active') {
      current.status = 'backlog';
    }
    milestoneMap.set(bucketId, current);

    const intentGoalRecords = (Array.isArray(goalsState?.goals) ? goalsState.goals : []).filter((goal) => goal.entity_level === 'intent' && goal.entity_id === intent.id);
    const taskGoalRecords = (Array.isArray(goalsState?.goals) ? goalsState.goals : []).filter((goal) => goal.entity_level === 'task' && String(goal.entity_id || '').startsWith(`${intent.id}::`));

    releaseToIntentEdges.push({
      _key: buildEdgeKey('release_intent', bucketId, intent.id),
      _from: `kg_versions/${bucketId}`,
      _to: `kg_intents/${intent.id}`,
      kind: 'release',
      projection_source: 'intent-context',
      extracted_at: new Date().toISOString(),
    });

    intentToMilestoneEdges.push({
      _key: buildEdgeKey('intent_milestone', intent.id, bucketId),
      _from: `kg_intents/${intent.id}`,
      _to: `kg_milestones/${bucketId}`,
      kind: 'has_milestone',
      projection_source: 'intent-context',
      extracted_at: new Date().toISOString(),
    });

    for (const goal of intentGoalRecords) {
      intentToGoalEdges.push({
        _key: buildEdgeKey('intent_goal', intent.id, goal.id),
        _from: `kg_intents/${intent.id}`,
        _to: `kg_goals/${goal.id}`,
        kind: 'implements',
        projection_source: 'intent-context',
        extracted_at: new Date().toISOString(),
      });
    }

    for (const goal of taskGoalRecords) {
      intentToTaskGoalEdges.push({
        _key: buildEdgeKey('intent_task_goal', intent.id, goal.id),
        _from: `kg_intents/${intent.id}`,
        _to: `kg_goals/${goal.id}`,
        kind: 'related_task_goal',
        projection_source: 'intent-context',
        extracted_at: new Date().toISOString(),
      });
    }

    return {
      _key: intent.id,
      id: intent.id,
      title: intent.title,
      status: normalizeLifecycle(intent.lifecycle) === 'active'
        ? 'in_progress'
        : normalizeLifecycle(intent.lifecycle) === 'backlog'
          ? 'open'
          : normalizeLifecycle(intent.lifecycle) === 'archived'
            ? 'archived'
            : 'completed',
      lifecycle: normalizeLifecycle(intent.lifecycle),
      goal_text: intent.goalText ?? intent.goal ?? '',
      priority: intent.priority ?? null,
      version_bucket: bucketId,
      task_count: intent.taskCount ?? 0,
      task_done_count: intent.taskDoneCount ?? 0,
      kind: 'intent',
      projection_source: 'intent-context',
      extracted_at: new Date().toISOString(),
    };
  });

  const milestoneDocs = [...milestoneMap.values()];
  const versionDocs = releaseCatalog.map((releaseLine) => ({
    _key: releaseLine.id,
    id: releaseLine.id,
    number: releaseLine.label,
    title: releaseLine.label,
    status: 'planning',
    kind: 'version',
    sources: releaseLine.sources,
    projection_source: 'intent-context',
    extracted_at: new Date().toISOString(),
  }));

  const goalDocs = (Array.isArray(goalsState?.goals) ? goalsState.goals : []).map((goal) => {
    const status = goal.state === 'active'
      ? 'in_progress'
      : goal.state === 'deprecated'
        ? 'archived'
        : 'open';
    return {
      _key: goal.id,
      id: goal.id,
      title: goal.title,
      description: goal.description || '',
      status,
      state: goal.state || status,
      parent_goal_id: goal.parent_goal_id || null,
      entity_level: goal.entity_level,
      entity_id: goal.entity_id,
      kind: 'goal',
      projection_source: 'goals-state',
      extracted_at: new Date().toISOString(),
      created_at: goal.created_at || new Date().toISOString(),
      updated_at: goal.updated_at || new Date().toISOString(),
    };
  });

  for (const goal of goalDocs.filter((doc) => doc.entity_level === 'milestone')) {
    const bucketId = String(goal.entity_id || '').toLowerCase();
    milestoneToGoalEdges.push({
      _key: buildEdgeKey('milestone_goal', bucketId, goal.id),
      _from: `kg_milestones/${bucketId}`,
      _to: `kg_goals/${goal.id}`,
      kind: 'tracks',
      projection_source: 'intent-context',
      extracted_at: new Date().toISOString(),
    });
  }

  return {
    intentDocs,
    milestoneDocs,
    versionDocs,
    goalDocs,
    edges: {
      releaseToIntentEdges,
      intentToMilestoneEdges,
      intentToGoalEdges,
      milestoneToGoalEdges,
      intentToTaskGoalEdges,
    },
  };
}

async function synchronizeIntentContextGraph(db, projection) {
  const intentCol = db.collection('kg_intents');
  const milestoneCol = db.collection('kg_milestones');
  const versionCol = db.collection('kg_versions');
  const goalCol = db.collection('kg_goals');
  const releasesCol = db.collection('kg_releases');
  const hasMilestoneCol = db.collection('kg_has_milestone');
  const implementsCol = db.collection('kg_implements');
  const relatedCol = db.collection('kg_related_to');

  const intentStats = await batchSeed(intentCol, projection.intentDocs, { overwriteMode: 'update' });
  const milestoneStats = await batchSeed(milestoneCol, projection.milestoneDocs, { overwriteMode: 'update' });
  const versionStats = await batchSeed(versionCol, projection.versionDocs, { overwriteMode: 'update' });
  const goalStats = await batchSeed(goalCol, projection.goalDocs, { overwriteMode: 'update' });

  await batchSeed(releasesCol, projection.edges.releaseToIntentEdges, { overwriteMode: 'update' });
  await batchSeed(hasMilestoneCol, projection.edges.intentToMilestoneEdges, { overwriteMode: 'update' });
  await batchSeed(implementsCol, projection.edges.intentToGoalEdges, { overwriteMode: 'update' });
  await batchSeed(relatedCol, [
    ...projection.edges.milestoneToGoalEdges,
    ...projection.edges.intentToTaskGoalEdges,
  ], { overwriteMode: 'update' });

  return {
    intents: intentStats.total_saved,
    milestones: milestoneStats.total_saved,
    versions: versionStats.total_saved,
    goals: goalStats.total_saved,
  };
}

async function fetchIntentContextFromGraph(db, { id, kind, depth, mode, includeTasks, includeUnlinked, detailsByIntent, focusIntentId, activeIntentId }) {
  if (!['workspace', 'intent', 'milestone', 'release-line', 'goal'].includes(kind)) {
    return null;
  }

  const nodeMap = new Map();
  const edgeMap = new Map();
  const warnings = [];
  const detail = kind === 'intent' ? detailsByIntent?.get(id) ?? null : null;

  function addNode(doc, options = {}) {
    if (!doc) return;
    const collection = String(doc._id || '').split('/')[0];
    const kindMap = {
      kg_intents: 'intent',
      kg_milestones: 'milestone',
      kg_versions: 'release-line',
      kg_goals: 'goal',
    };
    const nodeKind = options.kindOverride || kindMap[collection];
    if (!nodeKind) return;
    const nodeId =
      nodeKind === 'release-line' ? `release:${doc._key}` :
      nodeKind === 'goal' ? `goal:${doc._key}` :
      `${nodeKind}:${doc._key}`;
    const state = doc.lifecycle || doc.state || doc.status || 'unknown';
    const label = doc.title || doc.number || doc.label || doc.id || doc._key;
    const metrics = [];
    if (nodeKind === 'intent') {
      metrics.push(`${doc.task_done_count ?? 0}/${doc.task_count ?? 0} tasks done`);
      if (doc.version_bucket) metrics.push(doc.version_bucket);
    } else if (nodeKind === 'milestone') {
      metrics.push(`${doc.intent_count ?? 0} intents`);
    } else if (nodeKind === 'release-line') {
      metrics.push(Array.isArray(doc.sources) ? `sources ${doc.sources.join(', ')}` : doc.number || '');
    } else if (nodeKind === 'goal') {
      metrics.push(doc.entity_level || 'goal');
      metrics.push(doc.state || doc.status || 'open');
    }

    nodeMap.set(nodeId, {
      id: nodeId,
      kind: nodeKind,
      label,
      shortLabel: nodeKind === 'intent' ? compactIntentLabel(doc._key) : compactLabel(label, 28),
      state,
      entityLevel: nodeKind === 'goal'
        ? doc.entity_level
        : nodeKind === 'milestone'
          ? 'milestone'
          : nodeKind === 'intent'
            ? 'intent'
            : nodeKind === 'workspace'
              ? 'system'
              : undefined,
      entityId: nodeKind === 'release-line' ? doc._key : doc.entity_id || doc._key,
      ownerIntentId: nodeKind === 'intent' ? doc._key : options.ownerIntentId ?? null,
      focus: nodeKind === 'intent' && doc._key === focusIntentId,
      active: nodeKind === 'intent' && doc._key === activeIntentId,
      selected: nodeKind === 'intent' && doc._key === id,
      warning: false,
      detail: doc.goal_text || doc.description || null,
      metrics: metrics.filter(Boolean),
      pathBucket: doc.version_bucket || (nodeKind === 'milestone' ? doc._key : undefined),
      sourceKind: doc.projection_source === 'goals-state' ? 'canonical' : (doc.projection_source || 'canonical'),
    });
  }

  if (kind === 'workspace') {
    nodeMap.set('workspace:svfactory', {
      id: 'workspace:svfactory',
      kind: 'workspace',
      label: 'SVFactory',
      shortLabel: 'SVFactory',
      state: 'active',
      entityLevel: 'system',
      entityId: 'workspace',
      ownerIntentId: null,
      focus: false,
      active: false,
      selected: true,
      warning: false,
      detail: 'Meta-factory operator workspace.',
      metrics: ['knowledge-graph context explorer'],
      pathBucket: undefined,
      sourceKind: 'canonical',
    });

    const versionCursor = await db.query(aql`
      FOR version IN kg_versions
        SORT version._key ASC
        RETURN version
    `);
    const milestoneCursor = await db.query(aql`
      FOR milestone IN kg_milestones
        SORT milestone._key ASC
        RETURN milestone
    `);
    const intentCursor = await db.query(aql`
      FOR intent IN kg_intents
        SORT intent._key ASC
        RETURN intent
    `);
    const goalCursor = await db.query(aql`
      FOR goal IN kg_goals
        FILTER ${includeTasks} ? true : goal.entity_level != 'task'
        SORT goal._key ASC
        RETURN goal
    `);
    const releaseEdgeCursor = await db.query(aql`
      FOR edge IN kg_releases
        RETURN edge
    `);
    const milestoneEdgeCursor = await db.query(aql`
      FOR edge IN kg_has_milestone
        RETURN edge
    `);
    const implementsEdgeCursor = await db.query(aql`
      FOR edge IN kg_implements
        RETURN edge
    `);
    const relatedEdgeCursor = await db.query(aql`
      FOR edge IN kg_related_to
        RETURN edge
    `);

    const versions = await versionCursor.all();
    const milestones = await milestoneCursor.all();
    const intents = await intentCursor.all();
    const goals = await goalCursor.all();
    const releaseEdges = await releaseEdgeCursor.all();
    const milestoneEdges = await milestoneEdgeCursor.all();
    const implementsEdges = await implementsEdgeCursor.all();
    const relatedEdges = await relatedEdgeCursor.all();

    const linkedIntentKeys = new Set(implementsEdges.map((edge) => String(edge._from || '').split('/')[1]).filter(Boolean));

    for (const version of versions) {
      addNode(version);
      edgeMap.set(`workspace_release_${version._key}`, {
        id: `workspace_release_${version._key}`,
        source: 'workspace:svfactory',
        target: `release:${version._key}`,
        kind: 'contains',
        emphasis: 'normal',
        sourceKind: 'canonical',
      });
    }

    const milestoneKeysByVersion = new Map();
    for (const edge of releaseEdges) {
      const versionKey = String(edge._from || '').split('/')[1];
      const intentKey = String(edge._to || '').split('/')[1];
      const intentDoc = intents.find((candidate) => candidate._key === intentKey);
      if (!versionKey || !intentDoc?.version_bucket) continue;
      const next = milestoneKeysByVersion.get(versionKey) ?? new Set();
      next.add(intentDoc.version_bucket);
      milestoneKeysByVersion.set(versionKey, next);
    }

    for (const milestone of milestones) {
      const milestoneIntentLinked = intents.some((intentDoc) => intentDoc.version_bucket === milestone._key);
      if (!includeUnlinked && !milestoneIntentLinked) continue;
      addNode(milestone);
    }

    for (const intentDoc of intents) {
      const isLinked = linkedIntentKeys.has(intentDoc._key);
      if (!includeUnlinked && !isLinked) continue;
      addNode(intentDoc);
    }

    for (const goal of goals) {
      addNode(goal);
    }

    const allEdgeRows = [
      ...releaseEdges.map((edge) => ({ edge })),
      ...milestoneEdges.map((edge) => ({ edge })),
      ...implementsEdges.map((edge) => ({ edge })),
      ...relatedEdges.map((edge) => ({ edge })),
    ];

    for (const row of allEdgeRows) {
      const edge = row.edge;
      if (!edge?._from || !edge?._to) continue;
      const fromCollection = String(edge._from).split('/')[0];
      const toCollection = String(edge._to).split('/')[0];
      const fromKey = String(edge._from).split('/')[1];
      const toKey = String(edge._to).split('/')[1];
      const kindMap = {
        kg_intents: 'intent',
        kg_milestones: 'milestone',
        kg_versions: 'release-line',
        kg_goals: 'goal',
      };
      const edgeKindMap = {
        kg_has_milestone: 'contains',
        kg_releases: 'belongs-to-release',
        kg_implements: 'tracks',
        kg_related_to: 'tracks',
      };
      const sourceKind = kindMap[fromCollection];
      const targetKind = kindMap[toCollection];
      if (!sourceKind || !targetKind) continue;
      const sourceNodeId = sourceKind === 'release-line' ? `release:${fromKey}` : sourceKind === 'goal' ? `goal:${fromKey}` : `${sourceKind}:${fromKey}`;
      const targetNodeId = targetKind === 'release-line' ? `release:${toKey}` : targetKind === 'goal' ? `goal:${toKey}` : `${targetKind}:${toKey}`;
      if (!nodeMap.has(sourceNodeId) || !nodeMap.has(targetNodeId)) continue;
      edgeMap.set(edge._key || `${sourceNodeId}->${targetNodeId}`, {
        id: edge._key || `${sourceNodeId}->${targetNodeId}`,
        source: sourceNodeId,
        target: targetNodeId,
        kind: edgeKindMap[String(edge._id).split('/')[0]] || 'contains',
        emphasis: sourceNodeId === `intent:${focusIntentId}` || targetNodeId === `intent:${focusIntentId}` ? 'focus' : 'normal',
        sourceKind: edge.projection_source || 'canonical',
      });
    }

    for (const goal of goals.filter((doc) => doc.parent_goal_id)) {
      const childNodeId = `goal:${goal._key}`;
      const parentNodeId = `goal:${goal.parent_goal_id}`;
      if (!nodeMap.has(childNodeId) || !nodeMap.has(parentNodeId)) continue;
      edgeMap.set(`goal_parent_${goal.parent_goal_id}_${goal._key}`, {
        id: `goal_parent_${goal.parent_goal_id}_${goal._key}`,
        source: parentNodeId,
        target: childNodeId,
        kind: 'sub-goal',
        emphasis: 'normal',
        sourceKind: 'canonical',
      });
    }

    if (includeTasks) {
      for (const [intentId, intentDetail] of detailsByIntent?.entries() ?? []) {
        if (!nodeMap.has(`intent:${intentId}`) || !Array.isArray(intentDetail?.tasks) || !intentDetail.tasks.length) continue;
        for (const [index, task] of intentDetail.tasks.entries()) {
          const taskId = `task:${intentId}:${index}`;
          nodeMap.set(taskId, {
            id: taskId,
            kind: 'task',
            label: task.title || task.text || `Task ${index + 1}`,
            shortLabel: compactLabel(task.title || task.text || `Task ${index + 1}`, 28),
            state: task.status || 'open',
            entityLevel: 'task',
            entityId: `${intentId}:${index}`,
            ownerIntentId: intentId,
            detail: task.description || task.text || null,
            metrics: [task.section ? `section ${task.section}` : '', task.source ? `source ${task.source}` : ''].filter(Boolean),
            sourceKind: 'derived-task',
            warning: false,
          });
          edgeMap.set(`task_contains_${intentId}_${index}`, {
            id: `task_contains_${intentId}_${index}`,
            source: `intent:${intentId}`,
            target: taskId,
            kind: 'contains',
            emphasis: 'normal',
            sourceKind: 'derived-task',
          });
        }
      }
    }

    for (const intentDoc of intents) {
      if (!includeUnlinked && !linkedIntentKeys.has(intentDoc._key)) continue;
      if (!linkedIntentKeys.has(intentDoc._key) && nodeMap.has(`intent:${intentDoc._key}`)) {
        warnings.push({
          id: `intent-missing-goal:${intentDoc._key}`,
          code: 'intent-missing-goal',
          level: 'warning',
          message: `Intent ${intentDoc._key} has no linked goal nodes in the graph projection.`,
          nodeIds: [`intent:${intentDoc._key}`],
        });
      }
    }

    const nodes = [...nodeMap.values()];
    const edges = [...edgeMap.values()].filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target));
    const linkedIntents = nodes.filter((node) => node.kind === 'intent' && linkedIntentKeys.has(node.entityId || '')).length;
    const unlinkedIntents = nodes.filter((node) => node.kind === 'intent' && !linkedIntentKeys.has(node.entityId || '')).length;

    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      center: {
        id: 'workspace:svfactory',
        kind: 'workspace',
      },
      query: {
        id,
        kind,
        depth,
        mode,
        include_tasks: includeTasks,
        include_unlinked: includeUnlinked,
      },
      nodes,
      edges,
      warnings,
      summary: {
        releaseLines: nodes.filter((node) => node.kind === 'release-line').length,
        milestones: nodes.filter((node) => node.kind === 'milestone').length,
        intents: nodes.filter((node) => node.kind === 'intent').length,
        tasks: nodes.filter((node) => node.kind === 'task').length,
        goals: nodes.filter((node) => node.kind === 'goal').length,
        warnings: warnings.length,
        linkedIntents,
        unlinkedIntents,
        focusIntentId: focusIntentId ?? null,
        activeIntentId: activeIntentId ?? null,
      },
      focusNodeId: focusIntentId ? `intent:${focusIntentId}` : null,
      defaultMode: mode,
      sources: {
        intent: 'knowledge-graph+filesystem-projection',
        goals: 'knowledge-graph+goals-state-projection',
        milestones: 'knowledge-graph+official-pack',
        releaseLines: 'knowledge-graph+official-pack',
        tasks: 'intent-markdown-derived',
      },
    };
  }

  const centerVertexId =
    kind === 'intent' ? `kg_intents/${id}` :
    kind === 'milestone' ? `kg_milestones/${id}` :
    kind === 'release-line' ? `kg_versions/${id}` :
    `kg_goals/${id}`;

  const existenceCursor = await db.query(aql`
    RETURN DOCUMENT(${centerVertexId})
  `);
  const [centerDoc] = await existenceCursor.all();
  if (!centerDoc) {
    return null;
  }

  const maxDepth = Math.max(1, Math.min(4, Number(depth || 1) + (mode === 'full' ? 1 : 0)));
  const neighborhoodCursor = await db.query(aql`
    FOR vertex, edge, path IN 0..${maxDepth} ANY ${centerVertexId} GRAPH "knowledge_graph"
      RETURN DISTINCT {
        vertex,
        edge,
        distance: LENGTH(path.edges)
      }
  `);
  const neighborhoodRows = await neighborhoodCursor.all();

  for (const row of neighborhoodRows) {
    addNode(row.vertex);
    const edge = row.edge;
    if (!edge?._from || !edge?._to) continue;
    const fromCollection = String(edge._from).split('/')[0];
    const toCollection = String(edge._to).split('/')[0];
    const fromKey = String(edge._from).split('/')[1];
    const toKey = String(edge._to).split('/')[1];
    const kindMap = {
      kg_intents: 'intent',
      kg_milestones: 'milestone',
      kg_versions: 'release-line',
      kg_goals: 'goal',
    };
    const edgeKindMap = {
      kg_has_milestone: 'contains',
      kg_releases: 'belongs-to-release',
      kg_implements: 'tracks',
      kg_related_to: 'tracks',
    };
    const sourceNodeId = kindMap[fromCollection] === 'release-line' ? `release:${fromKey}` : kindMap[fromCollection] === 'goal' ? `goal:${fromKey}` : `${kindMap[fromCollection]}:${fromKey}`;
    const targetNodeId = kindMap[toCollection] === 'release-line' ? `release:${toKey}` : kindMap[toCollection] === 'goal' ? `goal:${toKey}` : `${kindMap[toCollection]}:${toKey}`;
    if (!kindMap[fromCollection] || !kindMap[toCollection]) continue;
    edgeMap.set(edge._key || `${sourceNodeId}->${targetNodeId}`, {
      id: edge._key || `${sourceNodeId}->${targetNodeId}`,
      source: edgeKindMap[String(edge._id).split('/')[0]] === 'belongs-to-release' ? sourceNodeId : sourceNodeId,
      target: targetNodeId,
      kind: edgeKindMap[String(edge._id).split('/')[0]] || 'contains',
      emphasis: sourceNodeId === `intent:${focusIntentId}` || targetNodeId === `intent:${focusIntentId}` ? 'focus' : 'normal',
      sourceKind: edge.projection_source || 'canonical',
    });
  }

  const goalDocs = [...nodeMap.values()].filter((node) => node.kind === 'goal');
  const parentIds = new Set(goalDocs.map((node) => node.entityId).filter(Boolean));
  if (parentIds.size > 0) {
    const parentCursor = await db.query(aql`
      FOR goal IN kg_goals
        FILTER goal._key IN ${[...parentIds]}
        FILTER goal.parent_goal_id != null
        RETURN {
          id: goal._key,
          parent_goal_id: goal.parent_goal_id
        }
    `);
    const parentRows = await parentCursor.all();
    for (const row of parentRows) {
      const parentDocCursor = await db.query(aql`RETURN DOCUMENT(CONCAT('kg_goals/', ${row.parent_goal_id}))`);
      const [parentDoc] = await parentDocCursor.all();
      if (!parentDoc) continue;
      addNode(parentDoc);
      edgeMap.set(`goal_parent_${row.parent_goal_id}_${row.id}`, {
        id: `goal_parent_${row.parent_goal_id}_${row.id}`,
        source: `goal:${row.parent_goal_id}`,
        target: `goal:${row.id}`,
        kind: 'sub-goal',
        emphasis: 'normal',
        sourceKind: 'canonical',
      });
    }
  }

  if (kind === 'intent' && includeTasks && detail?.tasks?.length) {
    for (const [index, task] of detail.tasks.entries()) {
      const taskId = `task:${id}:${index}`;
      nodeMap.set(taskId, {
        id: taskId,
        kind: 'task',
        label: task.title || task.text || `Task ${index + 1}`,
        shortLabel: compactLabel(task.title || task.text || `Task ${index + 1}`, 28),
        state: task.status || 'open',
        entityLevel: 'task',
        entityId: `${id}:${index}`,
        ownerIntentId: id,
        detail: task.description || task.text || null,
        metrics: [task.section ? `section ${task.section}` : '', task.source ? `source ${task.source}` : ''].filter(Boolean),
        sourceKind: 'derived-task',
        warning: false,
      });
      edgeMap.set(`task_contains_${id}_${index}`, {
        id: `task_contains_${id}_${index}`,
        source: `intent:${id}`,
        target: taskId,
        kind: 'contains',
        emphasis: 'normal',
        sourceKind: 'derived-task',
      });
    }
  }

  if (kind === 'intent' && ![...nodeMap.values()].some((node) => node.kind === 'goal' && node.ownerIntentId === id)) {
    warnings.push({
      id: 'intent-missing-goal:graph',
      code: 'intent-missing-goal',
      level: 'warning',
      message: `Intent ${id} has no linked goal nodes in the graph projection.`,
      nodeIds: [`intent:${id}`],
    });
  }

  const nodes = [...nodeMap.values()];
  const edges = [...edgeMap.values()].filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target));
  const linkedIntents = nodes.filter((node) => node.kind === 'intent' && node.sourceKind !== 'projected').length;
  const unlinkedIntents = nodes.filter((node) => node.kind === 'intent' && node.sourceKind === 'projected').length;

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    center: {
      id: kind === 'release-line' ? `release:${id}` : kind === 'goal' ? `goal:${id}` : `${kind}:${id}`,
      kind,
    },
    query: {
      id,
      kind,
      depth,
      mode,
      include_tasks: includeTasks,
      include_unlinked: includeUnlinked,
    },
    nodes,
    edges,
    warnings,
    summary: {
      releaseLines: nodes.filter((node) => node.kind === 'release-line').length,
      milestones: nodes.filter((node) => node.kind === 'milestone').length,
      intents: nodes.filter((node) => node.kind === 'intent').length,
      tasks: nodes.filter((node) => node.kind === 'task').length,
      goals: nodes.filter((node) => node.kind === 'goal').length,
      warnings: warnings.length,
      linkedIntents,
      unlinkedIntents,
      focusIntentId: focusIntentId ?? null,
      activeIntentId: activeIntentId ?? null,
    },
    focusNodeId: focusIntentId ? `intent:${focusIntentId}` : null,
    defaultMode: kind === 'intent' && focusIntentId ? 'focus' : mode,
    sources: {
      intent: 'knowledge-graph+filesystem-projection',
      goals: 'knowledge-graph+goals-state-projection',
      milestones: 'knowledge-graph+official-pack',
      releaseLines: 'knowledge-graph+official-pack',
      tasks: 'intent-markdown-derived',
    },
  };
}

module.exports = {
  buildIntentGraphProjection,
  synchronizeIntentContextGraph,
  fetchIntentContextFromGraph,
  deriveVersionBucket,
};
