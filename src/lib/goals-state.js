'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const GOALS_STATE_SCHEMA_VERSION = '1.1.0';
const GOALS_STATE_DB_FILENAME = 'goals-state.db';
const GOALS_STATE_JSON_FILENAME = 'goals.state.json';

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function generateGoalId(entityLevel, entityId) {
  const level = sanitizeKey(entityLevel) || 'goal';
  const owner = sanitizeKey(entityId) || 'owner';
  const entropy = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `g-${level}-${owner}-${entropy}`;
}

function resolveGoalsArtifacts(workspaceRoot) {
  const roots = [
    path.join(workspaceRoot, 'svfactory'),
    path.join(workspaceRoot, 'kb-root'),
  ];

  for (const root of roots) {
    const sqlitePath = path.join(root, GOALS_STATE_DB_FILENAME);
    const statePath = path.join(root, GOALS_STATE_JSON_FILENAME);
    if (fs.existsSync(sqlitePath) || fs.existsSync(statePath)) {
      return { root, sqlitePath, statePath };
    }
  }

  const root = path.join(workspaceRoot, 'svfactory');
  return {
    root,
    sqlitePath: path.join(root, GOALS_STATE_DB_FILENAME),
    statePath: path.join(root, GOALS_STATE_JSON_FILENAME),
  };
}

