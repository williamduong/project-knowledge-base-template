import { Link } from 'react-router-dom'
import { useEnsureRuntimeService, useRuntimeServices } from '../hooks/useRuntimeServices'

function toneLabel(running: boolean, healthy: boolean) {
  if (running && healthy) {
    return 'healthy'
  }

  if (running) {
    return 'degraded'
  }

  return 'offline'
}

export function HomePage() {
  const runtimeServicesQuery = useRuntimeServices()
  const ensureRuntimeService = useEnsureRuntimeService()
  const summary = runtimeServicesQuery.data?.summary
  const services = summary?.services ?? []
  const autoStartCount = services.filter((service) => service.autoStart).length

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

          <div className="runtime-cron-card">
            <div>
              <p className="workspace-eyebrow">Runtime Cron</p>
              <h3>Cron Status</h3>
            </div>
            <div className="runtime-cron-grid">
              <span className="meta-pill">Last scan {runtimeServicesQuery.data?.refreshedAt ?? 'pending'}</span>
              <span className="meta-pill">Next scan {runtimeServicesQuery.data?.nextRunAt ?? 'pending'}</span>
              <span className="meta-pill">Reason {runtimeServicesQuery.data?.reason ?? 'pending'}</span>
              <span className="meta-pill">Interval {runtimeServicesQuery.data?.intervalMs ? `${Math.round(runtimeServicesQuery.data.intervalMs / 1000)}s` : 'pending'}</span>
            </div>
            {runtimeServicesQuery.data?.lastError ? (
              <p className="runtime-error-text">Last cron error: {runtimeServicesQuery.data.lastError}</p>
            ) : null}
          </div>

          <div className="runtime-compact-list">
            {services.map((service) => {
              const mutationPending = ensureRuntimeService.isPending && ensureRuntimeService.variables === service.id

              return (
                <article key={service.id} className="runtime-compact-item">
                  <div>
                    <div className="runtime-service-title-row">
                      <h3>{service.label}</h3>
                      <span className={`status-pill ${service.running && service.healthy ? 'status-good' : service.running ? 'status-warn' : 'status-offline'}`}>
                        {toneLabel(service.running, service.healthy)}
                      </span>
                    </div>
                    <p className="intent-id">{service.id}</p>
                    <p className="runtime-service-meta">
                      {service.host}:{service.port ?? 'unassigned'} · {service.source} · auto-start {service.autoStart ? 'on' : 'off'}
                    </p>
                  </div>
                  <button
                    className="tool-button"
                    type="button"
                    disabled={service.running || mutationPending}
                    onClick={() => ensureRuntimeService.mutate(service.id)}
                  >
                    {service.running ? 'Running' : mutationPending ? 'Ensuring...' : 'Ensure'}
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </section>
  )
}
