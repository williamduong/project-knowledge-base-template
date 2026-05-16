import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { IntentsListPage } from './pages/IntentsListPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { routeMeta, tabs } from './shell-data'

export function ShellFrame() {
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