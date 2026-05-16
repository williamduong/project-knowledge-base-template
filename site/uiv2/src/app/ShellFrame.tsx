import { useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useShellStatus } from './hooks/useShellStatus'
import { IntentsListPage } from './pages/IntentsListPage'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RuntimeServicesPage } from './pages/RuntimeServicesPage'
import { SearchOverlay } from './SearchOverlay'
import { productLabel, projectName, routeMeta, tabs } from './shell-data'

const projectNameStorageKey = 'kbx-ui-project-name'

export function ShellFrame() {
  const location = useLocation()
  const meta = routeMeta[location.pathname] ?? routeMeta['/']
  const shellStatusQuery = useShellStatus()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isEditingProjectName, setIsEditingProjectName] = useState(false)
  const [editableProjectName, setEditableProjectName] = useState(projectName)
  const [refreshFeedback, setRefreshFeedback] = useState('')
  const [isFooterExpanded, setIsFooterExpanded] = useState(false)
  const previousFingerprintRef = useRef<string | null>(null)
  const shellStatus = shellStatusQuery.data

  useEffect(() => {
    if (!shellStatus?.fingerprint) {
      return
    }

    previousFingerprintRef.current ??= shellStatus.fingerprint
  }, [shellStatus?.fingerprint])

  useEffect(() => {
    const storedProjectName = window.localStorage.getItem(projectNameStorageKey)

    if (storedProjectName) {
      setEditableProjectName(storedProjectName)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false)
        setIsEditingProjectName(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleRefresh = async () => {
    setRefreshFeedback('Syncing...')

    const previousFingerprint = previousFingerprintRef.current
    const refetchResult = await shellStatusQuery.refetch()
    const nextSnapshot = refetchResult.data

    const nextFingerprint = nextSnapshot?.fingerprint ?? shellStatusQuery.data?.fingerprint ?? null

    if (nextFingerprint && previousFingerprint && nextFingerprint !== previousFingerprint) {
      setRefreshFeedback('Updated signals')
    } else if (nextFingerprint) {
      setRefreshFeedback('No signal change')
    } else {
      setRefreshFeedback('Signals unavailable')
    }

    if (nextFingerprint) {
      previousFingerprintRef.current = nextFingerprint
    }
  }

  return (
    <div className="shell-root">
      <header className="shell-command-bar">
        <div className="shell-brand">
          <span className="brand-mark">KBX</span>
          <div className="brand-copy">
            {isEditingProjectName ? (
              <input
                autoFocus
                className="project-name-input"
                type="text"
                value={editableProjectName}
                onChange={(event) => setEditableProjectName(event.target.value)}
                onBlur={() => {
                  const nextName = editableProjectName.trim() || projectName
                  setEditableProjectName(nextName)
                  window.localStorage.setItem(projectNameStorageKey, nextName)
                  setIsEditingProjectName(false)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    const nextName = editableProjectName.trim() || projectName
                    setEditableProjectName(nextName)
                    window.localStorage.setItem(projectNameStorageKey, nextName)
                    setIsEditingProjectName(false)
                  }
                }}
              />
            ) : (
              <button
                className="project-name-button"
                type="button"
                title="Double click to edit project name"
                onDoubleClick={() => setIsEditingProjectName(true)}
              >
                <span className="project-name-text">{editableProjectName}</span>
              </button>
            )}
            <span className="brand-product-type">{productLabel}</span>
          </div>
        </div>

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

        <div className="command-cluster">
          <button
            className="icon-tool-button"
            type="button"
            aria-label="Open search"
            onClick={() => setIsSearchOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13Zm0-2a8.5 8.5 0 1 1 5.33 15.12l4.52 4.53l-1.42 1.41l-4.52-4.52A8.5 8.5 0 0 1 10.5 2Z" />
            </svg>
          </button>
          <button className="tool-button" type="button" onClick={handleRefresh}>
            {shellStatusQuery.isFetching ? 'Syncing...' : 'Sync Signals'}
          </button>
          {refreshFeedback ? <span className="refresh-feedback">{refreshFeedback}</span> : null}
        </div>
      </header>

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
              element={<HomePage />}
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
                <RuntimeServicesPage
                  title="System"
                  eyebrow="Operator Runtime"
                  subtitle="System is the full runtime registry view with live ports, health state, and manual recovery actions."
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

      <footer className={`shell-status-bar${isFooterExpanded ? ' expanded' : ''}`}>
        <button
          className="footer-toggle"
          type="button"
          aria-expanded={isFooterExpanded}
          onClick={() => setIsFooterExpanded((value) => !value)}
        >
          {isFooterExpanded ? 'Collapse' : 'Expand'}
        </button>
        <div className={`footer-surface-list${isFooterExpanded ? ' expanded' : ''}`}>
          {(shellStatus?.items ?? []).map((item) => (
            <span key={item.key} className={`status-item status-${item.tone}`} title={item.title ?? `${item.label}: ${item.value}`}>
              <span className="status-label">{item.label}</span>
              <span className="status-value">{item.value}</span>
            </span>
          ))}
        </div>
      </footer>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  )
}