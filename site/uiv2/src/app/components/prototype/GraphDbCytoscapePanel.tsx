import { useEffect, useMemo, useRef, useState } from 'react'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import { usePlanningWorkspace, type PlanningGraphNodeKind } from '../../hooks/kbx/usePlanningWorkspace'

type GraphFilter = 'all' | PlanningGraphNodeKind

function nodeColor(kind: PlanningGraphNodeKind) {
  if (kind === 'workspace') return '#6ee7b7'
  if (kind === 'objective') return '#60a5fa'
  if (kind === 'key_result') return '#38bdf8'
  if (kind === 'release') return '#fb923c'
  if (kind === 'intent') return '#f472b6'
  return '#94a3b8'
}

function edgeColor(kind: string) {
  if (kind === 'advances') return '#60a5fa'
  if (kind === 'belongs_to_release') return '#fb923c'
  return 'rgba(148, 163, 184, 0.48)'
}

export function GraphDbCytoscapePanel() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<Core | null>(null)
  const workspace = usePlanningWorkspace()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [filter, setFilter] = useState<GraphFilter>('all')

  const visibleGraph = useMemo(() => {
    const nodes = workspace.data?.graph.nodes ?? []
    const edges = workspace.data?.graph.edges ?? []
    const query = searchText.trim().toLowerCase()
    const filteredNodes = nodes.filter((node) => {
      if (filter !== 'all' && node.kind !== filter) return false
      if (!query) return true
      return `${node.label} ${node.detail} ${node.metrics.join(' ')}`.toLowerCase().includes(query)
    })
    const visibleNodeIds = new Set(filteredNodes.map((node) => node.id))
    const filteredEdges = edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
    return {
      nodes: filteredNodes,
      edges: filteredEdges,
    }
  }, [filter, searchText, workspace.data?.graph.edges, workspace.data?.graph.nodes])

  const selectedNode = useMemo(
    () => visibleGraph.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId, visibleGraph.nodes],
  )

  useEffect(() => {
    if (!visibleGraph.nodes.length) {
      setSelectedNodeId(null)
      return
    }
    if (selectedNodeId && visibleGraph.nodes.some((node) => node.id === selectedNodeId)) return
    setSelectedNodeId(visibleGraph.nodes[0].id)
  }, [selectedNodeId, visibleGraph.nodes])

  useEffect(() => {
    if (!containerRef.current) return

    const elements: ElementDefinition[] = [
      ...visibleGraph.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          kind: node.kind,
          metrics: node.metrics.join(' · '),
          color: nodeColor(node.kind),
          warning: node.warning ? 'true' : 'false',
        },
      })),
      ...visibleGraph.edges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          kind: edge.kind,
          color: edgeColor(edge.kind),
        },
      })),
    ]

    instanceRef.current?.destroy()
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: {
        name: 'breadthfirst',
        directed: true,
        spacingFactor: 1.1,
        padding: 28,
      },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'border-color': '#e2e8f0',
            'border-width': '1',
            color: '#e5edf5',
            label: 'data(label)',
            'text-wrap': 'wrap',
            'text-max-width': '150',
            'font-size': '11',
            'text-valign': 'center',
            'text-halign': 'center',
            width: '68',
            height: '68',
            'overlay-opacity': 0,
          },
        },
        {
          selector: 'node[warning = "true"]',
          style: {
            'border-color': '#fbbf24',
            'border-width': '3',
          },
        },
        {
          selector: 'edge',
          style: {
            width: '2',
            'line-color': 'data(color)',
            'target-arrow-color': 'data(color)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            opacity: 0.85,
          },
        },
        {
          selector: ':selected',
          style: {
            'border-color': '#ffffff',
            'border-width': '3',
            'line-color': '#ffffff',
            'target-arrow-color': '#ffffff',
          },
        },
      ],
      minZoom: 0.35,
      maxZoom: 2.2,
      wheelSensitivity: 0.22,
    })

    cy.on('tap', 'node', (event) => {
      setSelectedNodeId(String(event.target.id()))
    })

    instanceRef.current = cy
    return () => {
      cy.destroy()
      instanceRef.current = null
    }
  }, [visibleGraph.edges, visibleGraph.nodes])

  useEffect(() => {
    const cy = instanceRef.current
    if (!cy) return
    cy.elements().unselect()
    if (selectedNodeId) {
      const node = cy.getElementById(selectedNodeId)
      if (node.nonempty()) {
        node.select()
        cy.animate({
          fit: {
            eles: node.closedNeighborhood(),
            padding: 56,
          },
          duration: 220,
        })
      }
    }
  }, [selectedNodeId])

  return (
    <div className="prototype-graphdb-shell">
      <div className="prototype-graphdb-stage">
        <div className="prototype-graphdb-toolbar">
          <label className="rules-filter-select rules-filter-search">
            <span>Search graph</span>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="intent, objective, release"
            />
          </label>
          <label className="rules-filter-select">
            <span>Node kind</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value as GraphFilter)}>
              <option value="all">All nodes</option>
              <option value="workspace">Workspace</option>
              <option value="objective">Objectives</option>
              <option value="key_result">Key Results</option>
              <option value="release">Releases</option>
              <option value="intent">Intents</option>
              <option value="task">Tasks</option>
            </select>
          </label>
        </div>
        {workspace.isLoading ? (
          <div className="rules-tool-card prototype-chart-card"><em>Loading GraphDB projection…</em></div>
        ) : workspace.isError ? (
          <div className="rules-tool-card prototype-chart-card"><em>Failed to load GraphDB projection.</em></div>
        ) : (
          <div ref={containerRef} className="prototype-graphdb-canvas" />
        )}
      </div>

      <article className="system-info-card prototype-graphdb-sidecar">
        <span className="runtime-overview-label">GraphDB lens</span>
        <strong className="system-info-title">Live planning projection in Cytoscape.js</strong>
        <p>This tab reads the same `planning/workspace` graph projection but renders it with Cytoscape.js for pan, zoom, selection, and layout control.</p>
        <div className="runtime-overview-grid compact-runtime-overview-grid gate-overview-grid" style={{ marginTop: '1rem' }}>
          <div className="runtime-overview-card">
            <span className="runtime-overview-label">Nodes</span>
            <strong>{visibleGraph.nodes.length}</strong>
          </div>
          <div className="runtime-overview-card">
            <span className="runtime-overview-label">Edges</span>
            <strong>{visibleGraph.edges.length}</strong>
          </div>
          <div className="runtime-overview-card">
            <span className="runtime-overview-label">Warnings</span>
            <strong>{workspace.data?.validation.warnings.length ?? 0}</strong>
          </div>
          <div className="runtime-overview-card">
            <span className="runtime-overview-label">Mode</span>
            <strong>{workspace.data?.workspace.mode ?? 'svfactory-only'}</strong>
          </div>
        </div>
        <div className="rules-pill-row" style={{ marginTop: '1rem' }}>
          <span className="meta-pill">{workspace.data?.source.seedPath ?? 'seed path unavailable'}</span>
          {workspace.data?.source.reviewPath ? (
            <span className="meta-pill">{workspace.data.source.reviewPath}</span>
          ) : null}
        </div>

        {selectedNode ? (
          <div className="prototype-graphdb-detail">
            <span className="runtime-overview-label" style={{ marginTop: '1rem' }}>Selected node</span>
            <strong>{selectedNode.label}</strong>
            <span className="status-pill status-neutral">{selectedNode.kind}</span>
            <p>{selectedNode.detail || 'No detail available for this graph node.'}</p>
            <div className="rules-pill-row">
              {selectedNode.metrics.map((metric) => (
                <span key={`${selectedNode.id}-${metric}`} className="meta-pill">{metric}</span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="planning-validation-list" style={{ marginTop: '1rem' }}>
          {(workspace.data?.validation.warnings ?? []).slice(0, 4).map((warning) => (
            <article key={warning.id} className={`planning-warning-card planning-warning-${warning.level}`}>
              <strong>{warning.code}</strong>
              <p>{warning.message}</p>
            </article>
          ))}
        </div>
      </article>
    </div>
  )
}
