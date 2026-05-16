import { NavLink, Route, Routes, useLocation } from 'react-router-dom'

const tabs = [
  { label: 'Home', path: '/' },
  { label: 'Intents', path: '/intents' },
  { label: 'Knowledge Base', path: '/kb' },
  { label: 'Rules', path: '/rules' },
  { label: 'Graph', path: '/graph' },
  { label: 'Search', path: '/search' },
  { label: 'System', path: '/system' },
]

const routeMeta: Record<string, { eyebrow: string; summary: string; selection: string }> = {
  '/': {
    eyebrow: 'Home Aggregation Deferred',
    summary: 'Home stays thin until module surfaces become trustworthy.',
    selection: 'No pinned entity. Shell-first mode remains active.',
  },
  '/intents': {
    eyebrow: 'Intent Workspace',
    summary: 'Intent list is the first real domain slice inside the compact shell.',
    selection: 'List-only selection. Detail and actions are deferred to the next slice.',
  },
  '/kb': {
    eyebrow: 'Knowledge Base Workspace',
    summary: 'Document tree and reader will land after Intent and Task flows are anchored.',
    selection: 'No document selected.',
  },
  '/rules': {
    eyebrow: 'Rules Workspace',
    summary: 'Rule registry and findings stay deferred until core document and intent context stabilizes.',
    selection: 'No rule domain selected.',
  },
  '/graph': {
    eyebrow: 'Graph Workspace',
    summary: 'Graph remains a later module with metrics first and exploration later.',
    selection: 'No graph focus selected.',
  },
  '/search': {
    eyebrow: 'Search Workspace',
    summary: 'Cross-surface retrieval depends on stable result contracts from other modules.',
    selection: 'No result selected.',
  },
  '/system': {
    eyebrow: 'System Workspace',
    summary: 'Runtime and repository diagnostics will sit in a dedicated operator workspace.',
    selection: 'No runtime artifact selected.',
  },
}

const intentRows = [
  {
    id: 'v2-9-uiv2-shadcn-admin-shell-adoption',
    title: 'Rebuild KBX UIV2 shell with donor-driven visual language',
    state: 'active',
    priority: 'high',
    focus: 'Compact shell correction and Intent-first execution surface.',
    nextAction: 'Build Intent detail in the new shell instead of extending the old page shell.',
    blockReason: 'Legacy source parity on this branch is still notes-backed.',
  },
  {
    id: 'v2-10-intent-lifecycle-domain-separation',
    title: 'Separate intent lifecycle from broader domain aggregation',
    state: 'closed',
    priority: 'medium',
    focus: 'Historical reference for state ownership and lifecycle boundaries.',
    nextAction: 'Reuse contract decisions when action surfaces are added.',
    blockReason: 'No active blocker.',
  },
  {
    id: 'v2-9-kbagent-observability-graph',
    title: 'Legacy observability and graph checkpoint reference',
    state: 'dropped',
    priority: 'low',
    focus: 'Reference-only artifact from an older direction.',
    nextAction: 'Extract only reusable signals, not the old surface structure.',
    blockReason: 'Superseded by the module-first rebuild.',
  },
]

function PlaceholderPage(props: { title: string; subtitle: string; next: string }) {
  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">{props.title}</p>
          <h1>{props.title}</h1>
        </div>
        <div className="toolbar-actions">
          <button className="tool-button" type="button">
            Focus View
          </button>
          <button className="tool-button" type="button">
            Inspect
          </button>
        </div>
      </header>

      <div className="workspace-grid single-column-grid">
        <section className="surface-panel surface-panel-primary">
          <h2>Current Slice</h2>
          <p>{props.subtitle}</p>
        </section>
        <section className="surface-panel compact-note-panel">
          <h2>Next</h2>
          <p>{props.next}</p>
        </section>
      </div>
    </section>
  )
}

