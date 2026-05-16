import { Icon } from '@iconify/react'
import clock3 from '@iconify-icons/lucide/clock-3'
import server from '@iconify-icons/lucide/server'
import serverCog from '@iconify-icons/lucide/server-cog'
import settings2 from '@iconify-icons/lucide/settings-2'
import { useEnsureRuntimeService, useRuntimeServices } from '../hooks/useRuntimeServices'
import { useState } from 'react'

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

function cronStateTone(state: string) {
  if (state === 'running') {
    return 'status-good'
  }

  if (state === 'failed') {
    return 'status-offline'
  }

  return 'status-neutral'
}

export function RuntimeServicesPage(props: RuntimeServicesPageProps) {
  const runtimeServicesQuery = useRuntimeServices()
  const ensureRuntimeService = useEnsureRuntimeService()
  const summary = runtimeServicesQuery.data?.summary
  const services = summary?.services ?? []
  const schedules = runtimeServicesQuery.data?.schedules ?? []
  const [activeSection, setActiveSection] = useState<'services' | 'cron'>('services')

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

      <div className="system-shell-layout">
        <aside className="system-sidebar surface-panel compact-note-panel">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">System Menu</p>
              <div className="section-title-row">
                <span className="section-icon section-icon-system" aria-hidden="true">
                  <Icon icon={settings2} />
                </span>
                <h2>Operator Panels</h2>
              </div>
            </div>
          </div>
          <div className="system-menu-list" role="tablist" aria-label="System sections">
            <button
              className={`system-menu-item${activeSection === 'services' ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveSection('services')}
            >
              <span className="system-menu-item-label">
                <Icon icon={server} aria-hidden="true" />
                <span>Services</span>
              </span>
              <small>{summary?.summaryLabel ?? 'pending'}</small>
            </button>
            <button
              className={`system-menu-item${activeSection === 'cron' ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveSection('cron')}
            >
              <span className="system-menu-item-label">
                <Icon icon={clock3} aria-hidden="true" />
                <span>Cron Schedules</span>
              </span>
              <small>{schedules.length} entries</small>
            </button>
          </div>
          <ul className="signal-list">
            <li>System owns runtime detail and recovery actions.</li>
            <li>Home only owns summary cards and navigation into this workspace.</li>
            <li>Sidebar changes the detail pane; it should not duplicate detail blocks.</li>
          </ul>
        </aside>

        <section className="surface-panel surface-panel-primary system-detail-panel">
          {activeSection === 'services' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Runtime Registry</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={serverCog} />
                    </span>
                    <h2>Managed Services</h2>
                  </div>
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
            </>
          ) : (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Runtime Cron</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-cron" aria-hidden="true">
                      <Icon icon={clock3} />
                    </span>
                    <h2>Schedule List</h2>
                  </div>
                </div>
              </div>
              <div className="cron-schedule-table" role="table" aria-label="Runtime cron schedules">
                <div className="cron-schedule-header" role="row">
                  <span role="columnheader">Cron</span>
                  <span role="columnheader">Cadence</span>
                  <span role="columnheader">State</span>
                </div>
                {schedules.map((schedule) => (
                  <article key={schedule.id} className="cron-schedule-row" role="row">
                    <div role="cell">
                      <div className="runtime-service-title-row">
                        <h3>{schedule.label}</h3>
                      </div>
                      <p className="runtime-service-meta">{schedule.responsibility}</p>
                    </div>
                    <div role="cell">
                      <p>{schedule.cadence}</p>
                      <p className="runtime-service-meta">Next {schedule.nextRunAt ?? 'pending'}</p>
                    </div>
                    <div role="cell">
                      <span className={`status-pill ${cronStateTone(schedule.state)}`}>
                        {schedule.state}
                      </span>
                      <p className="runtime-service-meta">Last {schedule.refreshedAt ?? 'pending'}</p>
                    </div>
                  </article>
                ))}
              </div>
              <ul className="signal-list">
                <li>Auto-start schedules only fire when there is no live PID for the managed service.</li>
                <li>Runtime registry refresh persists the snapshot used by footer and Home summary surfaces.</li>
                <li>Failures in cron should degrade this pane, not spawn duplicate services.</li>
              </ul>
            </>
          )}

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
