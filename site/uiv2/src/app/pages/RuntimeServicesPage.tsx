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
import { useRefreshSystemSnapshot, useSystemSnapshot } from '../hooks/useSystemSnapshot'
import { useState } from 'react'

const RULES_PAGE_SIZE = 20

type RulesWorkspaceTab = 'registry' | 'violations' | 'packs' | 'dependencies' | 'precedence' | 'tools'

type RuleSourceCategory = {
  id: string
  label: string
  tone: 'status-neutral' | 'status-live' | 'status-good' | 'status-warn'
}

type RegistrySortKey = 'id' | 'severity' | 'kind' | 'layer' | 'priority' | 'sourceType'
type SystemWorkspaceSection = 'services' | 'cron' | 'goal' | 'pipeline' | 'gates' | 'rules'
type Phase2GateItem = {
  gate: string
  severity: string
  command: string
  ok: boolean
  detail: string
}

type Phase2GateSummary = {
  blocked?: boolean
  pass?: number
  warn?: number
  fail?: number
  readyCount?: number
  blockedCount?: number
  attentionCount?: number
}

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const startIndex = (safePage - 1) * pageSize

  return {
    page: safePage,
    totalPages,
    items: items.slice(startIndex, startIndex + pageSize),
  }
}

function tabCountLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

function sortIndicator(sortKey: RegistrySortKey, activeKey: RegistrySortKey, direction: 'asc' | 'desc') {
  if (sortKey !== activeKey) {
    return ' ⇅'
  }

  return direction === 'asc' ? ' ↑' : ' ↓'
}

function classifyRuleSource(sourceDoc: string | null | undefined): RuleSourceCategory {
  const normalized = String(sourceDoc || '')

  if (normalized === 'template/.github/agents/kbx.agent.template.md') {
    return { id: 'agent-contract', label: 'Agent Contract', tone: 'status-good' }
  }

  if (normalized === 'template/12-ai-skills/agent-operating-manual.md') {
    return { id: 'agent-manual', label: 'Agent Manual', tone: 'status-live' }
  }

  if (normalized.startsWith('template/.github/prompts/')) {
    return { id: 'prompt-template', label: 'Prompt Template', tone: 'status-neutral' }
  }

  if (normalized === 'svfactory/CONSTITUTION.md') {
    return { id: 'constitution', label: 'Constitution', tone: 'status-warn' }
  }

  if (normalized.startsWith('template/15-governance/') || normalized.startsWith('knowledge-base/15-governance/')) {
    return { id: 'governance', label: 'Governance', tone: 'status-neutral' }
  }

  if (normalized.startsWith('src/lib/rules/')) {
    return { id: 'runtime-rule', label: 'Runtime Rule', tone: 'status-live' }
  }

  if (normalized.startsWith('template/')) {
    return { id: 'template-doc', label: 'Template Doc', tone: 'status-neutral' }
  }

  if (normalized.startsWith('knowledge-base/')) {
    return { id: 'workspace-doc', label: 'Workspace Doc', tone: 'status-neutral' }
  }

  return { id: 'other', label: 'Other Source', tone: 'status-neutral' }
}

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

function gateSeverityTone(severity: string | null | undefined) {
  const normalized = String(severity || '').toLowerCase()
  if (normalized === 'hard-fail') {
    return 'status-offline'
  }
  if (normalized === 'warn' || normalized === 'warning') {
    return 'status-warn'
  }
  return 'status-live'
}

function gateStatusTone(gate: Phase2GateItem) {
  if (gate.ok) {
    return 'status-good'
  }

  return gateSeverityTone(gate.severity)
}

function gateSeverityLabel(severity: string | null | undefined) {
  const normalized = String(severity || '').toLowerCase()
  if (normalized === 'hard-fail') {
    return 'block'
  }
  if (normalized === 'warn' || normalized === 'warning') {
    return 'warn'
  }
  return normalized || 'info'
}

function gateLabelFromId(gateId: string | null | undefined) {
  return String(gateId || 'Unknown Gate')
    .replace(/^G-/, '')
    .split('-')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0) + chunk.slice(1).toLowerCase())
    .join(' ')
}

function gateNextAction(summary: Phase2GateSummary, failingGate: Phase2GateItem | undefined) {
  const failCount = Number(summary.fail ?? summary.blockedCount ?? 0)
  const warnCount = Number(summary.warn ?? summary.attentionCount ?? 0)

  if (failCount > 0 && failingGate) {
    return `Unblock ${gateLabelFromId(failingGate.gate)} before maintain or release flows.`
  }
  if (warnCount > 0) {
    return 'Review warning-level gates before promoting this runtime state.'
  }
  return 'Gate surface is healthy enough to continue deeper runtime checks.'
}

