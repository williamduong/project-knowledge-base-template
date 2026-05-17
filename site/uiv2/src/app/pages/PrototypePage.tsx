import { Icon } from '@iconify/react'
import blocks from '@iconify-icons/lucide/blocks'
import bot from '@iconify-icons/lucide/bot'
import chartColumn from '@iconify-icons/lucide/bar-chart-3'
import layoutGrid from '@iconify-icons/lucide/layout-grid'
import listTodo from '@iconify-icons/lucide/list-todo'
import panelLeft from '@iconify-icons/lucide/panel-left'
import server from '@iconify-icons/lucide/server'
import shield from '@iconify-icons/lucide/shield'
import workflow from '@iconify-icons/lucide/workflow'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import ReactECharts from 'echarts-for-react'
import ReactFlow, { Background, Controls, MiniMap, type Edge, type Node } from 'reactflow'
import { z } from 'zod'
import 'reactflow/dist/style.css'

type PrototypeTab = 'overview' | 'navigation' | 'tabs' | 'grid' | 'forms' | 'overlays' | 'states' | 'charts' | 'flow'

type CatalogCard = {
  label: string
  detail: string
  tone: 'status-neutral' | 'status-live' | 'status-good' | 'status-warn'
}

type GridRow = {
  id: string
  severity: 'error' | 'warn' | 'info'
  kind: 'hard' | 'master' | 'soft'
  sourceType: 'Agent Contract' | 'Agent Manual' | 'Governance'
  source: string
  description: string
}

const navigationPatterns: CatalogCard[] = [
  { label: 'Top Tab Strip', detail: 'Primary global navigation for first-class workspaces.', tone: 'status-good' },
  { label: 'Segmented Tabs', detail: 'Dense local mode switch for sibling views inside one slice.', tone: 'status-live' },
  { label: 'Vertical Tabs', detail: 'Good for settings or inspector-style stacks with strong labels.', tone: 'status-neutral' },
  { label: 'Toolbar Actions', detail: 'Compact action strip for sync, preview, and promote flows.', tone: 'status-neutral' },
  { label: 'Local Rail', detail: 'Secondary workspace navigation for deep operator surfaces.', tone: 'status-warn' },
]

const navigationPrimitives: CatalogCard[] = [
  { label: 'Tab Trigger', detail: 'Clickable item that maps one route or view segment to active context.', tone: 'status-good' },
  { label: 'Rail Item', detail: 'Dense vertical selector for local workspace submodes.', tone: 'status-live' },
  { label: 'Toolbar Group', detail: 'Action cluster for refresh, preview, and promote flows.', tone: 'status-neutral' },
  { label: 'Status Indicator', detail: 'Compact health/sync marker anchored near navigation controls.', tone: 'status-warn' },
]

const gridRows: GridRow[] = [
  { id: 'KBX-MR002', severity: 'warn', kind: 'master', sourceType: 'Agent Manual', source: 'template/12-ai-skills/agent-operating-manual.md', description: 'Deterministic commands beat prompt-only reasoning.' },
  { id: 'KBX-MR003', severity: 'warn', kind: 'master', sourceType: 'Agent Contract', source: 'template/.github/agents/kbx.agent.template.md', description: 'Non-trivial KB change must route through intent flow.' },
  { id: 'KBX-S006', severity: 'warn', kind: 'soft', sourceType: 'Agent Contract', source: 'template/.github/agents/kbx.agent.template.md', description: 'Probe install state via CLI rather than hidden filesystem heuristics.' },
  { id: 'KBX-GB001', severity: 'error', kind: 'hard', sourceType: 'Governance', source: 'template/15-governance/git-binding-policy.md', description: 'Intent IDs must satisfy the current naming contract.' },
  { id: 'KBX-S001', severity: 'warn', kind: 'soft', sourceType: 'Agent Contract', source: 'template/.github/agents/kbx.agent.template.md', description: 'Every factual KB or source claim should be cited or marked provisional.' },
  { id: 'KBX-S004', severity: 'warn', kind: 'soft', sourceType: 'Agent Manual', source: 'template/12-ai-skills/agent-operating-manual.md', description: 'Create gates instead of blocking chat when a human actor is required.' },
]

