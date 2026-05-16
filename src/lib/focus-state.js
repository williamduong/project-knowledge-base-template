'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const FOCUS_STATE_SCHEMA_VERSION = '1.0.0';
const FOCUS_STATE_DB_FILENAME = 'focus-state.db';
const AUTO_SECTION_START = '<!-- FOCUS_STATE_AUTO_START -->';
const AUTO_SECTION_END = '<!-- FOCUS_STATE_AUTO_END -->';

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function readTextFileSafe(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }

    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function resolveFocusArtifacts(workspaceRoot) {
  const roots = [
    path.join(workspaceRoot, 'svfactory'),
    path.join(workspaceRoot, 'kb-root'),
  ];

  for (const root of roots) {
    const statePath = path.join(root, 'focus.state.json');
    const sqlitePath = path.join(root, FOCUS_STATE_DB_FILENAME);
    const markdownPath = path.join(root, 'focus.md');
    if (fs.existsSync(sqlitePath) || fs.existsSync(statePath) || fs.existsSync(markdownPath)) {
      return {
        root,
        sqlitePath: sqlitePath,
        statePath: fs.existsSync(statePath) ? statePath : null,
        markdownPath: fs.existsSync(markdownPath) ? markdownPath : null,
      };
    }
  }

  return {
    root: null,
    sqlitePath: null,
    statePath: null,
    markdownPath: null,
  };
}

function ensureFocusStateDb(sqlitePath) {
  if (!sqlitePath) {
    return null;
  }

  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  const db = new DatabaseSync(sqlitePath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS focus_state_snapshot (
      singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
      schema_version TEXT NOT NULL,
      source_type TEXT NOT NULL,
      maintainer_focus_json TEXT NOT NULL,
      current_focus_json TEXT NOT NULL,
      checkpoint_json TEXT,
      updated_at TEXT NOT NULL
    )
  `);
  return db;
}

function writeFocusStateToSqlite(sqlitePath, state) {
  const db = ensureFocusStateDb(sqlitePath);
  if (!db) {
    return;
  }

  try {
    const statement = db.prepare(`
      INSERT INTO focus_state_snapshot (
        singleton_id,
        schema_version,
        source_type,
        maintainer_focus_json,
        current_focus_json,
        checkpoint_json,
        updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(singleton_id) DO UPDATE SET
        schema_version = excluded.schema_version,
        source_type = excluded.source_type,
        maintainer_focus_json = excluded.maintainer_focus_json,
        current_focus_json = excluded.current_focus_json,
        checkpoint_json = excluded.checkpoint_json,
        updated_at = excluded.updated_at
    `);

    statement.run(
      state.schema_version || FOCUS_STATE_SCHEMA_VERSION,
      state.source_type || 'state-file',
      JSON.stringify(isObject(state.maintainer_focus) ? state.maintainer_focus : {}),
      JSON.stringify(isObject(state.current_focus) ? state.current_focus : {}),
      JSON.stringify(isObject(state.checkpoint) ? state.checkpoint : null),
      new Date().toISOString()
    );
  } finally {
    db.close();
  }
}

function readFocusStateFromSqlite(sqlitePath) {
  if (!sqlitePath || !fs.existsSync(sqlitePath)) {
    return null;
  }

  const db = ensureFocusStateDb(sqlitePath);
  if (!db) {
    return null;
  }

  try {
    const row = db.prepare(`
      SELECT
        schema_version,
        source_type,
        maintainer_focus_json,
        current_focus_json,
        checkpoint_json
      FROM focus_state_snapshot
      WHERE singleton_id = 1
    `).get();

    if (!row) {
      return null;
    }

    return {
      schema_version: row.schema_version,
      source_type: row.source_type,
      maintainer_focus: parseJsonFileValue(row.maintainer_focus_json, {}),
      current_focus: parseJsonFileValue(row.current_focus_json, {}),
      checkpoint: parseJsonFileValue(row.checkpoint_json, null),
    };
  } finally {
    db.close();
  }
}

function parseJsonFileValue(value, fallbackValue) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallbackValue;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallbackValue;
  }
}

function extractSection(markdown, heading) {
  const lines = String(markdown || '').split(/\r?\n/);
  const target = `## ${heading}`.trim().toLowerCase();
  const startIndex = lines.findIndex((line) => line.trim().toLowerCase() === target);

  if (startIndex === -1) {
    return '';
  }

  const collected = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line.trim())) {
      break;
    }
    collected.push(line);
  }

  return collected.join('\n').trim();
}

