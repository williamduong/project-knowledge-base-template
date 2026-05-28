import type { PlanningGraphNode, PlanningGraphNodeKind, PlanningGraphEdge } from './usePlanningWorkspace'

export type PlanningLayoutNode = PlanningGraphNode & {
  x: number
  y: number
  width: number
  height: number
  column: number
  row: number
}

export type PlanningLayoutEdge = PlanningGraphEdge & {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

export type PlanningGraphLayout = {
  width: number
  height: number
  nodes: PlanningLayoutNode[]
  edges: PlanningLayoutEdge[]
}

const COLUMN_ORDER: PlanningGraphNodeKind[] = ['workspace', 'objective', 'key_result', 'release', 'intent', 'task']
const COLUMN_X = [32, 260, 520, 780, 1040, 1300]
const NODE_WIDTH = 208
const NODE_HEIGHT = 92
const ROW_GAP = 28
const COLUMN_GAP = 52
const TOP_PADDING = 32

export function buildPlanningGraphLayout(nodes: PlanningGraphNode[], edges: PlanningGraphEdge[]): PlanningGraphLayout {
  const grouped = new Map<PlanningGraphNodeKind, PlanningGraphNode[]>()
  for (const kind of COLUMN_ORDER) {
    grouped.set(kind, [])
  }

  for (const node of nodes) {
    const current = grouped.get(node.kind) ?? []
    current.push(node)
    grouped.set(node.kind, current)
  }

  const laidOutNodes: PlanningLayoutNode[] = []
  let maxRows = 1

  for (const [column, kind] of COLUMN_ORDER.entries()) {
    const columnNodes = (grouped.get(kind) ?? []).slice().sort((left, right) => left.label.localeCompare(right.label))
    maxRows = Math.max(maxRows, columnNodes.length)
    columnNodes.forEach((node, row) => {
      laidOutNodes.push({
        ...node,
        column,
        row,
        x: COLUMN_X[column],
        y: TOP_PADDING + row * (NODE_HEIGHT + ROW_GAP),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })
    })
  }

  const nodeMap = new Map(laidOutNodes.map((node) => [node.id, node]))
  const laidOutEdges: PlanningLayoutEdge[] = edges
    .map((edge) => {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) return null
      return {
        ...edge,
        sourceX: source.x + source.width,
        sourceY: source.y + source.height / 2,
        targetX: target.x,
        targetY: target.y + target.height / 2,
      }
    })
    .filter((edge): edge is PlanningLayoutEdge => edge !== null)

  return {
    width: COLUMN_X[COLUMN_X.length - 1] + NODE_WIDTH + COLUMN_GAP,
    height: TOP_PADDING * 2 + maxRows * (NODE_HEIGHT + ROW_GAP),
    nodes: laidOutNodes,
    edges: laidOutEdges,
  }
}
