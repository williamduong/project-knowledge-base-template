import { Icon } from '@iconify/react'
import gauge from '@iconify-icons/lucide/gauge'
import server from '@iconify-icons/lucide/server'
import clock3 from '@iconify-icons/lucide/clock-3'
import flag from '@iconify-icons/lucide/flag'
import bookOpen from '@iconify-icons/lucide/book-open'
import { Link } from 'react-router-dom'
import { useRuntimeServices } from '../hooks/useRuntimeServices'

export function HomePage() {
  const runtimeServicesQuery = useRuntimeServices()
  const summary = runtimeServicesQuery.data?.summary
  const schedules = runtimeServicesQuery.data?.schedules ?? []
  const autoStartCount = (summary?.services ?? []).filter((service) => service.autoStart).length

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
            <span className="meta-pill">Runtime {summary?.summaryLabel ?? 'pending'}</span>
            <span className="meta-pill">Schedules {schedules.length}</span>
            <span className="meta-pill">Next scan {runtimeServicesQuery.data?.nextRunAt ?? 'pending'}</span>
          </div>
        </section>

        <section className="home-dashboard-grid">
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
            <div className="runtime-cron-grid">
              <span className="meta-pill">Schedules {schedules.length}</span>
              <span className="meta-pill">Last scan {runtimeServicesQuery.data?.refreshedAt ?? 'pending'}</span>
              <span className="meta-pill">Interval {runtimeServicesQuery.data?.intervalMs ? `${Math.round(runtimeServicesQuery.data.intervalMs / 1000)}s` : 'pending'}</span>
            </div>
            <p className="runtime-service-meta">Cron detail stays in System. Home only keeps operational summary chips.</p>
            {runtimeServicesQuery.data?.lastError ? (
              <p className="runtime-error-text">Last cron error: {runtimeServicesQuery.data.lastError}</p>
            ) : null}
          </article>

          <article className="surface-panel home-dashboard-card">
            <div className="panel-toolbar">
              <div>
                <p className="workspace-eyebrow">Intents</p>
                <div className="section-title-row">
                  <span className="section-icon section-icon-intent" aria-hidden="true">
                    <Icon icon={flag} />
                  </span>
                  <h2>Intent Workspace</h2>
                </div>
              </div>
              <Link className="tool-button" to="/intents">
                Open
              </Link>
            </div>
            <p className="home-dashboard-copy">Intent queue remains the first real domain slice. Home should only route into it, not duplicate its table.</p>
            <div className="runtime-cron-grid">
              <span className="meta-pill">Focus handled in footer</span>
              <span className="meta-pill">Detail in Intents tab</span>
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
            <p className="home-dashboard-copy">Knowledge Base, Rules, Graph, and Search stay as summary entry points here until their owning workspaces mature.</p>
            <div className="runtime-cron-grid">
              <span className="meta-pill">KB</span>
              <span className="meta-pill">Rules</span>
              <span className="meta-pill">Graph</span>
              <span className="meta-pill">Search</span>
            </div>
          </article>
        </section>
      </div>
    </section>
  )
}