function IntentsListPage() {
  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">Intent First Slice</p>
          <h1>Intents</h1>
        </div>
        <div className="toolbar-actions">
          <button className="tool-button" type="button">
            Refresh List
          </button>
          <button className="tool-button tool-button-primary" type="button">
            Create Draft Intent
          </button>
        </div>
      </header>

      <div className="workspace-grid intent-workspace-grid">
        <section className="surface-panel surface-panel-primary">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Inventory</p>
              <h2>Intent Queue</h2>
            </div>
            <div className="panel-toolbar-meta">
              <span className="count-pill">{intentRows.length} total</span>
              <span className="count-pill">1 active focus</span>
            </div>
          </div>

          <div className="intent-table" role="table" aria-label="Intent list">
            <div className="intent-table-header" role="row">
              <span role="columnheader">Intent</span>
              <span role="columnheader">State</span>
              <span role="columnheader">Priority</span>
              <span role="columnheader">Next</span>
              <span role="columnheader">Block</span>
            </div>
            {intentRows.map((intent) => (
              <article key={intent.id} className="intent-row" role="row">
                <div className="intent-main-cell" role="cell">
                  <h3>{intent.title}</h3>
                  <p className="intent-id">{intent.id}</p>
                  <p className="intent-focus">{intent.focus}</p>
                </div>
                <div role="cell">
                  <span className={`status-pill status-${intent.state}`}>{intent.state}</span>
                </div>
                <div role="cell">
                  <span className="meta-pill">{intent.priority}</span>
                </div>
                <p role="cell">{intent.nextAction}</p>
                <p role="cell">{intent.blockReason}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="surface-panel compact-note-panel">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Confirmed Contract</p>
              <h2>Scan Snapshot</h2>
            </div>
          </div>
          <ul className="signal-list">
            <li>Intent list already exists in the legacy runtime.</li>
            <li>Intent detail is the next build slice inside this workspace.</li>
            <li>Create, update, approve, preview, and apply remain required lifecycle actions.</li>
            <li>Task stays nested under Intent before any broader task aggregation.</li>
            <li>Current parity is notes-backed until direct source/runtime evidence is restored on this branch.</li>
          </ul>
        </section>
      </div>
    </section>
  )
}

function ShellFrame() {
  const location = useLocation()
  const meta = routeMeta[location.pathname] ?? routeMeta['/']

  return (
    <div className="shell-root">
      <header className="shell-command-bar">
        <div className="shell-brand">
          <span className="brand-mark">KBX</span>
          <div>
            <strong>Operator Control Plane</strong>
            <p>UIV2 compact shell rebuild</p>
          </div>
        </div>

        <div className="command-cluster">
          <button className="tool-button shell-command-input" type="button">
            Command Search
          </button>
          <button className="tool-button" type="button">
            Refresh
          </button>
          <button className="tool-button" type="button">
            Theme
          </button>
        </div>
      </header>

      <nav className="shell-tab-strip" aria-label="Primary">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) => `shell-tab${isActive ? ' active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <main className="shell-main">
        <aside className="shell-rail">
          <section className="rail-section">
            <p className="rail-section-title">Workspace</p>
            <button className="rail-item rail-item-active" type="button">
              Current Shell
            </button>
            <button className="rail-item" type="button">
              Focus Queue
            </button>
            <button className="rail-item" type="button">
              Runtime Flags
            </button>
          </section>

          <section className="rail-section">
            <p className="rail-section-title">Build Order</p>
            <ul className="rail-list compact-rail-list">
              <li>Compact shell frame</li>
              <li>Intent detail</li>
              <li>Intent actions</li>
              <li>Task inside Intent</li>
            </ul>
          </section>
        </aside>

        <section className="shell-content">
          <Routes>
            <Route
              path="/"
              element={
                <PlaceholderPage
                  title="Home"
                  subtitle="Home remains intentionally thin until stable module surfaces exist to compose into an aggregation workspace."
                  next="Complete the compact shell, then continue with Intent detail before any Home summary blocks."
                />
              }
            />
            <Route path="/intents" element={<IntentsListPage />} />
            <Route
              path="/kb"
              element={
                <PlaceholderPage
                  title="Knowledge Base"
                  subtitle="Knowledge Base will start from the tree and reader surfaces, not from top-level summaries."
                  next="After Intent and Task slices, build document tree, then document reader, then metadata side panels."
                />
              }
            />
            <Route
              path="/rules"
              element={
                <PlaceholderPage
                  title="Rules"
                  subtitle="Rules stay deferred until document and intent contexts are trustworthy enough for findings interpretation."
                  next="Start with registry and domain grouping once upstream module contracts stabilize."
                />
              }
            />
            <Route
              path="/graph"
              element={
                <PlaceholderPage
                  title="Graph"
                  subtitle="Graph remains metrics-first in the early rebuild and should not pull the shell toward premature visualization work."
                  next="Land graph metrics after Knowledge Base document contracts exist."
                />
              }
            />
            <Route
              path="/search"
              element={
                <PlaceholderPage
                  title="Search"
                  subtitle="Search depends on stable result contracts from documents, intents, and rules before cross-surface retrieval is worthwhile."
                  next="Build this after document and intent hit types are defined."
                />
              }
            />
            <Route
              path="/system"
              element={
                <PlaceholderPage
                  title="System"
                  subtitle="System is an operator workspace over runtime and repository state, not a decorative diagnostics page."
                  next="Add runtime diagnostics once shell and core intent workflows are stable."
                />
              }
            />
          </Routes>
        </section>

        <aside className="shell-inspector">
          <section className="inspector-section">
            <p className="rail-section-title">Current View</p>
            <h2>{meta.eyebrow}</h2>
            <p>{meta.summary}</p>
          </section>

          <section className="inspector-section">
            <p className="rail-section-title">Selection</p>
            <p>{meta.selection}</p>
          </section>

          <section className="inspector-section">
            <p className="rail-section-title">Source Alignment</p>
            <ul className="signal-list compact-signal-list">
              <li>Top navigation remains primary.</li>
              <li>Shell is now full-height and tool-first.</li>
              <li>Status surfaces stay visible without a page footer.</li>
            </ul>
          </section>
        </aside>
      </main>

      <footer className="shell-status-bar">
        <span>Shell Mode: Compact IDE Frame</span>
        <span>Focus: Intent detail next</span>
        <span>Runtime: Notes-backed shell slice</span>
      </footer>
    </div>
  )
}

export function App() {
  return <ShellFrame />
}