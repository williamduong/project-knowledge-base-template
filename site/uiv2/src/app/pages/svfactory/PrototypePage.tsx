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
import { useMemo, useState, useEffect, lazy, Suspense } from 'react'
import { GraphDbCytoscapePanel } from '../../components/prototype/GraphDbCytoscapePanel'
import { useForm } from 'react-hook-form'
// Lazy-load heavy visualization modules when needed
// (dynamic imports below inside component)
import { z } from 'zod'
import 'reactflow/dist/style.css'

type PrototypeTab = 'overview' | 'navigation' | 'tabs' | 'gates' | 'grid' | 'forms' | 'overlays' | 'states' | 'charts' | 'flow' | 'graphdb' | 'components'

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

const prototypeGateItems = [
  {
    gate: 'G-RELEASE-READY',
    title: 'Release Ready',
    status: 'pass',
    policy: 'block',
    detail: 'Release preconditions and downstream evidence are satisfied for this snapshot.',
    command: 'kbx release check --json',
  },
  {
    gate: 'G-EVIDENCE-SUFFICIENT',
    title: 'Evidence Sufficient',
    status: 'warn',
    policy: 'warn',
    detail: 'Workspace evidence is mostly present, but one downstream validation is still pending.',
    command: 'kbx doctor --json',
  },
  {
    gate: 'G-CHAOS-WITHIN-THRESHOLD',
    title: 'Chaos Within Threshold',
    status: 'block',
    policy: 'block',
    detail: 'Chaos coefficient crossed the operator threshold and should stop promotion until reconciled.',
    command: 'kbx chaos --estimate --json',
  },
  {
    gate: 'G-SINGLE-OWNER-INTENT',
    title: 'Single Owner Intent',
    status: 'pass',
    policy: 'block',
    detail: 'Exactly one owner intent is active for the current version scope.',
    command: 'kbx status --json',
  },
]

function prototypeGateTone(status: string) {
  if (status === 'block') return 'status-offline'
  if (status === 'warn') return 'status-warn'
  return 'status-good'
}

const chartCatalog = [
  { name: 'Bar Chart', use: 'Compare counts or throughput across rule families.' },
  { name: 'Line Chart', use: 'Trend findings, drift, or runtime health over time.' },
  { name: 'Donut Chart', use: 'Show distribution of categories with small label sets.' },
  { name: 'Stacked Area', use: 'Surface composition shifts across time or releases.' },
  { name: 'Heatmap', use: 'Matrix-like hotspots such as rule-to-surface pressure.' },
  { name: 'Scatter', use: 'Plot relationships or anomalies across two metrics.' },
  { name: 'Radar', use: 'Compare multi-dimensional profiles across axes.' },
  { name: 'Gauge', use: 'Single-value telemetry or threshold visualization.' },
]

const formSchema = z.object({
  title: z.string().min(8, 'Title needs at least 8 characters.'),
  owner: z.string().min(3, 'Owner must be a stable team or role slug.'),
  sourceType: z.enum(['Agent Contract', 'Agent Manual', 'Governance']),
  summary: z.string().min(20, 'Summary should explain the UX intent clearly.'),
})

type FormValues = z.infer<typeof formSchema>

