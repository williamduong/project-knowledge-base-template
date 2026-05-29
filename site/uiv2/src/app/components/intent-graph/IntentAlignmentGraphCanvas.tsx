import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import type {
  IntentAlignmentEdge,
  IntentAlignmentGraph,
  IntentAlignmentNode,
} from '../../hooks/kbx/intent-alignment-graph-model'

type GraphMode = 'focus' | 'alignment' | 'full'
type LifecycleFilter = 'all' | 'active' | 'backlog' | 'closed' | 'archived'
type PlanningSidebarTab = 'system-goals' | 'backlog' | 'focus' | 'active' | 'closed' | 'archived' | 'milestones'

type IntentAlignmentGraphCanvasProps = {
  graph: IntentAlignmentGraph
  onSelectNode?: (node: IntentAlignmentNode) => void
  queryMode?: GraphMode
  onQueryModeChange?: (mode: GraphMode) => void
  queryDepth?: number
  onQueryDepthChange?: (depth: number) => void
  sidebarTab?: PlanningSidebarTab
  onSidebarTabChange?: (tab: PlanningSidebarTab) => void
}

type PositionedNode = Node<{ modelNode: IntentAlignmentNode; label: ReactNode }>

const kindOrder: Record<IntentAlignmentNode['kind'], number> = {
  workspace: 0,
  'release-line': 1,
  milestone: 2,
  intent: 3,
  task: 4,
  goal: 5,
}

function nodeColumn(node: IntentAlignmentNode) {
  if (node.kind === 'workspace') return 0
  if (node.kind === 'release-line') return 1
  if (node.kind === 'milestone') return 2
  if (node.kind === 'intent') return 4
  if (node.kind === 'task') return 6
  if (node.kind === 'goal') {
    if (node.entityLevel === 'system') return 1
    if (node.entityLevel === 'milestone') return 3
    if (node.entityLevel === 'intent') return 5
    if (node.entityLevel === 'task') return 7
    return 5
  }
  return 4
}

function sortNodes(a: IntentAlignmentNode, b: IntentAlignmentNode) {
  const orderDiff = kindOrder[a.kind] - kindOrder[b.kind]
  if (orderDiff !== 0) return orderDiff
  if (a.pathBucket && b.pathBucket && a.pathBucket !== b.pathBucket) return a.pathBucket.localeCompare(b.pathBucket)
  return a.label.localeCompare(b.label)
}

function buildVisibleGraph(
  graph: IntentAlignmentGraph,
  options: {
    mode: GraphMode
    lifecycleFilter: LifecycleFilter
    showTasks: boolean
    linkedOnly: boolean
  },
) {
  const linkedIntentIds = new Set(
    graph.edges
      .filter((edge) => edge.kind === 'contains' && edge.target.startsWith('intent:'))
      .map((edge) => edge.target),
  )

  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]))
  const adjacency = new Map<string, string[]>()
  const reverseAdjacency = new Map<string, string[]>()
  for (const edge of graph.edges) {
    const next = adjacency.get(edge.source) ?? []
    next.push(edge.target)
    adjacency.set(edge.source, next)
    const prev = reverseAdjacency.get(edge.target) ?? []
    prev.push(edge.source)
    reverseAdjacency.set(edge.target, prev)
  }

  let candidateIds = new Set(graph.nodes.map((node) => node.id))

  if (!options.showTasks) {
    candidateIds = new Set([...candidateIds].filter((id) => nodeMap.get(id)?.kind !== 'task'))
  }

  if (options.lifecycleFilter !== 'all') {
    candidateIds = new Set([...candidateIds].filter((id) => {
      const node = nodeMap.get(id)
      if (!node) return false
      if (node.kind === 'intent') return node.state === options.lifecycleFilter
      if (node.ownerIntentId) {
        const owner = nodeMap.get(`intent:${node.ownerIntentId}`)
        return owner ? owner.state === options.lifecycleFilter : true
      }
      return true
    }))
  }

  if (options.linkedOnly) {
    candidateIds = new Set([...candidateIds].filter((id) => {
      const node = nodeMap.get(id)
      if (!node) return false
      if (node.kind === 'intent') return linkedIntentIds.has(id)
      if (node.ownerIntentId) return linkedIntentIds.has(`intent:${node.ownerIntentId}`)
      return true
    }))
  }

  if (options.mode === 'focus' && graph.focusNodeId) {
    const visited = new Set<string>()
    const queue: Array<{ id: string; depth: number }> = [{ id: graph.focusNodeId, depth: 0 }]
    while (queue.length) {
      const current = queue.shift()
      if (!current || visited.has(current.id) || current.depth > 3) continue
      visited.add(current.id)
      for (const next of adjacency.get(current.id) ?? []) queue.push({ id: next, depth: current.depth + 1 })
      for (const prev of reverseAdjacency.get(current.id) ?? []) queue.push({ id: prev, depth: current.depth + 1 })
    }
    candidateIds = new Set([...candidateIds].filter((id) => visited.has(id)))
  }

  const visibleNodes = graph.nodes.filter((node) => candidateIds.has(node.id))
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id))
  const visibleEdges = graph.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))

  return {
    nodes: visibleNodes.sort(sortNodes),
    edges: visibleEdges,
  }
}

