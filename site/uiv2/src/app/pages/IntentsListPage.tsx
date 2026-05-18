import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@iconify/react'
import flag from '@iconify-icons/lucide/flag'
import flagTriangleRight from '@iconify-icons/lucide/flag-triangle-right'
import listTodo from '@iconify-icons/lucide/list-todo'
import network from '@iconify-icons/lucide/network'
import target from '@iconify-icons/lucide/target'
import activity from '@iconify-icons/lucide/activity'
import archive from '@iconify-icons/lucide/archive'
import chevronDown from '@iconify-icons/lucide/chevron-down'
import chevronUp from '@iconify-icons/lucide/chevron-up'
import clock3 from '@iconify-icons/lucide/clock-3'
import xIcon from '@iconify-icons/lucide/x'
import { useIntentsList, type IntentListItem } from '../hooks/useIntentsList'
import { useIntentDetail, type IntentTask } from '../hooks/useIntentDetail'
import { useSystemSnapshot, systemSnapshotQueryKey } from '../hooks/useSystemSnapshot'

type GoalCard = {
  id: string
  label: string
  metric: string
  state: string
  progress: number
  caption: string
  icon: typeof target
  tone: 'active' | 'warning' | 'neutral' | 'done'
}

type MilestoneBlock = {
  id: string
  label: string
  progress: number
  state: 'active' | 'backlog' | 'closed'
  metrics: string
  objectives: string[]
}

type IntentHealthFilter = 'all' | 'active' | 'backlog' | 'closed' | 'archived' | 'dropped' | 'selected'
type IntentSortKey = 'title' | 'version' | 'lifecycle' | 'mode' | 'runtime'

function normalizeLifecycle(value: string | null | undefined) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return 'unknown'
  if (text === 'active') return 'active'
  if (text === 'backlog') return 'backlog'
  if (text === 'closed' || text === 'released') return 'closed'
  if (text === 'dropped' || text === 'cancelled' || text === 'canceled') return 'dropped'
  if (text === 'archive' || text === 'archived') return 'archived'
  return text.replace(/\s+/g, '-')
}

function formatIntentStatus(detail: { lifecycle: string | null; status: string | null }) {
  const lifecycle = detail.lifecycle?.trim()
  const status = detail.status?.trim()
  if (lifecycle && status && lifecycle.toLowerCase() !== status.toLowerCase()) {
    return `${lifecycle} · ${status}`
  }
  return lifecycle ?? status ?? 'unknown'
}

function formatTimestamp(value: string | null) {
  if (!value) return 'Unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function deriveVersionBucket(intentId: string) {
  const match = intentId.match(/^(v\d+(?:-\d+)?)/i)
  return match?.[1]?.toLowerCase() ?? 'legacy'
}

function versionRank(versionId: string) {
  const numbers = versionId.replace(/^v/i, '').split('-').map((part) => Number.parseInt(part, 10)).filter((part) => Number.isFinite(part))
  return numbers.reduce((accumulator, value, index) => accumulator + value / 10 ** (index * 2), 0)
}

function summarizeMilestoneState(intents: IntentListItem[]) {
  const total = intents.length || 1
  const active = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'active').length
  const backlog = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'backlog').length
  const closed = intents.filter((intent) => ['closed', 'archived'].includes(normalizeLifecycle(intent.lifecycle))).length
  const progress = clampProgress((closed / total) * 100)

  if (active > 0) return { state: 'active' as const, progress }
  if (backlog > 0) return { state: 'backlog' as const, progress }
  return { state: 'closed' as const, progress: closed === total ? 100 : progress }
}