const tabsCatalog = [
  { name: 'Underline Tabs', use: 'Classic top-strip content switching for broad content families.' },
  { name: 'Segmented Tabs', use: 'Dense local toggles for operators choosing one mode at a time.' },
  { name: 'Pill Tabs', use: 'Visible category switching with low chrome and high contrast.' },
  { name: 'Vertical Tabs', use: 'Inspector or settings style side-mounted switching.' },
]

const chartCatalog = [
  { name: 'Bar Chart', use: 'Compare counts or throughput across rule families.' },
  { name: 'Line Chart', use: 'Trend findings, drift, or runtime health over time.' },
  { name: 'Donut Chart', use: 'Show distribution of categories with small label sets.' },
  { name: 'Stacked Area', use: 'Surface composition shifts across time or releases.' },
  { name: 'Heatmap', use: 'Matrix-like hotspots such as rule-to-surface pressure.' },
]

const formSchema = z.object({
  title: z.string().min(8, 'Title needs at least 8 characters.'),
  owner: z.string().min(3, 'Owner must be a stable team or role slug.'),
  sourceType: z.enum(['Agent Contract', 'Agent Manual', 'Governance']),
  summary: z.string().min(20, 'Summary should explain the UX intent clearly.'),
})

type FormValues = z.infer<typeof formSchema>

