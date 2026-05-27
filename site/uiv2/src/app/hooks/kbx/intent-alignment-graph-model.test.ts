import type { IntentDetail } from './useIntentDetail'
import type { GoalTreeNode, GoalsTreeResponse } from './useGoalsTree'
import type { IntentListItem } from './useIntentsList'
import type { SystemSnapshotResponse } from '../svfactory/useSystemSnapshot'
import { buildIntentAlignmentGraph } from './intent-alignment-graph-model'

const intents: IntentListItem[] = [
  {
    id: 'v2-10-code-graph',
    title: 'Code Graph',
    lifecycle: 'active',
    priority: 'high',
    blocks: null,
    mode: 'full',
    strategic_mode: 'svfactory',
    taskCount: 2,
    taskDoneCount: 1,
    goalText: 'Build graph infrastructure for SVFactory.',
    focusCurrent: 'Stabilize graph-backed surfaces.',
    focusNextAction: 'Map intent alignment graph.',
    chaosEstimate: {
      currentScore: 42,
      currentLevel: 'stable',
      estimatedDelta: 3,
      projectedScore: 45,
      projectedLevel: 'stable',
      warning: null,
    },
  },
  {
    id: 'v3-0-dna-graph-ontology-boundary',
    title: 'DNA Graph Boundary',
    lifecycle: 'backlog',
    priority: 'medium',
    blocks: null,
    mode: 'full',
    strategic_mode: 'svfactory',
    taskCount: 1,
    taskDoneCount: 0,
    goalText: 'Clarify DNA/graph boundary.',
  },
]

const goalsTree: GoalTreeNode = {
  entityLevel: 'system',
  entityId: 'workspace',
  label: 'SVFactory',
  summary: 'Factory system root',
  runtimeState: 'active',
  status: {
    code: 'aligned',
    label: 'aligned',
  },
  goals: [
    {
      id: 'g-system-sg1',
      entityLevel: 'system',
      entityId: 'workspace',
      parentGoalId: null,
      title: 'SG-1 Build-to-Build',
      description: 'Primary system goal',
      state: 'active',
      rank: 1,
      createdAt: '2026-05-27T00:00:00Z',
      updatedAt: '2026-05-27T00:00:00Z',
      childGoalCount: 1,
      canDelete: false,
    },
  ],
  children: [
    {
      entityLevel: 'milestone',
      entityId: 'v3-0',
      label: 'v3.0',
      summary: 'DNA platform milestone rail',
      runtimeState: 'planned',
      status: {
        code: 'aligned',
        label: 'aligned',
      },
      goals: [
        {
          id: 'g-milestone-v3-0',
          entityLevel: 'milestone',
          entityId: 'v3-0',
          parentGoalId: 'g-system-sg1',
          title: 'M0 Foundation',
          description: 'Ship foundation reset',
          state: 'planned',
          rank: 1,
          createdAt: '2026-05-27T00:00:00Z',
          updatedAt: '2026-05-27T00:00:00Z',
          childGoalCount: 1,
          canDelete: false,
        },
      ],
      children: [
        {
          entityLevel: 'intent',
          entityId: 'v2-10-code-graph',
          label: 'Code Graph',
          summary: 'Stabilize graph-backed surfaces.',
          runtimeState: 'active',
          status: {
            code: 'aligned',
            label: 'aligned',
          },
          goals: [
            {
              id: 'g-intent-code-graph',
              entityLevel: 'intent',
              entityId: 'v2-10-code-graph',
              parentGoalId: 'g-milestone-v3-0',
              title: 'Intent goal for code graph',
              description: 'Link code graph to system goals',
              state: 'active',
              rank: 1,
              createdAt: '2026-05-27T00:00:00Z',
              updatedAt: '2026-05-27T00:00:00Z',
              childGoalCount: 1,
              canDelete: true,
            },
          ],
          children: [
            {
              entityLevel: 'task',
              entityId: 'task-01',
              label: 'Seed official backlog',
              summary: 'Seed official backlog and validate graph counts.',
              runtimeState: 'active',
              status: {
                code: 'missing-goals',
                label: 'missing goals',
              },
              goals: [],
              children: [],
            },
          ],
        },
      ],
    },
  ],
}

