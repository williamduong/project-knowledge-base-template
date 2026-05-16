import { Icon } from '@iconify/react'
import blocks from '@iconify-icons/lucide/blocks'
import bot from '@iconify-icons/lucide/bot'
import chartColumn from '@iconify-icons/lucide/bar-chart-3'
import gitBranch from '@iconify-icons/lucide/git-branch'
import listTodo from '@iconify-icons/lucide/list-todo'
import panelLeft from '@iconify-icons/lucide/panel-left'
import searchIcon from '@iconify-icons/lucide/search'
import server from '@iconify-icons/lucide/server'
import shield from '@iconify-icons/lucide/shield'
import { useState } from 'react'

type PrototypeTab = 'overview' | 'navigation' | 'tables' | 'forms' | 'states' | 'analytics'

const navigationPatterns = [
  { label: 'Top Tab Strip', detail: 'Primary global navigation. Keep route state in URL and reserve this strip for domain workspaces.', tone: 'status-good' },
  { label: 'Local Rail', detail: 'Secondary workspace navigation for System or Prototype submodes only.', tone: 'status-live' },
  { label: 'Toolbar Actions', detail: 'Compact actions for sync, preview, and promote flows.', tone: 'status-neutral' },
  { label: 'Status Footer', detail: 'Persistent low-noise runtime bar with expandable detail.', tone: 'status-warn' },
]

const componentGallery = [
  { label: 'Surface Panel', detail: 'Primary shell panel with dense operator spacing.', tone: 'status-good' },
  { label: 'Status Pill', detail: 'Compact signal markers for state, severity, and source taxonomy.', tone: 'status-warn' },
  { label: 'Meta Pill', detail: 'Secondary telemetry chips for low-noise labels and counts.', tone: 'status-neutral' },
  { label: 'Inspector Card', detail: 'Context sidecar for focus, notes, and action readiness.', tone: 'status-good' },
]

const prototypeRules = [
  { id: 'KBX-MR002', severity: 'warn', kind: 'master', sourceType: 'Agent Manual', source: 'template/12-ai-skills/agent-operating-manual.md', description: 'Deterministic commands beat prompt-only reasoning.' },
  { id: 'KBX-MR003', severity: 'warn', kind: 'master', sourceType: 'Agent Contract', source: 'template/.github/agents/kbx.agent.template.md', description: 'Non-trivial KB change must route through intent flow.' },
  { id: 'KBX-S006', severity: 'warn', kind: 'soft', sourceType: 'Agent Contract', source: 'template/.github/agents/kbx.agent.template.md', description: 'Probe install state via CLI rather than hidden filesystem heuristics.' },
  { id: 'KBX-GB001', severity: 'error', kind: 'hard', sourceType: 'Governance', source: 'template/15-governance/git-binding-policy.md', description: 'Intent IDs must satisfy the current naming contract.' },
]

const formPresets = [
  { id: 'intent', label: 'Intent Create', detail: 'Metadata-first mutation entry with risk framing.' },
  { id: 'rule', label: 'Rule Review', detail: 'Structured triage for source, enforcement, and consolidation.' },
  { id: 'runtime', label: 'Runtime Repair', detail: 'Action preview before deterministic service recovery.' },
]

