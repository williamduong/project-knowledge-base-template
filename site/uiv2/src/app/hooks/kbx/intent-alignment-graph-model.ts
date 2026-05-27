import { useMemo } from 'react'
import type { IntentDetail } from './useIntentDetail'
import type { GoalRecord, GoalTreeNode, GoalsTreeResponse } from './useGoalsTree'
import type { IntentListItem } from './useIntentsList'
import type { SystemSnapshotResponse } from '../svfactory/useSystemSnapshot'
import { buildMilestones, buildReleaseLines, deriveVersionBucket } from './intent-workspace-model'

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

export type IntentAlignmentNode = {
  id: string
  kind: IntentAlignmentNodeKind
  label: string
  shortLabel: string
  state: string
  entityLevel?: GoalTreeNode['entityLevel']
  entityId?: string
  ownerIntentId?: string | null
  focus?: boolean
  active?: boolean
  selected?: boolean
  warning?: boolean
  detail?: string
  metrics: string[]
  pathBucket?: string
}

export type IntentAlignmentEdge = {
  id: string
  source: string
  target: string
  kind: IntentAlignmentEdgeKind
  emphasis?: 'focus' | 'warning' | 'normal'
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
  nodes: IntentAlignmentNode[]
  edges: IntentAlignmentEdge[]
  warnings: IntentAlignmentWarning[]
  summary: IntentAlignmentSummary
  focusNodeId: string | null
  defaultMode: 'focus' | 'alignment' | 'full'
}

type BuildIntentAlignmentGraphInput = {
  intents: IntentListItem[]
  goalsTree: GoalTreeNode | null
  goalsSummary?: GoalsTreeResponse['summary'] | null
  snapshotMetadata?: SystemSnapshotResponse['metadata'] | null
  selectedIntentId?: string | null
  detail?: IntentDetail | null
}

function normalizeLifecycle(value: string | null | undefined) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return 'unknown'
  if (text === 'closed' || text === 'released') return 'closed'
  if (text === 'archive' || text === 'archived') return 'archived'
  if (text === 'open') return 'backlog'
  return text.replace(/\s+/g, '-')
}