function buildPositions(nodes: IntentAlignmentNode[], edges: IntentAlignmentEdge[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const adjacency = new Map<string, string[]>()
  const indegree = new Map<string, number>()

  for (const node of nodes) {
    adjacency.set(node.id, [])
    indegree.set(node.id, 0)
  }

  for (const edge of edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue
    adjacency.get(edge.source)?.push(edge.target)
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
  }

  for (const [nodeId, children] of adjacency.entries()) {
    adjacency.set(nodeId, children.sort((left, right) => sortNodes(nodeMap.get(left)!, nodeMap.get(right)!)))
  }

  const positions = new Map<string, { x: number; y: number }>()
  let cursorY = 40

  function visit(nodeId: string): number {
    if (positions.has(nodeId)) return positions.get(nodeId)!.y
    const node = nodeMap.get(nodeId)!
    const children = adjacency.get(nodeId) ?? []
    const x = nodeColumn(node) * 220 + 36

    if (!children.length) {
      const y = cursorY
      cursorY += 120
      positions.set(nodeId, { x, y })
      return y
    }

    const childYs: number[] = children.map((childId) => visit(childId))
    const y: number = childYs.length === 1 ? childYs[0] : (Math.min(...childYs) + Math.max(...childYs)) / 2
    positions.set(nodeId, { x, y })
    return y
  }

  const roots = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .sort(sortNodes)

  for (const root of roots) {
    visit(root.id)
  }

  for (const node of nodes) {
    if (!positions.has(node.id)) {
      visit(node.id)
    }
  }

  return positions
}

function nodeStyle(node: IntentAlignmentNode): React.CSSProperties {
  const background =
    node.kind === 'workspace' ? 'rgba(110, 231, 183, 0.14)' :
    node.kind === 'release-line' ? 'rgba(59, 130, 246, 0.14)' :
    node.kind === 'milestone' ? 'rgba(251, 191, 36, 0.12)' :
    node.kind === 'intent' ? 'rgba(244, 114, 182, 0.13)' :
    node.kind === 'task' ? 'rgba(148, 163, 184, 0.14)' :
    'rgba(217, 226, 236, 0.08)'

  const borderColor =
    node.focus ? '#6ee7b7' :
    node.selected ? '#f8fafc' :
    node.warning ? '#fbbf24' :
    'rgba(49, 72, 99, 0.95)'

  return {
    width: node.kind === 'goal' ? 180 : node.kind === 'intent' ? 220 : 190,
    minHeight: node.kind === 'goal' ? 84 : 94,
    borderRadius: 14,
    border: `1px solid ${borderColor}`,
    background,
    color: '#ebf2fa',
    padding: 0,
    boxShadow: node.focus ? '0 0 0 1px rgba(110, 231, 183, 0.35), 0 16px 32px rgba(0,0,0,0.22)' : '0 10px 20px rgba(0,0,0,0.16)',
  }
}

function edgeStyle(edge: IntentAlignmentEdge): React.CSSProperties {
  if (edge.emphasis === 'focus') {
    return { stroke: '#6ee7b7', strokeWidth: 2.2 }
  }
  if (edge.emphasis === 'warning' || edge.kind === 'projected-intent') {
    return { stroke: '#fbbf24', strokeWidth: 1.8, strokeDasharray: '6 4' }
  }
  if (edge.kind === 'sub-goal') {
    return { stroke: '#94a3b8', strokeWidth: 1.4, strokeDasharray: '3 3' }
  }
  return { stroke: '#43617e', strokeWidth: 1.6 }
}

function renderNodeLabel(node: IntentAlignmentNode) {
  return (
    <div className={`intent-graph-node intent-graph-node-${node.kind}${node.warning ? ' warning' : ''}${node.focus ? ' focus' : ''}`}>
      <div className="intent-graph-node-head">
        <span className="intent-graph-node-kind">{node.kind.replace('-', ' ')}</span>
        <span className={`status-pill ${node.warning ? 'status-warn' : node.focus ? 'status-good' : 'status-neutral'}`}>
          {node.focus ? 'focus' : node.state}
        </span>
      </div>
      <strong>{node.shortLabel}</strong>
      <p>{node.label}</p>
      {node.metrics.length ? <small>{node.metrics.slice(0, 2).join(' · ')}</small> : null}
    </div>
  )
}

function modeLabel(mode: GraphMode) {
  if (mode === 'focus') return 'focus'
  if (mode === 'alignment') return 'planning'
  return 'full map'
}

export function IntentAlignmentGraphCanvas({
  graph,
  onSelectNode,
  queryMode,
  onQueryModeChange,
  queryDepth = 1,
  onQueryDepthChange,
  sidebarTab,
  onSidebarTabChange,
}: IntentAlignmentGraphCanvasProps) {
  const [mode, setMode] = useState<GraphMode>(queryMode ?? graph.defaultMode)
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('all')
  const [showTasks, setShowTasks] = useState(true)
  const [linkedOnly, setLinkedOnly] = useState(false)
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null)

  useEffect(() => {
    setMode(queryMode ?? graph.defaultMode)
  }, [graph.defaultMode, graph.focusNodeId, queryMode])

  const visibleGraph = useMemo(() => buildVisibleGraph(graph, {
    mode,
    lifecycleFilter,
    showTasks,
    linkedOnly,
  }), [graph, linkedOnly, lifecycleFilter, mode, showTasks])

  const positions = useMemo(() => buildPositions(visibleGraph.nodes, visibleGraph.edges), [visibleGraph.edges, visibleGraph.nodes])

  const flowNodes = useMemo<PositionedNode[]>(() => visibleGraph.nodes.map((node) => ({
    id: node.id,
    position: positions.get(node.id) ?? { x: 0, y: 0 },
    draggable: false,
    selectable: true,
    data: {
      modelNode: node,
      label: renderNodeLabel(node),
    },
    style: nodeStyle(node),
  })), [positions, visibleGraph.nodes])

  const flowEdges = useMemo<Edge[]>(() => visibleGraph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: edge.emphasis === 'focus' ? '#6ee7b7' : edge.kind === 'projected-intent' ? '#fbbf24' : '#43617e',
    },
    animated: edge.emphasis === 'focus',
    style: edgeStyle(edge),
  })), [visibleGraph.edges])

  useEffect(() => {
    if (!instance || !flowNodes.length) return
    const handle = window.requestAnimationFrame(() => {
      instance.fitView({ padding: 0.16, duration: 220 })
    })
    return () => window.cancelAnimationFrame(handle)
  }, [flowNodes, instance, mode])

  const updateMode = (nextMode: GraphMode) => {
    setMode(nextMode)
    onQueryModeChange?.(nextMode)
  }

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    const modelNode = (node as PositionedNode).data?.modelNode
    if (modelNode) {
      onSelectNode?.(modelNode)
    }
  }

  return (
    <section className="surface-panel surface-panel-primary intent-graph-shell">
      <div className="panel-toolbar">
        <div>
          <p className="workspace-eyebrow">Planning Graph</p>
          <h2>Release, milestone, goal, intent, and task map</h2>
        </div>
        <div className="panel-toolbar-meta">
          <span className="count-pill">{visibleGraph.nodes.length} nodes</span>
          <span className="count-pill">{visibleGraph.edges.length} edges</span>
          <span className="count-pill">{graph.summary.warnings} warnings</span>
        </div>
      </div>

      <div className="intent-graph-controls">
        <div className="intent-graph-pill-row">
          {(['focus', 'alignment', 'full'] as GraphMode[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`tool-button${mode === item ? ' active' : ''}`}
              onClick={() => updateMode(item)}
            >
              {modeLabel(item)}
            </button>
          ))}
        </div>

        {onSidebarTabChange ? (
          <div className="intent-graph-pill-row">
            <button className={`tool-button${sidebarTab === 'system-goals' ? ' active' : ''}`} type="button" onClick={() => onSidebarTabChange('system-goals')}>System Goals</button>
            <button className={`tool-button${sidebarTab === 'milestones' ? ' active' : ''}`} type="button" onClick={() => onSidebarTabChange('milestones')}>Milestones</button>
            <button className={`tool-button${sidebarTab === 'focus' ? ' active' : ''}`} type="button" onClick={() => onSidebarTabChange('focus')}>Focus</button>
            <button className={`tool-button${sidebarTab === 'active' ? ' active' : ''}`} type="button" onClick={() => onSidebarTabChange('active')}>Active</button>
            <button className={`tool-button${sidebarTab === 'backlog' ? ' active' : ''}`} type="button" onClick={() => onSidebarTabChange('backlog')}>Backlog</button>
            <button className={`tool-button${sidebarTab === 'closed' ? ' active' : ''}`} type="button" onClick={() => onSidebarTabChange('closed')}>Closed</button>
            <button className={`tool-button${sidebarTab === 'archived' ? ' active' : ''}`} type="button" onClick={() => onSidebarTabChange('archived')}>Archive</button>
          </div>
        ) : null}

        <label className="rules-filter-field">
          <span>Depth</span>
          <select value={queryDepth} onChange={(event) => onQueryDepthChange?.(Number(event.target.value))}>
            <option value={1}>1 hop</option>
            <option value={2}>2 hops</option>
            <option value={3}>3 hops</option>
          </select>
        </label>

        <label className="rules-filter-field">
          <span>Lifecycle</span>
          <select value={lifecycleFilter} onChange={(event) => setLifecycleFilter(event.target.value as LifecycleFilter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="backlog">Backlog</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="intent-graph-toggle">
          <input type="checkbox" checked={showTasks} onChange={(event) => setShowTasks(event.target.checked)} />
          <span>Show tasks</span>
        </label>

        <label className="intent-graph-toggle">
          <input type="checkbox" checked={linkedOnly} onChange={(event) => setLinkedOnly(event.target.checked)} />
          <span>Only linked intents</span>
        </label>

        {graph.focusNodeId ? (
          <button type="button" className="tool-button" onClick={() => updateMode('focus')}>
            Focus current planning intent
          </button>
        ) : null}
      </div>

      <div className="intent-graph-summary-bar">
        <span className="meta-pill">{graph.summary.linkedIntents} linked intents</span>
        <span className="meta-pill">{graph.summary.unlinkedIntents} unlinked intents</span>
        <span className="meta-pill">{graph.summary.releaseLines} release lines</span>
        <span className="meta-pill">{graph.summary.goals} goal nodes</span>
      </div>

      <div className="intent-graph-canvas">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          fitView
          proOptions={{ hideAttribution: true }}
          onInit={setInstance}
          onNodeClick={handleNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
        >
          <MiniMap pannable zoomable />
          <Controls />
          <Background gap={18} size={1} color="rgba(67, 97, 126, 0.25)" />
        </ReactFlow>
      </div>
    </section>
  )
}
