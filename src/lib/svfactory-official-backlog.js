'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { connect } = require('../graph-db/knowledge');
const { seedGovernanceEntities } = require('../graph-db/transformers/seed-governance');
const { readGoalsState, resolveGoalsArtifacts } = require('./goals-state');

const OFFICIAL_BACKLOG_PACK_RELATIVE_PATH = path.join('svfactory', 'official-backlog.seed.json');
const ACTIVE_INTENTS_RELATIVE_ROOT = path.join('knowledge-base', 'intents', '_active');
const BACKLOG_INTENTS_RELATIVE_ROOT = path.join('knowledge-base', 'intents', '_backlog');

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function summarizePack(pack) {
  return {
    goalCount: Array.isArray(pack.goal_ids) ? pack.goal_ids.length : 0,
    releaseLineCount: Array.isArray(pack.release_lines) ? pack.release_lines.length : 0,
    activeIntentCount: Array.isArray(pack.active_intent_ids) ? pack.active_intent_ids.length : 0,
    backlogIntentCount: Array.isArray(pack.backlog_intent_ids) ? pack.backlog_intent_ids.length : 0,
  };
}

function loadOfficialBacklogPack(workspaceRoot) {
  const packPath = path.join(workspaceRoot, OFFICIAL_BACKLOG_PACK_RELATIVE_PATH);
  const pack = readJsonFile(packPath);
  return {
    packPath,
    pack,
  };
}

function loadGoalRegistryMap(workspaceRoot) {
  const goalsStatePath = path.join(workspaceRoot, 'svfactory', 'goals.state.json');
  const goalsState = readJsonFile(goalsStatePath);
  const goals = Array.isArray(goalsState?.goals) ? goalsState.goals : [];
  const goalMap = new Map(goals.map((goal) => [goal.id, goal]));
  return {
    goalsStatePath,
    goals,
    goalMap,
  };
}

function collectIntentRegistry(workspaceRoot) {
  const activeIds = listIntentIds(path.join(workspaceRoot, ACTIVE_INTENTS_RELATIVE_ROOT), 'active');
  const backlogIds = listIntentIds(path.join(workspaceRoot, BACKLOG_INTENTS_RELATIVE_ROOT), 'backlog');
  return { activeIds, backlogIds };
}

function resolveOfficialGoalRecords(workspaceRoot, pack) {
  const { goalMap } = loadGoalRegistryMap(workspaceRoot);
  return (pack.goal_ids || []).map((goalId) => goalMap.get(goalId)).filter(Boolean);
}

function compareExpectedIds(expectedIds, actualIds) {
  const expectedSet = new Set(expectedIds || []);
  const actualSet = new Set(actualIds || []);
  return {
    missing: [...expectedSet].filter((id) => !actualSet.has(id)),
    unexpected: [...actualSet].filter((id) => !expectedSet.has(id)),
  };
}

function validateOfficialBacklogPack(workspaceRoot, packInput) {
  const loaded = packInput ? { pack: packInput } : loadOfficialBacklogPack(workspaceRoot);
  const pack = loaded.pack;
  const { goalMap } = loadGoalRegistryMap(workspaceRoot);
  const { activeIds, backlogIds } = collectIntentRegistry(workspaceRoot);

  const missingGoalIds = (pack.goal_ids || []).filter((goalId) => !goalMap.has(goalId));
  const activeDiff = compareExpectedIds(pack.active_intent_ids || [], activeIds);
  const backlogDiff = compareExpectedIds(pack.backlog_intent_ids || [], backlogIds);

  return {
    ok: missingGoalIds.length === 0 &&
      activeDiff.missing.length === 0 &&
      backlogDiff.missing.length === 0,
    summary: summarizePack(pack),
    missingGoalIds,
    activeIntents: activeDiff,
    backlogIntents: backlogDiff,
    actual: {
      activeIntentIds: activeIds,
      backlogIntentIds: backlogIds,
    },
  };
}

function backupOfficialBacklogArtifacts(workspaceRoot, stampInput) {
  const artifacts = resolveGoalsArtifacts(workspaceRoot);
  const stamp = stampInput || new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(workspaceRoot, 'svfactory', 'backups', 'official-backlog', stamp);
  fs.mkdirSync(backupDir, { recursive: true });

  const copiedFiles = [];
  for (const filePath of [artifacts.statePath, artifacts.sqlitePath]) {
    if (!filePath || !fs.existsSync(filePath)) {
      continue;
    }
    const targetPath = path.join(backupDir, path.basename(filePath));
    fs.copyFileSync(filePath, targetPath);
    copiedFiles.push(targetPath);
  }

  return {
    backupDir,
    copiedFiles,
  };
}

