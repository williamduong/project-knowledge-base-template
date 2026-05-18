import { Icon } from '@iconify/react'
import chartColumn from '@iconify-icons/lucide/bar-chart-3'
import bookOpen from '@iconify-icons/lucide/book-open'
import bot from '@iconify-icons/lucide/bot'
import flag from '@iconify-icons/lucide/flag'
import gauge from '@iconify-icons/lucide/gauge'
import network from '@iconify-icons/lucide/network'
import refreshCw from '@iconify-icons/lucide/refresh-cw'
import searchIcon from '@iconify-icons/lucide/search'
import server from '@iconify-icons/lucide/server'
import settings2 from '@iconify-icons/lucide/settings-2'
import blocks from '@iconify-icons/lucide/blocks'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useShellStatus } from './hooks/useShellStatus'
import { useRefreshSystemSnapshot } from './hooks/useSystemSnapshot'
import { IntentsListPage } from './pages/IntentsListPage'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RuntimeServicesPage } from './pages/RuntimeServicesPage'
import { PrototypePage } from './pages/PrototypePage'
import { KnowledgeBasePage } from './pages/KnowledgeBasePage'
import { SearchOverlay } from './SearchOverlay'
import { productLabel, projectName, tabs } from './shell-data'

const projectNameStorageKey = 'kbx-ui-project-name'

const tabIcons = {
  '/': gauge,
  '/intents': flag,
  '/kb': bookOpen,
  '/rules': bot,
  '/graph': chartColumn,
  '/search': searchIcon,
  '/system': settings2,
  '/prototype': blocks,
} as const

function statusItemIcon(key: string, label: string) {
  if (key === 'focus-intent') {
    return flag
  }

  if (key === 'chaos') {
    return gauge
  }

  if (key === 'bridge-api') {
    return network
  }

  if (key === 'workspace-runtime') {
    return server
  }

  if (key === 'ui-local') {
    return gauge
  }

  if (label.toLowerCase().includes('runtime')) {
    return server
  }

  return settings2
}

export function ShellFrame() {
  const shellStatusQuery = useShellStatus()
  const refreshSystemSnapshot = useRefreshSystemSnapshot()
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
    const nextSnapshot = await refreshSystemSnapshot.mutateAsync()

    const nextFingerprint = nextSnapshot?.metadata?.fingerprint ?? shellStatusQuery.data?.fingerprint ?? null

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
              <Icon icon={tabIcons[tab.path]} aria-hidden="true" />
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
            <Icon icon={searchIcon} aria-hidden="true" />
          </button>
          <button className="tool-button" type="button" onClick={handleRefresh}>
            <Icon icon={refreshCw} aria-hidden="true" />
            {shellStatusQuery.isFetching || refreshSystemSnapshot.isPending ? 'Syncing...' : 'Sync Signals'}
          </button>
          {refreshFeedback ? <span className="refresh-feedback">{refreshFeedback}</span> : null}
        </div>
      </header>

      <main className="shell-main">
        <section className="shell-content">
          <Routes>
            <Route
              path="/"
              element={<HomePage />}
            />
            <Route path="/intents" element={<IntentsListPage />} />
            <Route path="/kb" element={<KnowledgeBasePage />} />
            <Route
              path="/rules"
              element={
                <RuntimeServicesPage
                  title="Rules"
                  eyebrow="Rules Workspace"
                  subtitle="Rule registry, findings, packs, dependencies, precedence, and tool coverage."
                  mode="rules"
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
            <Route
              path="/prototype"
              element={<PrototypePage />}
            />
          </Routes>
        </section>
      </main>

      <footer className={`shell-status-bar${isFooterExpanded ? ' expanded' : ''}`}>
        <button
          className="footer-toggle"
          type="button"
          aria-expanded={isFooterExpanded}
          onClick={() => setIsFooterExpanded((value) => !value)}
        >
          <Icon icon={isFooterExpanded ? chartColumn : settings2} aria-hidden="true" />
          {isFooterExpanded ? 'Collapse' : 'Expand'}
        </button>
        <div className={`footer-surface-list${isFooterExpanded ? ' expanded' : ''}`}>
          {(shellStatus?.items ?? []).map((item) => (
            <span key={item.key} className={`status-item status-${item.tone}`} title={item.title ?? `${item.label}: ${item.value}`}>
              <Icon icon={statusItemIcon(item.key, item.label)} aria-hidden="true" />
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
