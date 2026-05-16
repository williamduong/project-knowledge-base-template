import { Icon } from '@iconify/react'
import badgeCheck from '@iconify-icons/lucide/badge-check'
import binary from '@iconify-icons/lucide/binary'
import gauge from '@iconify-icons/lucide/gauge'
import server from '@iconify-icons/lucide/server'
import clock3 from '@iconify-icons/lucide/clock-3'
import flag from '@iconify-icons/lucide/flag'
import bookOpen from '@iconify-icons/lucide/book-open'
import flagTriangleRight from '@iconify-icons/lucide/flag-triangle-right'
import gitBranch from '@iconify-icons/lucide/git-branch'
import goal from '@iconify-icons/lucide/goal'
import listTodo from '@iconify-icons/lucide/list-todo'
import shield from '@iconify-icons/lucide/shield'
import { Link } from 'react-router-dom'
import { useShellStatus } from '../hooks/useShellStatus'
import { useRuntimeServices } from '../hooks/useRuntimeServices'
import { intentRows } from '../shell-data'

export function HomePage() {
  const runtimeServicesQuery = useRuntimeServices()
  const shellStatusQuery = useShellStatus()
  const summary = runtimeServicesQuery.data?.summary
  const shellItems = shellStatusQuery.data?.items ?? []
  const schedules = runtimeServicesQuery.data?.schedules ?? []
  const autoStartCount = (summary?.services ?? []).filter((service) => service.autoStart).length
  const runningSchedules = schedules.filter((schedule) => schedule.state === 'running').length
  const activeIntent = intentRows.find((intent) => intent.state === 'active')
  const closedIntentCount = intentRows.filter((intent) => intent.state === 'closed').length
  const droppedIntentCount = intentRows.filter((intent) => intent.state === 'dropped').length
  const highPriorityCount = intentRows.filter((intent) => intent.priority === 'high').length
  const focusItem = shellItems.find((item) => item.key === 'focus-intent')
  const chaosItem = shellItems.find((item) => item.key === 'chaos')
  const bridgeItem = shellItems.find((item) => item.key === 'bridge')
  const apiItem = shellItems.find((item) => item.key === 'bridge-api')
  const runtimeItem = shellItems.find((item) => item.key === 'workspace-runtime')
  const uiItem = shellItems.find((item) => item.key === 'ui-local')
  const checkpointLabel = activeIntent ? activeIntent.nextAction : 'No active checkpoint recorded.'
  const blockedCount = intentRows.filter((intent) => intent.blockReason && !intent.blockReason.toLowerCase().includes('no active blocker')).length
  const attentionCount = shellItems.filter((item) => item.tone === 'warn' || item.tone === 'offline').length
  const liveSurfaceCount = shellItems.filter((item) => item.category === 'surface' && item.source === 'live').length
  const stalledScheduleCount = schedules.filter((schedule) => schedule.state !== 'running').length
  const milestoneRows = [
    {
      title: bridgeItem?.value === 'connected' ? 'Bridge Connected' : 'Bridge Attention',
      detail: apiItem?.value ?? 'Bridge API status pending.',
      icon: badgeCheck,
    },
    {
      title: summary?.healthyCount === summary?.registeredCount ? 'Runtime Stable' : 'Runtime Recovery Watch',
      detail: runtimeItem?.value ?? `${summary?.healthyCount ?? 0}/${summary?.registeredCount ?? 0} services healthy`,
      icon: binary,
    },
    {
      title: activeIntent ? 'Intent Detail Next' : 'Intent Queue Pending',
      detail: activeIntent?.nextAction ?? 'Awaiting active intent routing.',
      icon: listTodo,
    },
  ]

  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">Operator Home</p>
          <h1>Home</h1>
          <p>Home is the summary dashboard: fast operational blocks first, then drill into the owning workspace only when detail is needed.</p>
        </div>
        <div className="toolbar-actions">
          <Link className="tool-button" to="/system">
            Open System
          </Link>
          <button className="tool-button" type="button" onClick={() => runtimeServicesQuery.refetch()}>
            {runtimeServicesQuery.isFetching ? 'Refreshing...' : 'Refresh Runtime'}
          </button>
        </div>
      </header>

      <div className="workspace-grid single-column-grid">
        <section className="surface-panel surface-panel-primary home-hero-panel">
          <div>
            <p className="workspace-eyebrow">Control Plane Snapshot</p>
            <div className="section-title-row">
              <span className="section-icon section-icon-runtime" aria-hidden="true">
                <Icon icon={gauge} />
              </span>
              <h2>Operator Summary</h2>
            </div>
            <p className="home-hero-copy">Use Home to spot drift fast. Use System to inspect runtime internals and recover services.</p>
          </div>
          <div className="runtime-summary-bar">
            <span className="meta-pill">Bridge {bridgeItem?.value ?? 'pending'}</span>
            <span className="meta-pill">Runtime {summary?.summaryLabel ?? 'pending'}</span>
            <span className="meta-pill">Schedules {schedules.length}</span>
            <span className="meta-pill">Focus {focusItem?.value ?? 'pending'}</span>
            <span className="meta-pill">Next scan {runtimeServicesQuery.data?.nextRunAt ?? 'pending'}</span>
          </div>
        </section>

        <section className="home-dashboard-grid">
          <section className="home-dashboard-section">
            <div className="home-section-heading">
              <p className="workspace-eyebrow">Runtime Cluster</p>
              <h2>Runtime And Scheduler</h2>
            </div>

            <article className="surface-panel home-dashboard-card surface-panel-primary">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Runtime</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={server} />
                    </span>
                    <h2>Services</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/system">
                  Open
                </Link>
              </div>
              <div className="runtime-overview-grid compact-runtime-overview-grid">
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Registered</span>
                  <strong>{summary?.registeredCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Running</span>
                  <strong>{summary?.runningCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Healthy</span>
                  <strong>{summary?.healthyCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Auto-start</span>
                  <strong>{autoStartCount}</strong>
                </div>
              </div>
              <div className="home-inline-summary-row">
                <span className="meta-pill">UI {uiItem?.value ?? 'pending'}</span>
                <span className="meta-pill">API {apiItem?.value ?? 'pending'}</span>
                <span className="meta-pill">Node {runtimeItem?.value ?? 'pending'}</span>
              </div>
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Scheduling</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-cron" aria-hidden="true">
                      <Icon icon={clock3} />
                    </span>
                    <h2>Cron</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/system">
                  View List
                </Link>
              </div>
              <div className="runtime-overview-grid compact-runtime-overview-grid">
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Schedules</span>
                  <strong>{schedules.length}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Running</span>
                  <strong>{runningSchedules}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Interval</span>
                  <strong>{runtimeServicesQuery.data?.intervalMs ? `${Math.round(runtimeServicesQuery.data.intervalMs / 1000)}s` : 'pending'}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Stalled</span>
                  <strong>{stalledScheduleCount}</strong>
                </div>
              </div>
              <p className="runtime-service-meta">Cron detail stays in System. Home keeps only scan rhythm and scheduler health.</p>
              {runtimeServicesQuery.data?.lastError ? (
                <p className="runtime-error-text">Last cron error: {runtimeServicesQuery.data.lastError}</p>
              ) : null}
            </article>
          </section>

          <section className="home-dashboard-section">
            <div className="home-section-heading">
              <p className="workspace-eyebrow">Execution Cluster</p>
              <h2>Focus, Intents, Pipeline</h2>
            </div>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Intents</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-intent" aria-hidden="true">
                      <Icon icon={flag} />
                    </span>
                    <h2>Intent Overview</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/intents">
                  Open
                </Link>
              </div>
              <div className="runtime-overview-grid compact-runtime-overview-grid">
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Active</span>
                  <strong>{activeIntent ? 1 : 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Closed</span>
                  <strong>{closedIntentCount}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Dropped</span>
                  <strong>{droppedIntentCount}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">High Priority</span>
                  <strong>{highPriorityCount}</strong>
                </div>
              </div>
              <div className="home-summary-stack">
                <div className="home-inline-summary-row">
                  <span className="meta-pill">Current {focusItem?.value ?? activeIntent?.id ?? 'none'}</span>
                  <span className="meta-pill">Checkpoint {chaosItem?.value ?? 'pending'}</span>
                </div>
                <p className="home-dashboard-copy">{activeIntent?.title ?? 'Intent queue remains the first real domain slice and becomes the owning workspace for detail.'}</p>
              </div>
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Focus</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-intent" aria-hidden="true">
                      <Icon icon={flagTriangleRight} />
                    </span>
                    <h2>Focus And Checkpoint</h2>
                  </div>
                </div>
                <span className="count-pill">Live Summary</span>
              </div>
              <div className="home-summary-stack">
                <div className="home-detail-block">
                  <span className="runtime-overview-label">Focus Intent</span>
                  <strong className="home-detail-value">{focusItem?.value ?? activeIntent?.id ?? 'No active focus'}</strong>
                  <p className="home-dashboard-copy">{focusItem?.title ?? activeIntent?.focus ?? 'Focus state is currently unavailable from the workspace snapshot.'}</p>
                </div>
                <div className="home-detail-block">
                  <span className="runtime-overview-label">Checkpoint</span>
                  <strong className="home-detail-value">{chaosItem?.value ?? 'pending'}</strong>
                  <p className="home-dashboard-copy">{checkpointLabel}</p>
                </div>
              </div>
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Flow</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={gitBranch} />
                    </span>
                    <h2>Pipeline</h2>
                  </div>
                </div>
                <span className="count-pill">Intent Linked</span>
              </div>
              <div className="runtime-overview-grid compact-runtime-overview-grid">
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">In Flight</span>
                  <strong>{activeIntent ? 1 : 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Blocked</span>
                  <strong>{blockedCount}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Attention</span>
                  <strong>{attentionCount}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Recovery</span>
                  <strong>{summary?.healthyCount === summary?.registeredCount ? 'Stable' : 'Watch'}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="home-dashboard-section">
            <div className="home-section-heading">
              <p className="workspace-eyebrow">Governance Cluster</p>
              <h2>Rules, Goals, Direction</h2>
            </div>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Governance</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-kb" aria-hidden="true">
                      <Icon icon={shield} />
                    </span>
                    <h2>Rules</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/rules">
                  Open
                </Link>
              </div>
              <div className="runtime-overview-grid compact-runtime-overview-grid">
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Attention</span>
                  <strong>{attentionCount}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Live Surfaces</span>
                  <strong>{liveSurfaceCount}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Blocked Intents</span>
                  <strong>{blockedCount}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Chaos</span>
                  <strong>{chaosItem?.value ?? 'pending'}</strong>
                </div>
              </div>
              <p className="home-dashboard-copy">Use Home to read current findings pressure quickly, then inspect full rule context in the owning Rules workspace.</p>
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Direction</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-intent" aria-hidden="true">
                      <Icon icon={goal} />
                    </span>
                    <h2>Goal</h2>
                  </div>
                </div>
                <span className="count-pill">Current Target</span>
              </div>
              <div className="home-summary-stack">
                <div className="home-detail-block">
                  <span className="runtime-overview-label">Primary Goal</span>
                  <strong className="home-detail-value">Rebuild KBX UI as a compact domain-first operator control plane.</strong>
                  <p className="home-dashboard-copy">{focusItem?.value ? `Current focus is ${focusItem.value}.` : 'Home should summarize operator truth quickly, then route every deeper action to the owning workspace.'}</p>
                </div>
              </div>
            </article>
          </section>

          <section className="home-dashboard-section">
            <div className="home-section-heading">
              <p className="workspace-eyebrow">Roadmap Cluster</p>
              <h2>Milestones And Deferred Surfaces</h2>
            </div>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Delivery</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-cron" aria-hidden="true">
                      <Icon icon={listTodo} />
                    </span>
                    <h2>Milestones</h2>
                  </div>
                </div>
                <span className="count-pill">Rolling Checkpoints</span>
              </div>
              <div className="home-module-list">
                {milestoneRows.map((milestone) => (
                  <div key={milestone.title} className="home-module-row">
                    <Icon icon={milestone.icon} aria-hidden="true" />
                    <div>
                      <strong>{milestone.title}</strong>
                      <p>{milestone.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Knowledge Base</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-kb" aria-hidden="true">
                      <Icon icon={bookOpen} />
                    </span>
                    <h2>Deferred Modules</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/kb">
                  Open
                </Link>
              </div>
              <div className="home-module-list compact">
                <div className="home-module-row compact-row">
                  <Icon icon={bookOpen} aria-hidden="true" />
                  <div>
                    <strong>Knowledge Base</strong>
                    <p>Tree and reader surfaces land after Intent detail is anchored.</p>
                  </div>
                </div>
                <div className="home-module-row compact-row">
                  <Icon icon={shield} aria-hidden="true" />
                  <div>
                    <strong>Rules</strong>
                    <p>Registry and findings remain deferred until upstream contracts stabilize.</p>
                  </div>
                </div>
                <div className="home-module-row compact-row">
                  <Icon icon={gitBranch} aria-hidden="true" />
                  <div>
                    <strong>Graph And Search</strong>
                    <p>Keep as entry surfaces only until their owning workspaces mature.</p>
                  </div>
                </div>
              </div>
            </article>
          </section>
        </section>
      </div>
    </section>
  )
}
