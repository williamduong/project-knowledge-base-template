'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { resolveExistingState } = require('../../lib/context');
const { listIntentRecords } = require('../../lib/intent');
const { loadPlanningSeed, INTENT_REVIEW_RELATIVE_PATH } = require('../../lib/svfactory-planning-seed');
const {
  deriveVersionBucket,
  extractIntentNarrative,
  extractIntentTasks,
  extractStagedFiles,
  formatReleaseBucketLabel,
  normalizeLifecycle,
} = require('../../lib/intent-task-parser');
const { COLLECTIONS, EDGE_COLLECTIONS, NODE_KIND } = require('./schema');

function readJsonFileSafe(filePath, fallbackValue = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallbackValue;
  }
}

function readTextFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function normalizeReleaseState(value) {
  const lifecycle = normalizeLifecycle(value);
  if (lifecycle === 'closed' || lifecycle === 'done') return 'shipped';
  if (lifecycle === 'active') return 'active';
  if (lifecycle === 'backlog') return 'planned';
  if (lifecycle === 'archived') return 'archived';
  return 'draft';
}

function summarizeIntentState(lifecycle) {
  const normalized = normalizeLifecycle(lifecycle);
  if (normalized === 'closed' || normalized === 'done' || normalized === 'archived') {
    return { state: 'done', progress: 100 };
  }
  if (normalized === 'active') {
    return { state: 'active', progress: 60 };
  }
  if (normalized === 'blocked') {
    return { state: 'blocked', progress: 35 };
  }
  if (normalized === 'draft') {
    return { state: 'draft', progress: 10 };
  }
  return { state: 'planned', progress: 25 };
}

function flattenGoalTree(goals, parentObjectiveId, bucket) {
  for (const goal of goals || []) {
    bucket.objectives.push({
      _key: goal.id,
      id: goal.id,
      kind: NODE_KIND.OBJECTIVE,
      code: goal.code,
      title: goal.title,
      description: goal.description,
      success_criteria: goal.success_criteria,
      state: goal.state,
      parent_objective_id: parentObjectiveId,
      metrics: [],
    });

    if (parentObjectiveId) {
      bucket.edges.push({
        _key: `contains-${parentObjectiveId}-${goal.id}`,
        _from: `${COLLECTIONS.OBJECTIVES}/${parentObjectiveId}`,
        _to: `${COLLECTIONS.OBJECTIVES}/${goal.id}`,
        kind: 'contains',
      });
    }

    for (const keyResult of goal.key_results || []) {
      bucket.keyResults.push({
        _key: keyResult.id,
        id: keyResult.id,
        kind: NODE_KIND.KEY_RESULT,
        code: keyResult.code,
        title: keyResult.title,
        description: keyResult.description,
        success_criteria: keyResult.success_criteria,
        metric: keyResult.metric,
        target: keyResult.target,
        state: keyResult.state,
        parent_objective_id: goal.id,
      });
      bucket.edges.push({
        _key: `kr-${goal.id}-${keyResult.id}`,
        _from: `${COLLECTIONS.OBJECTIVES}/${goal.id}`,
        _to: `${COLLECTIONS.KEY_RESULTS}/${keyResult.id}`,
        kind: 'has_key_result',
      });
    }

    flattenGoalTree(goal.sub_goals || [], goal.id, bucket);
  }
}

function buildGoalLookup(seed) {
  const flattened = { objectives: [], keyResults: [], edges: [] };
  flattenGoalTree(seed.goals || [], null, flattened);
  return flattened;
}

