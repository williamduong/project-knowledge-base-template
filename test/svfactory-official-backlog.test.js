'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  applyOfficialGoalsProjection,
  buildOfficialBacklogStatus,
  validateOfficialBacklogPack,
} = require('../src/lib/svfactory-official-backlog');

function makeWorkspaceFixture() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'svfactory-official-backlog-'));

  fs.mkdirSync(path.join(workspaceRoot, 'svfactory'), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, 'knowledge-base', 'intents', '_active', 'v1-0-active-intent'), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, 'knowledge-base', 'intents', '_backlog'), { recursive: true });

  fs.writeFileSync(path.join(workspaceRoot, 'knowledge-base', 'intents', '_active', 'v1-0-active-intent', 'intent.md'), '---\nid: v1-0-active-intent\n---\n', 'utf8');
  fs.writeFileSync(path.join(workspaceRoot, 'knowledge-base', 'intents', '_backlog', 'v1-1-backlog-intent.md'), '---\nslug: v1-1-backlog-intent\n---\n', 'utf8');

  const goalsState = {
    schema_version: '1.0.0',
    goals: [
      {
        id: 'g-system-a',
        entity_level: 'system',
        entity_id: 'workspace',
        parent_goal_id: null,
        title: 'System A',
        description: 'Root system goal',
        state: 'active',
        rank: 1,
        created_at: '2026-05-27T00:00:00Z',
        updated_at: '2026-05-27T00:00:00Z',
      },
      {
        id: 'g-milestone-a',
        entity_level: 'milestone',
        entity_id: 'v1-0',
        parent_goal_id: 'g-system-a',
        title: 'Milestone A',
        description: 'Milestone goal',
        state: 'planned',
        rank: 1,
        created_at: '2026-05-27T00:00:00Z',
        updated_at: '2026-05-27T00:00:00Z',
      },
      {
        id: 'g-milestone-legacy',
        entity_level: 'milestone',
        entity_id: 'legacy',
        parent_goal_id: null,
        title: 'Legacy Goal',
        description: 'Historical tombstone',
        state: 'deprecated',
        rank: 99,
        created_at: '2026-05-27T00:00:00Z',
        updated_at: '2026-05-27T00:00:00Z',
      },
    ],
    source_files: {
      sqlite: path.join(workspaceRoot, 'svfactory', 'goals-state.db'),
      state: path.join(workspaceRoot, 'svfactory', 'goals.state.json'),
    },
  };

  fs.writeFileSync(path.join(workspaceRoot, 'svfactory', 'goals.state.json'), `${JSON.stringify(goalsState, null, 2)}\n`, 'utf8');

  const pack = {
    schema_version: '1.0.0',
    goal_ids: ['g-system-a', 'g-milestone-a'],
    release_lines: [{ id: 'v1-0', label: 'v1.0', sources: ['goals', 'intents'] }],
    active_intent_ids: ['v1-0-active-intent'],
    backlog_intent_ids: ['v1-1-backlog-intent'],
  };
  fs.writeFileSync(path.join(workspaceRoot, 'svfactory', 'official-backlog.seed.json'), `${JSON.stringify(pack, null, 2)}\n`, 'utf8');

  return workspaceRoot;
}

test('validateOfficialBacklogPack reports pack coverage and drift', () => {
  const workspaceRoot = makeWorkspaceFixture();

  const result = validateOfficialBacklogPack(workspaceRoot);

  assert.equal(result.ok, true);
  assert.equal(result.summary.goalCount, 2);
  assert.deepEqual(result.missingGoalIds, []);
  assert.deepEqual(result.activeIntents.missing, []);
  assert.deepEqual(result.backlogIntents.missing, []);
  assert.deepEqual(result.activeIntents.unexpected, []);
  assert.deepEqual(result.backlogIntents.unexpected, []);
});

test('applyOfficialGoalsProjection rebuilds the projected goals state from the official pack', () => {
  const workspaceRoot = makeWorkspaceFixture();

  const result = applyOfficialGoalsProjection(workspaceRoot);

  assert.equal(result.summary.totalGoals, 2);
  assert.equal(result.summary.activeGoals, 1);
  assert.equal(result.summary.plannedGoals, 1);
  assert.equal(result.summary.deprecatedGoals, 0);

  const status = buildOfficialBacklogStatus(workspaceRoot);
  assert.equal(status.ok, true);
  assert.equal(status.goalsState.totalGoals, 2);
  assert.equal(status.goalsState.systemGoals, 1);
  assert.equal(status.goalsState.milestoneGoals, 1);
});