function buildGoalCards(intents: IntentListItem[], focusIntentId: string | null, activeIntentId: string | null, snapshotMetadata: { generatedAt?: string | null; reloadRecommended?: boolean | null } | undefined): GoalCard[] {
  const total = intents.length || 1
  const active = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'active').length
  const backlog = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'backlog').length
  const completed = intents.filter((intent) => ['closed', 'archived'].includes(normalizeLifecycle(intent.lifecycle))).length
  const focusAligned = focusIntentId ? intents.some((intent) => intent.id === focusIntentId) : false
  const snapshotLive = snapshotMetadata?.generatedAt ? true : false

  return [
    {
      id: 'active-delivery',
      label: 'Active Delivery',
      metric: `${active} intents`,
      state: active > 0 ? 'in-flight' : 'idle',
      progress: clampProgress((active / total) * 100),
      caption: `${backlog} backlog waiting behind the active stream.`,
      icon: activity,
      tone: active > 0 ? 'active' : 'neutral',
    },
    {
      id: 'focus-alignment',
      label: 'Focus Alignment',
      metric: focusIntentId ?? 'missing focus',
      state: focusAligned ? 'aligned' : 'drift',
      progress: focusAligned ? 100 : 38,
      caption: activeIntentId ? `Current active record: ${activeIntentId}.` : 'No active intent surfaced by snapshot.',
      icon: target,
      tone: focusAligned ? 'done' : 'warning',
    },
    {
      id: 'completion-flow',
      label: 'Completion Flow',
      metric: `${completed}/${intents.length} done`,
      state: completed > 0 ? 'moving' : 'starting',
      progress: clampProgress((completed / total) * 100),
      caption: 'Counts archive and closed intents as delivered milestones.',
      icon: archive,
      tone: completed > 0 ? 'done' : 'neutral',
    },
    {
      id: 'snapshot-readiness',
      label: 'Snapshot Readiness',
      metric: snapshotLive ? 'live contract' : 'pending',
      state: snapshotMetadata?.reloadRecommended ? 'reload' : 'fresh',
      progress: snapshotMetadata?.reloadRecommended ? 62 : 100,
      caption: snapshotMetadata?.reloadRecommended ? 'Bridge says UI should reload signals.' : 'Bridge snapshot is healthy enough for live intent browsing.',
      icon: clock3,
      tone: snapshotMetadata?.reloadRecommended ? 'warning' : 'active',
    },
  ]
}

function buildMilestones(intents: IntentListItem[]) {
  const buckets = new Map<string, IntentListItem[]>()

  for (const intent of intents) {
    const bucket = deriveVersionBucket(intent.id)
    const current = buckets.get(bucket) ?? []
    current.push(intent)
    buckets.set(bucket, current)
  }

  return Array.from(buckets.entries())
    .map(([id, bucketIntents]) => {
      const { progress, state } = summarizeMilestoneState(bucketIntents)
      const active = bucketIntents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'active').length
      const backlog = bucketIntents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'backlog').length
      const objectives = bucketIntents
        .slice(0, 3)
        .map((intent) => intent.title?.replace(/^"|"$/g, '') || intent.id)

      return {
        id,
        label: id === 'legacy' ? 'Legacy' : id.toUpperCase(),
        progress,
        state,
        metrics: `${bucketIntents.length} intents · ${active} active · ${backlog} backlog`,
        objectives,
      } satisfies MilestoneBlock
    })
    .sort((left, right) => versionRank(right.id) - versionRank(left.id))
}

function statusTone(value: string) {
  if (value === 'active' || value === 'aligned' || value === 'fresh' || value === 'closed') return 'status-good'
  if (value === 'backlog' || value === 'moving' || value === 'in-flight') return 'status-neutral'
  if (value === 'archived') return 'status-offline'
  if (value === 'dropped' || value === 'reload' || value === 'drift') return 'status-warn'
  return 'status-neutral'
}

function milestoneVisualState(value: MilestoneBlock['state']) {
  if (value === 'closed') return 'done'
  if (value === 'active') return 'active'
  return 'upcoming'
}

function intentVersionLabel(intentId: string) {
  const bucket = deriveVersionBucket(intentId)
  return bucket === 'legacy' ? 'legacy' : bucket.toUpperCase()
}

function intentRuntimeLabel(intentId: string, focusIntentId: string | null, activeIntentId: string | null) {
  if (intentId === focusIntentId && intentId === activeIntentId) return 'focus + active'
  if (intentId === focusIntentId) return 'focus'
  if (intentId === activeIntentId) return 'active'
  return 'queued'
}

