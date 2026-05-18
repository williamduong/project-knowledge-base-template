'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  readGoalsState,
  createGoal,
  updateGoal,
  deleteGoal,
  listGoalsForEntity,
} = require('../../src/lib/goals-state');

function tmpWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-goals-'));
  fs.mkdirSync(path.join(root, 'svfactory'), { recursive: true });
  return root;
}

test('goals-state can create, update, and list multiple goals per entity', () => {
  const workspaceRoot = tmpWorkspace();

  const systemGoal = createGoal({
    workspaceRoot,
    goal: {
      entity_level: 'system',
      entity_id: 'workspace',
      title: 'Stabilize operator experience',
      description: 'No surprising runtime side effects',
    },
  });

  const milestoneGoal = createGoal({
    workspaceRoot,
    goal: {
      entity_level: 'milestone',
      entity_id: 'v2-9',
      parent_goal_id: systemGoal.id,
      title: 'Ship UIV2 runtime shell',
      description: 'Bridge + UI work bundled safely',
    },
  });

  createGoal({
    workspaceRoot,
    goal: {
      entity_level: 'intent',
      entity_id: 'v2-9-demo',
      parent_goal_id: milestoneGoal.id,
      title: 'Implement intent registry workspace',
    },
  });

  updateGoal({
    workspaceRoot,
    goalId: milestoneGoal.id,
    patch: {
      description: 'Bridge + UIV2 shell work bundled safely',
    },
  });

  const state = readGoalsState({ workspaceRoot });
  const systemGoals = listGoalsForEntity(state, 'system', 'workspace');
  const milestoneGoals = listGoalsForEntity(state, 'milestone', 'v2-9');

  assert.equal(systemGoals.length, 1);
  assert.equal(milestoneGoals.length, 1);
  assert.match(milestoneGoals[0].description, /UIV2 shell/);
});

test('goals-state blocks deleting a parent goal while child goals still exist', () => {
  const workspaceRoot = tmpWorkspace();

  const parent = createGoal({
    workspaceRoot,
    goal: {
      entity_level: 'system',
      entity_id: 'workspace',
      title: 'Keep OKR tree aligned',
    },
  });

  createGoal({
    workspaceRoot,
    goal: {
      entity_level: 'milestone',
      entity_id: 'v2-10',
      parent_goal_id: parent.id,
      title: 'Attach milestone goals',
    },
  });

  assert.throws(
    () => deleteGoal({ workspaceRoot, goalId: parent.id }),
    /Cannot delete parent goal/,
  );
});
