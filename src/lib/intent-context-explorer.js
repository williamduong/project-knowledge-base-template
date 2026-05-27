'use strict';

function normalizeLifecycle(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'unknown';
  if (text === 'closed' || text === 'released') return 'closed';
  if (text === 'archive' || text === 'archived') return 'archived';
  if (text === 'open') return 'backlog';
  return text.replace(/\s+/g, '-');
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

function deriveVersionBucket(intentId) {
  const match = String(intentId || '').match(/^(v\d+(?:-\d+)?)/i);
  return match?.[1]?.toLowerCase() ?? 'legacy';
}

function versionRank(versionId) {
  const numbers = String(versionId || '')
    .replace(/^v/i, '')
    .split('-')
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
  return numbers.reduce((accumulator, value, index) => accumulator + value / 10 ** (index * 2), 0);
}

function formatReleaseLineLabel(bucketId) {
  if (bucketId === 'legacy') return 'Legacy';
  return bucketId.replace(/^v(\d+)-(\d+)$/i, 'v$1.$2').toUpperCase();
}

function rootNodeId() {
  return 'workspace:svfactory';
}

function entityNodeId(entityLevel, entityId) {
  return `${entityLevel}:${entityId}`;
}

function goalNodeId(goalId) {
  return `goal:${goalId}`;
}

function releaseLineNodeId(releaseId) {
  return `release:${releaseId}`;
}

function createNodeBase(input) {
  return {
    ...input,
    metrics: Array.isArray(input.metrics) ? input.metrics : [],
  };
}

function pushUniqueNode(map, node) {
  if (!map.has(node.id)) {
    map.set(node.id, node);
    return;
  }

  const current = map.get(node.id);
  map.set(node.id, {
    ...current,
    ...node,
    metrics: [...new Set([...(current.metrics || []), ...(node.metrics || [])])],
    warning: Boolean(current.warning || node.warning),
    focus: Boolean(current.focus || node.focus),
    active: Boolean(current.active || node.active),
    selected: Boolean(current.selected || node.selected),
  });
}

function pushUniqueEdge(edges, edge) {
  if (!edges.has(edge.id)) {
    edges.set(edge.id, edge);
  }
}

function sortNodes(a, b) {
  const kindOrder = {
    workspace: 0,
    'release-line': 1,
    milestone: 2,
    intent: 3,
    task: 4,
    goal: 5,
  };
  const orderDiff = kindOrder[a.kind] - kindOrder[b.kind];
  if (orderDiff !== 0) return orderDiff;
  if (a.pathBucket && b.pathBucket && a.pathBucket !== b.pathBucket) {
    return a.pathBucket.localeCompare(b.pathBucket);
  }
  return a.label.localeCompare(b.label);
}

function buildReleaseLineCatalog(intents, goalsTree, officialReleaseLines) {
  const bucketIds = new Set();
  for (const intent of intents || []) {
    bucketIds.add(deriveVersionBucket(intent.id));
  }
  if (goalsTree?.children) {
    for (const milestone of goalsTree.children) {
      if (milestone?.entityLevel === 'milestone' && milestone.entityId) {
        bucketIds.add(String(milestone.entityId).toLowerCase());
      }
    }
  }
  for (const releaseLine of officialReleaseLines || []) {
    if (releaseLine?.id) {
      bucketIds.add(String(releaseLine.id).toLowerCase());
    }
  }

  const intentCounts = new Map();
  for (const intent of intents || []) {
    const bucketId = deriveVersionBucket(intent.id);
    intentCounts.set(bucketId, (intentCounts.get(bucketId) ?? 0) + 1);
  }

  return [...bucketIds]
    .sort((left, right) => versionRank(left) - versionRank(right))
    .map((bucketId) => {
      const official = (officialReleaseLines || []).find((item) => String(item.id || '').toLowerCase() === bucketId) ?? null;
      return {
        id: bucketId,
        label: official?.label || formatReleaseLineLabel(bucketId),
        intentCount: intentCounts.get(bucketId) ?? 0,
        summary: official?.sources?.length
          ? `Sources: ${official.sources.join(', ')}`
          : 'No release metadata registered yet.',
        sourceKind: official ? 'official' : 'computed',
      };
    });
}

function createEmptyGraph(query, center) {
  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    center,
    query,
    nodes: [],
    edges: [],
    warnings: [],
    summary: {
      releaseLines: 0,
      milestones: 0,
      intents: 0,
      tasks: 0,
      goals: 0,
      warnings: 0,
      linkedIntents: 0,
      unlinkedIntents: 0,
      focusIntentId: null,
      activeIntentId: null,
    },
    focusNodeId: null,
    defaultMode: query.mode,
    sources: {
      intent: 'filesystem',
      goals: 'goals-state-db+graph-seed',
      milestones: 'goal-ownership+official-pack',
      releaseLines: 'official-pack',
      tasks: 'intent-markdown-derived',
    },
  };
}

