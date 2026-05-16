import { useEnsureRuntimeService, useRuntimeServices } from '../hooks/useRuntimeServices'

type RuntimeServicesPageProps = {
  title: string
  eyebrow: string
  subtitle: string
}

function toneClass(service: { running: boolean; healthy: boolean }) {
  if (service.running && service.healthy) {
    return 'status-good'
  }

  if (service.running) {
    return 'status-warn'
  }

  return 'status-offline'
}

export function RuntimeServicesPage(props: RuntimeServicesPageProps) {
  const runtimeServicesQuery = useRuntimeServices()
  const ensureRuntimeService = useEnsureRuntimeService()
  const summary = runtimeServicesQuery.data?.summary
  const services = summary?.services ?? []
  const autoStartCount = services.filter((service) => service.autoStart).length

  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">{props.eyebrow}</p>
          <h1>{props.title}</h1>
          <p>{props.subtitle}</p>
        </div>
        <div className="toolbar-actions">
          <button className="tool-button" type="button" onClick={() => runtimeServicesQuery.refetch()}>
            {runtimeServicesQuery.isFetching ? 'Refreshing...' : 'Refresh Runtime'}
          </button>
        </div>
      </header>

      <div className="workspace-grid runtime-workspace-grid">
        <section className="surface-panel surface-panel-primary">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Runtime Registry</p>
              <h2>Managed Services</h2>
            </div>
            <div className="panel-toolbar-meta">
              <span className="count-pill">{summary?.summaryLabel ?? 'pending'}</span>
              <span className="count-pill">1m auto-scan</span>
            </div>
          </div>

          <div className="runtime-summary-bar">
            <span className="meta-pill">Registered {summary?.registeredCount ?? 0}</span>
            <span className="meta-pill">Running {summary?.runningCount ?? 0}</span>
            <span className="meta-pill">Healthy {summary?.healthyCount ?? 0}</span>
            <span className="meta-pill">Last scan {runtimeServicesQuery.data?.refreshedAt ?? 'pending'}</span>
          </div>

          <div className="runtime-service-list" role="table" aria-label="Runtime services list">
            <div className="runtime-service-header" role="row">
              <span role="columnheader">Service</span>
              <span role="columnheader">Runtime</span>
              <span role="columnheader">Port</span>
              <span role="columnheader">Health</span>
              <span role="columnheader">Action</span>
            </div>

            {services.map((service) => {
              const mutationPending = ensureRuntimeService.isPending && ensureRuntimeService.variables === service.id
              const actionLabel = service.running ? 'Running' : mutationPending ? 'Ensuring...' : 'Ensure'

              return (
                <article key={service.id} className="runtime-service-row" role="row">
                  <div className="runtime-service-main" role="cell">
                    <div className="runtime-service-title-row">
                      <h3>{service.label}</h3>
                      <span className={`status-pill ${toneClass(service)}`}>
                        {service.running ? (service.healthy ? 'healthy' : 'degraded') : 'offline'}
                      </span>
                    </div>
                    <p className="intent-id">{service.id}</p>
                    <p className="runtime-service-meta">
                      {service.kind} · {service.host}{service.healthPath}
                    </p>
                  </div>
                  <p role="cell">{service.source}</p>
                  <p role="cell">{service.port ?? 'unassigned'}</p>
                  <p role="cell">{service.healthy ? 'healthy' : service.running ? 'reachable only' : 'offline'}</p>
                  <div role="cell">
                    <button
                      className="tool-button"
                      type="button"
                      disabled={service.running || mutationPending}
                      onClick={() => ensureRuntimeService.mutate(service.id)}
                    >
                      {actionLabel}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="surface-panel compact-note-panel">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Runtime Cron</p>
              <h2>Cron Control</h2>
            </div>
          </div>
          <div className="runtime-cron-card runtime-cron-card-inline">
            <div className="runtime-cron-grid">
              <span className="meta-pill">Last scan {runtimeServicesQuery.data?.refreshedAt ?? 'pending'}</span>
              <span className="meta-pill">Next scan {runtimeServicesQuery.data?.nextRunAt ?? 'pending'}</span>
              <span className="meta-pill">Reason {runtimeServicesQuery.data?.reason ?? 'pending'}</span>
              <span className="meta-pill">Interval {runtimeServicesQuery.data?.intervalMs ? `${Math.round(runtimeServicesQuery.data.intervalMs / 1000)}s` : 'pending'}</span>
              <span className="meta-pill">Auto-start {autoStartCount}</span>
            </div>
          </div>
          <ul className="signal-list">
            <li>Bridge scans the runtime registry every 60 seconds and updates cached service state.</li>
            <li>Ensure is a manual recovery action for a registered service that is currently down.</li>
            <li>Port values show the live resolved port, not only the preferred registry port.</li>
            <li>Health is based on TCP reachability plus HTTP health checks when defined.</li>
            <li>Auto-start services are re-checked by cron and started automatically when absent.</li>
          </ul>
          {runtimeServicesQuery.data?.lastError ? (
            <p className="runtime-error-text">Last cron error: {runtimeServicesQuery.data.lastError}</p>
          ) : null}
          {ensureRuntimeService.isError ? (
            <p className="runtime-error-text">
              Ensure failed: {ensureRuntimeService.error instanceof Error ? ensureRuntimeService.error.message : 'Unknown error'}
            </p>
          ) : null}
          {ensureRuntimeService.data?.action ? (
            <p className="runtime-success-text">Last ensure action: {ensureRuntimeService.data.action}</p>
          ) : null}
        </section>
      </div>
    </section>
  )
}