function parseIntentRecord(record, workspaceRoot, contentRoot, linkedKeyResultIds, assistantTriage) {
  const intentText = readTextFileSafe(record.metaPath);
  const planPath = record.workspacePath ? path.join(record.workspacePath, 'plan.md') : null;
  const planText = planPath ? readTextFileSafe(planPath) : '';
  const focus = record.meta?.focus && typeof record.meta.focus === 'object' ? record.meta.focus : {};
  const narrative = extractIntentNarrative(intentText);
  const rawTasks = [
    ...extractIntentTasks(intentText, 'intent.md'),
    ...extractIntentTasks(planText, 'plan.md'),
  ];
  const tasks = rawTasks.map((task, index) => ({
    _key: `${record.id}--task-${index + 1}`,
    id: `${record.id}--task-${index + 1}`,
    kind: NODE_KIND.TASK,
    intent_id: record.id,
    title: task.title || `Task ${index + 1}`,
    description: task.description || task.text || '',
    state: normalizeLifecycle(task.status || (task.done ? 'done' : 'open')),
    section: task.section || 'General',
    source: task.source || 'intent.md',
    task_index: index,
    explicit_commits: task.explicitCommits || [],
    tags: task.tags || [],
  }));

  const lifecycle = normalizeLifecycle(record.meta?.lifecycle || record.lifecycle || record.scope || 'backlog');
  const stateSummary = summarizeIntentState(lifecycle);
  const releaseBucket = deriveVersionBucket(record.id);
  const stagedFiles = extractStagedFiles(intentText);
  const triageDecision = assistantTriage?.decision || null;
  const validationState = linkedKeyResultIds.length > 0
    ? 'linked'
    : triageDecision === 'propose-new-okr'
      ? 'proposed-new-key-result'
      : triageDecision === 'out-of-scope'
        ? 'out-of-scope'
        : 'missing-key-result';

  return {
    _key: record.id,
    id: record.id,
    kind: NODE_KIND.INTENT,
    title: record.meta?.title || record.id,
    lifecycle,
    mode: record.meta?.mode || record.scope || 'backlog',
    change_type: record.meta?.change_type || 'docs',
    summary: narrative.summary || record.meta?.description || '',
    goal_text: record.meta?.goal_text || narrative.goal || '',
    decision_summary: record.meta?.decision_summary || '',
    close_condition: record.meta?.close_condition || '',
    focus_current: focus.current || '',
    focus_next_action: focus.next_action || '',
    focus_updated_at: focus.last_updated || null,
    progress: stateSummary.progress,
    runtime_state: stateSummary.state,
    release_bucket: releaseBucket,
    task_count: tasks.length,
    completed_task_count: tasks.filter((task) => task.state === 'done').length,
    validation_state: validationState,
    linked_key_result_ids: linkedKeyResultIds,
    assistant_decision: triageDecision,
    assistant_summary: assistantTriage?.summary || '',
    assistant_why_now: assistantTriage?.why_now || '',
    assistant_next_action: assistantTriage?.next_action || '',
    assistant_release_id: assistantTriage?.release_id || null,
    proposed_objective: assistantTriage?.proposed_objective || null,
    proposed_key_result: assistantTriage?.proposed_key_result || null,
    out_of_scope_reason: assistantTriage?.out_of_scope_reason || null,
    assistant_warnings: Array.isArray(assistantTriage?.warnings) ? assistantTriage.warnings : [],
    staged_files: stagedFiles,
    source_file: record.metaPath ? path.relative(workspaceRoot, record.metaPath).replace(/\\/g, '/') : null,
    workspace_path: record.workspacePath ? path.relative(workspaceRoot, record.workspacePath).replace(/\\/g, '/') : null,
    scope: record.scope,
    tasks,
  };
}

function buildReleaseRecords(seedReleases, intents) {
  const releases = [];
  const seen = new Set();

  for (const release of seedReleases || []) {
    releases.push({
      _key: release.id,
      id: release.id,
      kind: NODE_KIND.RELEASE,
      code: release.code,
      title: release.title,
      description: release.description,
      state: release.state,
      release_bucket: release.code.toLowerCase(),
      intent_ids: release.intent_ids || [],
      target_goal_ids: release.target_goal_ids || [],
      source_kind: 'declared',
    });
    seen.add(release.id);
  }

  const grouped = new Map();
  for (const intent of intents) {
    const bucket = intent.release_bucket || 'legacy';
    const current = grouped.get(bucket) || [];
    current.push(intent.id);
    grouped.set(bucket, current);
  }

  for (const [bucket, intentIds] of grouped.entries()) {
    const derivedId = `release-${bucket}`;
    if (seen.has(derivedId)) continue;
    releases.push({
      _key: derivedId,
      id: derivedId,
      kind: NODE_KIND.RELEASE,
      code: bucket,
      title: formatReleaseBucketLabel(bucket),
      description: `${intentIds.length} intents grouped under ${formatReleaseBucketLabel(bucket)}.`,
      state: normalizeReleaseState(intentIds.some((intentId) => {
        const intent = intents.find((item) => item.id === intentId);
        return intent?.lifecycle;
      }) ? (intents.find((item) => item.id === intentIds[0])?.lifecycle || 'planned') : 'planned'),
      release_bucket: bucket,
      intent_ids: intentIds,
      target_goal_ids: [],
      source_kind: 'derived',
    });
  }

  return releases.sort((left, right) => String(left.code).localeCompare(String(right.code), undefined, { numeric: true }));
}