function buildFullGraph({
  intents,
  goalsTree,
  goalsSummary,
  focusIntentId,
  activeIntentId,
  selectedIntentId,
  detailsByIntent,
  officialReleaseLines,
}) {
  const nodes = new Map();
  const edges = new Map();
  const warnings = [];
  const goalNodeMap = new Map();
  const linkedIntentIds = new Set();
  const releaseCatalog = buildReleaseLineCatalog(intents, goalsTree, officialReleaseLines);
  const releaseLineIds = new Set(releaseCatalog.map((item) => item.id));

  function registerWarnings(code, level, message, nodeIds) {
    warnings.push({
      id: `${code}:${warnings.length}`,
      code,
      level,
      message,
      nodeIds,
    });
    for (const nodeId of nodeIds) {
      const current = nodes.get(nodeId);
      if (current) {
        nodes.set(nodeId, { ...current, warning: true });
      }
    }
  }

  pushUniqueNode(nodes, createNodeBase({
    id: rootNodeId(),
    kind: 'workspace',
    label: 'SVFactory',
    shortLabel: 'SVFactory',
    state: 'system',
    entityLevel: 'system',
    entityId: 'workspace',
    metrics: [
      `${goalsSummary?.totalGoals ?? 0} tracked goals`,
      `${intents.length} intents in registry`,
    ],
    detail: 'SVFactory operating graph root.',
    sourceKind: 'canonical',
  }));

  for (const releaseLine of releaseCatalog) {
    pushUniqueNode(nodes, createNodeBase({
      id: releaseLineNodeId(releaseLine.id),
      kind: 'release-line',
      label: releaseLine.label,
      shortLabel: releaseLine.label,
      state: releaseLine.intentCount > 0 ? 'active' : 'planned',
      pathBucket: releaseLine.id,
      metrics: [
        `${releaseLine.intentCount} intents`,
      ],
      detail: releaseLine.summary,
      sourceKind: releaseLine.sourceKind,
    }));
    pushUniqueEdge(edges, {
      id: `${rootNodeId()}->${releaseLineNodeId(releaseLine.id)}:contains`,
      source: rootNodeId(),
      target: releaseLineNodeId(releaseLine.id),
      kind: 'contains',
      sourceKind: 'computed',
    });

    if (releaseLine.intentCount === 0) {
      registerWarnings(
        'release-without-intents',
        'info',
        `Release line ${releaseLine.label} currently has no intent nodes.`,
        [releaseLineNodeId(releaseLine.id)],
      );
    }
  }

  function addGoalRecordNodes(ownerNodeId, goalRecords, ownerIntentId) {
    for (const goalRecord of goalRecords || []) {
      const goalId = goalNodeId(goalRecord.id);
      goalNodeMap.set(goalRecord.id, goalRecord);
      pushUniqueNode(nodes, createNodeBase({
        id: goalId,
        kind: 'goal',
        label: goalRecord.title,
        shortLabel: compactLabel(goalRecord.title, 26),
        state: goalRecord.state,
        entityLevel: goalRecord.entityLevel,
        entityId: goalRecord.entityId,
        ownerIntentId,
        metrics: [goalRecord.entityLevel, goalRecord.state],
        detail: goalRecord.description,
        sourceKind: 'canonical',
      }));
      pushUniqueEdge(edges, {
        id: `${ownerNodeId}->${goalId}:tracks`,
        source: ownerNodeId,
        target: goalId,
        kind: 'tracks',
        sourceKind: 'canonical',
      });
    }
  }

  function walkTree(node, parentNodeId, ownerIntentId) {
    const nodeId = node.entityLevel === 'system' && node.entityId === 'workspace'
      ? rootNodeId()
      : entityNodeId(node.entityLevel, node.entityId);
    const existingIntent = node.entityLevel === 'intent'
      ? intents.find((intent) => intent.id === node.entityId) ?? null
      : null;
    const detail = node.entityLevel === 'intent' ? detailsByIntent.get(node.entityId) ?? null : null;
    const nextOwnerIntentId = node.entityLevel === 'intent' ? node.entityId : ownerIntentId;
    const releaseBucket = node.entityLevel === 'milestone'
      ? String(node.entityId || '').toLowerCase()
      : node.entityLevel === 'intent'
        ? deriveVersionBucket(node.entityId)
        : undefined;

    pushUniqueNode(nodes, createNodeBase({
      id: nodeId,
      kind: node.entityLevel === 'system'
        ? 'workspace'
        : node.entityLevel === 'milestone'
          ? 'milestone'
          : node.entityLevel === 'intent'
            ? 'intent'
            : 'task',
      label: node.label,
      shortLabel: node.entityLevel === 'intent' ? compactIntentLabel(node.entityId) : compactLabel(node.label, 28),
      state: existingIntent ? normalizeLifecycle(existingIntent.lifecycle) : node.runtimeState,
      entityLevel: node.entityLevel,
      entityId: node.entityId,
      ownerIntentId: nextOwnerIntentId,
      focus: node.entityLevel === 'intent' && node.entityId === focusIntentId,
      active: node.entityLevel === 'intent' && node.entityId === activeIntentId,
      selected: node.entityLevel === 'intent' && node.entityId === selectedIntentId,
      pathBucket: releaseBucket,
      metrics: [
        node.status.label,
        `${(node.goals || []).length} goals`,
        node.entityLevel === 'intent' && existingIntent?.taskCount != null
          ? `${existingIntent.taskCount} tasks`
          : `${(node.children || []).length} children`,
      ].filter(Boolean),
      detail: detail?.focusCurrent ?? node.summary ?? existingIntent?.goalText ?? null,
      sourceKind: node.entityLevel === 'task' ? 'derived-task' : 'canonical',
    }));

    if (node.entityLevel === 'intent') {
      linkedIntentIds.add(node.entityId);
    }

    if (parentNodeId && parentNodeId !== nodeId) {
      pushUniqueEdge(edges, {
        id: `${parentNodeId}->${nodeId}:contains`,
        source: parentNodeId,
        target: nodeId,
        kind: 'contains',
        emphasis: node.entityLevel === 'intent' && (node.entityId === focusIntentId || node.entityId === activeIntentId) ? 'focus' : 'normal',
        sourceKind: 'canonical',
      });
    }

    if (node.entityLevel === 'milestone' && releaseBucket && releaseLineIds.has(releaseBucket)) {
      pushUniqueEdge(edges, {
        id: `${releaseLineNodeId(releaseBucket)}->${nodeId}:belongs-to-release`,
        source: releaseLineNodeId(releaseBucket),
        target: nodeId,
        kind: 'belongs-to-release',
        sourceKind: 'computed',
      });
    }

    addGoalRecordNodes(nodeId, node.goals, nextOwnerIntentId);

    if (node.entityLevel === 'milestone' && node.status.code === 'missing-goals') {
      registerWarnings(
        'milestone-missing-coverage',
        'warning',
        `Milestone ${node.label} still has no complete goal coverage.`,
        [nodeId],
      );
    }

    if (node.entityLevel === 'task') {
      if (node.status.code === 'missing-goals') {
        registerWarnings(
          'task-missing-goal',
          'warning',
          `Task ${node.label} is visible in the flow but has no goal coverage yet.`,
          [nodeId],
        );
      } else if (node.status.code === 'outside-main') {
        registerWarnings(
          'task-outside-main',
          'info',
          `Task ${node.label} is outside the main goal tree path.`,
          [nodeId],
        );
      }
    }

    for (const child of node.children || []) {
      walkTree(child, nodeId, nextOwnerIntentId);
    }
  }

  if (goalsTree) {
    walkTree(goalsTree, null, null);
  }

  for (const goalRecord of goalNodeMap.values()) {
    if (!goalRecord.parentGoalId) continue;
    const parentGoal = goalNodeMap.get(goalRecord.parentGoalId);
    if (!parentGoal) continue;
    pushUniqueEdge(edges, {
      id: `${goalNodeId(parentGoal.id)}->${goalNodeId(goalRecord.id)}:sub-goal`,
      source: goalNodeId(parentGoal.id),
      target: goalNodeId(goalRecord.id),
      kind: 'sub-goal',
      sourceKind: 'canonical',
    });
  }

  for (const intent of intents || []) {
    const intentNodeId = entityNodeId('intent', intent.id);
    const releaseBucket = deriveVersionBucket(intent.id);
    const currentNode = nodes.get(intentNodeId);
    const detail = detailsByIntent.get(intent.id) ?? null;
    if (currentNode) {
      pushUniqueNode(nodes, {
        ...currentNode,
        label: intent.title,
        shortLabel: compactIntentLabel(intent.id),
        state: normalizeLifecycle(intent.lifecycle),
        focus: currentNode.focus || intent.id === focusIntentId,
        active: currentNode.active || intent.id === activeIntentId,
        selected: currentNode.selected || intent.id === selectedIntentId,
        detail: intent.goalText ?? detail?.goalText ?? currentNode.detail,
        metrics: [...new Set([
          ...currentNode.metrics,
          `${intent.taskDoneCount ?? 0}/${intent.taskCount ?? 0} tasks done`,
          intent.chaosEstimate?.projectedScore != null ? `chaos ${intent.chaosEstimate.projectedScore}` : '',
        ].filter(Boolean))],
      });
      continue;
    }

    pushUniqueNode(nodes, createNodeBase({
      id: intentNodeId,
      kind: 'intent',
      label: intent.title,
      shortLabel: compactIntentLabel(intent.id),
      state: normalizeLifecycle(intent.lifecycle),
      entityLevel: 'intent',
      entityId: intent.id,
      ownerIntentId: intent.id,
      focus: intent.id === focusIntentId,
      active: intent.id === activeIntentId,
      selected: intent.id === selectedIntentId,
      warning: true,
      pathBucket: releaseBucket,
      metrics: [
        `${intent.taskDoneCount ?? 0}/${intent.taskCount ?? 0} tasks done`,
        intent.goalText ? 'goal text present' : 'missing goal text',
      ],
      detail: intent.goalText ?? intent.goal ?? detail?.summary ?? 'Intent exists in the registry but is not linked into the goal tree.',
      sourceKind: 'projected',
    }));
    pushUniqueEdge(edges, {
      id: `${releaseLineNodeId(releaseBucket)}->${intentNodeId}:projected-intent`,
      source: releaseLineIds.has(releaseBucket) ? releaseLineNodeId(releaseBucket) : rootNodeId(),
      target: intentNodeId,
      kind: 'projected-intent',
      emphasis: 'warning',
      sourceKind: 'computed',
    });
    registerWarnings(
      'intent-missing-goal',
      'warning',
      `Intent ${intent.id} is visible in the registry but not linked into the current goal tree.`,
      [intentNodeId],
    );
  }

  if (focusIntentId && !nodes.has(entityNodeId('intent', focusIntentId))) {
    registerWarnings(
      'focus-intent-missing',
      'warning',
      `Focus intent ${focusIntentId} is not visible in the current alignment graph.`,
      [rootNodeId()],
    );
  }

  for (const [intentId, detail] of detailsByIntent.entries()) {
    if (!detail?.tasks?.length) continue;
    for (const task of detail.tasks) {
      const matchingTaskNode = [...nodes.values()].find((node) =>
        node.kind === 'task' &&
        node.ownerIntentId === intentId &&
        (node.label === task.title || node.shortLabel === compactLabel(task.title, 28))
      );
      if (!matchingTaskNode) continue;
      pushUniqueNode(nodes, {
        ...matchingTaskNode,
        detail: task.description ?? task.text ?? matchingTaskNode.detail,
        metrics: [...new Set([
          ...matchingTaskNode.metrics,
          task.section ? `section ${task.section}` : '',
          task.source ? `source ${task.source}` : '',
        ].filter(Boolean))],
      });
    }
  }

  const nodeList = [...nodes.values()].sort(sortNodes);
  const edgeList = [...edges.values()];
  const focusNodeId = focusIntentId ? entityNodeId('intent', focusIntentId) : null;

  return {
    nodes: nodeList,
    edges: edgeList,
    warnings,
    focusNodeId,
    defaultMode: focusNodeId ? 'focus' : 'alignment',
    summary: {
      releaseLines: nodeList.filter((node) => node.kind === 'release-line').length,
      milestones: nodeList.filter((node) => node.kind === 'milestone').length,
      intents: nodeList.filter((node) => node.kind === 'intent').length,
      tasks: nodeList.filter((node) => node.kind === 'task').length,
      goals: nodeList.filter((node) => node.kind === 'goal').length,
      warnings: warnings.length,
      linkedIntents: linkedIntentIds.size,
      unlinkedIntents: Math.max(0, intents.length - linkedIntentIds.size),
      focusIntentId: focusIntentId ?? null,
      activeIntentId: activeIntentId ?? null,
    },
  };
}

