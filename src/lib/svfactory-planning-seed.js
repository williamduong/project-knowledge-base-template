'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { PlanningSeed } = require('../contracts/planning.contract');
const { resolveExistingState } = require('./context');
const { resolveGoalsArtifacts, readGoalsState, replaceAllGoals } = require('./goals-state');
const { listIntentRecords } = require('./intent');

const PLANNING_SEED_RELATIVE_PATH = path.join('svfactory', 'planning.seed.json');
const INTENT_REVIEW_RELATIVE_PATH = path.join('svfactory', 'planning-intent-review.json');
const ACTIVE_INTENTS_RELATIVE_ROOT = path.join('knowledge-base', 'intents', '_active');
const BACKLOG_INTENTS_RELATIVE_ROOT = path.join('knowledge-base', 'intents', '_backlog');

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadPlanningSeed(workspaceRoot) {
  const seedPath = path.join(workspaceRoot, PLANNING_SEED_RELATIVE_PATH);
  const parsed = PlanningSeed.parse(readJsonFile(seedPath));
  return {
    seedPath,
    seed: parsed,
  };
}

function writePlanningSeed(workspaceRoot, seed) {
  const seedPath = path.join(workspaceRoot, PLANNING_SEED_RELATIVE_PATH);
  const parsed = PlanningSeed.parse(seed);
  fs.mkdirSync(path.dirname(seedPath), { recursive: true });
  fs.writeFileSync(seedPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return {
    seedPath,
    seed: parsed,
  };
}

function defaultPlanningReview() {
  return {
    generated_at: null,
    north_star: '',
    active_intent_ids: [],
    backlog_intent_ids: [],
    linked_intent_ids: [],
    intents_missing_goal_mapping: [],
    assistant_triage: {},
  };
}

function loadPlanningReview(workspaceRoot) {
  const reviewPath = path.join(workspaceRoot, INTENT_REVIEW_RELATIVE_PATH);
  if (!fs.existsSync(reviewPath)) {
    return {
      reviewPath,
      review: defaultPlanningReview(),
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
    return {
      reviewPath,
      review: {
        ...defaultPlanningReview(),
        ...(parsed || {}),
        assistant_triage: parsed?.assistant_triage && typeof parsed.assistant_triage === 'object'
          ? parsed.assistant_triage
          : {},
      },
    };
  } catch {
    return {
      reviewPath,
      review: defaultPlanningReview(),
    };
  }
}

function flattenGoalTreeNode(goalNode, parentGoalId, bucket) {
  const now = new Date().toISOString();
  bucket.push({
    id: goalNode.id,
    entity_level: 'system',
    entity_id: 'workspace',
    parent_goal_id: parentGoalId,
    goal_kind: 'objective',
    title: goalNode.title,
    description: goalNode.description,
    success_criteria: goalNode.success_criteria,
    state: goalNode.state,
    rank: bucket.length,
    created_at: now,
    updated_at: now,
  });

  for (const keyResult of goalNode.key_results || []) {
    bucket.push({
      id: keyResult.id,
      entity_level: 'system',
      entity_id: 'workspace',
      parent_goal_id: goalNode.id,
      goal_kind: 'key_result',
      title: `${keyResult.code} — ${keyResult.title}`,
      description: keyResult.description,
      success_criteria: keyResult.success_criteria,
      key_result_metric: keyResult.metric,
      key_result_target: keyResult.target,
      state: keyResult.state,
      rank: bucket.length,
      created_at: now,
      updated_at: now,
    });
  }

  for (const childGoal of goalNode.sub_goals || []) {
    flattenGoalTreeNode(childGoal, goalNode.id, bucket);
  }
}

function buildPlanningGoalRecords(seed) {
  const goals = [];
  for (const goalNode of seed.goals) {
    flattenGoalTreeNode(goalNode, null, goals);
  }
  return goals;
}

function listIntentIds(rootPath, mode) {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const names = fs.readdirSync(rootPath).sort((left, right) => left.localeCompare(right));
  if (mode === 'active') {
    return names.filter((name) => fs.statSync(path.join(rootPath, name)).isDirectory());
  }

  return names
    .filter((name) => fs.statSync(path.join(rootPath, name)).isFile() && name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/i, ''));
}

function buildIntentGoalReview(seed, workspaceRoot, existingReview = defaultPlanningReview()) {
  const activeIntentIds = listIntentIds(path.join(workspaceRoot, ACTIVE_INTENTS_RELATIVE_ROOT), 'active');
  const backlogIntentIds = listIntentIds(path.join(workspaceRoot, BACKLOG_INTENTS_RELATIVE_ROOT), 'backlog');
  const context = resolveExistingState({ workspaceRoot });
  const knownIntentIds = listIntentRecords(context.contentRoot, {
    includeActive: true,
    includeBacklog: true,
    includeClosed: true,
    includeArchived: false,
  }).map((record) => record.id);
  const linkedIntentIds = new Set((seed.intent_goal_links || []).map((link) => link.intent_id));
  const assistantTriage = Object.fromEntries(
    Object.entries(existingReview.assistant_triage || {}).filter(([intentId]) => knownIntentIds.includes(intentId)),
  );

  return {
    generated_at: new Date().toISOString(),
    north_star: seed.north_star.title,
    active_intent_ids: activeIntentIds,
    backlog_intent_ids: backlogIntentIds,
    linked_intent_ids: [...linkedIntentIds].sort(),
    assistant_triage: assistantTriage,
    intents_missing_goal_mapping: knownIntentIds
      .filter((intentId) => !linkedIntentIds.has(intentId))
      .map((intentId) => ({
        intent_id: intentId,
        suggested_relation: 'advances',
        suggested_goal_id: null,
        suggested_key_result_id: null,
        status: 'manual-review-required',
      })),
  };
}

function writeIntentGoalReview(workspaceRoot, review) {
  const reviewPath = path.join(workspaceRoot, INTENT_REVIEW_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(reviewPath), { recursive: true });
  fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  return reviewPath;
}

function backupGoalsArtifacts(workspaceRoot) {
  const artifacts = resolveGoalsArtifacts(workspaceRoot);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(workspaceRoot, 'svfactory', 'backups', 'planning-seed', stamp);
  fs.mkdirSync(backupDir, { recursive: true });

  const copiedFiles = [];
  for (const filePath of [artifacts.statePath, artifacts.sqlitePath]) {
    if (!filePath || !fs.existsSync(filePath)) continue;
    const targetPath = path.join(backupDir, path.basename(filePath));
    fs.copyFileSync(filePath, targetPath);
    copiedFiles.push(targetPath);
  }

  return { backupDir, copiedFiles };
}

function applySvfactoryPlanningSeed(workspaceRoot) {
  const { seed } = loadPlanningSeed(workspaceRoot);
  const { review: existingReview } = loadPlanningReview(workspaceRoot);
  const backup = backupGoalsArtifacts(workspaceRoot);
  const goals = buildPlanningGoalRecords(seed);
  replaceAllGoals({ workspaceRoot, goals });
  const state = readGoalsState({ workspaceRoot });
  const review = buildIntentGoalReview(seed, workspaceRoot, existingReview);
  const reviewPath = writeIntentGoalReview(workspaceRoot, review);

  return {
    seed,
    state,
    backup,
    review,
    reviewPath,
  };
}

function updatePlanningReview(workspaceRoot, mutate) {
  const { review } = loadPlanningReview(workspaceRoot);
  const nextReview = mutate({
    ...defaultPlanningReview(),
    ...review,
    assistant_triage: { ...(review.assistant_triage || {}) },
  }) || review;
  writeIntentGoalReview(workspaceRoot, nextReview);
  return nextReview;
}

function mutatePlanningSeed(workspaceRoot, mutate) {
  const { seed } = loadPlanningSeed(workspaceRoot);
  const draft = JSON.parse(JSON.stringify(seed));
  const nextSeed = mutate(draft) || draft;
  writePlanningSeed(workspaceRoot, nextSeed);
  return applySvfactoryPlanningSeed(workspaceRoot);
}

function slugifyPlanningValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function collectGoalIds(goals, bucket = new Set()) {
  for (const goal of goals || []) {
    bucket.add(goal.id);
    for (const keyResult of goal.key_results || []) {
      bucket.add(keyResult.id);
    }
    collectGoalIds(goal.sub_goals || [], bucket);
  }
  return bucket;
}

function nextTopLevelObjectiveCode(seed) {
  const numbers = (seed.goals || [])
    .map((goal) => /^G(\d+(?:\.\d+)*)$/i.exec(String(goal.code || '').trim()))
    .filter(Boolean)
    .map((match) => Number(match[1].split('.')[0]))
    .filter((value) => Number.isFinite(value));
  const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `G${nextNumber}`;
}

function ensureUniquePlanningId(baseId, usedIds) {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let index = 2;
  while (usedIds.has(`${baseId}-${index}`)) {
    index += 1;
  }
  const uniqueId = `${baseId}-${index}`;
  usedIds.add(uniqueId);
  return uniqueId;
}

function createCanonicalObjectiveAndKeyResult(seed, {
  proposedObjective,
  proposedKeyResult,
}) {
  const objectiveCode = nextTopLevelObjectiveCode(seed);
  const objectiveNumber = objectiveCode.replace(/^G/i, '');
  const usedIds = collectGoalIds(seed.goals || []);
  const objectiveSlug = slugifyPlanningValue(proposedObjective.title) || `goal-${objectiveNumber}`;
  const keyResultSlug = slugifyPlanningValue(proposedKeyResult.title) || `key-result-${objectiveNumber}-1`;
  const objectiveId = ensureUniquePlanningId(`g-sf-g${objectiveNumber}-${objectiveSlug}`, usedIds);
  const keyResultId = ensureUniquePlanningId(`kr-sf-g${objectiveNumber}-k1-${keyResultSlug}`, usedIds);
  const keyResultCode = `KR${objectiveNumber}.1`;

  const objectiveRecord = {
    id: objectiveId,
    code: objectiveCode,
    kind: 'objective',
    title: proposedObjective.title,
    description: proposedObjective.description,
    success_criteria: proposedObjective.success_criteria,
    state: 'planned',
    sub_goals: [],
    key_results: [
      {
        id: keyResultId,
        code: keyResultCode,
        title: proposedKeyResult.title,
        description: proposedKeyResult.description,
        success_criteria: proposedKeyResult.success_criteria,
        metric: proposedKeyResult.metric,
        target: proposedKeyResult.target,
        state: 'planned',
      },
    ],
  };

  seed.goals = [...(seed.goals || []), objectiveRecord];

  return {
    objectiveId,
    objectiveCode,
    keyResultId,
    keyResultCode,
  };
}

function addIntentKeyResultLink(workspaceRoot, { intentId, keyResultId, relation = 'advances', notes = '' }) {
  return mutatePlanningSeed(workspaceRoot, (seed) => {
    const existing = (seed.intent_goal_links || []).find((link) => link.intent_id === intentId && link.key_result_id === keyResultId);
    if (!existing) {
      seed.intent_goal_links = [
        ...(seed.intent_goal_links || []),
        {
          intent_id: intentId,
          relation,
          key_result_id: keyResultId,
          notes,
        },
      ];
      return seed;
    }

    existing.relation = relation;
    existing.notes = notes;
    return seed;
  });
}

function removeIntentKeyResultLink(workspaceRoot, { intentId, keyResultId }) {
  return mutatePlanningSeed(workspaceRoot, (seed) => {
    seed.intent_goal_links = (seed.intent_goal_links || []).filter((link) => !(link.intent_id === intentId && link.key_result_id === keyResultId));
    return seed;
  });
}

function addIntentToRelease(workspaceRoot, { releaseId, intentId }) {
  return mutatePlanningSeed(workspaceRoot, (seed) => {
    const release = (seed.releases || []).find((item) => item.id === releaseId);
    if (!release) {
      throw new Error(`Release ${releaseId} is not declared in planning.seed.json`);
    }
    release.intent_ids = [...new Set([...(release.intent_ids || []), intentId])];
    return seed;
  });
}

function removeIntentFromRelease(workspaceRoot, { releaseId, intentId }) {
  return mutatePlanningSeed(workspaceRoot, (seed) => {
    const release = (seed.releases || []).find((item) => item.id === releaseId);
    if (!release) {
      throw new Error(`Release ${releaseId} is not declared in planning.seed.json`);
    }
    release.intent_ids = (release.intent_ids || []).filter((id) => id !== intentId);
    return seed;
  });
}

function addTargetGoalToRelease(workspaceRoot, { releaseId, goalId }) {
  return mutatePlanningSeed(workspaceRoot, (seed) => {
    const release = (seed.releases || []).find((item) => item.id === releaseId);
    if (!release) {
      throw new Error(`Release ${releaseId} is not declared in planning.seed.json`);
    }
    release.target_goal_ids = [...new Set([...(release.target_goal_ids || []), goalId])];
    return seed;
  });
}

function recordAssistantTriage(workspaceRoot, { intentId, triage }) {
  return updatePlanningReview(workspaceRoot, (review) => {
    review.assistant_triage[intentId] = {
      ...(review.assistant_triage[intentId] || {}),
      ...triage,
      intent_id: intentId,
      updated_at: new Date().toISOString(),
    };
    return review;
  });
}

function applyAssistantDecision(workspaceRoot, {
  intentId,
  decision,
  summary = '',
  whyNow = '',
  nextAction = '',
  keyResultId = null,
  releaseId = null,
  proposedObjective = null,
  proposedKeyResult = null,
  outOfScopeReason = '',
  warnings = [],
}) {
  let resolvedKeyResultId = keyResultId;
  let resolvedObjectiveId = proposedObjective?.id || null;

  if (decision === 'bind-existing') {
    if (resolvedKeyResultId) {
      addIntentKeyResultLink(workspaceRoot, {
        intentId,
        keyResultId: resolvedKeyResultId,
        relation: 'advances',
        notes: `Assistant decision: ${summary}`.trim(),
      });
    }
    if (releaseId) {
      try {
        addIntentToRelease(workspaceRoot, { releaseId, intentId });
      } catch {
        // Ignore derived or missing releases here; triage record still captures the decision.
      }
    }
  }

  if (decision === 'propose-new-okr' && proposedObjective && proposedKeyResult) {
    const promotionResult = mutatePlanningSeed(workspaceRoot, (seed) => {
      const created = createCanonicalObjectiveAndKeyResult(seed, {
        proposedObjective,
        proposedKeyResult,
      });

      seed.intent_goal_links = [
        ...(seed.intent_goal_links || []).filter((link) => !(link.intent_id === intentId && link.key_result_id === created.keyResultId)),
        {
          intent_id: intentId,
          relation: 'advances',
          key_result_id: created.keyResultId,
          notes: `Assistant promoted new O/KR: ${proposedObjective.title}`,
        },
      ];

      const release = (seed.releases || []).find((item) => item.id === releaseId);
      if (release) {
        release.intent_ids = [...new Set([...(release.intent_ids || []), intentId])];
        release.target_goal_ids = [...new Set([...(release.target_goal_ids || []), created.objectiveId])];
      }

      resolvedObjectiveId = created.objectiveId;
      resolvedKeyResultId = created.keyResultId;
      return seed;
    });

    const review = recordAssistantTriage(workspaceRoot, {
      intentId,
      triage: {
        decision,
        status: 'applied',
        summary,
        why_now: whyNow,
        next_action: nextAction,
        key_result_id: resolvedKeyResultId,
        release_id: releaseId,
        objective_id: resolvedObjectiveId,
        proposed_objective: proposedObjective,
        proposed_key_result: proposedKeyResult,
        out_of_scope_reason: null,
        warnings,
      },
    });

    return {
      ...promotionResult,
      review,
    };
  }

  recordAssistantTriage(workspaceRoot, {
    intentId,
    triage: {
      decision,
      status: decision === 'bind-existing' ? 'applied' : 'pending-review',
      summary,
      why_now: whyNow,
      next_action: nextAction,
      key_result_id: resolvedKeyResultId,
      release_id: releaseId,
      objective_id: resolvedObjectiveId,
      proposed_objective: proposedObjective,
      proposed_key_result: proposedKeyResult,
      out_of_scope_reason: outOfScopeReason || null,
      warnings,
    },
  });

  return applySvfactoryPlanningSeed(workspaceRoot);
}

module.exports = {
  PLANNING_SEED_RELATIVE_PATH,
  INTENT_REVIEW_RELATIVE_PATH,
  loadPlanningSeed,
  loadPlanningReview,
  writePlanningSeed,
  buildPlanningGoalRecords,
  buildIntentGoalReview,
  applySvfactoryPlanningSeed,
  addIntentKeyResultLink,
  removeIntentKeyResultLink,
  addIntentToRelease,
  removeIntentFromRelease,
  addTargetGoalToRelease,
  recordAssistantTriage,
  applyAssistantDecision,
};
