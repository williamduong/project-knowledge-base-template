'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildIntentContextExplorer } = require('../src/lib/intent-context-explorer.js');

const intents = [
  {
    id: 'v2-10-code-graph',
    title: 'Code Graph',
    lifecycle: 'active',
    taskCount: 2,
    taskDoneCount: 1,
    goalText: 'Build graph infrastructure for SVFactory.',
    chaosEstimate: {
      projectedScore: 45,
    },
  },
  {
    id: 'v3-0-dna-graph-ontology-boundary',
    title: 'DNA Graph Boundary',
    lifecycle: 'backlog',
    taskCount: 1,
    taskDoneCount: 0,
    goalText: 'Clarify DNA/graph boundary.',
    chaosEstimate: null,
  },
];

const goalsTree = {
  entityLevel: 'system',
  entityId: 'workspace',
  label: 'SVFactory',
  summary: 'Factory system root',
  runtimeState: 'active',
  status: { code: 'aligned', label: 'aligned' },
  goals: [
    {
      id: 'g-system-sg1',
      entityLevel: 'system',
      entityId: 'workspace',
      parentGoalId: null,
      title: 'SG-1 Build-to-Build',
      description: 'Primary system goal',
      state: 'active',
    },
  ],
  children: [
    {
      entityLevel: 'milestone',
      entityId: 'v3-0',
      label: 'v3.0',
      summary: 'DNA platform milestone rail',
      runtimeState: 'planned',
      status: { code: 'aligned', label: 'aligned' },
      goals: [
        {
          id: 'g-milestone-v3-0',
          entityLevel: 'milestone',
          entityId: 'v3-0',
          parentGoalId: 'g-system-sg1',
          title: 'M0 Foundation',
          description: 'Ship foundation reset',
          state: 'planned',
        },
      ],
      children: [
        {
          entityLevel: 'intent',
          entityId: 'v2-10-code-graph',
          label: 'Code Graph',
          summary: 'Stabilize graph-backed surfaces.',
          runtimeState: 'active',
          status: { code: 'aligned', label: 'aligned' },
          goals: [
            {
              id: 'g-intent-code-graph',
              entityLevel: 'intent',
              entityId: 'v2-10-code-graph',
              parentGoalId: 'g-milestone-v3-0',
              title: 'Intent goal for code graph',
              description: 'Link code graph to system goals',
              state: 'active',
            },
          ],
          children: [
            {
              entityLevel: 'task',
              entityId: 'task-01',
              label: 'Seed official backlog',
              summary: 'Seed official backlog and validate graph counts.',
              runtimeState: 'active',
              status: { code: 'missing-goals', label: 'missing goals' },
              goals: [],
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

const goalsSummary = {
  totalGoals: 3,
  coverage: { system: 1, milestones: 1, intents: 1, tasks: 0 },
  missingCounts: { milestones: 0, intents: 0, tasks: 1 },
  outsideCounts: { milestones: 0, intents: 0, tasks: 0 },
  entityCounts: { milestones: 1, intents: 1, tasks: 1 },
};

const detailsByIntent = new Map([
  ['v2-10-code-graph', {
    id: 'v2-10-code-graph',
    focusCurrent: 'Stabilize graph-backed surfaces.',
    summary: 'Phase 0 graph hardening.',
    tasks: [
      {
        title: 'Seed official backlog',
        status: 'active',
        source: 'plan.md',
        description: 'Seed official backlog and validate graph counts.',
        section: 'Phase 1',
      },
    ],
  }],
  ['v3-0-dna-graph-ontology-boundary', {
    id: 'v3-0-dna-graph-ontology-boundary',
    focusCurrent: null,
    summary: 'Boundary cleanup.',
    tasks: [],
  }],
]);

const officialReleaseLines = [
  { id: 'v3-0', label: 'v3.0', sources: ['goals', 'intents'] },
  { id: 'v2-10', label: 'v2.10', sources: ['intents'] },
];

test('buildIntentContextExplorer returns graph-shaped payload around the selected intent', () => {
  const result = buildIntentContextExplorer({
    query: {
      id: 'v2-10-code-graph',
      kind: 'intent',
      depth: 1,
      mode: 'alignment',
      include_tasks: true,
      include_unlinked: true,
    },
    intents,
    goalsTree,
    goalsSummary,
    focusIntentId: 'v2-10-code-graph',
    activeIntentId: 'v2-10-code-graph',
    selectedIntentId: 'v2-10-code-graph',
    detailsByIntent,
    officialReleaseLines,
  });

  assert.equal(result.ok, true);
  assert.equal(result.center.id, 'intent:v2-10-code-graph');
  assert.equal(result.summary.intents >= 1, true);
  assert.equal(result.summary.goals >= 1, true);
  assert.equal(result.nodes.some((node) => node.kind === 'release-line'), true);
  assert.equal(result.warnings.some((warning) => warning.code === 'task-missing-goal'), true);
});

test('buildIntentContextExplorer keeps projected intents visible when include_unlinked=true', () => {
  const result = buildIntentContextExplorer({
    query: {
      id: 'workspace',
      kind: 'workspace',
      depth: 1,
      mode: 'full',
      include_tasks: true,
      include_unlinked: true,
    },
    intents,
    goalsTree,
    goalsSummary,
    focusIntentId: 'v2-10-code-graph',
    activeIntentId: 'v2-10-code-graph',
    selectedIntentId: 'v2-10-code-graph',
    detailsByIntent,
    officialReleaseLines,
  });

  assert.equal(result.nodes.some((node) => node.id === 'intent:v3-0-dna-graph-ontology-boundary' && node.sourceKind === 'projected'), true);
  assert.equal(result.warnings.some((warning) => warning.code === 'intent-missing-goal'), true);
});