function inferNodeKind(id, nodes) {
  const match = nodes.find((node) => node.id === id);
  if (match) return match.kind;
  if (String(id).startsWith('intent:')) return 'intent';
  if (String(id).startsWith('milestone:')) return 'milestone';
  if (String(id).startsWith('release:')) return 'release-line';
  if (String(id).startsWith('goal:')) return 'goal';
  if (String(id).startsWith('task:')) return 'task';
  return 'workspace';
}

function normalizeCenterNodeId(query, fullGraph) {
  const rawKind = query.kind || 'intent';
  if (query.id === 'workspace') return rootNodeId();
  if (query.id.includes(':')) return query.id;
  if (rawKind === 'goal') return goalNodeId(query.id);
  if (rawKind === 'release-line') return releaseLineNodeId(query.id);
  if (rawKind === 'workspace') return rootNodeId();
  return entityNodeId(rawKind, query.id);
}

function buildVisibleContext(fullGraph, query) {
  let candidateNodes = fullGraph.nodes;
  if (!query.include_tasks) {
    candidateNodes = candidateNodes.filter((node) => node.kind !== 'task');
  }
  if (!query.include_unlinked) {
    candidateNodes = candidateNodes.filter((node) => !(node.kind === 'intent' && node.sourceKind === 'projected'));
  }

  const nodeMap = new Map(candidateNodes.map((node) => [node.id, node]));
  const candidateNodeIds = new Set(candidateNodes.map((node) => node.id));
  const candidateEdges = fullGraph.edges.filter((edge) => candidateNodeIds.has(edge.source) && candidateNodeIds.has(edge.target));

  const centerId = normalizeCenterNodeId(query, candidateNodes);
  if (query.mode === 'full' || !nodeMap.has(centerId)) {
    return {
      centerId: nodeMap.has(centerId) ? centerId : rootNodeId(),
      nodes: candidateNodes,
      edges: candidateEdges,
    };
  }

  const adjacency = new Map();
  for (const node of candidateNodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of candidateEdges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const visited = new Set();
  const queue = [{ id: centerId, depth: 0 }];
  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current.id) || current.depth > query.depth) {
      continue;
    }
    visited.add(current.id);
    for (const next of adjacency.get(current.id) ?? []) {
      queue.push({ id: next, depth: current.depth + 1 });
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of candidateEdges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) continue;

      if (edge.kind === 'contains' && visited.has(edge.target) && ['workspace', 'release-line', 'milestone'].includes(sourceNode.kind) && !visited.has(edge.source)) {
        visited.add(edge.source);
        changed = true;
      }
      if (edge.kind === 'belongs-to-release' && visited.has(edge.target) && sourceNode.kind === 'release-line' && !visited.has(edge.source)) {
        visited.add(edge.source);
        changed = true;
      }
      if (edge.kind === 'tracks' && visited.has(edge.source) && targetNode.kind === 'goal' && !visited.has(edge.target)) {
        visited.add(edge.target);
        changed = true;
      }
      if (edge.kind === 'sub-goal' && visited.has(edge.target) && !visited.has(edge.source)) {
        visited.add(edge.source);
        changed = true;
      }
    }
  }

  const nodes = candidateNodes.filter((node) => visited.has(node.id));
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = candidateEdges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));

  return {
    centerId,
    nodes,
    edges,
  };
}