function sortIndicator(active: string, current: string, direction: 'asc' | 'desc') {
  if (active !== current) return ' ⇅'
  return direction === 'asc' ? ' ↑' : ' ↓'
}

function GoalCardView({ card }: { card: GoalCard }) {
  return (
    <article className={`intent-goal-card intent-goal-card-${card.tone}`}>
      <div className="intent-goal-head">
        <div className="intent-goal-head-copy">
          <span className="intent-goal-icon" aria-hidden="true">
            <Icon icon={card.icon} />
          </span>
          <div>
            <p className="workspace-eyebrow">{card.label}</p>
            <strong>{card.metric}</strong>
          </div>
        </div>
        <span className={`status-pill ${statusTone(card.state)}`}>{card.state}</span>
      </div>
      <div className="intent-progress-track" aria-hidden="true">
        <span style={{ width: `${card.progress}%` }} />
      </div>
      <div className="intent-goal-foot">
        <span>{card.progress}%</span>
        <p>{card.caption}</p>
      </div>
    </article>
  )
}

function IntentHealthBar({
  total,
  active,
  backlog,
  closed,
  archived,
  dropped,
  selected,
  filter,
  onFilterChange,
}: {
  total: number
  active: number
  backlog: number
  closed: number
  archived: number
  dropped: number
  selected: string | null
  filter: IntentHealthFilter
  onFilterChange: (next: IntentHealthFilter) => void
}) {
  const pill = (id: IntentHealthFilter, label: string, tone: string) => (
    <button
      type="button"
      className={`status-pill intent-filter-pill ${tone}${filter === id ? ' intent-filter-pill-active' : ''}`}
      onClick={() => onFilterChange(filter === id ? 'all' : id)}
    >
      {label}
    </button>
  )

  return (
    <div className="kb-health-bar intent-health-bar">
      <div className="kb-health-group">
        <span className="runtime-overview-label">Total</span>
        <button type="button" className={`count-pill kb-health-total intent-filter-total${filter === 'all' ? ' intent-filter-pill-active' : ''}`} onClick={() => onFilterChange('all')}>
          {total} intents
        </button>
      </div>
      <div className="kb-health-group">
        <span className="runtime-overview-label">Lifecycle</span>
        {pill('active', `active ${active}`, 'status-good')}
        {pill('backlog', `backlog ${backlog}`, 'status-neutral')}
        {pill('closed', `closed ${closed}`, 'status-good')}
        {pill('archived', `archived ${archived}`, 'status-offline')}
        {dropped > 0 ? pill('dropped', `dropped ${dropped}`, 'status-warn') : null}
        {selected ? pill('selected', 'selected', 'status-live') : null}
      </div>
      <div className="kb-health-next">
        <span className="runtime-overview-label">Filter</span>
        <span className="kb-health-next-text">{filter === 'all' ? (selected ?? 'All intents visible') : `Showing ${filter} intents`}</span>
      </div>
    </div>
  )
}

