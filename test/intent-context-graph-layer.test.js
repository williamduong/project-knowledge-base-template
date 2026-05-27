'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildIntentGraphProjection } = require('../src/lib/intent-context-graph-layer.js');

test('buildIntentGraphProjection creates intent, milestone, version, and edge projections', () => {
  const projection = buildIntentGraphProjection({
    intents: [
      {
        id: 'v2-10-code-graph',
        title: 'Code Graph',
        lifecycle: 'active',
        taskCount: 2,
        taskDoneCount: 1,
        goalText: 'Build graph infrastructure.',
      },
      {
        id: 'v3-0-dna-graph-ontology-boundary',
        title: 'DNA Boundary',
        lifecycle: 'backlog',
        taskCount: 1,
        taskDoneCount: 0,
        goalText: 'Clarify DNA/graph boundary.',
      },
    ],
    goalsState: {
      goals: [
        {
          id: 'g-intent-code-graph',
          entity_level: 'intent',
          entity_id: 'v2-10-code-graph',
          parent_goal_id: 'g-milestone-v2-10',
          title: 'Intent goal',
          description: '',
          state: 'active',
          created_at: '2026-05-27T00:00:00.000Z',
          updated_at: '2026-05-27T00:00:00.000Z',
        },
        {
          id: 'g-task-seed',
          entity_level: 'task',
          entity_id: 'v2-10-code-graph::plan::001::seed-official-backlog',
          parent_goal_id: 'g-intent-code-graph',
          title: 'Seed task goal',
          description: '',
          state: 'planned',
          created_at: '2026-05-27T00:00:00.000Z',
          updated_at: '2026-05-27T00:00:00.000Z',
        },
        {
          id: 'g-milestone-v3-0',
          entity_level: 'milestone',
          entity_id: 'v3-0',
          parent_goal_id: 'g-system-root',
          title: 'Milestone goal',
          description: '',
          state: 'planned',
          created_at: '2026-05-27T00:00:00.000Z',
          updated_at: '2026-05-27T00:00:00.000Z',
        },
      ],
    },
    officialReleaseLines: [
      { id: 'v2-10', label: 'v2.10', sources: ['intents'] },
      { id: 'v3-0', label: 'v3.0', sources: ['goals', 'intents'] },
    ],
  });

  assert.equal(projection.intentDocs.length, 2);
  assert.equal(projection.milestoneDocs.length, 2);
  assert.equal(projection.versionDocs.length, 2);
  assert.equal(projection.goalDocs.length, 3);
  assert.equal(projection.edges.releaseToIntentEdges.length, 2);
  assert.equal(projection.edges.intentToMilestoneEdges.length, 2);
  assert.equal(projection.edges.intentToGoalEdges.length, 1);
  assert.equal(projection.edges.intentToTaskGoalEdges.length, 1);
  assert.equal(projection.edges.milestoneToGoalEdges.length, 1);

  const activeMilestone = projection.milestoneDocs.find((doc) => doc._key === 'v2-10');
  assert.equal(activeMilestone.status, 'active');
});