const flowNodes: Node[] = [
  { id: 'catalog', position: { x: 0, y: 80 }, data: { label: 'Capability Catalog' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
  { id: 'navigation', position: { x: 220, y: 0 }, data: { label: 'Navigation Family' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
  { id: 'grid', position: { x: 220, y: 110 }, data: { label: 'Data Grid Family' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
  { id: 'forms', position: { x: 220, y: 220 }, data: { label: 'Validated Forms' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
  { id: 'charts', position: { x: 460, y: 55 }, data: { label: 'Charts & Metrics' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
  { id: 'states', position: { x: 460, y: 170 }, data: { label: 'States & Overlays' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
]

const flowEdges: Edge[] = [
  { id: 'e1', source: 'catalog', target: 'navigation', animated: true },
  { id: 'e2', source: 'catalog', target: 'grid', animated: true },
  { id: 'e3', source: 'catalog', target: 'forms', animated: true },
  { id: 'e4', source: 'grid', target: 'charts' },
  { id: 'e5', source: 'forms', target: 'states' },
  { id: 'e6', source: 'navigation', target: 'states' },
]

function toneForSeverity(severity: GridRow['severity']) {
  if (severity === 'error') return 'status-offline'
  if (severity === 'warn') return 'status-warn'
  return 'status-live'
}

function prototypeCharts() {
  return {
    bar: {
      tooltip: { trigger: 'axis' },
      grid: { top: 24, right: 16, bottom: 24, left: 40 },
      xAxis: { type: 'category', data: ['Navigation', 'Tabs', 'Grid', 'Forms', 'Charts', 'Flow'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [6, 4, 8, 7, 5, 3], itemStyle: { color: '#6ee7b7', borderRadius: [6, 6, 0, 0] } }],
    },
    line: {
      tooltip: { trigger: 'axis' },
      grid: { top: 24, right: 16, bottom: 24, left: 40 },
      xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', smooth: true, data: [12, 18, 11, 24, 20, 27], lineStyle: { color: '#38bdf8', width: 3 }, areaStyle: { color: 'rgba(56, 189, 248, 0.18)' } }],
    },
    donut: {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['52%', '72%'],
        label: { color: '#ebf2fa' },
        data: [
          { value: 12, name: 'Agent Contract' },
          { value: 8, name: 'Agent Manual' },
          { value: 5, name: 'Governance' },
        ],
      }],
    },
  }
}

export function PrototypePage() {
  const [activeTab, setActiveTab] = useState<PrototypeTab>('overview')
  const [searchText, setSearchText] = useState('agent')
  const [kindFilter, setKindFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: false }])
  // Interactive demo state for navigation patterns
  const [topTabIndex, setTopTabIndex] = useState<number>(0)
  const [segmentedIndex, setSegmentedIndex] = useState<number>(1)
  const [verticalIndex, setVerticalIndex] = useState<number>(2)
  const [railIndex, setRailIndex] = useState<number>(0)
  const [toolbarActive, setToolbarActive] = useState<boolean[]>([false, false, false])

  function toggleToolbar(index: number) {
    setToolbarActive((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: 'Consolidate rule registry source taxonomy',
      owner: 'knowledge-management',
      sourceType: 'Agent Contract',
      summary: 'Showcase a validated form with visible errors, stable labels, and live preview in the capability catalog.',
    },
    mode: 'onChange',
  })

  const watchedValues = form.watch()

  const filteredRules = useMemo(() => {
    return gridRows.filter((rule) => {
      if (kindFilter !== 'all' && rule.kind !== kindFilter) return false
      if (sourceFilter !== 'all' && rule.sourceType !== sourceFilter) return false
      if (!searchText.trim()) return true

      return `${rule.id} ${rule.sourceType} ${rule.source} ${rule.description}`
        .toLowerCase()
        .includes(searchText.trim().toLowerCase())
    })
  }, [kindFilter, searchText, sourceFilter])

  const columns = useMemo<ColumnDef<GridRow>[]>(() => [
    { accessorKey: 'id', header: 'Rule', cell: (info) => <strong>{info.getValue<string>()}</strong> },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: (info) => <span className={`status-pill ${toneForSeverity(info.getValue<GridRow['severity']>())}`}>{info.getValue<string>()}</span>,
    },
    { accessorKey: 'kind', header: 'Kind', cell: (info) => <span className="status-pill status-neutral">{info.getValue<string>()}</span> },
    { accessorKey: 'sourceType', header: 'Source Type', cell: (info) => <span className="status-pill status-good">{info.getValue<string>()}</span> },
    { accessorKey: 'source', header: 'Source', cell: (info) => <p className="rules-cell-copy rules-source-copy" title={info.getValue<string>()}>{info.getValue<string>()}</p> },
    { accessorKey: 'description', header: 'Description', cell: (info) => <p className="rules-cell-copy">{info.getValue<string>()}</p> },
  ], [])

  const table = useReactTable({
    data: filteredRules,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const charts = prototypeCharts()

  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">Capability Lab</p>
          <h1>R&amp;D Prototype</h1>
          <p>Interactive catalog of UI capability families. Each section names the pattern, shows a direct demo, and helps decide what should graduate into production workspaces.</p>
        </div>
        <div className="toolbar-actions">
          <button className="tool-button" type="button">Snapshot</button>
          <button className="tool-button tool-button-primary" type="button">Promote Pattern</button>
        </div>
      </header>

      <div className="system-shell-layout">
        <aside className="system-sidebar surface-panel compact-note-panel">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Capability Families</p>
              <div className="section-title-row">
                <span className="section-icon section-icon-system" aria-hidden="true">
                  <Icon icon={blocks} />
                </span>
                <h2>UI Capability Catalog</h2>
              </div>
            </div>
          </div>
          <div className="system-menu-list" role="tablist" aria-label="Prototype sections">
            <button className={`system-menu-item${activeTab === 'overview' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('overview')}><span className="system-menu-item-label"><Icon icon={server} aria-hidden="true" /><span>Overview</span></span><small>map</small></button>
            <button className={`system-menu-item${activeTab === 'navigation' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('navigation')}><span className="system-menu-item-label"><Icon icon={panelLeft} aria-hidden="true" /><span>Navigation</span></span><small>shell patterns</small></button>
            <button className={`system-menu-item${activeTab === 'tabs' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('tabs')}><span className="system-menu-item-label"><Icon icon={blocks} aria-hidden="true" /><span>Tabs</span></span><small>variants</small></button>
            <button className={`system-menu-item${activeTab === 'grid' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('grid')}><span className="system-menu-item-label"><Icon icon={layoutGrid} aria-hidden="true" /><span>Data Grid</span></span><small>tanstack table</small></button>
            <button className={`system-menu-item${activeTab === 'forms' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('forms')}><span className="system-menu-item-label"><Icon icon={listTodo} aria-hidden="true" /><span>Forms</span></span><small>rhf + zod</small></button>
            <button className={`system-menu-item${activeTab === 'overlays' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('overlays')}><span className="system-menu-item-label"><Icon icon={bot} aria-hidden="true" /><span>Overlays</span></span><small>modal + drawer</small></button>
            <button className={`system-menu-item${activeTab === 'states' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('states')}><span className="system-menu-item-label"><Icon icon={shield} aria-hidden="true" /><span>States</span></span><small>loading + empty</small></button>
            <button className={`system-menu-item${activeTab === 'charts' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('charts')}><span className="system-menu-item-label"><Icon icon={chartColumn} aria-hidden="true" /><span>Charts</span></span><small>echarts</small></button>
            <button className={`system-menu-item${activeTab === 'flow' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('flow')}><span className="system-menu-item-label"><Icon icon={workflow} aria-hidden="true" /><span>Flow</span></span><small>reactflow</small></button>
          </div>
          <ul className="signal-list">
            <li>This route is intentionally maximal and is allowed to exceed production simplicity.</li>
            <li>Use it to pick patterns by name, interaction style, and visual result.</li>
            <li>Production routes should only inherit patterns that prove useful here.</li>
          </ul>
        </aside>

        <section className="surface-panel surface-panel-primary system-detail-panel prototype-shell">
          {activeTab === 'overview' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Catalog Map</p>
                  <h2>What This Stack Can Show</h2>
                </div>
                <div className="panel-toolbar-meta">
                  <span className="count-pill">8 capability families</span>
                  <span className="count-pill">real demos where possible</span>
                </div>
              </div>
              <div className="runtime-summary-bar">
                <span className="meta-pill">Navigation</span>
                <span className="meta-pill">Tabs</span>
                <span className="meta-pill">Data Grid</span>
                <span className="meta-pill">Validated Forms</span>
                <span className="meta-pill">Overlays</span>
                <span className="meta-pill">States</span>
                <span className="meta-pill">Charts</span>
                <span className="meta-pill">Flow</span>
              </div>
              <div className="system-info-grid prototype-card-grid prototype-overview-grid">
                {[
                  ['Navigation', 'Top tab strip, rail, toolbar, status footer'],
                  ['Tabs', 'Underline, segmented, pill, vertical'],
                  ['Data Grid', 'Sorting, filtering, pagination, truncation'],
                  ['Validated Forms', 'Zod schema, RHF errors, live preview'],
                  ['Overlays', 'Dialog, drawer, popover-like anchored card'],
                  ['States', 'Loading, success, warning, blocked, empty'],
                  ['Charts', 'Bar, line, donut with real chart library'],
                  ['Flow', 'Node-link canvas for workflow and dependency demos'],
                ].map(([title, detail]) => (
                  <article key={title} className="system-info-card">
                    <span className="runtime-overview-label">Capability</span>
                    <strong className="system-info-title">{title}</strong>
                    <p>{detail}</p>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {activeTab === 'navigation' ? (
            <>
              <div className="panel-toolbar"><div><p className="workspace-eyebrow">Navigation</p><h2>Shell Patterns</h2></div><span className="count-pill">{navigationPatterns.length} named patterns</span></div>
              <div className="rules-pack-grid nav-pattern-grid">
                {navigationPatterns.map((item) => (
                  <article key={item.label} className="nav-pattern-card rules-pack-card">
                    <div className="rules-pack-header"><strong>{item.label}</strong><span className={`status-pill ${item.tone}`}>{item.tone.replace('status-', '')}</span></div>
                    <div className="nav-pattern-demo">
                        {(() => {
                          switch (item.label) {
                            case 'Top Tab Strip':
                              return (
                                <nav className="nav-demo-bar" aria-label="Top tab strip demo">
                                  {['Overview', 'Signals', 'Mutations', 'Audit'].map((t, i) => (
                                    <button key={t} className={`nav-tab ${topTabIndex === i ? 'active' : ''}`} type="button" onClick={() => setTopTabIndex(i)}>{t}</button>
                                  ))}
                                </nav>
                              )
                            case 'Segmented Tabs':
                              return (
                                <div className="nav-demo-segmented" aria-hidden>
                                  {['List', 'Detail', 'Actions'].map((t, i) => (
                                    <button key={t} className={`segmented ${segmentedIndex === i ? 'active' : ''}`} type="button" onClick={() => setSegmentedIndex(i)}>{t}</button>
                                  ))}
                                </div>
                              )
                            case 'Vertical Tabs':
                              return (
                                <div className="nav-demo-vertical" aria-hidden>
                                  {['Profile', 'Policies', 'Runtime', 'Audit'].map((t, i) => (
                                    <button key={t} className={`vertical ${verticalIndex === i ? 'active' : ''}`} type="button" onClick={() => setVerticalIndex(i)}>{t}</button>
                                  ))}
                                </div>
                              )
                            case 'Toolbar Actions':
                              return (
                                <div className="nav-demo-toolbar">
                                  <button className={`icon-btn ${toolbarActive[0] ? 'active' : ''}`} type="button" aria-pressed={toolbarActive[0]} aria-label="action-1" onClick={() => toggleToolbar(0)}><Icon icon={listTodo} /></button>
                                  <button className={`icon-btn ${toolbarActive[1] ? 'active' : ''}`} type="button" aria-pressed={toolbarActive[1]} aria-label="action-2" onClick={() => toggleToolbar(1)}><Icon icon={chartColumn} /></button>
                                  <button className={`icon-btn ${toolbarActive[2] ? 'active' : ''}`} type="button" aria-pressed={toolbarActive[2]} aria-label="action-3" onClick={() => toggleToolbar(2)}><Icon icon={server} /></button>
                                </div>
                              )
                            case 'Local Rail':
                              return (
                                <div className="nav-demo-rail" aria-hidden>
                                  {[{ label: 'Overview', icon: panelLeft }, { label: 'Intents', icon: blocks }, { label: 'Flows', icon: workflow }].map((it, i) => (
                                    <button key={it.label} className={`rail-btn ${railIndex === i ? 'active' : ''}`} type="button" onClick={() => setRailIndex(i)}><Icon icon={it.icon} /><span>{it.label}</span></button>
                                  ))}
                                </div>
                              )
                            default:
                              return null
                          }
                        })()}
                    </div>
                    <p className="rules-cell-copy">{item.detail}</p>
                  </article>
                ))}
              </div>
              <div className="prototype-subsection">
                <div className="panel-toolbar prototype-subsection-toolbar">
                  <div>
                    <p className="workspace-eyebrow">Navigation Building Blocks</p>
                    <h3>Primitives Behind The Patterns</h3>
                  </div>
                  <span className="count-pill">{navigationPrimitives.length} primitives</span>
                </div>
                <p className="prototype-subsection-lead">These primitives are lower-level parts used to compose the shell patterns above.</p>
                <div className="system-info-grid prototype-card-grid prototype-subsection-grid">
                  {navigationPrimitives.map((item) => (
                  <article key={item.label} className="system-info-card">
                    <span className="runtime-overview-label">Navigation Primitive</span>
                    <strong className="system-info-title">{item.label}</strong>
                    <p>{item.detail}</p>
                  </article>
                ))}
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'tabs' ? (
            <>
              <div className="panel-toolbar"><div><p className="workspace-eyebrow">Tabs Family</p><h2>Tab Variants By Name</h2></div><span className="count-pill">4 tab styles</span></div>
              <div className="rules-pack-grid">
                {tabsCatalog.map((tab) => (
                  <article key={tab.name} className="rules-pack-card">
                    <strong>{tab.name}</strong>
                    <p className="rules-cell-copy">{tab.use}</p>
                  </article>
                ))}
              </div>
              <div className="prototype-tab-demo-stack">
                <article className="system-info-card">
                  <span className="runtime-overview-label">Underline Tabs</span>
                  <div className="prototype-underline-tabs">
                    {['Overview', 'Signals', 'Mutations', 'Audit'].map((item) => <button key={item} className={`prototype-tab-button ${item === 'Overview' ? 'active' : ''}`} type="button">{item}</button>)}
                  </div>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Segmented Tabs</span>
                  <div className="prototype-segmented-tabs">
                    {['List', 'Detail', 'Actions'].map((item, index) => <button key={item} className={`prototype-tab-button ${index === 1 ? 'active' : ''}`} type="button">{item}</button>)}
                  </div>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Pill Tabs</span>
                  <div className="rules-pill-row">
                    {['All', 'Hard', 'Master', 'Soft'].map((item, index) => <button key={item} className={`tool-button${index === 0 ? ' active' : ''}`} type="button">{item}</button>)}
                  </div>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Vertical Tabs</span>
                  <div className="prototype-vertical-tabs">
                    {['Profile', 'Policies', 'Runtime', 'Audit'].map((item, index) => <button key={item} className={`prototype-vertical-tab ${index === 2 ? 'active' : ''}`} type="button">{item}</button>)}
                  </div>
                </article>
              </div>
            </>
          ) : null}

          {activeTab === 'grid' ? (
            <>
              <div className="panel-toolbar"><div><p className="workspace-eyebrow">Data Grid</p><h2>TanStack Table Demo</h2></div><div className="panel-toolbar-meta"><span className="count-pill">{filteredRules.length} rows</span><span className="count-pill">sortable + pageable</span></div></div>
              <div className="rules-filter-grid">
                <label className="rules-filter-select rules-filter-search"><span>Search Rows</span><input type="text" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="rule id, source, description" /></label>
                <label className="rules-filter-select"><span>Kind</span><select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option value="all">All kinds</option><option value="hard">Hard</option><option value="master">Master</option><option value="soft">Soft</option></select></label>
                <label className="rules-filter-select"><span>Source Type</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">All sources</option><option value="Agent Contract">Agent Contract</option><option value="Agent Manual">Agent Manual</option><option value="Governance">Governance</option></select></label>
              </div>
              <div className="rules-table prototype-data-grid" role="table" aria-label="Capability grid demo">
                <div className="rules-table-header prototype-grid-header" role="row">
                  {table.getHeaderGroups().map((headerGroup) => headerGroup.headers.map((header) => (
                    <button key={header.id} className="rules-column-button" type="button" role="columnheader" onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() ? (header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ' ⇅') : ''}
                    </button>
                  )))}
                </div>
                {table.getRowModel().rows.map((row) => (
                  <article key={row.id} className="rules-table-row prototype-grid-row" role="row">
                    {row.getVisibleCells().map((cell) => <div key={cell.id} role="cell">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>)}
                  </article>
                ))}
              </div>
              <div className="rules-pagination">
                <span className="rules-pagination-copy">Real data-grid engine demo with sorting + client-side filtering.</span>
                <div className="rules-pagination-actions">
                  <button className="tool-button" type="button" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Previous</button>
                  <span className="count-pill">Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
                  <button className="tool-button" type="button" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Next</button>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'forms' ? (
            <>
              <div className="panel-toolbar"><div><p className="workspace-eyebrow">Validated Forms</p><h2>React Hook Form + Zod</h2></div><span className="count-pill">live schema validation</span></div>
              <div className="prototype-form-layout">
                <form className="system-info-card prototype-form-card" onSubmit={form.handleSubmit(() => undefined)}>
                  <label className="rules-filter-select rules-filter-search"><span>Title</span><input type="text" {...form.register('title')} /></label>
                  {form.formState.errors.title ? <p className="runtime-error-text">{form.formState.errors.title.message}</p> : null}
                  <label className="rules-filter-select rules-filter-search"><span>Owner</span><input type="text" {...form.register('owner')} /></label>
                  {form.formState.errors.owner ? <p className="runtime-error-text">{form.formState.errors.owner.message}</p> : null}
                  <label className="rules-filter-select"><span>Source Type</span><select {...form.register('sourceType')}><option value="Agent Contract">Agent Contract</option><option value="Agent Manual">Agent Manual</option><option value="Governance">Governance</option></select></label>
                  <label className="rules-filter-select prototype-textarea-field"><span>Summary</span><textarea rows={5} {...form.register('summary')} /></label>
                  {form.formState.errors.summary ? <p className="runtime-error-text">{form.formState.errors.summary.message}</p> : null}
                  <div className="prototype-action-row">
                    <button className="tool-button tool-button-primary" type="submit">Validate</button>
                    <button className="tool-button" type="button" onClick={() => form.reset()}>Reset</button>
                    <span className={`status-pill ${form.formState.isValid ? 'status-good' : 'status-warn'}`}>{form.formState.isValid ? 'Schema valid' : 'Needs fixes'}</span>
                  </div>
                </form>
                <article className="system-info-card prototype-form-preview">
                  <span className="runtime-overview-label">Live Preview</span>
                  <strong className="system-info-title">Form State Mirror</strong>
                  <pre className="prototype-code-block">{JSON.stringify(watchedValues, null, 2)}</pre>
                </article>
              </div>
            </>
          ) : null}

          {activeTab === 'overlays' ? (
            <>
              <div className="panel-toolbar"><div><p className="workspace-eyebrow">Overlays</p><h2>Dialog, Drawer, Popover</h2></div><span className="count-pill">interaction patterns</span></div>
              <div className="prototype-action-row">
                <button className="tool-button tool-button-primary" type="button" onClick={() => setIsDialogOpen(true)}>Open Dialog</button>
                <button className="tool-button" type="button" onClick={() => setIsDrawerOpen(true)}>Open Drawer</button>
                <button className="tool-button" type="button" onClick={() => setIsPopoverOpen((value) => !value)}>Toggle Popover</button>
              </div>
              <div className="system-info-grid prototype-card-grid">
                <article className="system-info-card prototype-anchor-card">
                  <span className="runtime-overview-label">Popover Anchor</span>
                  <strong className="system-info-title">Inline contextual help</strong>
                  <p>Best for small clarification, not for full workflows.</p>
                  {isPopoverOpen ? (
                    <div className="prototype-popover-card">
                      <strong>Popover</strong>
                      <p className="rules-cell-copy">Use for quick explanation, preview, or secondary metadata.</p>
                    </div>
                  ) : null}
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Overlay Use</span>
                  <strong className="system-info-title">Choose by task weight</strong>
                  <div className="rules-pill-row">
                    <span className="meta-pill">Dialog = confirm</span>
                    <span className="meta-pill">Drawer = extended form</span>
                    <span className="meta-pill">Popover = contextual hint</span>
                  </div>
                </article>
              </div>
              {isDialogOpen ? <div className="prototype-overlay-backdrop"><div className="prototype-dialog"><div className="panel-toolbar"><h2>Dialog Pattern</h2><button className="tool-button" type="button" onClick={() => setIsDialogOpen(false)}>Close</button></div><p className="rules-cell-copy">Use dialog when a user must confirm a risky action or make a short focused decision.</p></div></div> : null}
              {isDrawerOpen ? <div className="prototype-drawer"><div className="panel-toolbar"><h2>Drawer Pattern</h2><button className="tool-button" type="button" onClick={() => setIsDrawerOpen(false)}>Close</button></div><p className="rules-cell-copy">Drawer supports longer forms or side-mounted inspectors without abandoning the page context.</p><div className="prototype-action-row"><button className="tool-button tool-button-primary" type="button">Apply</button><button className="tool-button" type="button" onClick={() => setIsDrawerOpen(false)}>Dismiss</button></div></div> : null}
            </>
          ) : null}

          {activeTab === 'states' ? (
            <>
              <div className="panel-toolbar"><div><p className="workspace-eyebrow">State Treatments</p><h2>Loading, Empty, Success, Blocked</h2></div><span className="count-pill">4 state examples</span></div>
              <div className="system-info-grid prototype-card-grid">
                <article className="system-info-card"><span className="runtime-overview-label">Loading</span><strong className="system-info-title">Skeleton / pending surface</strong><div className="prototype-skeleton-stack"><span /><span /><span /></div></article>
                <article className="system-info-card"><span className="runtime-overview-label">Success</span><strong className="system-info-title">Ready for promotion</strong><span className="status-pill status-good">healthy</span><p>Use green when the system is ready and user confidence should increase.</p></article>
                <article className="system-info-card"><span className="runtime-overview-label">Empty</span><strong className="system-info-title">No results found</strong><span className="status-pill status-neutral">empty</span><p>Pair empty state with a next action like widening filters or changing source type.</p></article>
                <article className="system-info-card"><span className="runtime-overview-label">Blocked</span><strong className="system-info-title">Runtime contract missing</strong><span className="status-pill status-offline">blocked</span><p>Use red for hard blockers only, with exact evidence and a deterministic recovery path.</p></article>
              </div>
            </>
          ) : null}

          {activeTab === 'charts' ? (
            <>
              <div className="panel-toolbar"><div><p className="workspace-eyebrow">Charts Family</p><h2>Real Chart Types</h2></div><span className="count-pill">{chartCatalog.length} named types</span></div>
              <div className="rules-pack-grid">
                {chartCatalog.map((chart) => (
                  <article key={chart.name} className="rules-pack-card"><strong>{chart.name}</strong><p className="rules-cell-copy">{chart.use}</p></article>
                ))}
              </div>
              <div className="rules-tool-grid prototype-chart-grid">
                <article className="rules-tool-card prototype-chart-card"><strong>Bar Chart</strong><ReactECharts option={charts.bar} style={{ height: 260 }} theme="default" /></article>
                <article className="rules-tool-card prototype-chart-card"><strong>Line / Area Chart</strong><ReactECharts option={charts.line} style={{ height: 260 }} theme="default" /></article>
                <article className="rules-tool-card prototype-chart-card"><strong>Donut Chart</strong><ReactECharts option={charts.donut} style={{ height: 260 }} theme="default" /></article>
              </div>
            </>
          ) : null}

          {activeTab === 'flow' ? (
            <>
              <div className="panel-toolbar"><div><p className="workspace-eyebrow">Flow Family</p><h2>React Flow Canvas</h2></div><span className="count-pill">workflow + dependency demo</span></div>
              <div className="prototype-flow-shell">
                <div className="prototype-flow-canvas">
                  <ReactFlow nodes={flowNodes} edges={flowEdges} fitView>
                    <MiniMap />
                    <Controls />
                    <Background />
                  </ReactFlow>
                </div>
                <article className="system-info-card">
                  <span className="runtime-overview-label">When to use</span>
                  <strong className="system-info-title">Process and dependency reasoning</strong>
                  <p>Good for task flow, approval lanes, dependency paths, or graph-like operator explanation. Avoid when a table or checklist is clearer.</p>
                </article>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </section>
  )
}