const flowNodes: any[] = [
  { id: 'catalog', position: { x: 0, y: 80 }, data: { label: 'Capability Catalog' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
  { id: 'navigation', position: { x: 220, y: 0 }, data: { label: 'Navigation Family' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
  { id: 'grid', position: { x: 220, y: 110 }, data: { label: 'Data Grid Family' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
  { id: 'forms', position: { x: 220, y: 220 }, data: { label: 'Validated Forms' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
  { id: 'charts', position: { x: 460, y: 55 }, data: { label: 'Charts & Metrics' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
  { id: 'states', position: { x: 460, y: 170 }, data: { label: 'States & Overlays' }, style: { borderRadius: 12, padding: 10, background: '#101722', color: '#ebf2fa', border: '1px solid #314863' } },
]

const flowEdges: any[] = [
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
    stackedArea: {
      tooltip: { trigger: 'axis' },
      legend: { data: ['A', 'B', 'C'], textStyle: { color: '#cbd5e1' } },
      xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
      yAxis: { type: 'value' },
      series: [
        { name: 'A', type: 'line', stack: 'total', areaStyle: {}, data: [120, 132, 101, 134, 90, 230], color: '#60a5fa' },
        { name: 'B', type: 'line', stack: 'total', areaStyle: {}, data: [220, 182, 191, 234, 290, 330], color: '#34d399' },
        { name: 'C', type: 'line', stack: 'total', areaStyle: {}, data: [150, 232, 201, 154, 190, 330], color: '#f97316' },
      ],
    },
    heatmap: {
      tooltip: { position: 'top' },
      grid: { height: '50%' },
      xAxis: { type: 'category', data: ['S1', 'S2', 'S3', 'S4', 'S5'] },
      yAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E'] },
      visualMap: { min: 0, max: 10, calculable: true, orient: 'horizontal', left: 'center', top: '70%' },
      series: [{
        name: 'Heat',
        type: 'heatmap',
        data: [[0,0,5],[0,1,1],[0,2,0],[0,3,3],[0,4,7],[1,0,2],[1,1,0],[1,2,4],[1,3,6],[1,4,2]],
        emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } }
      }],
    },
    scatter: {
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value' },
      yAxis: { type: 'value' },
      series: [{
        symbolSize: 12,
        data: [[10,8],[15,18],[20,12],[25,22],[30,16],[35,28]],
        type: 'scatter',
        itemStyle: { color: '#f472b6' }
      }],
    },
    radar: {
      tooltip: {},
      radar: { indicator: [{ name: 'Perf', max: 100 }, { name: 'Reliability', max: 100 }, { name: 'Scalability', max: 100 }, { name: 'UX', max: 100 }, { name: 'Security', max: 100 }], radius: '60%' },
      series: [{ type: 'radar', data: [{ value: [80, 90, 70, 85, 60], name: 'Current' }], itemStyle: { color: '#60a5fa' } }],
    },
    gauge: {
      series: [{
        type: 'gauge',
        progress: { show: true },
        axisLine: { lineStyle: { width: 12 } },
        detail: { valueAnimation: true, formatter: '{value}%' },
        data: [{ value: 62, name: 'Util' }]
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

  // Lazy-loaded modules
  const [EChartsModule, setEChartsModule] = useState<any | null>(null)
  const [ReactFlowModule, setReactFlowModule] = useState<any | null>(null)
  const ComponentsHub = lazy(() => import('../../components/prototype/ComponentsHub'))

  useEffect(() => {
    if (activeTab === 'charts' && !EChartsModule) {
      import('echarts-for-react').then((m) => setEChartsModule(m)).catch(() => {})
    }
    if (activeTab === 'flow' && !ReactFlowModule) {
      import('reactflow').then((m) => setReactFlowModule(m)).catch(() => {})
    }
  }, [activeTab, EChartsModule, ReactFlowModule])

  // Data grid expansion state
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const toggleExpand = (id: string) => setExpandedRows((p) => ({ ...(p || {}), [id]: !p[id] }))

  // Tabs demo local state (per-variant)
  const [underlineIndex, setUnderlineIndex] = useState<number>(0)
  const [segmentedTabIndex, setSegmentedTabIndex] = useState<number>(1)
  const [pillIndex, setPillIndex] = useState<number>(0)
  const [verticalTabsIndex, setVerticalTabsIndex] = useState<number>(2)

  // States demo selection
  const [stateView, setStateView] = useState<'loading' | 'success' | 'empty' | 'blocked'>('loading')

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
            <button className={`system-menu-item${activeTab === 'gates' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('gates')}><span className="system-menu-item-label"><Icon icon={shield} aria-hidden="true" /><span>Gates</span></span><small>operator layout</small></button>
            <button className={`system-menu-item${activeTab === 'grid' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('grid')}><span className="system-menu-item-label"><Icon icon={layoutGrid} aria-hidden="true" /><span>Data Grid</span></span><small>tanstack table</small></button>
            <button className={`system-menu-item${activeTab === 'forms' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('forms')}><span className="system-menu-item-label"><Icon icon={listTodo} aria-hidden="true" /><span>Forms</span></span><small>rhf + zod</small></button>
            <button className={`system-menu-item${activeTab === 'overlays' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('overlays')}><span className="system-menu-item-label"><Icon icon={bot} aria-hidden="true" /><span>Overlays</span></span><small>modal + drawer</small></button>
            <button className={`system-menu-item${activeTab === 'states' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('states')}><span className="system-menu-item-label"><Icon icon={shield} aria-hidden="true" /><span>States</span></span><small>loading + empty</small></button>
            <button className={`system-menu-item${activeTab === 'charts' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('charts')}><span className="system-menu-item-label"><Icon icon={chartColumn} aria-hidden="true" /><span>Charts</span></span><small>echarts</small></button>
            <button className={`system-menu-item${activeTab === 'flow' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('flow')}><span className="system-menu-item-label"><Icon icon={workflow} aria-hidden="true" /><span>Flow</span></span><small>reactflow</small></button>
            <button className={`system-menu-item${activeTab === 'graphdb' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('graphdb')}><span className="system-menu-item-label"><Icon icon={server} aria-hidden="true" /><span>GraphDB</span></span><small>cytoscape</small></button>
            <button className={`system-menu-item${activeTab === 'components' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('components')}><span className="system-menu-item-label"><Icon icon={blocks} aria-hidden="true" /><span>Components</span></span><small>controls</small></button>
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
                <span className="meta-pill">GraphDB</span>
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
                  ['GraphDB', 'Cytoscape.js surface for the live planning projection'],
                ].map(([title, detail]) => (
                  <article key={title} className="system-info-card">
                    <span className="runtime-overview-label">Capability</span>
                    <strong className="system-info-title">{title}</strong>
                    <p>{detail}</p>
                  </article>
                ))}
              </div>
              <div className="system-info-grid prototype-card-grid prototype-typo-grid">
                <article className="system-info-card">
                  <span className="runtime-overview-label">Typography</span>
                  <strong className="system-info-title">Type Scale & Styles</strong>
                  <div className="prototype-typo-samples">
                    <h1>H1 — Heading Largest</h1>
                    <h2>H2 — Section Heading</h2>
                    <h3>H3 — Subsection</h3>
                    <h4>H4 — Smaller Heading</h4>
                    <h5>H5 — Small Heading</h5>
                    <h6>H6 — Caption</h6>
                    <p className="lead">Lead paragraph — larger and slightly muted to introduce content.</p>
                    <p>Text paragraph with <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <code>inline code</code>, and a <a href="#">link</a>.</p>
                    <blockquote>“Design for operator clarity — keep affordances obvious.”</blockquote>
                    <ul><li>Unordered item</li><li>Another item</li></ul>
                    <ol><li>First</li><li>Second</li></ol>
                  </div>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Inputs</span>
                  <strong className="system-info-title">Native Inputs & Formats</strong>
                  <form className="prototype-input-samples" onSubmit={(e) => e.preventDefault()}>
                    <label>Text<input type="text" placeholder="Text input" /></label>
                    <label>Email<input type="email" placeholder="name@example.com" /></label>
                    <label>Number<input type="number" placeholder="42" /></label>
                    <label>Password<input type="password" placeholder="••••••" /></label>
                    <label>Search<input type="search" placeholder="search" /></label>
                    <label>Date<input type="date" /></label>
                    <label>Datetime<input type="datetime-local" /></label>
                    <label>Time<input type="time" /></label>
                    <label>Color<input type="color" defaultValue="#60a5fa" /></label>
                    <label>Range<input type="range" min={0} max={100} defaultValue={30} /></label>
                    <label>File<input type="file" /></label>
                    <label>Textarea<textarea rows={3}></textarea></label>
                    <label>Select
                      <select defaultValue="">
                        <option value="">Choose</option>
                        <option>Option A</option>
                        <option>Option B</option>
                      </select>
                    </label>
                    <div className="prototype-switch-row">
                      <label><input type="checkbox" /> Checkbox</label>
                      <label><input type="radio" name="r1" defaultChecked /> Radio</label>
                    </div>
                  </form>
                </article>
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
                    {['Overview', 'Signals', 'Mutations', 'Audit'].map((item, i) => <button key={item} className={`prototype-tab-button ${underlineIndex === i ? 'active' : ''}`} type="button" onClick={() => setUnderlineIndex(i)}>{item}</button>)}
                  </div>
                  <div className="prototype-tab-content">{['Overview content', 'Signals content', 'Mutations content', 'Audit content'][underlineIndex]}</div>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Segmented Tabs</span>
                  <div className="prototype-segmented-tabs">
                    {['List', 'Detail', 'Actions'].map((item, index) => <button key={item} className={`prototype-tab-button ${segmentedTabIndex === index ? 'active' : ''}`} type="button" onClick={() => setSegmentedTabIndex(index)}>{item}</button>)}
                  </div>
                  <div className="prototype-tab-content">{['List view content', 'Detail panel content', 'Actions panel content'][segmentedTabIndex]}</div>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Pill Tabs</span>
                  <div className="rules-pill-row">
                    {['All', 'Hard', 'Master', 'Soft'].map((item, index) => <button key={item} className={`tool-button${pillIndex === index ? ' active' : ''}`} type="button" onClick={() => setPillIndex(index)}>{item}</button>)}
                  </div>
                  <div className="prototype-tab-content">Selected filter: {['All', 'Hard', 'Master', 'Soft'][pillIndex]}</div>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Vertical Tabs</span>
                  <div className="prototype-vertical-tabs">
                    {['Profile', 'Policies', 'Runtime', 'Audit'].map((item, index) => <button key={item} className={`prototype-vertical-tab ${verticalTabsIndex === index ? 'active' : ''}`} type="button" onClick={() => setVerticalTabsIndex(index)}>{item}</button>)}
                  </div>
                  <div className="prototype-tab-content">Panel: {['Profile', 'Policies', 'Runtime', 'Audit'][verticalTabsIndex]}</div>
                </article>
              </div>
            </>
          ) : null}

          {activeTab === 'gates' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Operational Gates</p>
                  <h2>Gate Layout Prototype</h2>
                </div>
                <div className="panel-toolbar-meta">
                  <span className="count-pill">system-style detail pane</span>
                  <span className="count-pill">{prototypeGateItems.length} sample gates</span>
                </div>
              </div>

              <div className="kb-health-bar gate-health-bar">
                <div className="kb-health-group">
                  <span className="runtime-overview-label">Total</span>
                  <span className="count-pill kb-health-total">{prototypeGateItems.length} gates</span>
                </div>
                <div className="kb-health-group">
                  <span className="runtime-overview-label">Pass</span>
                  <span className="status-pill status-good">{prototypeGateItems.filter((item) => item.status === 'pass').length} pass</span>
                </div>
                <div className="kb-health-group">
                  <span className="runtime-overview-label">Warn</span>
                  <span className="status-pill status-warn">{prototypeGateItems.filter((item) => item.status === 'warn').length} warn</span>
                </div>
                <div className="kb-health-group">
                  <span className="runtime-overview-label">Block</span>
                  <span className="status-pill status-offline">{prototypeGateItems.filter((item) => item.status === 'block').length} block</span>
                </div>
                <div className="kb-health-next">
                  <span className="runtime-overview-label">Intent</span>
                  <span className="kb-health-next-text">Use this surface to compare gate-as-card density before graduating it into System.</span>
                </div>
              </div>

              <div className="runtime-overview-grid compact-runtime-overview-grid gate-overview-grid">
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Module</span>
                  <strong>gates</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Placement</span>
                  <strong>detail pane</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Layout</span>
                  <strong>health + grid</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Audience</span>
                  <strong>operator</strong>
                </div>
              </div>

              <div className="gate-grid">
                {prototypeGateItems.map((item) => (
                  <article key={item.gate} className="gate-card">
                    <div className="gate-card-header">
                      <div>
                        <span className="runtime-overview-label">{item.gate}</span>
                        <strong className="system-info-title">{item.title}</strong>
                      </div>
                      <div className="gate-card-pills">
                        <span className={`status-pill ${prototypeGateTone(item.status)}`}>{item.status}</span>
                        <span className={`status-pill ${item.policy === 'block' ? 'status-neutral' : 'status-live'}`}>{item.policy}</span>
                      </div>
                    </div>
                    <p className="rules-cell-copy">{item.detail}</p>
                    <div className="gate-card-meta">
                      <div>
                        <span className="runtime-overview-label">Command</span>
                        <code>{item.command}</code>
                      </div>
                    </div>
                  </article>
                ))}
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
                  <div key={row.id} className="rules-row-wrap">
                    <article onClick={() => toggleExpand(row.id)} key={row.id} className="rules-table-row prototype-grid-row" role="row">
                      {row.getVisibleCells().map((cell) => <div key={cell.id} role="cell">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>)}
                    </article>
                    {expandedRows[row.id] ? (
                      <div className="expanded-details" role="region">
                        <div className="expanded-content">
                          <strong>Details</strong>
                          <p>{row.original.description}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
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
              <div className="prototype-state-controls">
                <div className="rules-pill-row">
                  {(['loading', 'success', 'empty', 'blocked'] as const).map((s) => (
                    <button key={s} className={`tool-button${stateView === s ? ' active' : ''}`} type="button" onClick={() => setStateView(s)}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="system-info-grid prototype-card-grid">
                {stateView === 'loading' ? (
                  <article className="system-info-card"><span className="runtime-overview-label">Loading</span><strong className="system-info-title">Skeleton / pending surface</strong><div className="prototype-skeleton-stack"><span /><span /><span /></div></article>
                ) : stateView === 'success' ? (
                  <article className="system-info-card"><span className="runtime-overview-label">Success</span><strong className="system-info-title">Ready for promotion</strong><span className="status-pill status-good">healthy</span><p>Use green when the system is ready and user confidence should increase.</p></article>
                ) : stateView === 'empty' ? (
                  <article className="system-info-card"><span className="runtime-overview-label">Empty</span><strong className="system-info-title">No results found</strong><span className="status-pill status-neutral">empty</span><p>Pair empty state with a next action like widening filters or changing source type.</p></article>
                ) : (
                  <article className="system-info-card"><span className="runtime-overview-label">Blocked</span><strong className="system-info-title">Runtime contract missing</strong><span className="status-pill status-offline">blocked</span><p>Use red for hard blockers only, with exact evidence and a deterministic recovery path.</p></article>
                )}
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
                {EChartsModule ? (
                  (() => {
                    const ReactECharts = EChartsModule.default || EChartsModule
                    return (
                      <>
                        <article className="rules-tool-card prototype-chart-card"><strong>Bar Chart</strong><ReactECharts option={charts.bar} style={{ height: 260 }} theme="default" /></article>
                        <article className="rules-tool-card prototype-chart-card"><strong>Line / Area Chart</strong><ReactECharts option={charts.line} style={{ height: 260 }} theme="default" /></article>
                        <article className="rules-tool-card prototype-chart-card"><strong>Donut Chart</strong><ReactECharts option={charts.donut} style={{ height: 260 }} theme="default" /></article>
                        <article className="rules-tool-card prototype-chart-card"><strong>Stacked Area</strong><ReactECharts option={charts.stackedArea} style={{ height: 260 }} theme="default" /></article>
                        <article className="rules-tool-card prototype-chart-card"><strong>Heatmap</strong><ReactECharts option={charts.heatmap} style={{ height: 340 }} theme="default" /></article>
                        <article className="rules-tool-card prototype-chart-card"><strong>Scatter</strong><ReactECharts option={charts.scatter} style={{ height: 260 }} theme="default" /></article>
                        <article className="rules-tool-card prototype-chart-card"><strong>Radar</strong><ReactECharts option={charts.radar} style={{ height: 340 }} theme="default" /></article>
                        <article className="rules-tool-card prototype-chart-card"><strong>Gauge</strong><ReactECharts option={charts.gauge} style={{ height: 220 }} theme="default" /></article>
                      </>
                    )
                  })()
                ) : (
                  <article className="rules-tool-card prototype-chart-card"><em>Loading chart renderer…</em></article>
                )}
              </div>
            </>
          ) : null}

          {activeTab === 'flow' ? (
            <>
              <div className="panel-toolbar"><div><p className="workspace-eyebrow">Flow Family</p><h2>React Flow Canvas</h2></div><span className="count-pill">workflow + dependency demo</span></div>
              <div className="prototype-flow-shell">
                <div className="prototype-flow-canvas">
                  {ReactFlowModule ? (
                    (() => {
                      const ReactFlowComp = ReactFlowModule.default || ReactFlowModule.ReactFlow || ReactFlowModule
                      const MiniMapComp = ReactFlowModule.MiniMap
                      const ControlsComp = ReactFlowModule.Controls
                      const BackgroundComp = ReactFlowModule.Background
                      return (
                        <ReactFlowComp nodes={flowNodes} edges={flowEdges} fitView>
                          {MiniMapComp ? <MiniMapComp /> : null}
                          {ControlsComp ? <ControlsComp /> : null}
                          {BackgroundComp ? <BackgroundComp /> : null}
                        </ReactFlowComp>
                      )
                    })()
                  ) : (
                    <div className="rules-tool-card prototype-chart-card"><em>Loading flow canvas…</em></div>
                  )}
                </div>
                <article className="system-info-card">
                  <span className="runtime-overview-label">When to use</span>
                  <strong className="system-info-title">Process and dependency reasoning</strong>
                  <p>Good for task flow, approval lanes, dependency paths, or graph-like operator explanation. Avoid when a table or checklist is clearer.</p>
                </article>
              </div>
            </>
          ) : null}

          {activeTab === 'graphdb' ? (
            <>
              <div className="panel-toolbar"><div><p className="workspace-eyebrow">GraphDB Family</p><h2>Cytoscape.js planning graph</h2></div><span className="count-pill">live graph projection</span></div>
              <GraphDbCytoscapePanel />
            </>
          ) : null}

          {activeTab === 'components' ? (
            <>
              <div className="panel-toolbar"><div><p className="workspace-eyebrow">UI Controls</p><h2>Component Demos</h2></div><span className="count-pill">10 samples</span></div>
              <Suspense fallback={<div className="system-info-card"><em>Loading components…</em></div>}>
                <ComponentsHub />
              </Suspense>
            </>
          ) : null}
        </section>
      </div>
    </section>
  )
}
