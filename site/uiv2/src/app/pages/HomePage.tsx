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
          <p>Home stays thin, but it now carries one runtime control block so service health and cron state are visible from the first screen.</p>
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
        <section className="surface-panel surface-panel-primary">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Runtime Overview</p>
              <h2>Control Block</h2>
            </div>
            <div className="panel-toolbar-meta">
              <span className="count-pill">{summary?.summaryLabel ?? 'pending'}</span>
              <span className="count-pill">cron 60s</span>
            </div>
          </div>

          <div className="runtime-overview-grid">
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

          <div className="runtime-cron-card runtime-cron-card-inline">
            <div className="panel-toolbar">
              <div>
                <p className="workspace-eyebrow">Runtime Cron</p>
                <h3>Compact Summary</h3>
              </div>
              <Link className="tool-button" to="/system">
                Open System Detail
              </Link>
            </div>
            <div className="runtime-cron-grid">
              <span className="meta-pill">Schedules {schedules.length}</span>
              <span className="meta-pill">Last scan {runtimeServicesQuery.data?.refreshedAt ?? 'pending'}</span>
              <span className="meta-pill">Next scan {runtimeServicesQuery.data?.nextRunAt ?? 'pending'}</span>
              <span className="meta-pill">Interval {runtimeServicesQuery.data?.intervalMs ? `${Math.round(runtimeServicesQuery.data.intervalMs / 1000)}s` : 'pending'}</span>
            </div>
            {runtimeServicesQuery.data?.lastError ? (
              <p className="runtime-error-text">Last cron error: {runtimeServicesQuery.data.lastError}</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  )
}
