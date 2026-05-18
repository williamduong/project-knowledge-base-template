import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@iconify/react'
import flag from '@iconify-icons/lucide/flag'
import flagTriangleRight from '@iconify-icons/lucide/flag-triangle-right'
import listTodo from '@iconify-icons/lucide/list-todo'
import network from '@iconify-icons/lucide/network'
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
}

type MilestoneBlock = {
  id: string
  label: string
  progress: number
  state: string
  metrics: string
  objectives: string[]
  intents: IntentListItem[]
}

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

function summarizeMilestoneState(intents: IntentListItem[]) {
  const total = intents.length || 1
  const active = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'active').length
  const backlog = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'backlog').length
  const closed = intents.filter((intent) => ['closed', 'archived'].includes(normalizeLifecycle(intent.lifecycle))).length
  const progress = clampProgress((closed / total) * 100)

  if (active > 0) return { state: 'active', progress }
  if (backlog > 0) return { state: 'backlog', progress }
  return { state: 'closed', progress: closed === total ? 100 : progress }
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
    },
    {
      id: 'focus-alignment',
      label: 'Focus Alignment',
      metric: focusIntentId ?? 'missing focus',
      state: focusAligned ? 'aligned' : 'drift',
      progress: focusAligned ? 100 : 38,
      caption: activeIntentId ? `Current active record: ${activeIntentId}.` : 'No active intent surfaced by snapshot.',
    },
    {
      id: 'completion-flow',
      label: 'Completion Flow',
      metric: `${completed}/${intents.length} done`,
      state: completed > 0 ? 'moving' : 'starting',
      progress: clampProgress((completed / total) * 100),
      caption: 'Counts archive and closed intents as delivered milestones.',
    },
    {
      id: 'snapshot-readiness',
      label: 'Snapshot Readiness',
      metric: snapshotLive ? 'live contract' : 'pending',
      state: snapshotMetadata?.reloadRecommended ? 'reload' : 'fresh',
      progress: snapshotMetadata?.reloadRecommended ? 62 : 100,
      caption: snapshotMetadata?.reloadRecommended ? 'Bridge says UI should reload signals.' : 'Bridge snapshot is healthy enough for live intent browsing.',
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
        .slice(0, 4)
        .map((intent) => intent.title?.replace(/^"|"$/g, '') || intent.id)

      return {
        id,
        label: id === 'legacy' ? 'Legacy' : id.toUpperCase(),
        progress,
        state,
        metrics: `${bucketIntents.length} intents · ${active} active · ${backlog} backlog`,
        objectives,
        intents: bucketIntents,
      } satisfies MilestoneBlock
    })
    .sort((a, b) => a.id.localeCompare(b.id))
}

function statusTone(value: string) {
  if (value === 'active' || value === 'aligned' || value === 'fresh') return 'status-good'
  if (value === 'backlog' || value === 'moving' || value === 'in-flight') return 'status-neutral'
  if (value === 'closed') return 'status-good'
  if (value === 'archived') return 'status-offline'
  if (value === 'dropped' || value === 'reload' || value === 'drift') return 'status-warn'
  return 'status-neutral'
}

function GoalCardView({ card }: { card: GoalCard }) {
  return (
    <article className="intent-goal-card">
      <div className="intent-goal-head">
        <div>
          <p className="workspace-eyebrow">{card.label}</p>
          <strong>{card.metric}</strong>
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
}: {
  total: number
  active: number
  backlog: number
  closed: number
  archived: number
  dropped: number
  selected: string | null
}) {
  return (
    <div className="kb-health-bar intent-health-bar">
      <div className="kb-health-group">
        <span className="runtime-overview-label">Total</span>
        <span className="count-pill kb-health-total">{total} intents</span>
      </div>
      <div className="kb-health-group">
        <span className="runtime-overview-label">Lifecycle</span>
        <span className="status-pill status-good">active {active}</span>
        <span className="status-pill status-neutral">backlog {backlog}</span>
        <span className="status-pill status-good">closed {closed}</span>
        <span className="status-pill status-offline">archived {archived}</span>
        {dropped > 0 ? <span className="status-pill status-warn">dropped {dropped}</span> : null}
      </div>
      <div className="kb-health-next">
        <span className="runtime-overview-label">Selection</span>
        <span className="kb-health-next-text">{selected ?? 'Choose an intent to inspect detail drawer'}</span>
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
            Goals, milestone progress, live intent health, and a drawer-based operator detail surface now share the same bridge-backed inventory.
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
        <div className="intent-goal-grid">
          {goalCards.map((card) => (
            <GoalCardView key={card.id} card={card} />
          ))}
        </div>

        <div className="intent-milestone-rail">
          {milestones.map((milestone) => (
            <article key={milestone.id} className="intent-milestone-card">
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

        <IntentHealthBar
          total={intents.length}
          active={lifecycleCounts.active}
          backlog={lifecycleCounts.backlog}
          closed={lifecycleCounts.closed}
          archived={lifecycleCounts.archived}
          dropped={lifecycleCounts.dropped}
          selected={selectedIntentId}
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
          <div className="intent-record-grid">
            {intents.map((intent) => {
              const lifecycle = normalizeLifecycle(intent.lifecycle)
              const isFocused = intent.id === focusIntentId
              const isActive = intent.id === activeIntentId
              return (
                <button
                  key={intent.id}
                  className={`intent-record-card${selectedIntentId === intent.id ? ' selected' : ''}`}
                  type="button"
                  onClick={() => openDrawerForIntent(intent.id)}
                >
                  <div className="intent-record-head">
                    <div>
                      <h3>{intent.title?.replace(/^"|"$/g, '') || intent.id}</h3>
                      <p className="intent-id">{intent.id}</p>
                    </div>
                    <span className={`status-pill ${statusTone(lifecycle)}`}>{intent.lifecycle ?? 'unknown'}</span>
                  </div>
                  <div className="intent-record-pills">
                    {isFocused ? <span className="meta-pill meta-pill-focus">Focus</span> : null}
                    {isActive ? <span className="meta-pill">Active runtime</span> : null}
                    <span className="meta-pill">{intent.mode ?? 'normal'}</span>
                    <span className="meta-pill">{intent.strategic_mode ?? 'no strategic mode'}</span>
                  </div>
                  <div className="intent-record-meta">
                    <div>
                      <span className="runtime-overview-label">Priority</span>
                      <strong>{intent.priority ?? 'n/a'}</strong>
                    </div>
                    <div>
                      <span className="runtime-overview-label">Blockers</span>
                      <strong>{intent.blocks ?? 'none'}</strong>
                    </div>
                  </div>
                </button>
              )
            })}
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
