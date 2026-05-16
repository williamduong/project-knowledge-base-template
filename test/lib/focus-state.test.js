'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  FOCUS_STATE_SCHEMA_VERSION,
  FOCUS_STATE_DB_FILENAME,
  AUTO_SECTION_START,
  AUTO_SECTION_END,
  resolveFocusArtifacts,
  readFocusState,
  readFocusStateFromSqlite,
  writeFocusState,
} = require('../../src/lib/focus-state');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-focus-state-'));
}

test('resolveFocusArtifacts prefers svfactory when state file exists', () => {
  const root = tmpDir();
  const svfactoryRoot = path.join(root, 'svfactory');
  fs.mkdirSync(svfactoryRoot, { recursive: true });
  fs.writeFileSync(path.join(svfactoryRoot, 'focus.state.json'), '{}\n');

  const artifacts = resolveFocusArtifacts(root);
  assert.equal(artifacts.root, svfactoryRoot);
  assert.ok(artifacts.statePath.endsWith(path.join('svfactory', 'focus.state.json')));
});

test('readFocusState returns machine-readable current focus from focus.state.json', () => {
  const root = tmpDir();
  const svfactoryRoot = path.join(root, 'svfactory');
  fs.mkdirSync(svfactoryRoot, { recursive: true });
  fs.writeFileSync(path.join(svfactoryRoot, 'focus.state.json'), JSON.stringify({
    schema_version: '1.0.0',
    source_type: 'state-file',
    maintainer_focus: {
      version_target: 'v2.9 work',
      current_phase: 'UI shell',
      current_branch: 'intent/v2-9-ui',
    },
    current_focus: {
      intent_id: 'v2-9-ui',
      intent_state: 'branch-local',
      source: 'maintainer-manual',
      branch_name: 'intent/v2-9-ui',
    },
    checkpoint: {
      intent_id: 'v2-9-ui',
      event: 'sync',
      timestamp: '2026-05-16T00:00:00Z',
      branch: 'intent/v2-9-ui',
    },
  }, null, 2));

  const state = readFocusState({ workspaceRoot: root });
  assert.equal(state.schema_version, '1.0.0');
  assert.equal(state.current_focus.intent_id, 'v2-9-ui');
  assert.equal(state.current_focus.intent_state, 'branch-local');
  assert.equal(state.checkpoint.intent_id, 'v2-9-ui');
});

test('readFocusState falls back to markdown projection when no state file exists', () => {
  const root = tmpDir();
  const svfactoryRoot = path.join(root, 'svfactory');
  fs.mkdirSync(svfactoryRoot, { recursive: true });
  fs.writeFileSync(path.join(svfactoryRoot, 'focus.md'), [
    '# Focus',
    '',
    '## Active Version Target',
    '',
    'v2.8 planning',
    '',
    '## Current Phase',
    '',
    '**Version:** branch `intent/v2-8-plan`',
    '',
  ].join('\n'));

  const state = readFocusState({ workspaceRoot: root });
  assert.equal(state.schema_version, FOCUS_STATE_SCHEMA_VERSION);
  assert.equal(state.source_type, 'markdown-fallback');
  assert.equal(state.maintainer_focus.version_target, 'v2.8 planning');
  assert.equal(state.maintainer_focus.current_branch, 'intent/v2-8-plan');
  assert.equal(state.current_focus.intent_id, null);
});

test('readFocusState hydrates sqlite store from focus.state.json', () => {
  const root = tmpDir();
  const svfactoryRoot = path.join(root, 'svfactory');
  fs.mkdirSync(svfactoryRoot, { recursive: true });
  fs.writeFileSync(path.join(svfactoryRoot, 'focus.state.json'), JSON.stringify({
    schema_version: '1.0.0',
    source_type: 'state-file',
    maintainer_focus: {
      version_target: 'v2.9',
      current_phase: 'Phase 2',
      current_branch: 'intent/v2-9-ui',
    },
    current_focus: {
      intent_id: 'v2-9-ui',
      intent_state: 'branch-local',
      source: 'maintainer-manual',
      branch_name: 'intent/v2-9-ui',
    },
    checkpoint: null,
  }, null, 2));

  const state = readFocusState({ workspaceRoot: root });
  assert.equal(state.current_focus.intent_id, 'v2-9-ui');

  const sqlitePath = path.join(svfactoryRoot, FOCUS_STATE_DB_FILENAME);
  assert.equal(fs.existsSync(sqlitePath), true);

  const sqliteState = readFocusStateFromSqlite(sqlitePath);
  assert.equal(sqliteState.current_focus.intent_id, 'v2-9-ui');
  assert.equal(sqliteState.maintainer_focus.current_branch, 'intent/v2-9-ui');
});

test('writeFocusState persists sqlite first and projects json plus markdown section', () => {
  const root = tmpDir();
  const svfactoryRoot = path.join(root, 'svfactory');
  fs.mkdirSync(svfactoryRoot, { recursive: true });
  fs.writeFileSync(path.join(svfactoryRoot, 'focus.md'), '# Focus\n\n## Notes\n\nManual content stays here.\n');

  const nextState = writeFocusState({
    workspaceRoot: root,
    branchName: 'intent/v3-0-phase3',
    state: {
      source_type: 'state-file',
      maintainer_focus: {
        version_target: 'v3.0',
        current_phase: 'Phase 3',
        current_branch: 'intent/v3-0-phase3',
      },
      current_focus: {
        intent_id: 'v3-0-phase3',
        intent_state: 'active',
        source: 'api',
        branch_name: 'intent/v3-0-phase3',
      },
      checkpoint: {
        intent_id: 'v3-0-phase3',
        event: 'writer-test',
        timestamp: '2026-05-16T12:00:00Z',
        branch: 'intent/v3-0-phase3',
      },
    },
  });

  assert.equal(nextState.current_focus.intent_id, 'v3-0-phase3');

  const sqlitePath = path.join(svfactoryRoot, FOCUS_STATE_DB_FILENAME);
  const sqliteState = readFocusStateFromSqlite(sqlitePath);
  assert.equal(sqliteState.current_focus.intent_id, 'v3-0-phase3');

  const jsonState = JSON.parse(fs.readFileSync(path.join(svfactoryRoot, 'focus.state.json'), 'utf8'));
  assert.equal(jsonState.current_focus.intent_id, 'v3-0-phase3');

  const markdown = fs.readFileSync(path.join(svfactoryRoot, 'focus.md'), 'utf8');
  assert.match(markdown, new RegExp(AUTO_SECTION_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(markdown, new RegExp(AUTO_SECTION_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(markdown, /v3-0-phase3/);
});