function buildReleaseEdges(releases) {
  const edges = [];
  for (const release of releases) {
    for (const intentId of release.intent_ids || []) {
      edges.push({
        _key: `release-${release.id}-${intentId}`,
        _from: `${COLLECTIONS.INTENTS}/${intentId}`,
        _to: `${COLLECTIONS.RELEASES}/${release.id}`,
        kind: 'belongs_to_release',
      });
    }
  }
  return edges;
}

function buildWorkspaceSnapshot({ workspaceRoot }) {
  const context = resolveExistingState({ workspaceRoot });
  const { seed, seedPath } = loadPlanningSeed(workspaceRoot);
  const reviewPath = path.join(workspaceRoot, INTENT_REVIEW_RELATIVE_PATH);
  const review = readJsonFileSafe(reviewPath, null);
  const assistantTriageMap = review?.assistant_triage && typeof review.assistant_triage === 'object'
    ? review.assistant_triage
    : {};
  const goalGraph = buildGoalLookup(seed);
  const keyResultIds = new Set(goalGraph.keyResults.map((item) => item.id));
  const explicitLinks = new Map();

  for (const link of seed.intent_goal_links || []) {
    if (!link.key_result_id || !keyResultIds.has(link.key_result_id)) {
      continue;
    }
    const current = explicitLinks.get(link.intent_id) || [];
    current.push(link.key_result_id);
    explicitLinks.set(link.intent_id, [...new Set(current)]);
  }

  const records = listIntentRecords(context.contentRoot, {
    includeActive: true,
    includeBacklog: true,
    includeClosed: true,
    includeArchived: false,
  });

  const intents = records.map((record) => {
    const linkedKeyResultIds = explicitLinks.get(record.id) || [];
    return parseIntentRecord(record, workspaceRoot, context.contentRoot, linkedKeyResultIds, assistantTriageMap[record.id] || null);
  });

  const releases = buildReleaseRecords(seed.releases || [], intents);
  const tasks = intents.flatMap((intent) => intent.tasks);
  const warnings = [];

  for (const intent of intents.filter((item) => item.validation_state !== 'linked')) {
    if (intent.validation_state === 'proposed-new-key-result') {
      warnings.push({
        id: `proposed-kr:${intent.id}`,
        level: 'info',
        code: 'intent-proposed-new-key-result',
        message: `Intent ${intent.id} has a pending new O/KR proposal instead of an existing key result link.`,
        entity_ids: [intent.id],
      });
      continue;
    }

    if (intent.validation_state === 'out-of-scope') {
      warnings.push({
        id: `out-of-scope:${intent.id}`,
        level: 'info',
        code: 'intent-out-of-scope',
        message: `Intent ${intent.id} is marked outside the current OKR scope.`,
        entity_ids: [intent.id],
      });
      continue;
    }

    warnings.push({
      id: `missing-kr:${intent.id}`,
      level: 'warning',
      code: 'intent-missing-key-result',
      message: `Intent ${intent.id} is not linked to any key result yet.`,
      entity_ids: [intent.id],
    });
  }

  for (const keyResult of goalGraph.keyResults) {
    const intentCount = intents.filter((intent) => intent.linked_key_result_ids.includes(keyResult.id)).length;
    if (intentCount === 0) {
      warnings.push({
        id: `kr-without-intent:${keyResult.id}`,
        level: 'info',
        code: 'key-result-without-intent',
        message: `${keyResult.code} has no intent mapped yet.`,
        entity_ids: [keyResult.id],
      });
    }
  }

  const objectiveEdges = goalGraph.objectives
    .filter((objective) => !objective.parent_objective_id)
    .map((objective) => ({
      _key: `workspace-objective-${objective.id}`,
      _from: `${COLLECTIONS.WORKSPACES}/svfactory`,
      _to: `${COLLECTIONS.OBJECTIVES}/${objective.id}`,
      kind: 'contains',
    }));

  const releaseEdgesFromWorkspace = releases.map((release) => ({
    _key: `workspace-release-${release.id}`,
    _from: `${COLLECTIONS.WORKSPACES}/svfactory`,
    _to: `${COLLECTIONS.RELEASES}/${release.id}`,
    kind: 'contains',
  }));

  const taskEdges = tasks.map((task) => ({
    _key: `task-edge-${task.id}`,
    _from: `${COLLECTIONS.INTENTS}/${task.intent_id}`,
    _to: `${COLLECTIONS.TASKS}/${task.id}`,
    kind: 'has_task',
  }));

  const intentEdges = intents.flatMap((intent) => intent.linked_key_result_ids.map((keyResultId) => ({
    _key: `advance-${intent.id}-${keyResultId}`,
    _from: `${COLLECTIONS.INTENTS}/${intent.id}`,
    _to: `${COLLECTIONS.KEY_RESULTS}/${keyResultId}`,
    kind: 'advances',
  })));

  const releaseEdges = buildReleaseEdges(releases);
  const now = new Date().toISOString();

  const workspace = {
    _key: 'svfactory',
    id: 'svfactory',
    kind: NODE_KIND.WORKSPACE,
    title: seed.north_star.title,
    description: seed.north_star.description,
    mode: seed.mode,
    north_star_id: seed.north_star.id,
    checked_at: now,
    seed_path: path.relative(workspaceRoot, seedPath).replace(/\\/g, '/'),
    review_path: fs.existsSync(reviewPath) ? path.relative(workspaceRoot, reviewPath).replace(/\\/g, '/') : null,
    review_generated_at: review?.generated_at || null,
  };

  const graphNodes = [
    {
      id: workspace.id,
      kind: 'workspace',
      label: workspace.title,
      state: 'active',
      metrics: [`${goalGraph.objectives.length} objectives`, `${goalGraph.keyResults.length} key results`],
    },
    ...goalGraph.objectives.map((objective) => ({
      id: objective.id,
      kind: 'objective',
      label: `${objective.code} — ${objective.title}`,
      state: objective.state,
      metrics: [objective.success_criteria],
    })),
    ...goalGraph.keyResults.map((keyResult) => ({
      id: keyResult.id,
      kind: 'key_result',
      label: `${keyResult.code} — ${keyResult.title}`,
      state: keyResult.state,
      metrics: [keyResult.metric || 'metric not set', keyResult.target || 'target not set'],
    })),
    ...releases.map((release) => ({
      id: release.id,
      kind: 'release',
      label: release.title,
      state: release.state,
      metrics: [`${release.intent_ids.length} intents`, release.source_kind],
    })),
    ...intents.map((intent) => ({
      id: intent.id,
      kind: 'intent',
      label: intent.title,
      state: intent.validation_state === 'linked' ? intent.lifecycle : 'warning',
      metrics: [
        `${intent.task_count} tasks`,
        intent.validation_state === 'linked'
          ? `${intent.linked_key_result_ids.length} KR`
          : intent.validation_state === 'proposed-new-key-result'
            ? 'new O/KR proposed'
            : intent.validation_state === 'out-of-scope'
              ? 'out of current goals'
              : 'KR missing',
      ],
    })),
    ...tasks.map((task) => ({
      id: task.id,
      kind: 'task',
      label: task.title,
      state: task.state,
      metrics: [task.section, task.source],
    })),
  ];

  const graphEdges = [
    ...objectiveEdges,
    ...goalGraph.edges,
    ...releaseEdgesFromWorkspace,
    ...releaseEdges,
    ...intentEdges,
    ...taskEdges,
  ].map((edge) => ({
    id: edge._key,
    kind: edge.kind,
    source: edge._from.split('/')[1],
    target: edge._to.split('/')[1],
  }));

  return {
    checkedAt: now,
    source: {
      seedPath: workspace.seed_path,
      reviewPath: workspace.review_path,
      contentRoot: path.relative(workspaceRoot, context.contentRoot).replace(/\\/g, '/'),
    },
    workspace,
    northStar: seed.north_star,
    summary: {
      objectives: goalGraph.objectives.length,
      keyResults: goalGraph.keyResults.length,
      intents: intents.length,
      tasks: tasks.length,
      releases: releases.length,
      intentsWithoutKeyResult: intents.filter((intent) => intent.validation_state === 'missing-key-result').length,
      mappedIntents: intents.filter((intent) => intent.validation_state === 'linked').length,
    },
    validation: {
      warnings,
      missingKeyResultIntentIds: intents.filter((intent) => intent.validation_state === 'missing-key-result').map((intent) => intent.id),
      intentReview: review,
    },
    objectives: goalGraph.objectives,
    keyResults: goalGraph.keyResults,
    intents,
    tasks,
    releases,
    graph: {
      nodes: graphNodes,
      edges: graphEdges,
    },
    documents: {
      workspace,
      objectives: goalGraph.objectives,
      keyResults: goalGraph.keyResults,
      intents: intents.map(({ tasks: _tasks, ...intent }) => intent),
      tasks,
      releases,
      containsEdges: [...objectiveEdges, ...releaseEdgesFromWorkspace],
      keyResultEdges: goalGraph.edges.filter((edge) => edge.kind === 'has_key_result'),
      intentEdges,
      taskEdges,
      releaseEdges,
    },
  };
}

module.exports = {
  buildWorkspaceSnapshot,
};