function TaskRow({
  task,
  index,
  expanded,
  onToggle,
}: {
  task: IntentTask
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className={`intent-task-grid-row${expanded ? ' expanded' : ''}`}>
      <button className="intent-task-grid-button" type="button" onClick={onToggle}>
        <span>{task.title ?? `Task ${index + 1}`}</span>
        <span className={`status-pill ${statusTone(normalizeLifecycle(task.status))}`}>{task.status ?? 'unknown'}</span>
        <span>{task.source ?? 'No source'}</span>
      </button>
      {expanded ? (
        <div className="intent-task-grid-detail">
          <p>{task.source ?? 'Task detail source unavailable.'}</p>
          {task.explicitCommits?.length ? (
            <div>
              <strong>Explicit commits</strong>
              <div className="intent-staged-list">
                {task.explicitCommits.map((commit) => (
                  <code key={commit} className="intent-staged-chip">{commit}</code>
                ))}
              </div>
            </div>
          ) : null}
          {task.relatedCommits?.length ? (
            <div>
              <strong>Related commits</strong>
              <div className="intent-related-list">
                {task.relatedCommits.map((commit, commitIndex) => (
                  <div key={`${commit.sha ?? 'commit'}-${commitIndex}`} className="intent-related-item">
                    <code>{commit.sha ?? 'no-sha'}</code>
                    <span>{commit.subject ?? 'No subject'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function IntentsListPage() {
  const queryClient = useQueryClient()
  const intentsQuery = useIntentsList()
  const systemSnapshotQuery = useSystemSnapshot()
  const intents = intentsQuery.data?.parsed?.intents ?? []
  const snapshotMetadata = systemSnapshotQuery.data?.metadata
  const focusIntentId = snapshotMetadata?.focusIntentId ?? null
  const activeIntentId = snapshotMetadata?.activeIntentId ?? null
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(null)
  const [showAllMilestones, setShowAllMilestones] = useState(false)
  const [healthFilter, setHealthFilter] = useState<IntentHealthFilter>('all')
  const [intentSortKey, setIntentSortKey] = useState<IntentSortKey>('version')
  const [intentSortDirection, setIntentSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (!intents.length) {
      setSelectedIntentId(null)
      return
    }

    const preferredId = [selectedIntentId, focusIntentId, activeIntentId, intents[0]?.id].find((id) =>
      Boolean(id) && intents.some((intent) => intent.id === id),
    ) ?? intents[0]?.id ?? null

    if (preferredId !== selectedIntentId) {
      setSelectedIntentId(preferredId)
    }
  }, [activeIntentId, focusIntentId, intents, selectedIntentId])

  useEffect(() => {
    setExpandedTaskIndex(null)
  }, [selectedIntentId])

  const detailQuery = useIntentDetail(selectedIntentId)
  const detail = detailQuery.data?.detail ?? null

  const lifecycleCounts = useMemo(() => ({
    active: intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'active').length,
    backlog: intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'backlog').length,
    closed: intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'closed').length,
    archived: intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'archived').length,
    dropped: intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'dropped').length,
  }), [intents])

  const goalCards = useMemo(
    () => buildGoalCards(intents, focusIntentId, activeIntentId, snapshotMetadata),
    [activeIntentId, focusIntentId, intents, snapshotMetadata],
  )
  const milestones = useMemo(() => buildMilestones(intents), [intents])
  const visibleMilestones = showAllMilestones ? milestones : milestones.slice(0, 3)

  const filteredIntents = useMemo(() => {
    return intents.filter((intent) => {
      const lifecycle = normalizeLifecycle(intent.lifecycle)
      if (healthFilter === 'all') return true
      if (healthFilter === 'selected') return intent.id === selectedIntentId
      return lifecycle === healthFilter
    })
  }, [healthFilter, intents, selectedIntentId])

  const sortedIntents = useMemo(() => {
    const items = [...filteredIntents]
    items.sort((left, right) => {
      const leftRuntime = intentRuntimeLabel(left.id, focusIntentId, activeIntentId)
      const rightRuntime = intentRuntimeLabel(right.id, focusIntentId, activeIntentId)
      const leftValues: Record<IntentSortKey, string> = {
        title: String(left.title ?? left.id),
        version: intentVersionLabel(left.id),
        lifecycle: String(left.lifecycle ?? ''),
        mode: String(left.mode ?? ''),
        runtime: leftRuntime,
      }
      const rightValues: Record<IntentSortKey, string> = {
        title: String(right.title ?? right.id),
        version: intentVersionLabel(right.id),
        lifecycle: String(right.lifecycle ?? ''),
        mode: String(right.mode ?? ''),
        runtime: rightRuntime,
      }
      let comparison = 0
      if (intentSortKey === 'version') {
        comparison = versionRank(leftValues.version) - versionRank(rightValues.version)
      } else {
        comparison = leftValues[intentSortKey].localeCompare(rightValues[intentSortKey])
      }
      return comparison * (intentSortDirection === 'asc' ? 1 : -1)
    })
    return items
  }, [activeIntentId, filteredIntents, focusIntentId, intentSortDirection, intentSortKey])

  const refreshAll = async () => {
    await Promise.all([
      intentsQuery.refetch(),
      detailQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: systemSnapshotQueryKey }),
    ])
  }

  const openDrawerForIntent = (intentId: string) => {
    setSelectedIntentId(intentId)
    setDrawerOpen(true)
  }

  const toggleIntentSort = (nextKey: IntentSortKey) => {
    setIntentSortDirection((current) => (intentSortKey === nextKey ? (current === 'asc' ? 'desc' : 'asc') : nextKey === 'version' ? 'desc' : 'asc'))
    setIntentSortKey(nextKey)
  }

  const selectedIntent = intents.find((intent) => intent.id === selectedIntentId) ?? null
  const detailStatus = detail ? formatIntentStatus(detail) : 'Select an intent'
  const relationEntries = detail ? [
    { label: 'Intent file', value: detail.sourceFile ?? 'none' },
    { label: 'Workspace node', value: detail.workspacePath ?? 'none' },
    { label: 'Focus relation', value: detail.id === focusIntentId ? 'Current workspace focus' : 'Not current focus' },
    { label: 'Active relation', value: detail.id === activeIntentId ? 'Current active intent' : 'Not active runtime intent' },
  ] : []

  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">Intent Workspace</p>
          <h1>Intents</h1>
          <p className="intent-page-summary">
            Compact roadmap view on top, operator registry below, and intent detail kept in the drawer.
          </p>
        </div>
        <div className="toolbar-actions">
          <button className="tool-button" type="button" onClick={() => void refreshAll()}>
            Refresh List
          </button>
          <button className="tool-button tool-button-primary" type="button" disabled title="Draft/create stays deferred until bridge mutations are backed by real CLI contracts.">
            Create Draft Intent
          </button>
        </div>
      </header>

      <section className="intent-section-shell">
        <div className="intent-goal-grid compact">
          {goalCards.map((card) => (
            <GoalCardView key={card.id} card={card} />
          ))}
        </div>

        <section className="surface-panel surface-panel-primary intent-milestone-strip-shell">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Milestones</p>
              <h2>Version rail</h2>
            </div>
            <button className="tool-button" type="button" onClick={() => setShowAllMilestones((current) => !current)}>
              <Icon icon={showAllMilestones ? chevronUp : chevronDown} aria-hidden="true" />
              {showAllMilestones ? 'Collapse' : 'Expand'}
            </button>
          </div>
          <div className="intent-milestone-rail compact">
            {visibleMilestones.map((milestone) => (
              <article key={milestone.id} className={`intent-milestone-card intent-milestone-card-${milestoneVisualState(milestone.state)}`}>
                <div className="intent-milestone-head">
                  <div>
                    <p className="workspace-eyebrow">Milestone</p>
                    <h3>{milestone.label}</h3>
                  </div>
                  <span className={`status-pill ${statusTone(milestone.state)}`}>{milestone.state}</span>
                </div>
                <p className="intent-milestone-metrics">{milestone.metrics}</p>
                <div className="intent-progress-track" aria-hidden="true">
                  <span style={{ width: `${milestone.progress}%` }} />
                </div>
                <span className="intent-milestone-progress">{milestone.progress}% complete</span>
                <div className="intent-milestone-objectives">
                  {milestone.objectives.map((objective) => (
                    <div key={objective} className="intent-milestone-objective">{objective}</div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <IntentHealthBar
          total={intents.length}
          active={lifecycleCounts.active}
          backlog={lifecycleCounts.backlog}
          closed={lifecycleCounts.closed}
          archived={lifecycleCounts.archived}
          dropped={lifecycleCounts.dropped}
          selected={selectedIntentId}
          filter={healthFilter}
          onFilterChange={setHealthFilter}
        />

        {intentsQuery.isLoading ? (
          <div className="intent-empty-state">
            <h3>Loading intent inventory</h3>
            <p>Fetching live queue and milestone blocks from the bridge.</p>
          </div>
        ) : intentsQuery.isError ? (
          <div className="intent-empty-state intent-empty-state-danger">
            <h3>Intent inventory unavailable</h3>
            <p>{intentsQuery.error instanceof Error ? intentsQuery.error.message : 'Unknown intent list error.'}</p>
          </div>
        ) : !intents.length ? (
          <div className="intent-empty-state">
            <h3>No intents found</h3>
            <p>The workspace did not return any intent records yet.</p>
          </div>
        ) : (
          <div className="rules-table intent-registry-table" role="table" aria-label="Intent registry list">
            <div className="rules-table-header intent-registry-header" role="row">
              <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleIntentSort('title')}>Intent{sortIndicator('title', intentSortKey, intentSortDirection)}</button>
              <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleIntentSort('version')}>Version{sortIndicator('version', intentSortKey, intentSortDirection)}</button>
              <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleIntentSort('lifecycle')}>Lifecycle{sortIndicator('lifecycle', intentSortKey, intentSortDirection)}</button>
              <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleIntentSort('mode')}>Mode{sortIndicator('mode', intentSortKey, intentSortDirection)}</button>
              <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleIntentSort('runtime')}>Runtime{sortIndicator('runtime', intentSortKey, intentSortDirection)}</button>
              <span role="columnheader">Blockers</span>
            </div>
            {sortedIntents.map((intent) => {
              const lifecycle = normalizeLifecycle(intent.lifecycle)
              const isFocused = intent.id === focusIntentId
              const isActive = intent.id === activeIntentId
              return (
                <article
                  key={intent.id}
                  className={`rules-table-row intent-registry-row${selectedIntentId === intent.id ? ' selected' : ''}`}
                  role="row"
                  onClick={() => openDrawerForIntent(intent.id)}
                >
                  <div role="cell" className="intent-registry-title-cell">
                    <strong>{intent.title?.replace(/^"|"$/g, '') || intent.id}</strong>
                    <p className="intent-id">{intent.id}</p>
                  </div>
                  <div role="cell">
                    <span className="meta-pill">{intentVersionLabel(intent.id)}</span>
                  </div>
                  <div role="cell">
                    <span className={`status-pill ${statusTone(lifecycle)}`}>{intent.lifecycle ?? 'unknown'}</span>
                  </div>
                  <div role="cell">
                    <span className="meta-pill">{intent.mode ?? 'normal'}</span>
                  </div>
                  <div role="cell" className="intent-runtime-cell">
                    {isFocused ? <span className="meta-pill meta-pill-focus">Focus</span> : null}
                    {isActive ? <span className="meta-pill">Active</span> : null}
                    {!isFocused && !isActive ? <span className="meta-pill">Queued</span> : null}
                  </div>
                  <div role="cell">
                    <p className="intent-registry-blockers">{intent.blocks ?? 'none'}</p>
                  </div>
                </article>
              )
            })}
            {!sortedIntents.length ? (
              <article className="rules-table-empty" role="row">
                <h3>No intents match this filter</h3>
                <p>Try another lifecycle pill in the intent health bar.</p>
              </article>
            ) : null}
          </div>
        )}
      </section>

      {drawerOpen && selectedIntentId ? (
        <div className="prototype-overlay-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside className="prototype-drawer intent-detail-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="panel-toolbar">
              <div>
                <p className="workspace-eyebrow">Intent Detail</p>
                <h2>{selectedIntent?.title?.replace(/^"|"$/g, '') || selectedIntentId}</h2>
              </div>
              <button className="icon-tool-button" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close intent drawer">
                <Icon icon={xIcon} />
              </button>
            </div>

            {!selectedIntentId ? null : detailQuery.isLoading ? (
              <div className="intent-empty-state">
                <h3>Loading detail</h3>
                <p>Hydrating the selected intent from the bridge detail route.</p>
              </div>
            ) : detailQuery.isError || !detail ? (
              <div className="intent-empty-state intent-empty-state-danger">
                <h3>Detail unavailable</h3>
                <p>{detailQuery.error instanceof Error ? detailQuery.error.message : 'Bridge detail route did not return a usable payload.'}</p>
              </div>
            ) : (
              <div className="intent-drawer-stack">
                <article className="intent-drawer-block">
                  <div className="section-title-row">
                    <span className="section-icon section-icon-intent" aria-hidden="true">
                      <Icon icon={flag} />
                    </span>
                    <div>
                      <h3>Summary & Lifecycle</h3>
                      <p className="intent-id">{detail.id ?? selectedIntentId}</p>
                    </div>
                  </div>
                  <div className="intent-hero-badges">
                    <span className={`status-pill ${statusTone(normalizeLifecycle(detail.lifecycle))}`}>{detail.lifecycle ?? 'unknown'}</span>
                    <span className="meta-pill">{detailStatus}</span>
                    <span className="meta-pill">{detail.mode ?? 'normal'}</span>
                    <span className="meta-pill">{detail.changeType ?? 'unspecified'}</span>
                  </div>
                  <p className="intent-detail-summary">
                    {detail.summary ?? detail.goal ?? 'No narrative summary has been extracted from intent.md yet.'}
                  </p>
                  <div className="intent-progress-track" aria-hidden="true">
                    <span style={{ width: `${detail.lifecycle === 'active' ? 56 : detail.lifecycle === 'backlog' ? 22 : 100}%` }} />
                  </div>
                </article>

                <article className="intent-drawer-block">
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={flagTriangleRight} />
                    </span>
                    <h3>Detail</h3>
                  </div>
                  <div className="intent-drawer-detail-grid">
                    <div className="system-info-card">
                      <strong className="system-info-title">{detail.focusCurrent ?? 'No current focus recorded'}</strong>
                      <p>Next action: {detail.focusNextAction ?? 'pending'}</p>
                      <p className="system-card-subtle">Updated: {formatTimestamp(detail.focusUpdatedAt)}</p>
                    </div>
                    <div className="system-info-card">
                      <strong className="system-info-title">
                        {detail.chaosEstimate?.projectedScore ?? detail.chaosEstimate?.currentScore ?? 'n/a'}
                      </strong>
                      <p>{detail.chaosEstimate?.projectedLevel ?? detail.chaosEstimate?.currentLevel ?? 'No live chaos estimate attached.'}</p>
                      {detail.chaosEstimate?.warning ? <p className="runtime-warning-text">{detail.chaosEstimate.warning}</p> : null}
                    </div>
                  </div>
                  <p className="rules-cell-copy">{detail.decisionSummary ?? 'No decision summary captured yet.'}</p>
                </article>

                <article className="intent-drawer-block">
                  <div className="section-title-row">
                    <span className="section-icon section-icon-kb" aria-hidden="true">
                      <Icon icon={network} />
                    </span>
                    <h3>Metadata & Relations</h3>
                  </div>
                  <div className="intent-relations-grid">
                    {relationEntries.map((entry) => (
                      <div key={entry.label} className="intent-relation-card">
                        <span className="runtime-overview-label">{entry.label}</span>
                        <strong>{entry.value}</strong>
                      </div>
                    ))}
                    <div className="intent-relation-card">
                      <span className="runtime-overview-label">Staged modules</span>
                      <strong>{detail.stagedFiles.length}</strong>
                    </div>
                    <div className="intent-relation-card">
                      <span className="runtime-overview-label">Task nodes</span>
                      <strong>{detail.tasks.length}</strong>
                    </div>
                  </div>
                  {detail.stagedFiles.length ? (
                    <div className="intent-staged-list">
                      {detail.stagedFiles.map((file) => (
                        <code key={file} className="intent-staged-chip">{file}</code>
                      ))}
                    </div>
                  ) : null}
                </article>

                <article className="intent-drawer-block">
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={listTodo} />
                    </span>
                    <div>
                      <h3>Tasks Grid</h3>
                      <p className="system-card-subtle">Click a task row to expand row detail inline.</p>
                    </div>
                  </div>
                  {detail.tasks.length ? (
                    <div className="intent-task-grid">
                      <div className="intent-task-grid-header">
                        <span>Task</span>
                        <span>Status</span>
                        <span>Source</span>
                      </div>
                      {detail.tasks.map((task, index) => (
                        <TaskRow
                          key={`${task.title ?? 'task'}-${index}`}
                          task={task}
                          index={index}
                          expanded={expandedTaskIndex === index}
                          onToggle={() => setExpandedTaskIndex((current) => current === index ? null : index)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rules-cell-copy">No task lines were extracted from `intent.md` or `plan.md` for this intent.</p>
                  )}
                </article>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  )
}