function summarizeVisibleGraph(nodes, warnings, focusIntentId, activeIntentId) {
  const linkedIntents = nodes.filter((node) => node.kind === 'intent' && node.sourceKind !== 'projected').length;
  const unlinkedIntents = nodes.filter((node) => node.kind === 'intent' && node.sourceKind === 'projected').length;
  return {
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
  };
}

function buildIntentContextExplorer({
  query,
  intents,
  goalsTree,
  goalsSummary,
  focusIntentId,
  activeIntentId,
  selectedIntentId,
  detailsByIntent,
  officialReleaseLines,
}) {
  const centerFallbackKind = query.kind || 'workspace';
  const centerFallbackId = query.kind === 'workspace' ? rootNodeId() : query.id;
  if (!Array.isArray(intents) || intents.length === 0) {
    return createEmptyGraph(query, { id: centerFallbackId, kind: centerFallbackKind });
  }

  const fullGraph = buildFullGraph({
    intents,
    goalsTree,
    goalsSummary,
    focusIntentId,
    activeIntentId,
    selectedIntentId,
    detailsByIntent: detailsByIntent ?? new Map(),
    officialReleaseLines: officialReleaseLines ?? [],
  });

  const visible = buildVisibleContext(fullGraph, query);
  const visibleNodeIds = new Set(visible.nodes.map((node) => node.id));
  const visibleWarnings = fullGraph.warnings.filter((warning) => warning.nodeIds.some((nodeId) => visibleNodeIds.has(nodeId)));
  const centerKind = inferNodeKind(visible.centerId, visible.nodes);

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    center: {
      id: visible.centerId,
      kind: centerKind,
    },
    query,
    nodes: visible.nodes,
    edges: visible.edges,
    warnings: visibleWarnings,
    summary: summarizeVisibleGraph(visible.nodes, visibleWarnings, focusIntentId, activeIntentId),
    focusNodeId: fullGraph.focusNodeId && visibleNodeIds.has(fullGraph.focusNodeId) ? fullGraph.focusNodeId : null,
    defaultMode: fullGraph.focusNodeId && visibleNodeIds.has(fullGraph.focusNodeId) ? 'focus' : 'alignment',
    sources: {
      intent: 'filesystem',
      goals: 'goals-state-db+graph-seed',
      milestones: 'goal-ownership+official-pack',
      releaseLines: 'official-pack',
      tasks: 'intent-markdown-derived',
    },
  };
}

module.exports = {
  deriveVersionBucket,
  versionRank,
  buildIntentContextExplorer,
  rootNodeId,
  entityNodeId,
  goalNodeId,
  releaseLineNodeId,
};
