import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../shared/api/client'

export type IntentAlignmentNodeKind =
  | 'workspace'
  | 'release-line'
  | 'milestone'
  | 'intent'
  | 'task'
  | 'goal'

export type IntentAlignmentEdgeKind =
  | 'contains'
  | 'belongs-to-release'
  | 'tracks'
  | 'sub-goal'
  | 'projected-intent'

export type IntentAlignmentWarningCode =
  | 'focus-intent-missing'
  | 'intent-missing-goal'
  | 'milestone-missing-coverage'
  | 'task-missing-goal'
  | 'task-outside-main'
  | 'release-without-intents'
  | 'goal-without-active-intent'

export type IntentAlignmentSourceKind =
  | 'canonical'
  | 'projected'
  | 'derived-task'
  | 'official'
  | 'computed'

export type IntentAlignmentNode = {
  id: string
  kind: IntentAlignmentNodeKind
  label: string
  shortLabel: string
  state: string
  entityLevel?: 'system' | 'milestone' | 'intent' | 'task'
  entityId?: string
  ownerIntentId?: string | null
  focus?: boolean
  active?: boolean
  selected?: boolean
  warning?: boolean
  detail?: string | null
  metrics: string[]
  pathBucket?: string
  sourceKind: IntentAlignmentSourceKind
}

export type IntentAlignmentEdge = {
  id: string
  source: string
  target: string
  kind: IntentAlignmentEdgeKind
  emphasis?: 'focus' | 'warning' | 'normal'
  sourceKind?: IntentAlignmentSourceKind
}

export type IntentAlignmentWarning = {
  id: string
  code: IntentAlignmentWarningCode
  level: 'warning' | 'info'
  message: string
  nodeIds: string[]
}

export type IntentAlignmentSummary = {
  releaseLines: number
  milestones: number
  intents: number
  tasks: number
  goals: number
  warnings: number
  linkedIntents: number
  unlinkedIntents: number
  focusIntentId: string | null
  activeIntentId: string | null
}

export type IntentAlignmentGraph = {
  ok: boolean
  checkedAt: string
  center: {
    id: string
    kind: IntentAlignmentNodeKind
  }
  query: {
    id: string
    kind: IntentAlignmentNodeKind
    depth: number
    mode: 'focus' | 'alignment' | 'full'
    include_tasks: boolean
    include_unlinked: boolean
  }
  nodes: IntentAlignmentNode[]
  edges: IntentAlignmentEdge[]
  warnings: IntentAlignmentWarning[]
  summary: IntentAlignmentSummary
  focusNodeId: string | null
  defaultMode: 'focus' | 'alignment' | 'full'
  sources: {
    intent: string
    goals: string
    milestones: string
    releaseLines: string
    tasks: string
  }
}

export type IntentAlignmentGraphTarget = {
  id: string
  kind: IntentAlignmentNodeKind
}

type UseIntentAlignmentGraphInput = {
  selectedIntentId?: string | null
  focusIntentId?: string | null
  activeIntentId?: string | null
  depth?: number
  mode?: 'focus' | 'alignment' | 'full'
  includeTasks?: boolean
  includeUnlinked?: boolean
}

export const intentContextQueryKey = ['intent-context']

export const emptyIntentAlignmentGraph: IntentAlignmentGraph = {
  ok: true,
  checkedAt: '',
  center: {
    id: 'workspace:svfactory',
    kind: 'workspace',
  },
  query: {
    id: 'workspace',
    kind: 'workspace',
    depth: 1,
    mode: 'alignment',
    include_tasks: true,
    include_unlinked: true,
  },
  nodes: [],
  edges: [],
  warnings: [],
  summary: {
    releaseLines: 0,
    milestones: 0,
    intents: 0,
    tasks: 0,
    goals: 0,
    warnings: 0,
    linkedIntents: 0,
    unlinkedIntents: 0,
    focusIntentId: null,
    activeIntentId: null,
  },
  focusNodeId: null,
  defaultMode: 'alignment',
  sources: {
    intent: 'filesystem',
    goals: 'goals-state-db+graph-seed',
    milestones: 'goal-ownership+official-pack',
    releaseLines: 'official-pack',
    tasks: 'intent-markdown-derived',
  },
}

export function resolveIntentContextTarget({
  selectedIntentId,
  focusIntentId,
  activeIntentId,
}: Pick<UseIntentAlignmentGraphInput, 'selectedIntentId' | 'focusIntentId' | 'activeIntentId'>): IntentAlignmentGraphTarget {
  const intentId = selectedIntentId ?? focusIntentId ?? activeIntentId ?? null
  if (intentId) {
    return {
      id: intentId,
      kind: 'intent',
    }
  }
  return {
    id: 'workspace',
    kind: 'workspace',
  }
}

export function buildIntentContextPath({
  selectedIntentId,
  focusIntentId,
  activeIntentId,
  depth = 1,
  mode = 'alignment',
  includeTasks = true,
  includeUnlinked = true,
}: UseIntentAlignmentGraphInput) {
  const target = resolveIntentContextTarget({
    selectedIntentId,
    focusIntentId,
    activeIntentId,
  })

  const searchParams = new URLSearchParams()
  searchParams.set('id', target.id)
  searchParams.set('kind', target.kind)
  searchParams.set('depth', String(depth))
  searchParams.set('mode', mode)
  searchParams.set('include_tasks', includeTasks ? 'true' : 'false')
  searchParams.set('include_unlinked', includeUnlinked ? 'true' : 'false')
  return `/api/intents/context?${searchParams.toString()}`
}

export function useIntentAlignmentGraph(input: UseIntentAlignmentGraphInput) {
  const {
    selectedIntentId,
    focusIntentId,
    activeIntentId,
    depth = 1,
    mode = 'alignment',
    includeTasks = true,
    includeUnlinked = true,
  } = input

  const target = resolveIntentContextTarget({
    selectedIntentId,
    focusIntentId,
    activeIntentId,
  })

  return useQuery({
    queryKey: [
      ...intentContextQueryKey,
      target.id,
      target.kind,
      depth,
      mode,
      includeTasks,
      includeUnlinked,
    ],
    queryFn: () => apiGet<IntentAlignmentGraph>(buildIntentContextPath({
      selectedIntentId,
      focusIntentId,
      activeIntentId,
      depth,
      mode,
      includeTasks,
      includeUnlinked,
    })),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}
