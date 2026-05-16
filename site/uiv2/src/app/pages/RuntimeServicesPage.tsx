import { Icon } from '@iconify/react'
import goal from '@iconify-icons/lucide/goal'
import gitBranch from '@iconify-icons/lucide/git-branch'
import shield from '@iconify-icons/lucide/shield'
import clock3 from '@iconify-icons/lucide/clock-3'
import server from '@iconify-icons/lucide/server'
import serverCog from '@iconify-icons/lucide/server-cog'
import settings2 from '@iconify-icons/lucide/settings-2'
import { useHomeSummary } from '../hooks/useHomeSummary'
import { useRulesSummary } from '../hooks/useRulesSummary'
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

function ruleSeverityTone(severity: string | null | undefined) {
  const normalized = String(severity || '').toLowerCase()
  if (normalized === 'error') {
    return 'status-offline'
  }
  if (normalized === 'warn' || normalized === 'warning') {
    return 'status-warn'
  }
  return 'status-live'
}

export function RuntimeServicesPage(props: RuntimeServicesPageProps) {
  const runtimeServicesQuery = useRuntimeServices()
  const homeSummaryQuery = useHomeSummary()
  const rulesSummaryQuery = useRulesSummary()
  const ensureRuntimeService = useEnsureRuntimeService()
  const summary = runtimeServicesQuery.data?.summary
  const services = summary?.services ?? []
  const schedules = runtimeServicesQuery.data?.schedules ?? []
  const dashboard = homeSummaryQuery.data?.summary
  const pipeline = dashboard?.pipeline
  const rules = rulesSummaryQuery.data?.summary ?? dashboard?.rules
  const goalSummary = dashboard?.goal
  const currentIntent = dashboard?.session.intent
  const currentTask = dashboard?.session.currentTask
  const [activeSection, setActiveSection] = useState<'services' | 'cron' | 'goal' | 'pipeline' | 'rules'>('services')
  const [ruleKindFilter, setRuleKindFilter] = useState<'all' | 'hard' | 'master' | 'soft'>('all')
  const [rulePackFilter, setRulePackFilter] = useState<string>('all')

  const allRules = rules?.rules ?? []
  const filteredRules = allRules.filter((rule) => {
    if (ruleKindFilter !== 'all' && rule.kind !== ruleKindFilter) {
      return false
    }
    if (rulePackFilter === 'all') {
      return true
    }
    const selectedPack = rules?.packs?.find((pack) => pack.id === rulePackFilter)
    return Boolean(selectedPack?.ruleIds.includes(rule.id ?? ''))
  })
  const rulesWithTools = filteredRules.filter((rule) => rule.tools.length > 0)
  const rulesWithoutTools = filteredRules.filter((rule) => rule.tools.length === 0)
  const dependencyRows = filteredRules.filter((rule) => rule.dependsOn.length > 0)
  const precedenceRows = [...filteredRules].sort((left, right) => (left.precedence ?? 99) - (right.precedence ?? 99) || String(left.id ?? '').localeCompare(String(right.id ?? '')))

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
            <button
              className={`system-menu-item${activeSection === 'goal' ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveSection('goal')}
            >
              <span className="system-menu-item-label">
                <Icon icon={goal} aria-hidden="true" />
                <span>Goal</span>
              </span>
              <small>{currentIntent?.id ?? 'pending'}</small>
            </button>
            <button
              className={`system-menu-item${activeSection === 'pipeline' ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveSection('pipeline')}
            >
              <span className="system-menu-item-label">
                <Icon icon={gitBranch} aria-hidden="true" />
                <span>Pipeline</span>
              </span>
              <small>{pipeline?.stepCount ?? 0} steps</small>
            </button>
            <button
              className={`system-menu-item${activeSection === 'rules' ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveSection('rules')}
            >
              <span className="system-menu-item-label">
                <Icon icon={shield} aria-hidden="true" />
                <span>Rules</span>
              </span>
              <small>{rules?.violationCount ?? 0} findings</small>
            </button>
          </div>
          <ul className="signal-list">
            <li>System owns runtime detail and recovery actions.</li>
            <li>Home only owns summary cards and navigation into this workspace.</li>
            <li>Sidebar changes the detail pane and should expose operator truth, not duplicate Home layout.</li>
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
          ) : activeSection === 'cron' ? (
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
          ) : activeSection === 'goal' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Session Intent</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-intent" aria-hidden="true">
                      <Icon icon={goal} />
                    </span>
                    <h2>Goal And Checkpoint</h2>
                  </div>
                </div>
                <div className="panel-toolbar-meta">
                  <span className="count-pill">{currentIntent?.id ?? 'pending'}</span>
                  <span className="count-pill">{currentIntent?.status ?? currentIntent?.lifecycle ?? 'unavailable'}</span>
                </div>
              </div>

              <div className="system-info-grid">
                <article className="system-info-card">
                  <span className="runtime-overview-label">Primary Goal</span>
                  <strong className="system-info-title">{goalSummary?.text ?? currentIntent?.goal ?? 'Goal unavailable'}</strong>
                  <p>{goalSummary?.summary ?? currentIntent?.summary ?? 'No goal summary available yet.'}</p>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Focus Current</span>
                  <strong className="system-info-title">{goalSummary?.focusCurrent ?? currentIntent?.focusCurrent ?? 'pending'}</strong>
                  <p>Next action: {goalSummary?.focusNextAction ?? currentIntent?.focusNextAction ?? 'pending'}</p>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Checkpoint Event</span>
                  <strong className="system-info-title">{goalSummary?.checkpointEvent ?? 'pending'}</strong>
                  <p>{goalSummary?.checkpointTimestamp ?? 'No checkpoint timestamp recorded.'}</p>
                </article>
                <article className="system-info-card">
                  <span className="runtime-overview-label">Current Task</span>
                  <strong className="system-info-title">{currentTask?.title ?? 'No current task'}</strong>
                  <p>{currentTask?.status ?? 'Task state unavailable'}{currentTask?.source ? ` · ${currentTask.source}` : ''}</p>
                </article>
              </div>
            </>
          ) : activeSection === 'pipeline' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Release Pipeline</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={gitBranch} />
                    </span>
                    <h2>Pipeline Contract</h2>
                  </div>
                </div>
                <div className="panel-toolbar-meta">
                  <span className="count-pill">{pipeline?.stepCount ?? 0} steps</span>
                  <span className="count-pill">{pipeline?.file ?? 'no file'}</span>
                </div>
              </div>

              <div className="runtime-summary-bar">
                <span className="meta-pill">Confirm {pipeline?.confirmCount ?? 0}</span>
                <span className="meta-pill">Guarded {pipeline?.failOnNonzeroCount ?? 0}</span>
                <span className="meta-pill">Status {pipeline?.ok ? 'loaded' : 'error'}</span>
              </div>

              <div className="system-info-list">
                {(pipeline?.steps ?? []).map((step) => (
                  <article key={`${step.index}-${step.name}`} className="system-info-row">
                    <div>
                      <div className="runtime-service-title-row">
                        <h3>{step.name}</h3>
                        <span className={`status-pill ${step.confirm ? 'status-warn' : 'status-live'}`}>
                          {step.confirm ? 'confirm' : 'auto'}
                        </span>
                      </div>
                      <p className="runtime-service-meta">{step.description ?? 'No step description provided.'}</p>
                    </div>
                    <div>
                      <span className="runtime-overview-label">Condition</span>
                      <p>{step.when ?? 'always'}</p>
                    </div>
                  </article>
                ))}
              </div>

              {pipeline && !pipeline.ok ? <p className="runtime-error-text">Pipeline error: {pipeline.error ?? 'unknown error'}</p> : null}
            </>
          ) : (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Governance Findings</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-kb" aria-hidden="true">
                      <Icon icon={shield} />
                    </span>
                    <h2>Rule Pressure</h2>
                  </div>
                </div>
                <div className="panel-toolbar-meta">
                  <span className="count-pill">{rules?.count ?? 0} rules</span>
                  <span className="count-pill">{rules?.violationCount ?? 0} findings</span>
                </div>
              </div>

              <div className="runtime-overview-grid compact-runtime-overview-grid rules-overview-grid">
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Registered</span>
                  <strong>{rules?.count ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Hard</span>
                  <strong>{rules?.hardCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Master</span>
                  <strong>{rules?.masterCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Soft</span>
                  <strong>{rules?.softCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Linted</span>
                  <strong>{rules?.linted ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Errors</span>
                  <strong>{rules?.errorCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Warnings</span>
                  <strong>{rules?.warnCount ?? 0}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Packs</span>
                  <strong>{rules?.packCount ?? 0}</strong>
                </div>
              </div>

              <div className="rules-filter-bar">
                <div className="rules-filter-group" role="group" aria-label="Rule kind filter">
                  <button className={`tool-button${ruleKindFilter === 'all' ? ' active' : ''}`} type="button" onClick={() => setRuleKindFilter('all')}>All</button>
                  <button className={`tool-button${ruleKindFilter === 'hard' ? ' active' : ''}`} type="button" onClick={() => setRuleKindFilter('hard')}>Hard</button>
                  <button className={`tool-button${ruleKindFilter === 'master' ? ' active' : ''}`} type="button" onClick={() => setRuleKindFilter('master')}>Master</button>
                  <button className={`tool-button${ruleKindFilter === 'soft' ? ' active' : ''}`} type="button" onClick={() => setRuleKindFilter('soft')}>Soft</button>
                </div>
                <label className="rules-filter-select">
                  <span>Rule Pack</span>
                  <select value={rulePackFilter} onChange={(event) => setRulePackFilter(event.target.value)}>
                    <option value="all">All packs</option>
                    {(rules?.packs ?? []).map((pack) => (
                      <option key={pack.id ?? 'pack'} value={pack.id ?? ''}>{pack.title ?? pack.id ?? 'pack'}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="system-module-stack">
                <article className="system-info-card">
                  <div className="panel-toolbar compact-toolbar">
                    <div>
                      <p className="workspace-eyebrow">Violation Feed</p>
                      <h3>Findings</h3>
                    </div>
                    <span className="count-pill">{rules?.violations?.length ?? rules?.violationCount ?? 0}</span>
                  </div>
                  <div className="rules-table" role="table" aria-label="Rule violations list">
                    <div className="rules-table-header" role="row">
                      <span role="columnheader">Rule</span>
                      <span role="columnheader">Severity</span>
                      <span role="columnheader">File</span>
                      <span role="columnheader">Message</span>
                    </div>
                    {(rules?.violations ?? []).map((violation, index) => (
                      <article key={`${violation.ruleId ?? 'violation'}-${index}`} className="rules-table-row" role="row">
                        <div role="cell">
                          <strong>{violation.ruleId ?? 'unknown-rule'}</strong>
                        </div>
                        <div role="cell">
                          <span className={`status-pill ${ruleSeverityTone(violation.severity)}`}>{violation.severity ?? 'info'}</span>
                        </div>
                        <div role="cell">
                          <p className="rules-cell-copy">{violation.file ?? 'workspace'}</p>
                        </div>
                        <div role="cell">
                          <p className="rules-cell-copy">{violation.message ?? 'No message'}{violation.line ? ` · line ${violation.line}` : ''}</p>
                        </div>
                      </article>
                    ))}
                    {!(rules?.violations?.length) ? (
                      <article className="rules-table-empty" role="row">
                        <p>No rule violations reported.</p>
                      </article>
                    ) : null}
                  </div>
                </article>

                <article className="system-info-card">
                  <div className="panel-toolbar compact-toolbar">
                    <div>
                      <p className="workspace-eyebrow">Registry</p>
                      <h3>Rule Catalog</h3>
                    </div>
                    <span className="count-pill">{rules?.rules?.length ?? rules?.count ?? 0}</span>
                  </div>
                  <div className="rules-table" role="table" aria-label="Rule registry list">
                    <div className="rules-table-header rules-registry-header" role="row">
                      <span role="columnheader">Rule</span>
                      <span role="columnheader">Class</span>
                      <span role="columnheader">Source</span>
                      <span role="columnheader">Description</span>
                    </div>
                    {filteredRules.map((rule) => (
                      <article key={rule.id ?? rule.description ?? 'rule'} className="rules-table-row rules-registry-row" role="row">
                        <div role="cell">
                          <strong>{rule.id ?? 'unknown-rule'}</strong>
                          <p className="rules-cell-copy">{rule.title ?? rule.id ?? 'Unknown title'}</p>
                        </div>
                        <div role="cell">
                          <span className={`status-pill ${ruleSeverityTone(rule.severity)}`}>{rule.kind ?? 'rule'}</span>
                          <p className="rules-cell-copy">{rule.severity ?? 'info'} · {rule.layer ?? 'agent'}{rule.priority ? ` · ${rule.priority}` : ''}</p>
                        </div>
                        <div role="cell">
                          <p className="rules-cell-copy">{rule.sourceDoc ?? 'n/a'}{rule.sourceAnchor ? `#${rule.sourceAnchor}` : ''}</p>
                        </div>
                        <div role="cell">
                          <p className="rules-cell-copy">{rule.description ?? 'No description'}</p>
                          <p className="rules-cell-copy">
                            {rule.dependsOn?.length ? `Depends: ${rule.dependsOn.join(', ')}` : 'Depends: none'}
                            {rule.overrideMode ? ` · Override: ${rule.overrideMode}` : ''}
                            {rule.scope?.length ? ` · Scope: ${rule.scope.join(', ')}` : ''}
                          </p>
                        </div>
                      </article>
                    ))}
                    {!filteredRules.length ? (
                      <article className="rules-table-empty" role="row">
                        <p>No rules match the current filters.</p>
                      </article>
                    ) : null}
                  </div>
                </article>

                <article className="system-info-card">
                  <div className="panel-toolbar compact-toolbar">
                    <div>
                      <p className="workspace-eyebrow">Rule Packs</p>
                      <h3>Context Packets</h3>
                    </div>
                    <span className="count-pill">{rules?.packs?.length ?? 0}</span>
                  </div>
                  <div className="rules-pack-grid">
                    {(rules?.packs ?? []).map((pack) => (
                      <article key={pack.id ?? 'pack'} className="rules-pack-card">
                        <div className="rules-pack-header">
                          <strong>{pack.title ?? pack.id ?? 'Packet'}</strong>
                          <span className="status-pill status-neutral">{pack.context ?? 'context'}</span>
                        </div>
                        <p className="rules-cell-copy">{pack.description ?? 'No description'}</p>
                        <p className="rules-cell-copy">Rules: {pack.stats.count} · Hard: {pack.stats.hardCount} · Master: {pack.stats.masterCount} · Soft: {pack.stats.softCount}</p>
                        <p className="rules-cell-copy">Tool coverage: {pack.stats.toolCoverage}/{pack.stats.count}</p>
                      </article>
                    ))}
                  </div>
                </article>

                <article className="system-info-card">
                  <div className="panel-toolbar compact-toolbar">
                    <div>
                      <p className="workspace-eyebrow">Dependencies</p>
                      <h3>Dependency Graph</h3>
                    </div>
                    <span className="count-pill">{dependencyRows.length}</span>
                  </div>
                  <div className="rules-graph-list">
                    {dependencyRows.map((rule) => (
                      <article key={`${rule.id ?? 'rule'}-dependency`} className="rules-graph-item">
                        <strong>{rule.id ?? 'unknown-rule'}</strong>
                        <p className="rules-cell-copy">{rule.dependsOn.join(' -> ')}{' -> '}{rule.id ?? 'unknown-rule'}</p>
                      </article>
                    ))}
                    {!dependencyRows.length ? <p className="rules-cell-copy">No dependency edges in the current filtered set.</p> : null}
                  </div>
                </article>

                <article className="system-info-card">
                  <div className="panel-toolbar compact-toolbar">
                    <div>
                      <p className="workspace-eyebrow">Precedence</p>
                      <h3>Override Order</h3>
                    </div>
                    <span className="count-pill">{rules?.precedence?.length ?? 0} levels</span>
                  </div>
                  <div className="rules-precedence-stack">
                    {(rules?.precedence ?? []).map((level) => (
                      <article key={level.label} className="rules-precedence-card">
                        <strong>{level.level}. {level.label}</strong>
                        <p className="rules-cell-copy">{level.description}</p>
                      </article>
                    ))}
                  </div>
                  <div className="rules-graph-list">
                    {precedenceRows.slice(0, 12).map((rule) => (
                      <article key={`${rule.id ?? 'rule'}-precedence`} className="rules-graph-item">
                        <strong>{rule.id ?? 'unknown-rule'}</strong>
                        <p className="rules-cell-copy">Precedence {rule.precedence ?? 'n/a'} · {rule.kind ?? 'rule'} · Override {rule.overrideMode ?? 'none'}</p>
                      </article>
                    ))}
                  </div>
                </article>

                <article className="system-info-card">
                  <div className="panel-toolbar compact-toolbar">
                    <div>
                      <p className="workspace-eyebrow">Tool Coverage</p>
                      <h3>Execution Surfaces</h3>
                    </div>
                    <span className="count-pill">{rulesWithTools.length}/{filteredRules.length || 0}</span>
                  </div>
                  <div className="rules-tool-grid">
                    <article className="rules-tool-card">
                      <strong>Rules With Tools</strong>
                      {rulesWithTools.slice(0, 10).map((rule) => (
                        <p key={`${rule.id ?? 'rule'}-tool`} className="rules-cell-copy">{rule.id ?? 'unknown-rule'} · {rule.tools.join(', ')}</p>
                      ))}
                      {!rulesWithTools.length ? <p className="rules-cell-copy">No tool-backed rules in the current filtered set.</p> : null}
                    </article>
                    <article className="rules-tool-card">
                      <strong>Rules Without Tools</strong>
                      {rulesWithoutTools.slice(0, 10).map((rule) => (
                        <p key={`${rule.id ?? 'rule'}-no-tool`} className="rules-cell-copy">{rule.id ?? 'unknown-rule'} · prompt/policy only</p>
                      ))}
                      {!rulesWithoutTools.length ? <p className="rules-cell-copy">Every filtered rule has explicit tool coverage.</p> : null}
                    </article>
                  </div>
                </article>
              </div>

              {rulesSummaryQuery.data?.errors?.lint ? <p className="runtime-error-text">Rules lint error: {rulesSummaryQuery.data.errors.lint}</p> : null}
              {rulesSummaryQuery.data?.errors?.list ? <p className="runtime-error-text">Rules list error: {rulesSummaryQuery.data.errors.list}</p> : null}
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
