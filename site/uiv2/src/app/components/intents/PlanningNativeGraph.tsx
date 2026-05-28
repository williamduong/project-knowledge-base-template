import { Icon } from '@iconify/react'
import sparkles from '@iconify-icons/lucide/sparkles'
import target from '@iconify-icons/lucide/target'
import waypoints from '@iconify-icons/lucide/waypoints'
import flag from '@iconify-icons/lucide/flag'
import listTodo from '@iconify-icons/lucide/list-todo'
import alertTriangle from '@iconify-icons/lucide/alert-triangle'
import cube from '@iconify-icons/lucide/blocks'
import type { PlanningGraphNode } from '../../hooks/kbx/usePlanningWorkspace'
import { buildPlanningGraphLayout } from '../../hooks/kbx/planning-graph-layout'

const kindIcon = {
  workspace: sparkles,
  objective: target,
  key_result: cube,
  release: flag,
  intent: waypoints,
  task: listTodo,
} as const

function edgeTone(kind: string) {
  if (kind === 'advances') return 'var(--intent-accent, #0b5fff)'
  if (kind === 'belongs_to_release') return 'var(--intent-release, #ff7a00)'
  return 'rgba(15, 23, 42, 0.18)'
}

export function PlanningNativeGraph({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}: {
  nodes: PlanningGraphNode[]
  edges: Array<{ id: string; kind: string; source: string; target: string }>
  selectedNodeId: string | null
  onSelectNode: (id: string) => void
}) {
  const layout = buildPlanningGraphLayout(nodes, edges)

  return (
    <div className="planning-graph-shell">
      <div className="planning-graph-meta">
        <span className="workspace-eyebrow">Native Graph</span>
        <p>Workspace, objectives, key results, releases, intents, and tasks all render from GraphDB-backed nodes.</p>
      </div>
      <div className="planning-graph-stage">
        <svg
          className="planning-graph-edges"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-hidden="true"
        >
          {layout.edges.map((edge) => {
            const midX = (edge.sourceX + edge.targetX) / 2
            const path = `M ${edge.sourceX} ${edge.sourceY} C ${midX} ${edge.sourceY}, ${midX} ${edge.targetY}, ${edge.targetX} ${edge.targetY}`
            return (
              <path
                key={edge.id}
                d={path}
                fill="none"
                stroke={edgeTone(edge.kind)}
                strokeWidth={edge.kind === 'advances' ? 3 : 2}
                strokeDasharray={edge.kind === 'belongs_to_release' ? '8 6' : undefined}
                opacity={selectedNodeId && edge.source !== selectedNodeId && edge.target !== selectedNodeId ? 0.18 : 0.92}
              />
            )
          })}
        </svg>

        {layout.nodes.map((node) => {
          const nodeIcon = kindIcon[node.kind]
          const selected = node.id === selectedNodeId
          return (
            <button
              key={node.id}
              type="button"
              className={`planning-graph-node planning-graph-node-${node.kind}${selected ? ' selected' : ''}${node.warning ? ' warning' : ''}`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                height: `${node.height}px`,
              }}
              onClick={() => onSelectNode(node.id)}
            >
              <div className="planning-graph-node-head">
                <span className="planning-graph-node-kind">
                  <Icon icon={nodeIcon} />
                  {node.kind.replace(/_/g, ' ')}
                </span>
                {node.warning ? (
                  <span className="planning-graph-node-flag">
                    <Icon icon={alertTriangle} />
                  </span>
                ) : null}
              </div>
              <strong>{node.label}</strong>
              <div className="planning-graph-node-metrics">
                {node.metrics.slice(0, 2).map((metric) => (
                  <span key={`${node.id}-${metric}`}>{metric}</span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