function ensureGoalsDb(sqlitePath) {
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  const db = new DatabaseSync(sqlitePath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals_registry (
      id TEXT PRIMARY KEY,
      entity_level TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      parent_goal_id TEXT,
      goal_kind TEXT NOT NULL DEFAULT 'objective',
      title TEXT NOT NULL,
      description TEXT,
      success_criteria TEXT NOT NULL DEFAULT '',
      key_result_metric TEXT NOT NULL DEFAULT '',
      key_result_target TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL,
      rank INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_goals_registry_entity
      ON goals_registry (entity_level, entity_id, rank, created_at);
    CREATE INDEX IF NOT EXISTS idx_goals_registry_parent
      ON goals_registry (parent_goal_id);
  `);
  const columns = db.prepare(`PRAGMA table_info(goals_registry)`).all();
  const columnNames = new Set(columns.map((column) => String(column.name)));
  if (!columnNames.has('goal_kind')) {
    db.exec(`ALTER TABLE goals_registry ADD COLUMN goal_kind TEXT NOT NULL DEFAULT 'objective';`);
  }
  if (!columnNames.has('success_criteria')) {
    db.exec(`ALTER TABLE goals_registry ADD COLUMN success_criteria TEXT NOT NULL DEFAULT '';`);
  }
  if (!columnNames.has('key_result_metric')) {
    db.exec(`ALTER TABLE goals_registry ADD COLUMN key_result_metric TEXT NOT NULL DEFAULT '';`);
  }
  if (!columnNames.has('key_result_target')) {
    db.exec(`ALTER TABLE goals_registry ADD COLUMN key_result_target TEXT NOT NULL DEFAULT '';`);
  }
  db.prepare(`
    INSERT OR IGNORE INTO goals_meta (key, value)
    VALUES ('schema_version', ?)
  `).run(GOALS_STATE_SCHEMA_VERSION);
  return db;
}

function readJsonFileSafe(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function normalizeGoalRecord(goal) {
  const record = isObject(goal) ? goal : {};
  const now = new Date().toISOString();
  return {
    id: String(record.id || '').trim() || generateGoalId(record.entity_level, record.entity_id),
    entity_level: String(record.entity_level || '').trim(),
    entity_id: String(record.entity_id || '').trim(),
    parent_goal_id: record.parent_goal_id ? String(record.parent_goal_id).trim() : null,
    goal_kind: String(record.goal_kind || 'objective').trim() || 'objective',
    title: String(record.title || '').trim(),
    description: record.description == null ? '' : String(record.description).trim(),
    success_criteria: record.success_criteria == null ? '' : String(record.success_criteria).trim(),
    key_result_metric: record.key_result_metric == null ? '' : String(record.key_result_metric).trim(),
    key_result_target: record.key_result_target == null ? '' : String(record.key_result_target).trim(),
    state: String(record.state || 'active').trim() || 'active',
    rank: Number.isFinite(Number(record.rank)) ? Number(record.rank) : 0,
    created_at: String(record.created_at || now).trim() || now,
    updated_at: String(record.updated_at || now).trim() || now,
  };
}

function rowToGoalRecord(row) {
  return normalizeGoalRecord(row);
}

function readAllGoalsFromDb(sqlitePath) {
  if (!sqlitePath || !fs.existsSync(sqlitePath)) {
    return [];
  }

  const db = ensureGoalsDb(sqlitePath);
  try {
    return db.prepare(`
      SELECT
        id,
        entity_level,
        entity_id,
        parent_goal_id,
        goal_kind,
        title,
        description,
        success_criteria,
        key_result_metric,
        key_result_target,
        state,
        rank,
        created_at,
        updated_at
      FROM goals_registry
      ORDER BY entity_level, entity_id, rank, created_at
    `).all().map(rowToGoalRecord);
  } finally {
    db.close();
  }
}

function writeGoalsProjection(statePath, state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function hydrateGoalsDbFromJson(sqlitePath, jsonState) {
  if (!jsonState || !Array.isArray(jsonState.goals) || jsonState.goals.length === 0) {
    return;
  }

  const db = ensureGoalsDb(sqlitePath);
  try {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO goals_registry (
        id,
        entity_level,
        entity_id,
        parent_goal_id,
        goal_kind,
        title,
        description,
        success_criteria,
        key_result_metric,
        key_result_target,
        state,
        rank,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of jsonState.goals) {
      const goal = normalizeGoalRecord(item);
      if (!goal.entity_level || !goal.entity_id || !goal.title) {
        continue;
      }
      insert.run(
        goal.id,
        goal.entity_level,
        goal.entity_id,
        goal.parent_goal_id,
        goal.goal_kind,
        goal.title,
        goal.description,
        goal.success_criteria,
        goal.key_result_metric,
        goal.key_result_target,
        goal.state,
        goal.rank,
        goal.created_at,
        goal.updated_at,
      );
    }
  } finally {
    db.close();
  }
}

function readGoalsState({ workspaceRoot }) {
  const artifacts = resolveGoalsArtifacts(workspaceRoot);
  if (!fs.existsSync(artifacts.sqlitePath) && fs.existsSync(artifacts.statePath)) {
    hydrateGoalsDbFromJson(artifacts.sqlitePath, readJsonFileSafe(artifacts.statePath));
  }

  const goals = readAllGoalsFromDb(artifacts.sqlitePath);
  const state = {
    schema_version: GOALS_STATE_SCHEMA_VERSION,
    goals,
    source_files: {
      sqlite: artifacts.sqlitePath,
      state: artifacts.statePath,
    },
  };
  writeGoalsProjection(artifacts.statePath, state);
  return state;
}

function syncGoalsProjection(workspaceRoot) {
  const artifacts = resolveGoalsArtifacts(workspaceRoot);
  const state = {
    schema_version: GOALS_STATE_SCHEMA_VERSION,
    goals: readAllGoalsFromDb(artifacts.sqlitePath),
    source_files: {
      sqlite: artifacts.sqlitePath,
      state: artifacts.statePath,
    },
  };
  writeGoalsProjection(artifacts.statePath, state);
  return state;
}

function createGoal({ workspaceRoot, goal }) {
  const artifacts = resolveGoalsArtifacts(workspaceRoot);
  const db = ensureGoalsDb(artifacts.sqlitePath);
  try {
    const record = normalizeGoalRecord(goal);
    if (!record.entity_level || !record.entity_id) {
      throw new Error('Goal entity_level and entity_id are required.');
    }
    if (!record.title) {
      throw new Error('Goal title is required.');
    }

    db.prepare(`
      INSERT INTO goals_registry (
        id,
        entity_level,
        entity_id,
        parent_goal_id,
        goal_kind,
        title,
        description,
        success_criteria,
        key_result_metric,
        key_result_target,
        state,
        rank,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.entity_level,
      record.entity_id,
      record.parent_goal_id,
      record.goal_kind,
      record.title,
      record.description,
      record.success_criteria,
      record.key_result_metric,
      record.key_result_target,
      record.state,
      record.rank,
      record.created_at,
      record.updated_at,
    );
    return record;
  } finally {
    db.close();
    syncGoalsProjection(workspaceRoot);
  }
}

function updateGoal({ workspaceRoot, goalId, patch }) {
  const artifacts = resolveGoalsArtifacts(workspaceRoot);
  const db = ensureGoalsDb(artifacts.sqlitePath);
  try {
    const row = db.prepare(`SELECT * FROM goals_registry WHERE id = ?`).get(goalId);
    if (!row) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const current = rowToGoalRecord(row);
    const next = normalizeGoalRecord({
      ...current,
      ...patch,
      id: current.id,
      created_at: current.created_at,
      updated_at: new Date().toISOString(),
    });

    if (!next.title) {
      throw new Error('Goal title is required.');
    }

    db.prepare(`
      UPDATE goals_registry
      SET
        parent_goal_id = ?,
        goal_kind = ?,
        title = ?,
        description = ?,
        success_criteria = ?,
        key_result_metric = ?,
        key_result_target = ?,
        state = ?,
        rank = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      next.parent_goal_id,
      next.goal_kind,
      next.title,
      next.description,
      next.success_criteria,
      next.key_result_metric,
      next.key_result_target,
      next.state,
      next.rank,
      next.updated_at,
      goalId,
    );

    return next;
  } finally {
    db.close();
    syncGoalsProjection(workspaceRoot);
  }
}

function deleteGoal({ workspaceRoot, goalId }) {
  const artifacts = resolveGoalsArtifacts(workspaceRoot);
  const db = ensureGoalsDb(artifacts.sqlitePath);
  try {
    const row = db.prepare(`SELECT * FROM goals_registry WHERE id = ?`).get(goalId);
    if (!row) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const childCountRow = db.prepare(`
      SELECT COUNT(*) AS count
      FROM goals_registry
      WHERE parent_goal_id = ?
    `).get(goalId);

    const childCount = Number(childCountRow?.count || 0);
    if (childCount > 0) {
      const error = new Error(`Cannot delete parent goal "${goalId}" while ${childCount} child goal(s) still reference it.`);
      error.code = 'GOAL_HAS_CHILDREN';
      throw error;
    }

    db.prepare(`DELETE FROM goals_registry WHERE id = ?`).run(goalId);
    return rowToGoalRecord(row);
  } finally {
    db.close();
    syncGoalsProjection(workspaceRoot);
  }
}

function listGoalsForEntity(state, entityLevel, entityId) {
  const goals = Array.isArray(state?.goals) ? state.goals : [];
  return goals.filter((goal) => goal.entity_level === entityLevel && goal.entity_id === entityId);
}

function replaceAllGoals({ workspaceRoot, goals }) {
  const artifacts = resolveGoalsArtifacts(workspaceRoot);
  const db = ensureGoalsDb(artifacts.sqlitePath);
  try {
    db.exec('DELETE FROM goals_registry;');
    const insert = db.prepare(`
      INSERT INTO goals_registry (
        id,
        entity_level,
        entity_id,
        parent_goal_id,
        goal_kind,
        title,
        description,
        success_criteria,
        key_result_metric,
        key_result_target,
        state,
        rank,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of Array.isArray(goals) ? goals : []) {
      const goal = normalizeGoalRecord(item);
      if (!goal.entity_level || !goal.entity_id || !goal.title) {
        continue;
      }
      insert.run(
        goal.id,
        goal.entity_level,
        goal.entity_id,
        goal.parent_goal_id,
        goal.goal_kind,
        goal.title,
        goal.description,
        goal.success_criteria,
        goal.key_result_metric,
        goal.key_result_target,
        goal.state,
        goal.rank,
        goal.created_at,
        goal.updated_at,
      );
    }
  } finally {
    db.close();
    syncGoalsProjection(workspaceRoot);
  }
}

module.exports = {
  GOALS_STATE_SCHEMA_VERSION,
  GOALS_STATE_DB_FILENAME,
  resolveGoalsArtifacts,
  readGoalsState,
  syncGoalsProjection,
  createGoal,
  updateGoal,
  deleteGoal,
  listGoalsForEntity,
  replaceAllGoals,
  generateGoalId,
};