export function PrototypePage() {
  const [activeTab, setActiveTab] = useState<PrototypeTab>('overview')
  const [searchText, setSearchText] = useState('agent')
  const [kindFilter, setKindFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selectedPreset, setSelectedPreset] = useState('intent')

  const filteredRules = prototypeRules.filter((rule) => {
    if (kindFilter !== 'all' && rule.kind !== kindFilter) {
      return false
    }
    if (sourceFilter !== 'all' && rule.sourceType !== sourceFilter) {
      return false
    }
    if (!searchText.trim()) {
      return true
    }

    return `${rule.id} ${rule.source} ${rule.description}`.toLowerCase().includes(searchText.trim().toLowerCase())
  })

  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">R&D Sandbox</p>
          <h1>R&amp;D Prototype</h1>
          <p>Sandbox route for showing the current shell language, component inventory, dense tables, filters, forms, and state treatments in one operator-facing workspace.</p>
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
              <p className="workspace-eyebrow">Prototype Modes</p>
              <div className="section-title-row">
                <span className="section-icon section-icon-system" aria-hidden="true">
                  <Icon icon={blocks} />
                </span>
                <h2>Component Sandbox</h2>
              </div>
            </div>
          </div>
          <div className="system-menu-list" role="tablist" aria-label="Prototype sections">
            <button className={`system-menu-item${activeTab === 'overview' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('overview')}>
              <span className="system-menu-item-label"><Icon icon={server} aria-hidden="true" /><span>Overview</span></span>
              <small>shell + cards</small>
            </button>
            <button className={`system-menu-item${activeTab === 'navigation' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('navigation')}>
              <span className="system-menu-item-label"><Icon icon={panelLeft} aria-hidden="true" /><span>Navigation</span></span>
              <small>tabs + rails</small>
            </button>
            <button className={`system-menu-item${activeTab === 'tables' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('tables')}>
              <span className="system-menu-item-label"><Icon icon={chartColumn} aria-hidden="true" /><span>Tables</span></span>
              <small>filters + sort</small>
            </button>
            <button className={`system-menu-item${activeTab === 'forms' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('forms')}>
              <span className="system-menu-item-label"><Icon icon={listTodo} aria-hidden="true" /><span>Forms</span></span>
              <small>inputs + actions</small>
            </button>
            <button className={`system-menu-item${activeTab === 'states' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('states')}>
              <span className="system-menu-item-label"><Icon icon={shield} aria-hidden="true" /><span>States</span></span>
              <small>empty + alert</small>
            </button>
            <button className={`system-menu-item${activeTab === 'analytics' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('analytics')}>
              <span className="system-menu-item-label"><Icon icon={blocks} aria-hidden="true" /><span>Analytics</span></span>
              <small>charts + metrics</small>
            </button>
          </div>
          <ul className="signal-list">
            <li>Use this route to test shell rhythm before landing new production workspaces.</li>
            <li>Every block here should show a reusable UI pattern, not just placeholder theater.</li>
            <li>Keep it dense and operator-first, not a gallery website.</li>
          </ul>
        </aside>

        <section className="surface-panel surface-panel-primary system-detail-panel prototype-shell">
          {activeTab === 'overview' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Shell Demo</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={server} />
                    </span>
                    <h2>Operator Surface Inventory</h2>
                  </div>
                </div>
                <div className="panel-toolbar-meta">
                  <span className="count-pill">6 families</span>
                  <span className="count-pill">Reusable patterns only</span>
                </div>
              </div>

              <div className="runtime-summary-bar">
                <span className="meta-pill">Shell frame live</span>
                <span className="meta-pill">Dense panel language</span>
                <span className="meta-pill">Top nav primary</span>
                <span className="meta-pill">Local rail secondary</span>
              </div>

              <div className="system-info-grid prototype-card-grid">
                <article className="system-info-card">
                  <span className="runtime-overview-label">Command Bar</span>
                  <strong className="system-info-title">Compact global nav + utility actions</strong>
                  <p>Header remains thin and operational. Use it for mode changes, search entry, refresh, and route switching.</p>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Status Language</span>
                  <strong className="system-info-title">Pills, chips, and low-noise counters</strong>
                  <p>Use count pills for summary, meta pills for telemetry, and status pills for tone-bearing state.</p>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Workspace Rhythm</span>
                  <strong className="system-info-title">Toolbar → summary bar → detail surface</strong>
                  <p>Each page should read as a working console: immediate context, quick metrics, then actionable detail.</p>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Local Navigation</span>
                  <strong className="system-info-title">Rail for secondary slices only</strong>
                  <p>Keep top tabs global. Use the left rail only when a workspace has multiple submodes or operator tasks.</p>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Family Catalog</span>
                  <strong className="system-info-title">Navigation, tables, forms, states, analytics</strong>
                  <p>Prototype route is now a living catalog for reusable UI families before they graduate into real workspaces.</p>
                </article>
              </div>
            </>
          ) : null}

          {activeTab === 'navigation' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Navigation Catalog</p>
                  <h2>Tabs, Rails, Toolbars, Footer</h2>
                </div>
                <span className="count-pill">{navigationPatterns.length} patterns</span>
              </div>
              <div className="runtime-summary-bar">
                <span className="meta-pill">Top tabs = global</span>
                <span className="meta-pill">Left rail = local</span>
                <span className="meta-pill">Toolbar = action strip</span>
                <span className="meta-pill">Footer = runtime status</span>
              </div>
              <div className="rules-pack-grid">
                {navigationPatterns.map((item) => (
                  <article key={item.label} className="rules-pack-card">
                    <div className="rules-pack-header">
                      <strong>{item.label}</strong>
                      <span className={`status-pill ${item.tone}`}>{item.tone.replace('status-', '')}</span>
                    </div>
                    <p className="rules-cell-copy">{item.detail}</p>
                    <div className="rules-pill-row">
                      <span className="meta-pill">Dense</span>
                      <span className="meta-pill">Reusable</span>
                      <span className="meta-pill">Operator-first</span>
                    </div>
                  </article>
                ))}
              </div>
              <div className="system-info-grid prototype-card-grid">
                <article className="system-info-card">
                  <span className="runtime-overview-label">Shell Example</span>
                  <strong className="system-info-title">Primary tabs should stay stable</strong>
                  <p>Do not overload top navigation with mode toggles. Keep it for first-class operator workspaces only.</p>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Prototype Family</span>
                  <strong className="system-info-title">Primitive Components</strong>
                  <div className="rules-pill-row">
                    {componentGallery.map((item) => (
                      <span key={item.label} className={`status-pill ${item.tone}`}>{item.label}</span>
                    ))}
                  </div>
                </article>
              </div>
            </>
          ) : null}

          {activeTab === 'tables' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Data Views</p>
                  <h2>Search, Filters, Sort, Pagination</h2>
                </div>
                <div className="panel-toolbar-meta">
                  <span className="count-pill">{filteredRules.length} rows</span>
                  <span className="count-pill">Prototype dataset</span>
                </div>
              </div>

              <div className="rules-filter-grid">
                <label className="rules-filter-select rules-filter-search">
                  <span>Search</span>
                  <input type="text" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="rule id, source, description" />
                </label>
                <label className="rules-filter-select">
                  <span>Kind</span>
                  <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>
                    <option value="all">All kinds</option>
                    <option value="hard">Hard</option>
                    <option value="master">Master</option>
                    <option value="soft">Soft</option>
                  </select>
                </label>
                <label className="rules-filter-select">
                  <span>Source Type</span>
                  <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                    <option value="all">All sources</option>
                    <option value="Agent Contract">Agent Contract</option>
                    <option value="Agent Manual">Agent Manual</option>
                    <option value="Governance">Governance</option>
                  </select>
                </label>
              </div>

              <div className="rules-table" role="table" aria-label="Prototype rules table">
                <div className="rules-table-header prototype-table-header" role="row">
                  <button className="rules-column-button" type="button" role="columnheader">Rule ⇅</button>
                  <button className="rules-column-button" type="button" role="columnheader">Severity ⇅</button>
                  <button className="rules-column-button" type="button" role="columnheader">Kind ⇅</button>
                  <button className="rules-column-button" type="button" role="columnheader">Source Type ⇅</button>
                  <span role="columnheader">Source</span>
                  <span role="columnheader">Description</span>
                </div>
                {filteredRules.map((rule) => (
                  <article key={rule.id} className="rules-table-row prototype-table-row" role="row">
                    <div role="cell"><strong>{rule.id}</strong></div>
                    <div role="cell"><span className={`status-pill ${rule.severity === 'error' ? 'status-offline' : 'status-warn'}`}>{rule.severity}</span></div>
                    <div role="cell"><span className="status-pill status-neutral">{rule.kind}</span></div>
                    <div role="cell"><span className="status-pill status-good">{rule.sourceType}</span></div>
                    <div role="cell"><p className="rules-cell-copy rules-source-copy" title={rule.source}>{rule.source}</p></div>
                    <div role="cell"><p className="rules-cell-copy">{rule.description}</p></div>
                  </article>
                ))}
              </div>

              <div className="rules-pagination">
                <span className="rules-pagination-copy">Showing prototype table controls, sortable headers, and truncation behavior.</span>
                <div className="rules-pagination-actions">
                  <button className="tool-button" type="button">Previous</button>
                  <span className="count-pill">Page 1 / 1</span>
                  <button className="tool-button" type="button">Next</button>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'forms' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Form Demo</p>
                  <h2>Mutation Entry Patterns</h2>
                </div>
                <span className="count-pill">3 presets</span>
              </div>

              <div className="rules-filter-grid">
                <label className="rules-filter-select">
                  <span>Preset</span>
                  <select value={selectedPreset} onChange={(event) => setSelectedPreset(event.target.value)}>
                    {formPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>{preset.label}</option>
                    ))}
                  </select>
                </label>
                <label className="rules-filter-select rules-filter-search">
                  <span>Title</span>
                  <input type="text" value="Consolidate overlapping agent rules" readOnly />
                </label>
                <label className="rules-filter-select rules-filter-search">
                  <span>Owner</span>
                  <input type="text" value="knowledge-management" readOnly />
                </label>
              </div>

              <div className="system-info-grid prototype-card-grid">
                <article className="system-info-card">
                  <span className="runtime-overview-label">Preset</span>
                  <strong className="system-info-title">{formPresets.find((preset) => preset.id === selectedPreset)?.label ?? 'Intent Create'}</strong>
                  <p>{formPresets.find((preset) => preset.id === selectedPreset)?.detail ?? 'Structured operator form.'}</p>
                  <div className="rules-pill-row">
                    <span className="status-pill status-good">Valid</span>
                    <span className="status-pill status-neutral">Draft</span>
                  </div>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Actions</span>
                  <strong className="system-info-title">Primary + secondary mutation controls</strong>
                  <div className="prototype-action-row">
                    <button className="tool-button tool-button-primary" type="button">Preview</button>
                    <button className="tool-button" type="button">Save Draft</button>
                    <button className="tool-button" type="button">Cancel</button>
                  </div>
                </article>
              </div>
            </>
          ) : null}

          {activeTab === 'states' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">State Treatments</p>
                  <h2>Alerts, Empty States, Inspector</h2>
                </div>
                <span className="count-pill">attention patterns</span>
              </div>

              <div className="system-info-list">
                <article className="system-info-row prototype-state-row">
                  <div>
                    <div className="runtime-service-title-row">
                      <h3>Degraded Runtime Contract</h3>
                      <span className="status-pill status-offline">blocked</span>
                    </div>
                    <p className="runtime-service-meta">Use red only for action-blocking states with specific recovery path and clear evidence.</p>
                  </div>
                  <div>
                    <span className="runtime-overview-label">Recovery</span>
                    <p>Re-run deterministic check, then expose exact failing contract.</p>
                  </div>
                </article>
                <article className="system-info-row prototype-state-row">
                  <div>
                    <div className="runtime-service-title-row">
                      <h3>Empty Results</h3>
                      <span className="status-pill status-neutral">empty</span>
                    </div>
                    <p className="runtime-service-meta">Show no-results states inline with next action instead of pushing the user into dead space.</p>
                  </div>
                  <div>
                    <span className="runtime-overview-label">Next Action</span>
                    <p>Adjust filters, widen scope, or switch source group.</p>
                  </div>
                </article>
              </div>

              <div className="rules-tool-grid">
                <article className="rules-tool-card">
                  <strong>Inspector Mock</strong>
                  <p className="rules-cell-copy">Selected component: sortable registry header</p>
                  <p className="rules-cell-copy">Use when a page needs context, preview, schema help, or action readiness.</p>
                </article>
                <article className="rules-tool-card">
                  <strong>AI Assistant Surface</strong>
                  <div className="rules-pill-row">
                    <span className="status-pill status-live"><Icon icon={bot} aria-hidden="true" />Agent-safe</span>
                    <span className="status-pill status-neutral"><Icon icon={gitBranch} aria-hidden="true" />Traceable</span>
                    <span className="status-pill status-good"><Icon icon={searchIcon} aria-hidden="true" />Searchable</span>
                  </div>
                  <p className="rules-cell-copy">Demo for compact mixed-icon chips and guidance callouts.</p>
                </article>
              </div>
            </>
          ) : null}

          {activeTab === 'analytics' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Analytics Family</p>
                  <h2>Metrics, Trends, Visualization Stubs</h2>
                </div>
                <span className="count-pill">ECharts-ready</span>
              </div>
              <div className="runtime-overview-grid compact-runtime-overview-grid">
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Rule Coverage</span>
                  <strong>47</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Tool-backed</span>
                  <strong>31</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Registry Sources</span>
                  <strong>6</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Findings</span>
                  <strong>0</strong>
                </div>
              </div>
              <div className="rules-tool-grid">
                <article className="rules-tool-card prototype-chart-card">
                  <strong>Chart Surface Stub</strong>
                  <div className="prototype-chart-bars" aria-hidden="true">
                    <span style={{ height: '42%' }} />
                    <span style={{ height: '68%' }} />
                    <span style={{ height: '54%' }} />
                    <span style={{ height: '88%' }} />
                    <span style={{ height: '61%' }} />
                    <span style={{ height: '76%' }} />
                  </div>
                  <p className="rules-cell-copy">Use this family for operator charts only when the metric explains a decision, not as decoration.</p>
                </article>
                <article className="rules-tool-card">
                  <strong>Analytical Callouts</strong>
                  <p className="rules-cell-copy">Preferred first step: KPI strip, then compact comparison chart, then one focused diagnostic table.</p>
                  <div className="rules-pill-row">
                    <span className="meta-pill">metrics-first</span>
                    <span className="meta-pill">not dashboard theater</span>
                    <span className="meta-pill">decision-oriented</span>
                  </div>
                </article>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </section>
  )
}