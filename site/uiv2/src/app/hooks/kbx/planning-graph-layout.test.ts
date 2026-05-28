import { describe, expect, it } from 'vitest'
import { buildPlanningGraphLayout } from './planning-graph-layout'

describe('buildPlanningGraphLayout', () => {
  it('assigns nodes to fixed columns and emits edges with coordinates', () => {
    const layout = buildPlanningGraphLayout(
      [
        { id: 'workspace', kind: 'workspace', label: 'Workspace', state: 'active', detail: '', metrics: [] },
        { id: 'objective-1', kind: 'objective', label: 'Objective', state: 'active', detail: '', metrics: [] },
        { id: 'kr-1', kind: 'key_result', label: 'KR', state: 'active', detail: '', metrics: [] },
        { id: 'release-1', kind: 'release', label: 'Release', state: 'planned', detail: '', metrics: [] },
        { id: 'intent-1', kind: 'intent', label: 'Intent', state: 'active', detail: '', metrics: [] },
        { id: 'task-1', kind: 'task', label: 'Task', state: 'active', detail: '', metrics: [] },
      ],
      [
        { id: 'e1', kind: 'contains', source: 'workspace', target: 'objective-1' },
        { id: 'e2', kind: 'advances', source: 'intent-1', target: 'kr-1' },
      ],
    )

    const workspaceNode = layout.nodes.find((node) => node.id === 'workspace')
    const intentNode = layout.nodes.find((node) => node.id === 'intent-1')

    expect(workspaceNode?.column).toBe(0)
    expect(intentNode?.column).toBe(4)
    expect(layout.edges).toHaveLength(2)
    expect(layout.edges[0].sourceX).toBeGreaterThan(0)
    expect(layout.edges[0].targetY).toBeGreaterThan(0)
  })
})
