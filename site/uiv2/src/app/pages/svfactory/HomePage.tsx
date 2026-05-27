import { Icon } from '@iconify/react'
import badgeAlert from '@iconify-icons/lucide/badge-alert'
import badgeCheck from '@iconify-icons/lucide/badge-check'
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
import { useHomeSummary } from '../../hooks/svfactory/useHomeSummary'
import { useRefreshSystemSnapshot } from '../../hooks/svfactory/useSystemSnapshot'

export function HomePage() {
  const homeSummaryQuery = useHomeSummary()
  const refreshSystemSnapshot = useRefreshSystemSnapshot()
  const dashboard = homeSummaryQuery.data?.summary
  const snapshotMetadata = homeSummaryQuery.snapshotMetadata
  const runtime = dashboard?.runtime
  const session = dashboard?.session
  const goalSummary = dashboard?.goal
  const pipeline = dashboard?.pipeline
  const rules = dashboard?.rules
  const system = dashboard?.system
  const milestones = dashboard?.milestones ?? []
  const autoStartCount = (runtime?.services ?? []).filter((service) => service.autoStart).length
  const runningSchedules = runtime?.runningCount ?? 0
  const activeIntent = session?.intent
  const activeIntentCount = dashboard?.workspace.activeIntentCount ?? (activeIntent?.id ? 1 : 0)
  const closedIntentCount = session?.activeIntentIds ? Math.max(session.activeIntentIds.length - activeIntentCount, 0) : 0
  const droppedIntentCount = rules?.errorCount ?? 0
  const highPriorityCount = rules?.warnCount ?? 0
  const checkpointLabel = goalSummary?.focusNextAction ?? session?.currentTask?.title ?? 'No active checkpoint recorded.'
  const blockedCount = rules?.errorCount ?? 0
  const attentionCount = (rules?.errorCount ?? 0) + (system?.checkSummary.warn ?? 0)
  const liveSurfaceCount = (system?.checkSummary.pass ?? 0) + (runtime?.healthyCount ?? 0)
  const stalledScheduleCount = Math.max((runtime?.registeredCount ?? 0) - (runtime?.healthyCount ?? 0), 0)
  const milestoneRows = milestones.map((milestone) => ({
    title: milestone.label,
    detail: milestone.detail,
    icon: milestone.status === 'warn' || milestone.status === 'pending' ? badgeAlert : badgeCheck,
  }))

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
          <button className="tool-button" type="button" onClick={() => refreshSystemSnapshot.mutate()}>
            {homeSummaryQuery.isFetching || refreshSystemSnapshot.isPending ? 'Refreshing...' : 'Refresh Runtime'}
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
            <span className="meta-pill">Bridge {milestones[0]?.detail ?? 'pending'}</span>
            <span className="meta-pill">Runtime {runtime?.summaryLabel ?? 'pending'}</span>
            <span className="meta-pill">Pipeline {pipeline?.stepCount ?? 0} steps</span>
            <span className="meta-pill">Focus {activeIntent?.id ?? 'pending'}</span>
            <span className="meta-pill">Next scan {runtime?.nextRunAt ?? 'pending'}</span>
            <span className="meta-pill">Snapshot {snapshotMetadata?.generatedAt ?? 'pending'}</span>
            <span className="meta-pill">{snapshotMetadata?.reloadRecommended ? `Reload ${snapshotMetadata.reloadReasons.join(', ')}` : 'Snapshot aligned'}</span>
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
                  <strong>{runtime?.registeredCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Running</span>
                  <strong>{runtime?.runningCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Healthy</span>
                  <strong>{runtime?.healthyCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Auto-start</span>
                  <strong>{autoStartCount}</strong>
                </div>
              </div>
              <div className="home-inline-summary-row">
                <span className="meta-pill">Doctor {system?.result ?? 'pending'}</span>
                <span className="meta-pill">Node {system?.nodeVersion ?? 'pending'}</span>
                <span className="meta-pill">Workspace {dashboard?.workspace.hasWorkingTreeChanges ? 'dirty' : 'clean'}</span>
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
                  <strong>{runtime?.registeredCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Running</span>
                  <strong>{runningSchedules}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Interval</span>
                  <strong>{runtime?.refreshedAt ? 'live' : 'pending'}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Stalled</span>
                  <strong>{stalledScheduleCount}</strong>
                </div>
              </div>
              <p className="runtime-service-meta">Cron detail stays in System. Home keeps only scan rhythm and scheduler health.</p>
              {runtime?.lastError ? (
                <p className="runtime-error-text">Last cron error: {runtime.lastError}</p>
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
                  <strong>{activeIntentCount}</strong>
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
                  <span className="meta-pill">Current {activeIntent?.id ?? 'none'}</span>
                  <span className="meta-pill">Checkpoint {goalSummary?.checkpointEvent ?? 'pending'}</span>
                </div>
                <p className="home-dashboard-copy">{activeIntent?.title ?? activeIntent?.summary ?? 'Intent queue remains the first real domain slice and becomes the owning workspace for detail.'}</p>
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
                  <strong className="home-detail-value">{activeIntent?.id ?? 'No active focus'}</strong>
                  <p className="home-dashboard-copy">{goalSummary?.focusCurrent ?? activeIntent?.summary ?? 'Focus state is currently unavailable from the workspace snapshot.'}</p>
                </div>
                <div className="home-detail-block">
                  <span className="runtime-overview-label">Checkpoint</span>
                  <strong className="home-detail-value">{goalSummary?.checkpointEvent ?? 'pending'}</strong>
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
                  <strong>{pipeline?.stepCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Confirm Steps</span>
                  <strong>{pipeline?.confirmCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Guarded</span>
                  <strong>{pipeline?.failOnNonzeroCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Blocked</span>
                  <strong>{blockedCount}</strong>
                </div>
              </div>
              <p className="home-dashboard-copy">{pipeline?.steps?.[0]?.description ?? pipeline?.error ?? 'Pipeline summary unavailable.'}</p>
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
                  <span className="runtime-overview-label">Rules</span>
                  <strong>{rules?.count ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Violations</span>
                  <strong>{rules?.violationCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Errors</span>
                  <strong>{rules?.errorCount ?? 0}</strong>
                </div>
              </div>
              <p className="home-dashboard-copy">{rules?.topViolations?.[0]?.message ?? 'Use Home to read current findings pressure quickly, then inspect full rule context in the owning Rules workspace.'}</p>
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
                  <strong className="home-detail-value">{goalSummary?.text ?? activeIntent?.goal ?? 'Goal unavailable'}</strong>
                  <p className="home-dashboard-copy">{goalSummary?.summary ?? activeIntent?.summary ?? 'Home should summarize operator truth quickly, then route every deeper action to the owning workspace.'}</p>
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
                    <p>{rules?.topRules?.[0]?.description ?? 'Registry and findings remain deferred until upstream contracts stabilize.'}</p>
                  </div>
                </div>
                <div className="home-module-row compact-row">
                  <Icon icon={gitBranch} aria-hidden="true" />
                  <div>
                    <strong>Graph And Search</strong>
                    <p>{liveSurfaceCount > 0 ? `${liveSurfaceCount} live checks are already available across runtime and doctor surfaces.` : 'Keep as entry surfaces only until their owning workspaces mature.'}</p>
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