const goalsSummary: GoalsTreeResponse['summary'] = {
  totalGoals: 3,
  coverage: {
    system: 1,
    milestones: 1,
    intents: 1,
    tasks: 0,
  },
  missingCounts: {
    milestones: 0,
    intents: 0,
    tasks: 1,
  },
  outsideCounts: {
    milestones: 0,
    intents: 0,
    tasks: 0,
  },
  entityCounts: {
    milestones: 1,
    intents: 1,
    tasks: 1,
  },
}

const snapshotMetadata: SystemSnapshotResponse['metadata'] = {
  snapshotVersion: 1,
  generatedAt: '2026-05-27T00:00:00Z',
  staleAt: '2026-05-27T00:01:00Z',
  ttlMs: 60000,
  reloadRecommended: false,
  reloadReasons: [],
  fingerprint: 'abc',
  headSha: '123',
  branchName: 'intent/v2-10-code-graph',
  focusIntentId: 'v2-10-code-graph',
  activeIntentId: 'v2-10-code-graph',
  workingTreeDirty: false,
}

const detail: IntentDetail = {
  id: 'v2-10-code-graph',
  title: 'Code Graph',
  slug: 'v2-10-code-graph',
  scope: 'full',
  lifecycle: 'active',
  status: 'open',
  mode: 'full',
  changeType: 'feature',
  goalText: 'Build graph infrastructure for SVFactory.',
  decisionSummary: 'Graph is the canonical source for governance entities.',
  closeCondition: 'Graph-backed view works.',
  goal: 'Build graph infrastructure for SVFactory.',
  summary: 'Phase 0 graph hardening.',
  focusCurrent: 'Stabilize graph-backed surfaces.',
  focusNextAction: 'Map intent alignment graph.',
  focusUpdatedAt: '2026-05-27T00:00:00Z',
  chaosEstimate: {
    currentScore: 42,
    currentLevel: 'stable',
    estimatedDelta: 3,
    projectedScore: 45,
    projectedLevel: 'stable',
    warning: null,
  },
  tasks: [
    {
      title: 'Seed official backlog',
      status: 'active',
      source: 'plan.md',
      description: 'Seed official backlog and validate graph counts.',
      section: 'Phase 1',
    },
  ],
  stagedFiles: [],
  workspacePath: 'knowledge-base/intents/_active/v2-10-code-graph',
  sourceFile: 'knowledge-base/intents/_active/v2-10-code-graph/intent.md',
}

describe('intent alignment graph model', () => {
  it('builds release, milestone, intent, task, and goal nodes from current intent workspace sources', () => {
    const graph = buildIntentAlignmentGraph({
      intents,
      goalsTree,
      goalsSummary,
      snapshotMetadata,
      selectedIntentId: 'v2-10-code-graph',
      detail,
    })

    expect(graph.summary.releaseLines).toBeGreaterThanOrEqual(2)
    expect(graph.summary.milestones).toBe(1)
    expect(graph.summary.intents).toBe(2)
    expect(graph.summary.tasks).toBe(1)
    expect(graph.summary.goals).toBe(3)
    expect(graph.focusNodeId).toBe('intent:v2-10-code-graph')
  })

  it('emits warnings for task coverage gaps and intents that are missing from the goal tree', () => {
    const graph = buildIntentAlignmentGraph({
      intents,
      goalsTree,
      goalsSummary,
      snapshotMetadata,
      selectedIntentId: 'v2-10-code-graph',
      detail,
    })

    expect(graph.warnings.some((warning) => warning.code === 'task-missing-goal')).toBe(true)
    expect(graph.warnings.some((warning) => warning.code === 'intent-missing-goal')).toBe(true)
    expect(graph.summary.unlinkedIntents).toBe(1)
  })

  it('creates sub-goal edges between goal records when parent_goal_id is present', () => {
    const graph = buildIntentAlignmentGraph({
      intents,
      goalsTree,
      goalsSummary,
      snapshotMetadata,
      selectedIntentId: 'v2-10-code-graph',
      detail,
    })

    expect(graph.edges.some((edge) => edge.kind === 'sub-goal' && edge.source === 'goal:g-system-sg1' && edge.target === 'goal:g-milestone-v3-0')).toBe(true)
    expect(graph.edges.some((edge) => edge.kind === 'sub-goal' && edge.source === 'goal:g-milestone-v3-0' && edge.target === 'goal:g-intent-code-graph')).toBe(true)
  })
})