function parseFocusMarkdown(markdownPath) {
  const markdown = readTextFileSafe(markdownPath);
  if (!markdown) {
    return null;
  }

  const versionTarget = extractSection(markdown, 'Active Version Target')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || null;

  const currentPhase = extractSection(markdown, 'Current Phase');
  const branchMatch = currentPhase.match(/`([^`]+)`/);

  return {
    schema_version: FOCUS_STATE_SCHEMA_VERSION,
    source_type: 'markdown-fallback',
    maintainer_focus: {
      version_target: versionTarget,
      current_phase: currentPhase || null,
      current_branch: branchMatch ? branchMatch[1] : null,
    },
    current_focus: null,
    checkpoint: null,
    source_files: {
      markdown: markdownPath,
      state: null,
    },
  };
}

function normalizeCurrentFocus(currentFocus, branchName) {
  const record = isObject(currentFocus) ? currentFocus : {};
  const branch = typeof branchName === 'string' && branchName.trim()
    ? branchName.trim()
    : typeof record.branch_name === 'string' && record.branch_name.trim()
      ? record.branch_name.trim()
      : null;

  const intentId = typeof record.intent_id === 'string' && record.intent_id.trim()
    ? record.intent_id.trim()
    : null;

  const intentState = typeof record.intent_state === 'string' && record.intent_state.trim()
    ? record.intent_state.trim()
    : null;

  const source = typeof record.source === 'string' && record.source.trim()
    ? record.source.trim()
    : intentId
      ? 'state-file'
      : null;

  return {
    intent_id: intentId,
    intent_state: intentState,
    source,
    branch_name: branch,
    label: typeof record.label === 'string' && record.label.trim() ? record.label.trim() : null,
  };
}

function normalizeCheckpoint(checkpoint) {
  const record = isObject(checkpoint) ? checkpoint : {};
  return {
    intent_id: typeof record.intent_id === 'string' && record.intent_id.trim() ? record.intent_id.trim() : null,
    event: typeof record.event === 'string' && record.event.trim() ? record.event.trim() : null,
    timestamp: typeof record.timestamp === 'string' && record.timestamp.trim() ? record.timestamp.trim() : null,
    branch: typeof record.branch === 'string' && record.branch.trim() ? record.branch.trim() : null,
  };
}

function normalizeMaintainerFocus(maintainerFocus) {
  const record = isObject(maintainerFocus) ? maintainerFocus : {};
  return {
    version_target: typeof record.version_target === 'string' && record.version_target.trim() ? record.version_target.trim() : null,
    current_phase: typeof record.current_phase === 'string' && record.current_phase.trim() ? record.current_phase.trim() : null,
    current_branch: typeof record.current_branch === 'string' && record.current_branch.trim() ? record.current_branch.trim() : null,
  };
}

function normalizeFocusState(rawState, artifacts, branchName) {
  const state = isObject(rawState) ? rawState : {};
  return {
    schema_version: typeof state.schema_version === 'string' && state.schema_version.trim()
      ? state.schema_version.trim()
      : FOCUS_STATE_SCHEMA_VERSION,
    source_type: typeof state.source_type === 'string' && state.source_type.trim()
      ? state.source_type.trim()
      : 'state-file',
    maintainer_focus: normalizeMaintainerFocus(state.maintainer_focus),
    current_focus: normalizeCurrentFocus(state.current_focus, branchName),
    checkpoint: normalizeCheckpoint(state.checkpoint),
    source_files: {
      sqlite: artifacts.sqlitePath,
      state: artifacts.statePath,
      markdown: artifacts.markdownPath,
    },
  };
}

function buildDefaultArtifacts(workspaceRoot) {
  const root = path.join(workspaceRoot, 'svfactory');
  return {
    root,
    sqlitePath: path.join(root, FOCUS_STATE_DB_FILENAME),
    statePath: path.join(root, 'focus.state.json'),
    markdownPath: path.join(root, 'focus.md'),
  };
}

function mergeFocusState(baseState, partialState) {
  const base = isObject(baseState) ? baseState : {};
  const partial = isObject(partialState) ? partialState : {};

  return {
    schema_version: partial.schema_version ?? base.schema_version ?? FOCUS_STATE_SCHEMA_VERSION,
    source_type: partial.source_type ?? base.source_type ?? 'state-file',
    maintainer_focus: {
      ...(isObject(base.maintainer_focus) ? base.maintainer_focus : {}),
      ...(isObject(partial.maintainer_focus) ? partial.maintainer_focus : {}),
    },
    current_focus: {
      ...(isObject(base.current_focus) ? base.current_focus : {}),
      ...(isObject(partial.current_focus) ? partial.current_focus : {}),
    },
    checkpoint: partial.checkpoint === null
      ? null
      : {
          ...(isObject(base.checkpoint) ? base.checkpoint : {}),
          ...(isObject(partial.checkpoint) ? partial.checkpoint : {}),
        },
  };
}

function buildAutoProjectionSection(state) {
  const currentFocus = isObject(state.current_focus) ? state.current_focus : {};
  const checkpoint = isObject(state.checkpoint) ? state.checkpoint : {};
  const maintainerFocus = isObject(state.maintainer_focus) ? state.maintainer_focus : {};

  const lines = [
    '## Runtime Focus Projection',
    '',
    AUTO_SECTION_START,
    `- Intent: ${currentFocus.intent_id ? `\`${currentFocus.intent_id}\`` : '`none`'}`,
    `- State: ${currentFocus.intent_state ? `\`${currentFocus.intent_state}\`` : '`unknown`'}`,
    `- Source: ${currentFocus.source ? `\`${currentFocus.source}\`` : '`unknown`'}`,
    `- Branch: ${currentFocus.branch_name ? `\`${currentFocus.branch_name}\`` : '`unknown`'}`,
    `- Checkpoint Intent: ${checkpoint.intent_id ? `\`${checkpoint.intent_id}\`` : '`none`'}`,
    `- Checkpoint Event: ${checkpoint.event ? `\`${checkpoint.event}\`` : '`none`'}`,
    `- Checkpoint Timestamp: ${checkpoint.timestamp ? `\`${checkpoint.timestamp}\`` : '`none`'}`,
    `- Maintainer Version Target: ${maintainerFocus.version_target ? maintainerFocus.version_target : 'none'}`,
    AUTO_SECTION_END,
    '',
  ];

  return lines.join('\n');
}

function writeFocusStateJson(filePath, state) {
  if (!filePath) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function writeFocusMarkdownProjection(filePath, state) {
  if (!filePath) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const nextSection = buildAutoProjectionSection(state);
  const existing = readTextFileSafe(filePath);

  if (!existing) {
    fs.writeFileSync(filePath, [
      '# Focus — Current State',
      '',
      '> Maintainer-readable focus projection.',
      '',
      nextSection,
    ].join('\n'), 'utf8');
    return;
  }

  const startIndex = existing.indexOf(AUTO_SECTION_START);
  const endIndex = existing.indexOf(AUTO_SECTION_END);

  if (startIndex >= 0 && endIndex > startIndex) {
    const sectionStart = existing.lastIndexOf('## ', startIndex);
    const prefix = sectionStart >= 0 ? existing.slice(0, sectionStart).replace(/\s*$/, '') : existing.slice(0, startIndex).replace(/\s*$/, '');
    const suffix = existing.slice(endIndex + AUTO_SECTION_END.length).replace(/^\s*/, '\n\n');
    fs.writeFileSync(filePath, `${prefix}\n\n${nextSection}${suffix}`.trimEnd() + '\n', 'utf8');
    return;
  }

  fs.writeFileSync(filePath, `${existing.replace(/\s*$/, '')}\n\n${nextSection}`, 'utf8');
}

function readFocusState({ workspaceRoot, branchName } = {}) {
  const artifacts = resolveFocusArtifacts(workspaceRoot);

  const sqliteState = readFocusStateFromSqlite(artifacts.sqlitePath);
  if (sqliteState) {
    return normalizeFocusState(sqliteState, artifacts, branchName);
  }

  if (artifacts.statePath) {
    const parsed = readJsonFileSafe(artifacts.statePath);
    if (parsed) {
      writeFocusStateToSqlite(artifacts.sqlitePath, parsed);
      return normalizeFocusState(parsed, artifacts, branchName);
    }
  }

  const markdownFallback = parseFocusMarkdown(artifacts.markdownPath);
  if (markdownFallback) {
    writeFocusStateToSqlite(artifacts.sqlitePath, markdownFallback);
    return normalizeFocusState(markdownFallback, artifacts, branchName);
  }

  return normalizeFocusState(null, artifacts, branchName);
}

function writeFocusState({ workspaceRoot, state, branchName, syncMarkdown = true } = {}) {
  if (!workspaceRoot) {
    throw new Error('workspaceRoot is required');
  }

  const detectedArtifacts = resolveFocusArtifacts(workspaceRoot);
  const defaultArtifacts = buildDefaultArtifacts(workspaceRoot);
  const artifacts = detectedArtifacts.root
    ? {
        ...defaultArtifacts,
        ...detectedArtifacts,
        sqlitePath: detectedArtifacts.sqlitePath || defaultArtifacts.sqlitePath,
        statePath: detectedArtifacts.statePath || defaultArtifacts.statePath,
        markdownPath: detectedArtifacts.markdownPath || defaultArtifacts.markdownPath,
      }
    : defaultArtifacts;
  const existingState = readFocusState({ workspaceRoot, branchName });
  const merged = mergeFocusState(existingState, state);
  const normalized = normalizeFocusState(merged, artifacts, branchName);

  writeFocusStateToSqlite(artifacts.sqlitePath, normalized);
  writeFocusStateJson(artifacts.statePath, normalized);
  if (syncMarkdown) {
    writeFocusMarkdownProjection(artifacts.markdownPath, normalized);
  }

  return normalized;
}

module.exports = {
  FOCUS_STATE_SCHEMA_VERSION,
  FOCUS_STATE_DB_FILENAME,
  AUTO_SECTION_START,
  AUTO_SECTION_END,
  resolveFocusArtifacts,
  readFocusStateFromSqlite,
  writeFocusStateToSqlite,
  readFocusState,
  writeFocusState,
};