function applyOfficialGoalsProjection(workspaceRoot, packInput) {
  const loaded = packInput ? { pack: packInput } : loadOfficialBacklogPack(workspaceRoot);
  const pack = loaded.pack;
  const validation = validateOfficialBacklogPack(workspaceRoot, pack);
  if (!validation.ok) {
    throw new Error(`Official backlog pack validation failed: ${JSON.stringify({
      missingGoalIds: validation.missingGoalIds,
      missingActiveIntents: validation.activeIntents.missing,
      missingBacklogIntents: validation.backlogIntents.missing,
    })}`);
  }

  const artifacts = resolveGoalsArtifacts(workspaceRoot);
  const goalRecords = resolveOfficialGoalRecords(workspaceRoot, pack);
  const nextState = {
    schema_version: '1.0.0',
    goals: goalRecords,
    source_files: {
      sqlite: artifacts.sqlitePath,
      state: artifacts.statePath,
    },
  };

  fs.mkdirSync(path.dirname(artifacts.statePath), { recursive: true });
  fs.writeFileSync(artifacts.statePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
  if (fs.existsSync(artifacts.sqlitePath)) {
    fs.rmSync(artifacts.sqlitePath, { force: true });
  }

  const hydrated = readGoalsState({ workspaceRoot });
  return {
    state: hydrated,
    summary: {
      totalGoals: hydrated.goals.length,
      activeGoals: hydrated.goals.filter((goal) => goal.state === 'active').length,
      plannedGoals: hydrated.goals.filter((goal) => goal.state === 'planned').length,
      deprecatedGoals: hydrated.goals.filter((goal) => goal.state === 'deprecated').length,
    },
  };
}

async function seedOfficialBacklogToKnowledgeGraph(workspaceRoot) {
  const previousCwd = process.cwd();
  process.chdir(workspaceRoot);
  try {
    const db = await connect();
    const stats = await seedGovernanceEntities(db);
    return {
      ok: true,
      stats,
    };
  } finally {
    process.chdir(previousCwd);
  }
}

function buildOfficialBacklogStatus(workspaceRoot) {
  const { packPath, pack } = loadOfficialBacklogPack(workspaceRoot);
  const validation = validateOfficialBacklogPack(workspaceRoot, pack);
  const goalsState = readGoalsState({ workspaceRoot });
  return {
    ok: validation.ok,
    packPath,
    packSummary: summarizePack(pack),
    validation,
    releaseLines: pack.release_lines || [],
    activeIntentIds: pack.active_intent_ids || [],
    backlogIntentIds: pack.backlog_intent_ids || [],
    goalsState: {
      totalGoals: goalsState.goals.length,
      systemGoals: goalsState.goals.filter((goal) => goal.entity_level === 'system').length,
      milestoneGoals: goalsState.goals.filter((goal) => goal.entity_level === 'milestone').length,
    },
  };
}

async function runOfficialBacklogResetAndSeed(workspaceRoot, options = {}) {
  if (!options.confirmed) {
    throw new Error('Official backlog reset requires confirmed=true.');
  }

  const { pack } = loadOfficialBacklogPack(workspaceRoot);
  const backup = backupOfficialBacklogArtifacts(workspaceRoot, options.backupTag);
  const projection = applyOfficialGoalsProjection(workspaceRoot, pack);
  const graph = await seedOfficialBacklogToKnowledgeGraph(workspaceRoot);
  const status = buildOfficialBacklogStatus(workspaceRoot);

  return {
    ok: true,
    backup,
    projection,
    graph,
    status,
  };
}

module.exports = {
  OFFICIAL_BACKLOG_PACK_RELATIVE_PATH,
  loadOfficialBacklogPack,
  summarizePack,
  validateOfficialBacklogPack,
  buildOfficialBacklogStatus,
  backupOfficialBacklogArtifacts,
  applyOfficialGoalsProjection,
  seedOfficialBacklogToKnowledgeGraph,
  runOfficialBacklogResetAndSeed,
};