function compactLabel(value: string | null | undefined, limit = 38) {
  const text = String(value || '').trim()
  if (!text) return 'Untitled'
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 1)}…`
}

function compactIntentLabel(intentId: string) {
  return String(intentId || '').replace(/^v/i, 'v').replace(/-/g, '.')
}

function rootNodeId() {
  return 'workspace:svfactory'
}

function entityNodeId(entityLevel: GoalTreeNode['entityLevel'], entityId: string) {
  return `${entityLevel}:${entityId}`
}

function goalNodeId(goalId: string) {
  return `goal:${goalId}`
}

function releaseLineNodeId(releaseId: string) {
  return `release:${releaseId}`
}

function pushUniqueNode(map: Map<string, IntentAlignmentNode>, node: IntentAlignmentNode) {
  if (!map.has(node.id)) {
    map.set(node.id, node)
    return
  }

  const current = map.get(node.id)!
  map.set(node.id, {
    ...current,
    ...node,
    metrics: [...new Set([...(current.metrics || []), ...(node.metrics || [])])],
    warning: current.warning || node.warning,
    focus: current.focus || node.focus,
    active: current.active || node.active,
    selected: current.selected || node.selected,
  })
}

function pushUniqueEdge(edges: Map<string, IntentAlignmentEdge>, edge: IntentAlignmentEdge) {
  if (!edges.has(edge.id)) {
    edges.set(edge.id, edge)
  }
}

function createNodeBase(input: Omit<IntentAlignmentNode, 'metrics'> & { metrics?: string[] }): IntentAlignmentNode {
  return {
    ...input,
    metrics: input.metrics ?? [],
  }
}

export function buildIntentAlignmentGraph({
  intents,
  goalsTree,
  goalsSummary,
  snapshotMetadata,
  selectedIntentId = null,
  detail = null,
}: BuildIntentAlignmentGraphInput): IntentAlignmentGraph {
  const nodes = new Map<string, IntentAlignmentNode>()
  const edges = new Map<string, IntentAlignmentEdge>()
  const warnings: IntentAlignmentWarning[] = []
  const goalNodeMap = new Map<string, GoalRecord>()
  const treeEntityNodeIds = new Set<string>()
  const linkedIntentIds = new Set<string>()
  const focusIntentId = snapshotMetadata?.focusIntentId ?? null
  const activeIntentId = snapshotMetadata?.activeIntentId ?? null

  pushUniqueNode(nodes, createNodeBase({
    id: rootNodeId(),
    kind: 'workspace',
    label: 'SVFactory',
    shortLabel: 'SVFactory',
    state: 'system',
    entityLevel: 'system',
    entityId: 'workspace',
    metrics: [
      `${goalsSummary?.totalGoals ?? 0} tracked goals`,
      `${intents.length} intents in registry`,
    ],
    detail: 'SVFactory operating graph root.',
  }))

  const milestones = buildMilestones(intents)
  const releaseLines = buildReleaseLines(milestones)
  const releaseLineIds = new Set<string>()

  for (const releaseLine of releaseLines) {
    const releaseNode = createNodeBase({
      id: releaseLineNodeId(releaseLine.id),
      kind: 'release-line',
      label: releaseLine.label,
      shortLabel: releaseLine.label,
      state: releaseLine.state,
      pathBucket: releaseLine.id,
      metrics: [
        `${releaseLine.intentCount} intents`,
        `${releaseLine.progress}% progress`,
      ],
      detail: releaseLine.summary,
    })
    pushUniqueNode(nodes, releaseNode)
    releaseLineIds.add(releaseLine.id)
    pushUniqueEdge(edges, {
      id: `${rootNodeId()}->${releaseNode.id}:contains`,
      source: rootNodeId(),
      target: releaseNode.id,
      kind: 'contains',
    })
  }

  function registerWarnings(code: IntentAlignmentWarningCode, level: 'warning' | 'info', message: string, nodeIds: string[]) {
    warnings.push({
      id: `${code}:${warnings.length}`,
      code,
      level,
      message,
      nodeIds,
    })
    for (const nodeId of nodeIds) {
      const current = nodes.get(nodeId)
      if (current) {
        nodes.set(nodeId, { ...current, warning: true })
      }
    }
  }

  function addGoalRecordNodes(ownerNodeId: string, goalRecords: GoalRecord[], ownerIntentId: string | null) {
    for (const goalRecord of goalRecords) {
      const goalId = goalNodeId(goalRecord.id)
      goalNodeMap.set(goalRecord.id, goalRecord)
      pushUniqueNode(nodes, createNodeBase({
        id: goalId,
        kind: 'goal',
        label: goalRecord.title,
        shortLabel: compactLabel(goalRecord.title, 26),
        state: goalRecord.state,
        entityLevel: goalRecord.entityLevel,
        entityId: goalRecord.entityId,
        ownerIntentId,
        metrics: [
          goalRecord.entityLevel,
          goalRecord.state,
        ],
        detail: goalRecord.description,
      }))
      pushUniqueEdge(edges, {
        id: `${ownerNodeId}->${goalId}:tracks`,
        source: ownerNodeId,
        target: goalId,
        kind: 'tracks',
      })
    }
  }

  function walkTree(node: GoalTreeNode, parentNodeId: string | null, ownerIntentId: string | null) {
    const nodeId = entityNodeId(node.entityLevel, node.entityId)
    const existingIntent = node.entityLevel === 'intent'
      ? intents.find((intent) => intent.id === node.entityId) ?? null
      : null
    const nextOwnerIntentId = node.entityLevel === 'intent' ? node.entityId : ownerIntentId
    const releaseBucket = node.entityLevel === 'milestone'
      ? String(node.entityId || '').toLowerCase()
      : node.entityLevel === 'intent'
        ? deriveVersionBucket(node.entityId)
        : undefined

    pushUniqueNode(nodes, createNodeBase({
      id: nodeId,
      kind: node.entityLevel === 'system'
        ? 'workspace'
        : node.entityLevel === 'milestone'
          ? 'milestone'
          : node.entityLevel === 'intent'
            ? 'intent'
            : 'task',
      label: node.label,
      shortLabel: node.entityLevel === 'intent' ? compactIntentLabel(node.entityId) : compactLabel(node.label, 28),
      state: existingIntent ? normalizeLifecycle(existingIntent.lifecycle) : node.runtimeState,
      entityLevel: node.entityLevel,
      entityId: node.entityId,
      ownerIntentId: nextOwnerIntentId,
      focus: node.entityLevel === 'intent' && node.entityId === focusIntentId,
      active: node.entityLevel === 'intent' && node.entityId === activeIntentId,
      selected: node.entityLevel === 'intent' && node.entityId === selectedIntentId,
      pathBucket: releaseBucket,
      metrics: [
        node.status.label,
        `${node.goals.length} goals`,
        node.entityLevel === 'intent' && existingIntent?.taskCount != null
          ? `${existingIntent.taskCount} tasks`
          : `${node.children.length} children`,
      ].filter(Boolean) as string[],
      detail: node.summary ?? existingIntent?.goalText ?? undefined,
    }))

    treeEntityNodeIds.add(nodeId)
    if (node.entityLevel === 'intent') {
      linkedIntentIds.add(node.entityId)
    }

    if (parentNodeId && parentNodeId !== nodeId) {
      pushUniqueEdge(edges, {
        id: `${parentNodeId}->${nodeId}:contains`,
        source: parentNodeId,
        target: nodeId,
        kind: 'contains',
        emphasis: node.entityLevel === 'intent' && (node.entityId === focusIntentId || node.entityId === activeIntentId) ? 'focus' : 'normal',
      })
    }

    if (node.entityLevel === 'milestone' && releaseBucket && releaseLineIds.has(releaseBucket)) {
      pushUniqueEdge(edges, {
        id: `${releaseLineNodeId(releaseBucket)}->${nodeId}:belongs-to-release`,
        source: releaseLineNodeId(releaseBucket),
        target: nodeId,
        kind: 'belongs-to-release',
      })
    }

    addGoalRecordNodes(nodeId, node.goals, nextOwnerIntentId)

    if (node.entityLevel === 'milestone' && node.status.code === 'missing-goals') {
      registerWarnings(
        'milestone-missing-coverage',
        'warning',
        `Milestone ${node.label} still has no complete goal coverage.`,
        [nodeId],
      )
    }

    if (node.entityLevel === 'task') {
      if (node.status.code === 'missing-goals') {
        registerWarnings(
          'task-missing-goal',
          'warning',
          `Task ${node.label} is visible in the flow but has no goal coverage yet.`,
          [nodeId],
        )
      } else if (node.status.code === 'outside-main') {
        registerWarnings(
          'task-outside-main',
          'info',
          `Task ${node.label} is outside the main goal tree path.`,
          [nodeId],
        )
      }
    }

    for (const child of node.children) {
      walkTree(child, nodeId, nextOwnerIntentId)
    }
  }

  if (goalsTree) {
    walkTree(goalsTree, null, null)
  }

  for (const goalRecord of goalNodeMap.values()) {
    if (!goalRecord.parentGoalId) continue
    const parentGoal = goalNodeMap.get(goalRecord.parentGoalId)
    if (!parentGoal) continue
    pushUniqueEdge(edges, {
      id: `${goalNodeId(parentGoal.id)}->${goalNodeId(goalRecord.id)}:sub-goal`,
      source: goalNodeId(parentGoal.id),
      target: goalNodeId(goalRecord.id),
      kind: 'sub-goal',
    })
  }

  for (const intent of intents) {
    const intentNodeId = entityNodeId('intent', intent.id)
    const releaseBucket = deriveVersionBucket(intent.id)
    const currentNode = nodes.get(intentNodeId)
    if (currentNode) {
      pushUniqueNode(nodes, {
        ...currentNode,
        label: intent.title,
        shortLabel: compactIntentLabel(intent.id),
        state: normalizeLifecycle(intent.lifecycle),
        focus: currentNode.focus || intent.id === focusIntentId,
        active: currentNode.active || intent.id === activeIntentId,
        selected: currentNode.selected || intent.id === selectedIntentId,
        detail: intent.goalText ?? currentNode.detail,
        metrics: [...new Set([
          ...currentNode.metrics,
          `${intent.taskDoneCount ?? 0}/${intent.taskCount ?? 0} tasks done`,
          intent.chaosEstimate?.projectedScore != null ? `chaos ${intent.chaosEstimate.projectedScore}` : '',
        ].filter(Boolean))],
      })
      continue
    }

    pushUniqueNode(nodes, createNodeBase({
      id: intentNodeId,
      kind: 'intent',
      label: intent.title,
      shortLabel: compactIntentLabel(intent.id),
      state: normalizeLifecycle(intent.lifecycle),
      entityLevel: 'intent',
      entityId: intent.id,
      ownerIntentId: intent.id,
      focus: intent.id === focusIntentId,
      active: intent.id === activeIntentId,
      selected: intent.id === selectedIntentId,
      warning: true,
      pathBucket: releaseBucket,
      metrics: [
        `${intent.taskDoneCount ?? 0}/${intent.taskCount ?? 0} tasks done`,
        intent.goalText ? 'goal text present' : 'missing goal text',
      ],
      detail: intent.goalText ?? intent.goal ?? 'Intent exists in the registry but is not linked into the goal tree.',
    }))
    pushUniqueEdge(edges, {
      id: `${releaseLineNodeId(releaseBucket)}->${intentNodeId}:projected-intent`,
      source: releaseLineIds.has(releaseBucket) ? releaseLineNodeId(releaseBucket) : rootNodeId(),
      target: intentNodeId,
      kind: 'projected-intent',
      emphasis: 'warning',
    })
    registerWarnings(
      'intent-missing-goal',
      'warning',
      `Intent ${intent.id} is visible in the registry but not linked into the current goal tree.`,
      [intentNodeId],
    )
  }

  if (focusIntentId && !nodes.has(entityNodeId('intent', focusIntentId))) {
    registerWarnings(
      'focus-intent-missing',
      'warning',
      `Focus intent ${focusIntentId} is not visible in the current alignment graph.`,
      [rootNodeId()],
    )
  }

  if (detail?.id && detail.tasks?.length) {
    for (const task of detail.tasks) {
      const matchingTaskNode = [...nodes.values()].find((node) =>
        node.kind === 'task' &&
        (node.label === task.title || node.shortLabel === compactLabel(task.title, 28)),
      )
      if (!matchingTaskNode) continue
      pushUniqueNode(nodes, {
        ...matchingTaskNode,
        detail: task.description ?? task.text ?? matchingTaskNode.detail,
        metrics: [...new Set([
          ...matchingTaskNode.metrics,
          task.section ? `section ${task.section}` : '',
          task.source ? `source ${task.source}` : '',
        ].filter(Boolean))],
      })
    }
  }

  const nodeList = [...nodes.values()]
  const edgeList = [...edges.values()]
  const focusNodeId = focusIntentId ? entityNodeId('intent', focusIntentId) : null

  return {
    nodes: nodeList,
    edges: edgeList,
    warnings,
    summary: {
      releaseLines: nodeList.filter((node) => node.kind === 'release-line').length,
      milestones: nodeList.filter((node) => node.kind === 'milestone').length,
      intents: nodeList.filter((node) => node.kind === 'intent').length,
      tasks: nodeList.filter((node) => node.kind === 'task').length,
      goals: nodeList.filter((node) => node.kind === 'goal').length,
      warnings: warnings.length,
      linkedIntents: linkedIntentIds.size,
      unlinkedIntents: intents.length - linkedIntentIds.size,
      focusIntentId,
      activeIntentId,
    },
    focusNodeId,
    defaultMode: focusNodeId ? 'focus' : 'alignment',
  }
}

export function useIntentAlignmentGraph(input: BuildIntentAlignmentGraphInput) {
  const {
    intents,
    goalsTree,
    goalsSummary,
    snapshotMetadata,
    selectedIntentId,
    detail,
  } = input

  return useMemo(() => buildIntentAlignmentGraph({
    intents,
    goalsTree,
    goalsSummary,
    snapshotMetadata,
    selectedIntentId,
    detail,
  }), [
    detail,
    goalsSummary,
    goalsTree,
    intents,
    selectedIntentId,
    snapshotMetadata,
  ])
}