function GateHealthBar({
  total,
  passCount,
  warnCount,
  failCount,
  nextAction,
}: {
  total: number
  passCount: number
  warnCount: number
  failCount: number
  nextAction: string
}) {
  return (
    <div className="kb-health-bar gate-health-bar">
      <div className="kb-health-group">
        <span className="runtime-overview-label">Total</span>
        <span className="count-pill kb-health-total">{total} gates</span>
      </div>
      <div className="kb-health-group">
        <span className="runtime-overview-label">Pass</span>
        <span className="status-pill status-good">pass {passCount}</span>
      </div>
      <div className="kb-health-group">
        <span className="runtime-overview-label">Warn</span>
        <span className={`status-pill ${warnCount > 0 ? 'status-warn' : 'status-neutral'}`}>warn {warnCount}</span>
      </div>
      <div className="kb-health-group">
        <span className="runtime-overview-label">Block</span>
        <span className={`status-pill ${failCount > 0 ? 'status-offline' : 'status-neutral'}`}>block {failCount}</span>
      </div>
      <div className="kb-health-next">
        <span className="runtime-overview-label">Next action</span>
        <span className="kb-health-next-text">{nextAction}</span>
      </div>
    </div>
  )
}

export function RuntimeServicesPage(props: RuntimeServicesPageProps) {
  const runtimeServicesQuery = useRuntimeServices()
  const systemSnapshotQuery = useSystemSnapshot()
  const homeSummaryQuery = useHomeSummary()
  const rulesSummaryQuery = useRulesSummary()
  const ensureRuntimeService = useEnsureRuntimeService()
  const refreshSystemSnapshot = useRefreshSystemSnapshot()
  const snapshotMetadata = runtimeServicesQuery.snapshotMetadata
  const summary = runtimeServicesQuery.data?.summary
  const services = summary?.services ?? []
  const schedules = runtimeServicesQuery.data?.schedules ?? []
  const dashboard = homeSummaryQuery.data?.summary
  const pipeline = dashboard?.pipeline
  const rules = rulesSummaryQuery.data?.summary ?? dashboard?.rules
  const gatesSnapshot = (systemSnapshotQuery.data?.gates ?? {}) as {
    ok?: boolean
    phase?: string
    checkedAt?: string | null
    summary?: Phase2GateSummary
    items?: Phase2GateItem[]
    readiness?: string
  }
  const gates = Array.isArray(gatesSnapshot?.items) ? gatesSnapshot.items : []
  const gateSummary = gatesSnapshot?.summary ?? {}
  const gatePassCount = Number(gateSummary.pass ?? gateSummary.readyCount ?? gates.filter((gate) => gate.ok).length)
  const gateWarnCount = Number(
    gateSummary.warn
      ?? gateSummary.attentionCount
      ?? gates.filter((gate) => !gate.ok && String(gate.severity).toLowerCase() !== 'hard-fail').length,
  )
  const gateFailCount = Number(
    gateSummary.fail
      ?? gateSummary.blockedCount
      ?? gates.filter((gate) => !gate.ok && String(gate.severity).toLowerCase() === 'hard-fail').length,
  )
  const failingGate = gates.find((gate) => !gate.ok)
  const goalSummary = dashboard?.goal
  const currentIntent = dashboard?.session.intent
  const currentTask = dashboard?.session.currentTask
  const [activeSection, setActiveSection] = useState<SystemWorkspaceSection>('services')
  const [ruleKindFilter, setRuleKindFilter] = useState<'all' | 'hard' | 'master' | 'soft'>('all')
  const [rulePackFilter, setRulePackFilter] = useState<string>('all')
  const [ruleSourceFilter, setRuleSourceFilter] = useState<string>('all')
  const [ruleTextFilter, setRuleTextFilter] = useState<string>('')
  const [ruleSeverityFilter, setRuleSeverityFilter] = useState<string>('all')
  const [ruleLayerFilter, setRuleLayerFilter] = useState<string>('all')
  const [rulePriorityFilter, setRulePriorityFilter] = useState<string>('all')
  const [registrySortKey, setRegistrySortKey] = useState<RegistrySortKey>('id')
  const [registrySortDirection, setRegistrySortDirection] = useState<'asc' | 'desc'>('asc')
  const [activeRulesTab, setActiveRulesTab] = useState<RulesWorkspaceTab>('registry')
  const [rulePages, setRulePages] = useState<Record<RulesWorkspaceTab, number>>({
    registry: 1,
    violations: 1,
    packs: 1,
    dependencies: 1,
    precedence: 1,
    tools: 1,
  })

  // Expansion state for registry rows (show detail panel)
  const [expandedRuleRows, setExpandedRuleRows] = useState<Record<string, boolean>>({})
  const toggleRuleExpand = (id: string) => setExpandedRuleRows((p) => ({ ...(p || {}), [id]: !p?.[id] }))

  const allRules = rules?.rules ?? []
  const allPacks = rules?.packs ?? []
  const allViolations = rules?.violations ?? []
  const filteredRules = allRules.filter((rule) => {
    const searchNeedle = ruleTextFilter.trim().toLowerCase()
    const sourceCategory = classifyRuleSource(rule.sourceDoc)

    if (searchNeedle) {
      const haystack = [
        rule.id,
        rule.title,
        rule.description,
        rule.sourceDoc,
        rule.sourceAnchor,
        rule.kind,
        rule.layer,
        rule.priority,
        sourceCategory.label,
        ...(rule.scope ?? []),
        ...(rule.dependsOn ?? []),
        ...(rule.tools ?? []),
      ].filter(Boolean).join(' ').toLowerCase()

      if (!haystack.includes(searchNeedle)) {
        return false
      }
    }

    if (ruleKindFilter !== 'all' && rule.kind !== ruleKindFilter) {
      return false
    }

    if (ruleSeverityFilter !== 'all' && rule.severity !== ruleSeverityFilter) {
      return false
    }

    if (ruleLayerFilter !== 'all' && rule.layer !== ruleLayerFilter) {
      return false
    }

    if (rulePriorityFilter !== 'all' && rule.priority !== rulePriorityFilter) {
      return false
    }

    if (ruleSourceFilter !== 'all' && sourceCategory.id !== ruleSourceFilter) {
      return false
    }
    if (rulePackFilter === 'all') {
      return true
    }
    const selectedPack = rules?.packs?.find((pack) => pack.id === rulePackFilter)
    return Boolean(selectedPack?.ruleIds.includes(rule.id ?? ''))
  })
  const sortedRegistryRules = [...filteredRules].sort((left, right) => {
    const leftSource = classifyRuleSource(left.sourceDoc)
    const rightSource = classifyRuleSource(right.sourceDoc)
    const compareMap: Record<RegistrySortKey, [string, string]> = {
      id: [String(left.id ?? ''), String(right.id ?? '')],
      severity: [String(left.severity ?? ''), String(right.severity ?? '')],
      kind: [String(left.kind ?? ''), String(right.kind ?? '')],
      layer: [String(left.layer ?? ''), String(right.layer ?? '')],
      priority: [String(left.priority ?? ''), String(right.priority ?? '')],
      sourceType: [leftSource.label, rightSource.label],
    }

    const [leftValue, rightValue] = compareMap[registrySortKey]
    const direction = registrySortDirection === 'asc' ? 1 : -1
    const primary = leftValue.localeCompare(rightValue) * direction

    if (primary !== 0) {
      return primary
    }

    return String(left.id ?? '').localeCompare(String(right.id ?? '')) * direction
  })
  const dependencyRows = allRules.filter((rule) => rule.dependsOn.length > 0)
  const precedenceRows = [...allRules].sort((left, right) => (left.precedence ?? 99) - (right.precedence ?? 99) || String(left.id ?? '').localeCompare(String(right.id ?? '')))
  const toolCoverageRows = [...allRules].sort((left, right) => String(left.id ?? '').localeCompare(String(right.id ?? '')))
  const sourceBreakdown = allRules.reduce<Array<{ id: string; label: string; count: number; tone: RuleSourceCategory['tone'] }>>((accumulator, rule) => {
    const category = classifyRuleSource(rule.sourceDoc)
    const existing = accumulator.find((entry) => entry.id === category.id)

    if (existing) {
      existing.count += 1
      return accumulator
    }

    accumulator.push({ id: category.id, label: category.label, count: 1, tone: category.tone })
    return accumulator
  }, []).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))

  const registryPage = paginateItems(sortedRegistryRules, rulePages.registry, RULES_PAGE_SIZE)
  const violationsPage = paginateItems(allViolations, rulePages.violations, RULES_PAGE_SIZE)
  const packsPage = paginateItems(allPacks, rulePages.packs, RULES_PAGE_SIZE)
  const dependenciesPage = paginateItems(dependencyRows, rulePages.dependencies, RULES_PAGE_SIZE)
  const precedencePage = paginateItems(precedenceRows, rulePages.precedence, RULES_PAGE_SIZE)
  const toolsPage = paginateItems(toolCoverageRows, rulePages.tools, RULES_PAGE_SIZE)

  function setRulesPage(tab: RulesWorkspaceTab, page: number) {
    setRulePages((current) => ({ ...current, [tab]: page }))
  }

  function resetRegistryPage() {
    setRulePages((current) => ({ ...current, registry: 1 }))
  }

  function toggleRegistrySort(nextKey: RegistrySortKey) {
    setRegistrySortDirection((currentDirection) => {
      if (registrySortKey === nextKey) {
        return currentDirection === 'asc' ? 'desc' : 'asc'
      }

      return 'asc'
    })
    setRegistrySortKey(nextKey)
    resetRegistryPage()
  }

  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">{props.eyebrow}</p>
          <h1>{props.title}</h1>
          <p>{props.subtitle}</p>
        </div>
        <div className="toolbar-actions">
          <span className="meta-pill">
            {snapshotMetadata?.reloadRecommended
              ? `Reload recommended: ${snapshotMetadata.reloadReasons.join(', ')}`
              : `Snapshot ${snapshotMetadata?.generatedAt ?? 'pending'}`}
          </span>
          <button className="tool-button" type="button" onClick={() => refreshSystemSnapshot.mutate()}>
            {runtimeServicesQuery.isFetching || refreshSystemSnapshot.isPending ? 'Refreshing...' : 'Refresh Runtime'}
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
              className={`system-menu-item${activeSection === 'gates' ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveSection('gates')}
            >
              <span className="system-menu-item-label">
                <Icon icon={shield} aria-hidden="true" />
                <span>Gates</span>
              </span>
              <small>{gateFailCount > 0 ? `${gateFailCount} blocking` : `${gates.length} tracked`}</small>
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
          ) : activeSection === 'gates' ? (
            <>
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Operational Gates</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-kb" aria-hidden="true">
                      <Icon icon={shield} />
                    </span>
                    <h2>Gate Readiness</h2>
                  </div>
                </div>
                <div className="panel-toolbar-meta">
                  <span className="count-pill">{gatesSnapshot?.phase ?? 'phase-2-cli-bridge'}</span>
                  <span className="count-pill">{gatesSnapshot?.checkedAt ?? snapshotMetadata?.generatedAt ?? 'pending'}</span>
                </div>
              </div>

              <GateHealthBar
                total={gates.length}
                passCount={gatePassCount}
                warnCount={gateWarnCount}
                failCount={gateFailCount}
                nextAction={gateNextAction(gateSummary, failingGate)}
              />

              <div className="runtime-overview-grid compact-runtime-overview-grid gate-overview-grid">
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Collector</span>
                  <strong>{gatesSnapshot?.phase ? 'snapshot' : 'pending'}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Checked</span>
                  <strong>{gatesSnapshot?.checkedAt ? 'fresh' : 'pending'}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Readiness</span>
                  <strong>{gatesSnapshot?.readiness ?? (gateFailCount > 0 ? 'blocked' : gateWarnCount > 0 ? 'review' : 'ready')}</strong>
                </div>
                <div className="runtime-overview-card">
                  <span className="runtime-overview-label">Snapshot source</span>
                  <strong>{snapshotMetadata?.reloadRecommended ? 'stale' : 'live'}</strong>
                </div>
              </div>

              <div className="system-module-stack">
                <article className="system-info-card gate-section-shell">
                  <div className="panel-toolbar compact-toolbar">
                    <div>
                      <p className="workspace-eyebrow">Gate Registry</p>
                      <h3>Tracked Decisions</h3>
                    </div>
                    <div className="panel-toolbar-meta">
                      <span className="count-pill">{gates.length} items</span>
                      <span className="count-pill">{gateFailCount > 0 ? `${gateFailCount} blockers` : 'no blockers'}</span>
                    </div>
                  </div>

                  <div className="gate-grid">
                    {gates.map((gate) => (
                      <article key={gate.gate} className="gate-card">
                        <div className="gate-card-header">
                          <div>
                            <span className="runtime-overview-label">{gate.gate}</span>
                            <strong className="system-info-title">{gateLabelFromId(gate.gate)}</strong>
                          </div>
                          <div className="gate-card-pills">
                            <span className={`status-pill ${gateStatusTone(gate)}`}>{gate.ok ? 'pass' : 'needs action'}</span>
                            <span className={`status-pill ${gateSeverityTone(gate.severity)}`}>{gateSeverityLabel(gate.severity)}</span>
                          </div>
                        </div>
                        <p className="rules-cell-copy">{gate.detail}</p>
                        <div className="gate-card-meta">
                          <div>
                            <span className="runtime-overview-label">Command</span>
                            <code>{gate.command}</code>
                          </div>
                        </div>
                      </article>
                    ))}
                    {!gates.length ? (
                      <article className="gate-card gate-card-empty">
                        <strong className="system-info-title">No gate snapshot yet</strong>
                        <p className="rules-cell-copy">Refresh the runtime snapshot to hydrate operational gates into this pane.</p>
                      </article>
                    ) : null}
                  </div>
                </article>
              </div>
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

              <div className="system-module-stack">
                <article className="system-info-card rules-section-shell">
                  <div className="rules-tab-bar" role="tablist" aria-label="Rules workspace sections">
                    <button className={`rules-tab-button${activeRulesTab === 'registry' ? ' active' : ''}`} type="button" onClick={() => setActiveRulesTab('registry')}>Registry</button>
                    <button className={`rules-tab-button${activeRulesTab === 'violations' ? ' active' : ''}`} type="button" onClick={() => setActiveRulesTab('violations')}>Violation Feed</button>
                    <button className={`rules-tab-button${activeRulesTab === 'packs' ? ' active' : ''}`} type="button" onClick={() => setActiveRulesTab('packs')}>Rule Packs</button>
                    <button className={`rules-tab-button${activeRulesTab === 'dependencies' ? ' active' : ''}`} type="button" onClick={() => setActiveRulesTab('dependencies')}>Dependencies</button>
                    <button className={`rules-tab-button${activeRulesTab === 'precedence' ? ' active' : ''}`} type="button" onClick={() => setActiveRulesTab('precedence')}>Precedence</button>
                    <button className={`rules-tab-button${activeRulesTab === 'tools' ? ' active' : ''}`} type="button" onClick={() => setActiveRulesTab('tools')}>Tool Coverage</button>
                  </div>

                  {activeRulesTab === 'registry' ? (
                    <>
                      <div className="panel-toolbar compact-toolbar">
                        <div>
                          <p className="workspace-eyebrow">Registry</p>
                          <h3>Rule Catalog</h3>
                        </div>
                        <div className="panel-toolbar-meta">
                          <span className="count-pill">{registryPage.page}/{registryPage.totalPages}</span>
                          <span className="count-pill">{tabCountLabel(filteredRules.length, 'rule', 'rules')}</span>
                        </div>
                      </div>

                      <div className="rules-filter-grid">
                        <label className="rules-filter-select rules-filter-search">
                          <span>Search Rule Text</span>
                          <input
                            type="text"
                            value={ruleTextFilter}
                            placeholder="id, title, source, scope, tool..."
                            onChange={(event) => { setRuleTextFilter(event.target.value); resetRegistryPage() }}
                          />
                        </label>
                        <label className="rules-filter-select">
                          <span>Severity</span>
                          <select value={ruleSeverityFilter} onChange={(event) => { setRuleSeverityFilter(event.target.value); resetRegistryPage() }}>
                            <option value="all">All severities</option>
                            <option value="error">Error</option>
                            <option value="warn">Warn</option>
                            <option value="info">Info</option>
                          </select>
                        </label>
                        <label className="rules-filter-select">
                          <span>Kind</span>
                          <select value={ruleKindFilter} onChange={(event) => { setRuleKindFilter(event.target.value as 'all' | 'hard' | 'master' | 'soft'); resetRegistryPage() }}>
                            <option value="all">All kinds</option>
                            <option value="hard">Hard</option>
                            <option value="master">Master</option>
                            <option value="soft">Soft</option>
                          </select>
                        </label>
                        <label className="rules-filter-select">
                          <span>Layer</span>
                          <select value={ruleLayerFilter} onChange={(event) => { setRuleLayerFilter(event.target.value); resetRegistryPage() }}>
                            <option value="all">All layers</option>
                            <option value="root">Root</option>
                            <option value="agent">Agent</option>
                            <option value="cli">CLI</option>
                            <option value="ui">UI</option>
                          </select>
                        </label>
                        <label className="rules-filter-select">
                          <span>Priority</span>
                          <select value={rulePriorityFilter} onChange={(event) => { setRulePriorityFilter(event.target.value); resetRegistryPage() }}>
                            <option value="all">All priorities</option>
                            <option value="P0">P0</option>
                            <option value="P1">P1</option>
                            <option value="P2">P2</option>
                          </select>
                        </label>
                        <label className="rules-filter-select">
                          <span>Rule Pack</span>
                          <select value={rulePackFilter} onChange={(event) => { setRulePackFilter(event.target.value); resetRegistryPage() }}>
                            <option value="all">All packs</option>
                            {allPacks.map((pack) => (
                              <option key={pack.id ?? 'pack'} value={pack.id ?? ''}>{pack.title ?? pack.id ?? 'pack'}</option>
                            ))}
                          </select>
                        </label>
                        <label className="rules-filter-select">
                          <span>Source Type</span>
                          <select value={ruleSourceFilter} onChange={(event) => { setRuleSourceFilter(event.target.value); resetRegistryPage() }}>
                            <option value="all">All sources</option>
                            {sourceBreakdown.map((entry) => (
                              <option key={entry.id} value={entry.id}>{entry.label} ({entry.count})</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="rules-inline-meta">
                        {sourceBreakdown.map((entry) => (
                          <span key={entry.id} className={`status-pill ${entry.tone}`}>{entry.label} · {entry.count}</span>
                        ))}
                      </div>

                      <div className="rules-table" role="table" aria-label="Rule registry list">
                        <div className="rules-table-header rules-registry-header" role="row">
                          <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleRegistrySort('id')}>Rule{sortIndicator('id', registrySortKey, registrySortDirection)}</button>
                          <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleRegistrySort('severity')}>Severity{sortIndicator('severity', registrySortKey, registrySortDirection)}</button>
                          <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleRegistrySort('kind')}>Kind{sortIndicator('kind', registrySortKey, registrySortDirection)}</button>
                          <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleRegistrySort('layer')}>Layer{sortIndicator('layer', registrySortKey, registrySortDirection)}</button>
                          <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleRegistrySort('priority')}>Priority{sortIndicator('priority', registrySortKey, registrySortDirection)}</button>
                          <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleRegistrySort('sourceType')}>Source Type{sortIndicator('sourceType', registrySortKey, registrySortDirection)}</button>
                        </div>
                        {registryPage.items.map((rule, idx) => {
                          const rowId = String(rule.id ?? `rule-${idx}`)
                          const sourceLabel = `${rule.sourceDoc ?? 'n/a'}${rule.sourceAnchor ? `#${rule.sourceAnchor}` : ''}`
                          const sourceCategory = classifyRuleSource(rule.sourceDoc)

                          return (
                            <div key={rowId} className="rules-row-wrap">
                              <article onClick={() => toggleRuleExpand(rowId)} className="rules-table-row rules-registry-row" role="row" aria-expanded={expandedRuleRows[rowId] ? 'true' : 'false'}>
                                <div role="cell">
                                  <strong>{rule.id ?? 'unknown-rule'}</strong>
                                  <p className="rules-cell-copy">{rule.title ?? rule.id ?? 'Unknown title'}</p>
                                </div>
                                <div role="cell">
                                  <span className={`status-pill ${ruleSeverityTone(rule.severity)}`}>{rule.severity ?? 'info'}</span>
                                </div>
                                <div role="cell">
                                  <span className="status-pill status-neutral">{rule.kind ?? 'rule'}</span>
                                </div>
                                <div role="cell">
                                  <span className="status-pill status-neutral">{rule.layer ?? 'agent'}</span>
                                </div>
                                <div role="cell">
                                  <span className="status-pill status-neutral">{rule.priority ?? 'P?'}</span>
                                </div>
                                <div role="cell">
                                  <span className={`status-pill ${sourceCategory.tone}`}>{sourceCategory.label}</span>
                                </div>
                              </article>

                              {expandedRuleRows[rowId] ? (
                                <div className="expanded-details" role="region">
                                  <div className="expanded-content">
                                    <strong>Source</strong>
                                    <p className="rules-cell-copy rules-source-copy" title={sourceLabel}>{sourceLabel}</p>
                                    <strong>Description</strong>
                                    <p className="rules-cell-copy">{rule.description ?? 'No description'}</p>
                                    <p className="rules-cell-copy">
                                      {rule.dependsOn?.length ? `Depends: ${rule.dependsOn.join(', ')}` : 'Depends: none'}
                                      {rule.overrideMode ? ` · Override: ${rule.overrideMode}` : ''}
                                      {rule.scope?.length ? ` · Scope: ${rule.scope.join(', ')}` : ''}
                                    </p>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                        {!registryPage.items.length ? (
                          <article className="rules-table-empty" role="row">
                            <p>No rules match the current filters.</p>
                          </article>
                        ) : null}
                      </div>

                      <div className="rules-pagination">
                        <span className="rules-pagination-copy">Showing {registryPage.items.length ? `${(registryPage.page - 1) * RULES_PAGE_SIZE + 1}-${(registryPage.page - 1) * RULES_PAGE_SIZE + registryPage.items.length}` : '0'} of {filteredRules.length}</span>
                        <div className="rules-pagination-actions">
                          <button className="tool-button" type="button" disabled={registryPage.page <= 1} onClick={() => setRulesPage('registry', registryPage.page - 1)}>Previous</button>
                          <span className="count-pill">Page {registryPage.page} / {registryPage.totalPages}</span>
                          <button className="tool-button" type="button" disabled={registryPage.page >= registryPage.totalPages} onClick={() => setRulesPage('registry', registryPage.page + 1)}>Next</button>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {activeRulesTab === 'violations' ? (
                    <>
                      <div className="panel-toolbar compact-toolbar">
                        <div>
                          <p className="workspace-eyebrow">Violation Feed</p>
                          <h3>Findings</h3>
                        </div>
                        <div className="panel-toolbar-meta">
                          <span className="count-pill">{violationsPage.page}/{violationsPage.totalPages}</span>
                          <span className="count-pill">{tabCountLabel(allViolations.length, 'finding', 'findings')}</span>
                        </div>
                      </div>
                      <div className="rules-table" role="table" aria-label="Rule violations list">
                        <div className="rules-table-header" role="row">
                          <span role="columnheader">Rule</span>
                          <span role="columnheader">Severity</span>
                          <span role="columnheader">File</span>
                          <span role="columnheader">Message</span>
                        </div>
                        {violationsPage.items.map((violation, index) => (
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
                        {!violationsPage.items.length ? (
                          <article className="rules-table-empty" role="row">
                            <p>No rule violations reported.</p>
                          </article>
                        ) : null}
                      </div>
                      <div className="rules-pagination">
                        <span className="rules-pagination-copy">Showing {violationsPage.items.length ? `${(violationsPage.page - 1) * RULES_PAGE_SIZE + 1}-${(violationsPage.page - 1) * RULES_PAGE_SIZE + violationsPage.items.length}` : '0'} of {allViolations.length}</span>
                        <div className="rules-pagination-actions">
                          <button className="tool-button" type="button" disabled={violationsPage.page <= 1} onClick={() => setRulesPage('violations', violationsPage.page - 1)}>Previous</button>
                          <span className="count-pill">Page {violationsPage.page} / {violationsPage.totalPages}</span>
                          <button className="tool-button" type="button" disabled={violationsPage.page >= violationsPage.totalPages} onClick={() => setRulesPage('violations', violationsPage.page + 1)}>Next</button>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {activeRulesTab === 'packs' ? (
                    <>
                      <div className="panel-toolbar compact-toolbar">
                        <div>
                          <p className="workspace-eyebrow">Rule Packs</p>
                          <h3>Context Packets</h3>
                        </div>
                        <div className="panel-toolbar-meta">
                          <span className="count-pill">{packsPage.page}/{packsPage.totalPages}</span>
                          <span className="count-pill">{tabCountLabel(allPacks.length, 'pack', 'packs')}</span>
                        </div>
                      </div>
                      <div className="rules-pack-grid">
                        {packsPage.items.map((pack) => (
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
                        {!packsPage.items.length ? <p className="rules-cell-copy">No rule packs registered.</p> : null}
                      </div>
                      <div className="rules-pagination">
                        <span className="rules-pagination-copy">Showing {packsPage.items.length ? `${(packsPage.page - 1) * RULES_PAGE_SIZE + 1}-${(packsPage.page - 1) * RULES_PAGE_SIZE + packsPage.items.length}` : '0'} of {allPacks.length}</span>
                        <div className="rules-pagination-actions">
                          <button className="tool-button" type="button" disabled={packsPage.page <= 1} onClick={() => setRulesPage('packs', packsPage.page - 1)}>Previous</button>
                          <span className="count-pill">Page {packsPage.page} / {packsPage.totalPages}</span>
                          <button className="tool-button" type="button" disabled={packsPage.page >= packsPage.totalPages} onClick={() => setRulesPage('packs', packsPage.page + 1)}>Next</button>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {activeRulesTab === 'dependencies' ? (
                    <>
                      <div className="panel-toolbar compact-toolbar">
                        <div>
                          <p className="workspace-eyebrow">Dependencies</p>
                          <h3>Dependency Graph</h3>
                        </div>
                        <div className="panel-toolbar-meta">
                          <span className="count-pill">{dependenciesPage.page}/{dependenciesPage.totalPages}</span>
                          <span className="count-pill">{tabCountLabel(dependencyRows.length, 'edge', 'edges')}</span>
                        </div>
                      </div>
                      <div className="rules-graph-list">
                        {dependenciesPage.items.map((rule) => (
                          <article key={`${rule.id ?? 'rule'}-dependency`} className="rules-graph-item">
                            <strong>{rule.id ?? 'unknown-rule'}</strong>
                            <p className="rules-cell-copy">{rule.dependsOn.join(' -> ')}{' -> '}{rule.id ?? 'unknown-rule'}</p>
                          </article>
                        ))}
                        {!dependenciesPage.items.length ? <p className="rules-cell-copy">No dependency edges available.</p> : null}
                      </div>
                      <div className="rules-pagination">
                        <span className="rules-pagination-copy">Showing {dependenciesPage.items.length ? `${(dependenciesPage.page - 1) * RULES_PAGE_SIZE + 1}-${(dependenciesPage.page - 1) * RULES_PAGE_SIZE + dependenciesPage.items.length}` : '0'} of {dependencyRows.length}</span>
                        <div className="rules-pagination-actions">
                          <button className="tool-button" type="button" disabled={dependenciesPage.page <= 1} onClick={() => setRulesPage('dependencies', dependenciesPage.page - 1)}>Previous</button>
                          <span className="count-pill">Page {dependenciesPage.page} / {dependenciesPage.totalPages}</span>
                          <button className="tool-button" type="button" disabled={dependenciesPage.page >= dependenciesPage.totalPages} onClick={() => setRulesPage('dependencies', dependenciesPage.page + 1)}>Next</button>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {activeRulesTab === 'precedence' ? (
                    <>
                      <div className="panel-toolbar compact-toolbar">
                        <div>
                          <p className="workspace-eyebrow">Precedence</p>
                          <h3>Override Order</h3>
                        </div>
                        <div className="panel-toolbar-meta">
                          <span className="count-pill">{precedencePage.page}/{precedencePage.totalPages}</span>
                          <span className="count-pill">{tabCountLabel(precedenceRows.length, 'rule', 'rules')}</span>
                        </div>
                      </div>
                      <div className="rules-inline-meta">
                        {(rules?.precedence ?? []).map((level) => (
                          <span key={level.label} className="meta-pill">{level.level}. {level.label}</span>
                        ))}
                      </div>
                      <div className="rules-table" role="table" aria-label="Rule precedence list">
                        <div className="rules-table-header" role="row">
                          <span role="columnheader">Rule</span>
                          <span role="columnheader">Kind</span>
                          <span role="columnheader">Precedence</span>
                          <span role="columnheader">Override</span>
                        </div>
                        {precedencePage.items.map((rule) => (
                          <article key={`${rule.id ?? 'rule'}-precedence`} className="rules-table-row" role="row">
                            <div role="cell">
                              <strong>{rule.id ?? 'unknown-rule'}</strong>
                              <p className="rules-cell-copy">{rule.title ?? rule.description ?? 'No title'}</p>
                            </div>
                            <div role="cell">
                              <span className={`status-pill ${ruleSeverityTone(rule.severity)}`}>{rule.kind ?? 'rule'}</span>
                              <p className="rules-cell-copy">{rule.layer ?? 'agent'}</p>
                            </div>
                            <div role="cell">
                              <p className="rules-cell-copy">{rule.precedence ?? 'n/a'}</p>
                            </div>
                            <div role="cell">
                              <p className="rules-cell-copy">{rule.overrideMode ?? 'none'}</p>
                            </div>
                          </article>
                        ))}
                        {!precedencePage.items.length ? (
                          <article className="rules-table-empty" role="row">
                            <p>No precedence rows available.</p>
                          </article>
                        ) : null}
                      </div>
                      <div className="rules-pagination">
                        <span className="rules-pagination-copy">Showing {precedencePage.items.length ? `${(precedencePage.page - 1) * RULES_PAGE_SIZE + 1}-${(precedencePage.page - 1) * RULES_PAGE_SIZE + precedencePage.items.length}` : '0'} of {precedenceRows.length}</span>
                        <div className="rules-pagination-actions">
                          <button className="tool-button" type="button" disabled={precedencePage.page <= 1} onClick={() => setRulesPage('precedence', precedencePage.page - 1)}>Previous</button>
                          <span className="count-pill">Page {precedencePage.page} / {precedencePage.totalPages}</span>
                          <button className="tool-button" type="button" disabled={precedencePage.page >= precedencePage.totalPages} onClick={() => setRulesPage('precedence', precedencePage.page + 1)}>Next</button>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {activeRulesTab === 'tools' ? (
                    <>
                      <div className="panel-toolbar compact-toolbar">
                        <div>
                          <p className="workspace-eyebrow">Tool Coverage</p>
                          <h3>Execution Surfaces</h3>
                        </div>
                        <div className="panel-toolbar-meta">
                          <span className="count-pill">{toolsPage.page}/{toolsPage.totalPages}</span>
                          <span className="count-pill">{tabCountLabel(toolCoverageRows.length, 'rule', 'rules')}</span>
                        </div>
                      </div>
                      <div className="rules-table" role="table" aria-label="Rule tool coverage list">
                        <div className="rules-table-header" role="row">
                          <span role="columnheader">Rule</span>
                          <span role="columnheader">Kind</span>
                          <span role="columnheader">Coverage</span>
                          <span role="columnheader">Tools</span>
                        </div>
                        {toolsPage.items.map((rule) => (
                          <article key={`${rule.id ?? 'rule'}-tool`} className="rules-table-row" role="row">
                            <div role="cell">
                              <strong>{rule.id ?? 'unknown-rule'}</strong>
                              <p className="rules-cell-copy">{rule.title ?? 'No title'}</p>
                            </div>
                            <div role="cell">
                              <span className={`status-pill ${ruleSeverityTone(rule.severity)}`}>{rule.kind ?? 'rule'}</span>
                              <p className="rules-cell-copy">{rule.priority ?? 'priority n/a'}</p>
                            </div>
                            <div role="cell">
                              <span className={`status-pill ${rule.tools.length > 0 ? 'status-good' : 'status-warn'}`}>{rule.tools.length > 0 ? 'tool-backed' : 'policy-only'}</span>
                            </div>
                            <div role="cell">
                              <p className="rules-cell-copy">{rule.tools.length > 0 ? rule.tools.join(', ') : 'No explicit tool coverage'}</p>
                            </div>
                          </article>
                        ))}
                        {!toolsPage.items.length ? (
                          <article className="rules-table-empty" role="row">
                            <p>No tool coverage rows available.</p>
                          </article>
                        ) : null}
                      </div>
                      <div className="rules-pagination">
                        <span className="rules-pagination-copy">Showing {toolsPage.items.length ? `${(toolsPage.page - 1) * RULES_PAGE_SIZE + 1}-${(toolsPage.page - 1) * RULES_PAGE_SIZE + toolsPage.items.length}` : '0'} of {toolCoverageRows.length}</span>
                        <div className="rules-pagination-actions">
                          <button className="tool-button" type="button" disabled={toolsPage.page <= 1} onClick={() => setRulesPage('tools', toolsPage.page - 1)}>Previous</button>
                          <span className="count-pill">Page {toolsPage.page} / {toolsPage.totalPages}</span>
                          <button className="tool-button" type="button" disabled={toolsPage.page >= toolsPage.totalPages} onClick={() => setRulesPage('tools', toolsPage.page + 1)}>Next</button>
                        </div>
                      </div>
                    </>
                  ) : null}
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
