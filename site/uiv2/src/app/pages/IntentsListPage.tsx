import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import pencilLine from '@iconify-icons/lucide/pencil-line'
import { useIntentsList, type IntentListItem } from '../hooks/useIntentsList'
import { useIntentDetail, type IntentTask } from '../hooks/useIntentDetail'
import { useSystemSnapshot, systemSnapshotQueryKey } from '../hooks/useSystemSnapshot'
import { apiPatch } from '../../shared/api/client'

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
  state: 'draft' | 'backlog' | 'active' | 'closed'
  metrics: string
  objectives: string[]
}

type IntentHealthFilter = 'all' | 'active' | 'backlog' | 'closed' | 'archived' | 'dropped' | 'selected'
type IntentSortKey = 'title' | 'milestone' | 'lifecycle' | 'progress' | 'runtime'
type DetailSectionKey = 'summary' | 'detail' | 'relations' | 'tasks'
type EditableField = 'title' | 'summaryText' | 'focusCurrent' | 'focusNextAction' | 'closeCondition'

type IntentPatchResponse = {
  ok: boolean
  result?: {
    id?: string
    updated_fields?: string[]
    status?: string
  }
}

function normalizeLifecycle(value: string | null | undefined) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return 'unknown'
  if (text === 'active') return 'active'
  if (text === 'backlog') return 'backlog'
  if (text === 'closed' || text === 'released') return 'closed'
  if (text === 'dropped' || text === 'cancelled' || text === 'canceled') return 'dropped'
  if (text === 'archive' || text === 'archived') return 'archived'
  if (text === 'draft') return 'draft'
  if (text === 'open') return 'backlog'
  return text.replace(/\s+/g, '-')
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

function computeIntentProgress(lifecycle: string | null | undefined) {
  const normalized = normalizeLifecycle(lifecycle)
  if (normalized === 'draft') return 10
  if (normalized === 'backlog') return 25
  if (normalized === 'active') return 60
  if (normalized === 'closed' || normalized === 'archived') return 100
  if (normalized === 'dropped') return 0
  return 15
}

function lifecycleRailState(value: string | null | undefined): 'draft' | 'backlog' | 'active' | 'closed' {
  const normalized = normalizeLifecycle(value)
  if (normalized === 'active') return 'active'
  if (normalized === 'closed' || normalized === 'archived') return 'closed'
  if (normalized === 'draft') return 'draft'
  return 'backlog'
}

function summarizeMilestoneState(intents: IntentListItem[]) {
  const total = intents.length || 1
  const active = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'active').length
  const draft = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'draft').length
  const backlog = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'backlog').length
  const closed = intents.filter((intent) => ['closed', 'archived'].includes(normalizeLifecycle(intent.lifecycle))).length
  const progress = clampProgress((closed / total) * 100)

  if (active > 0) return { state: 'active' as const, progress }
  if (backlog > 0) return { state: 'backlog' as const, progress }
  if (draft > 0) return { state: 'draft' as const, progress }
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
  if (value === 'backlog' || value === 'moving' || value === 'in-flight' || value === 'draft') return 'status-neutral'
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

function LifecycleRail({ lifecycle }: { lifecycle: string | null | undefined }) {
  const current = lifecycleRailState(lifecycle)
  const steps: Array<'draft' | 'backlog' | 'active' | 'closed'> = ['draft', 'backlog', 'active', 'closed']
  const currentIndex = steps.indexOf(current)

  return (
    <div className="intent-lifecycle-rail" role="list" aria-label="Intent lifecycle">
      {steps.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'upcoming'
        return (
          <div key={step} className={`intent-lifecycle-step intent-lifecycle-step-${state}`} role="listitem">
            <span className="intent-lifecycle-dot" aria-hidden="true" />
            <strong>{step}</strong>
          </div>
        )
      })}
    </div>
  )
}

function CollapsibleBlock({
  title,
  icon,
  sectionKey,
  collapsed,
  onToggle,
  subtitle,
  children,
}: {
  title: string
  icon: typeof flag
  sectionKey: DetailSectionKey
  collapsed: boolean
  onToggle: (key: DetailSectionKey) => void
  subtitle?: string
  children: ReactNode
}) {
  return (
    <article className="intent-drawer-block">
      <button className="intent-section-toggle" type="button" onClick={() => onToggle(sectionKey)}>
        <span className="section-title-row">
          <span className="section-icon section-icon-intent" aria-hidden="true">
            <Icon icon={icon} />
          </span>
          <span>
            <h3>{title}</h3>
            {subtitle ? <p className="system-card-subtle">{subtitle}</p> : null}
          </span>
        </span>
        <Icon icon={collapsed ? chevronDown : chevronUp} aria-hidden="true" />
      </button>
      {!collapsed ? children : null}
    </article>
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
        <span>{task.section ?? 'General'}</span>
        <span className={`status-pill ${statusTone(normalizeLifecycle(task.status))}`}>{task.status ?? 'unknown'}</span>
        <span>{task.tags?.length ? task.tags.join(', ') : task.source ?? 'No source'}</span>
      </button>
      {expanded ? (
        <div className="intent-task-grid-detail">
          <p>{task.description ?? task.text ?? task.source ?? 'Task detail source unavailable.'}</p>
          <div className="intent-task-detail-meta">
            <span className="intent-path-chip">section: {task.section ?? 'General'}</span>
            <span className="intent-path-chip">source: {task.source ?? 'unknown'}</span>
            <span className="intent-path-chip">state: {task.done ? 'done' : task.status ?? 'open'}</span>
          </div>
          {task.tags?.length ? (
            <div className="intent-staged-list">
              {task.tags.map((tag) => (
                <span key={`${task.title ?? 'task'}-${tag}`} className="intent-task-tag">{tag}</span>
              ))}
            </div>
          ) : null}
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

function InlineEditableText({
  label,
  value,
  field,
  activeField,
  draftValue,
  onStartEdit,
  onChangeDraft,
  onCancel,
  onSave,
  saving,
  error,
  multiline = false,
}: {
  label: string
  value: string
  field: EditableField
  activeField: EditableField | null
  draftValue: string
  onStartEdit: (field: EditableField, currentValue: string) => void
  onChangeDraft: (value: string) => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
  error: string | null
  multiline?: boolean
}) {
  const isEditing = activeField === field
  return (
    <div className="intent-editable-field">
      <span className="runtime-overview-label">{label}</span>
      {isEditing ? (
        <div className="intent-inline-editor">
          {multiline ? (
            <textarea value={draftValue} onChange={(event) => onChangeDraft(event.target.value)} rows={4} />
          ) : (
            <input value={draftValue} onChange={(event) => onChangeDraft(event.target.value)} />
          )}
          <div className="intent-inline-editor-actions">
            <button className="tool-button tool-button-primary" type="button" onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="tool-button" type="button" onClick={onCancel}>Cancel</button>
          </div>
          {error ? <p className="runtime-warning-text">{error}</p> : null}
        </div>
      ) : (
        <button className="intent-editable-display" type="button" onDoubleClick={() => onStartEdit(field, value)}>
          <span>{value || 'Double-click to edit'}</span>
          <Icon icon={pencilLine} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export function IntentsListPage() {
  const queryClient = useQueryClient()
  const intentsQuery = useIntentsList()
  const systemSnapshotQuery = useSystemSnapshot()
  const intents = intentsQuery.data?.parsed?.intents ?? []
  const snapshot = systemSnapshotQuery.data
  const snapshotMetadata = snapshot?.metadata
  const focusIntentId = snapshotMetadata?.focusIntentId ?? null
  const activeIntentId = snapshotMetadata?.activeIntentId ?? null
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(null)
  const [showAllMilestones, setShowAllMilestones] = useState(false)
  const [healthFilter, setHealthFilter] = useState<IntentHealthFilter>('all')
  const [intentSortKey, setIntentSortKey] = useState<IntentSortKey>('milestone')
  const [intentSortDirection, setIntentSortDirection] = useState<'asc' | 'desc'>('desc')
  const [collapsedSections, setCollapsedSections] = useState<Record<DetailSectionKey, boolean>>({
    summary: false,
    detail: false,
    relations: false,
    tasks: false,
  })
  const [activeEditor, setActiveEditor] = useState<EditableField | null>(null)
  const [editorDraft, setEditorDraft] = useState('')
  const [editorError, setEditorError] = useState<string | null>(null)

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
    setActiveEditor(null)
    setEditorError(null)
  }, [selectedIntentId])

  useEffect(() => {
    if (!drawerOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [drawerOpen])

  const detailQuery = useIntentDetail(selectedIntentId)
  const detail = detailQuery.data?.detail ?? null

  const intentUpdateMutation = useMutation({
    mutationFn: async (payload: { id: string; body: Record<string, string> }) => {
      return apiPatch<IntentPatchResponse>(`/api/intents/${encodeURIComponent(payload.id)}`, payload.body)
    },
    onSuccess: async () => {
      setActiveEditor(null)
      setEditorError(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['intent-detail', selectedIntentId] }),
        queryClient.invalidateQueries({ queryKey: ['intents-list'] }),
        queryClient.invalidateQueries({ queryKey: systemSnapshotQueryKey }),
      ])
    },
    onError: (error) => {
      setEditorError(error instanceof Error ? error.message : 'Intent update failed.')
    },
  })

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
      const leftProgress = computeIntentProgress(left.lifecycle)
      const rightProgress = computeIntentProgress(right.lifecycle)
      const leftValues: Record<IntentSortKey, string | number> = {
        title: String(left.title ?? left.id),
        milestone: versionRank(deriveVersionBucket(left.id)),
        lifecycle: String(left.lifecycle ?? ''),
        progress: leftProgress,
        runtime: leftRuntime,
      }
      const rightValues: Record<IntentSortKey, string | number> = {
        title: String(right.title ?? right.id),
        milestone: versionRank(deriveVersionBucket(right.id)),
        lifecycle: String(right.lifecycle ?? ''),
        progress: rightProgress,
        runtime: rightRuntime,
      }
      let comparison = 0
      if (typeof leftValues[intentSortKey] === 'number' && typeof rightValues[intentSortKey] === 'number') {
        comparison = Number(leftValues[intentSortKey]) - Number(rightValues[intentSortKey])
      } else {
        comparison = String(leftValues[intentSortKey]).localeCompare(String(rightValues[intentSortKey]))
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
    setIntentSortDirection((current) => (intentSortKey === nextKey ? (current === 'asc' ? 'desc' : 'asc') : nextKey === 'milestone' || nextKey === 'progress' ? 'desc' : 'asc'))
    setIntentSortKey(nextKey)
  }

  const toggleSection = (key: DetailSectionKey) => {
    setCollapsedSections((current) => ({ ...current, [key]: !current[key] }))
  }

  const startEdit = (field: EditableField, currentValue: string) => {
    setActiveEditor(field)
    setEditorDraft(currentValue)
    setEditorError(null)
  }

  const cancelEdit = () => {
    setActiveEditor(null)
    setEditorDraft('')
    setEditorError(null)
  }

  const saveEdit = async (field: EditableField) => {
    if (!selectedIntentId) return
    const bodyMap: Record<EditableField, Record<string, string>> = {
      title: { title: editorDraft.trim() },
      summaryText: { decision_summary: editorDraft.trim() },
      focusCurrent: { focus: editorDraft.trim() },
      focusNextAction: { next_action: editorDraft.trim() },
      closeCondition: { close_condition: editorDraft.trim() },
    }
    await intentUpdateMutation.mutateAsync({ id: selectedIntentId, body: bodyMap[field] })
  }

  const selectedIntent = intents.find((intent) => intent.id === selectedIntentId) ?? null
  const rulesSummary = (snapshot?.rulesSummary as { summary?: { count?: number; packCount?: number; topRules?: Array<{ id: string }> } } | undefined)?.summary
  const runtimeSummary = (snapshot?.runtimeServices as { summary?: { runningCount?: number }; schedules?: Array<{ id: string }> } | undefined)
  const gatesSummary = (snapshot?.gates as { items?: Array<{ gate: string }>; readiness?: string } | undefined)
  const detailDescription = detail ? (detail.decisionSummary ?? detail.summary ?? detail.goal ?? '') : ''
  const detailProgress = detail ? computeIntentProgress(detail.lifecycle) : 0
  const relationSections = detail ? [
    {
      title: 'Intent Topology',
      rows: [
        { type: 'Goal', object: detail.goal ?? 'No explicit goal extracted yet', state: detail.goal ? 'declared' : 'missing', evidence: detail.sourceFile ?? 'intent.md' },
        { type: 'Milestone / Version', object: intentVersionLabel(detail.id ?? selectedIntentId ?? ''), state: normalizeLifecycle(detail.lifecycle), evidence: detail.id ?? selectedIntentId ?? 'unknown' },
        { type: 'Document (KB)', object: detail.sourceFile ?? 'none', state: detail.sourceFile ? 'linked' : 'missing', evidence: `${detail.stagedFiles.length} staged files` },
      ],
    },
    {
      title: 'Governance & Flow',
      rows: [
        { type: 'Pipeline', object: 'release pipeline', state: `${((snapshot?.homeSummary as { summary?: { pipeline?: { stepCount?: number } } } | undefined)?.summary?.pipeline?.stepCount ?? 0)} steps`, evidence: 'workspace snapshot' },
        { type: 'Rules', object: `${rulesSummary?.count ?? 0} rules`, state: `${rulesSummary?.packCount ?? 0} packs`, evidence: rulesSummary?.topRules?.[0]?.id ?? 'registry summary' },
        { type: 'Gates', object: `${gatesSummary?.items?.length ?? 0} operator gates`, state: gatesSummary?.readiness ?? 'unknown', evidence: 'system snapshot' },
      ],
    },
    {
      title: 'Runtime & Storage',
      rows: [
        { type: 'Services', object: `${runtimeSummary?.summary?.runningCount ?? 0} runtime services`, state: 'managed', evidence: 'runtime-services summary' },
        { type: 'Cron', object: `${runtimeSummary?.schedules?.length ?? 0} schedules`, state: 'registered', evidence: 'runtime-services summary' },
        { type: 'Database', object: 'focus-state.db', state: 'sqlite-backed', evidence: 'focus-state resolver' },
        { type: 'Chaos', object: String(detail.chaosEstimate?.projectedScore ?? detail.chaosEstimate?.currentScore ?? 'n/a'), state: detail.chaosEstimate?.projectedLevel ?? detail.chaosEstimate?.currentLevel ?? 'unknown', evidence: detail.chaosEstimate?.warning ?? 'intent metadata' },
      ],
    },
    {
      title: 'Agent & Prompt Surfaces',
      rows: [
        { type: 'Agent', object: 'SVFactory maintainer surface', state: 'self-host', evidence: '.github/agents/SVFactory.agent.md' },
        { type: 'Prompt', object: '.github/agents + svfactory prompts', state: 'active', evidence: 'workspace contract' },
        { type: 'Workspace Path', object: detail.workspacePath ?? 'none', state: detail.workspacePath ? 'linked' : 'missing', evidence: 'intent workspace' },
      ],
    },
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
              <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleIntentSort('milestone')}>Milestone{sortIndicator('milestone', intentSortKey, intentSortDirection)}</button>
              <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleIntentSort('lifecycle')}>Lifecycle{sortIndicator('lifecycle', intentSortKey, intentSortDirection)}</button>
              <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleIntentSort('progress')}>Progress{sortIndicator('progress', intentSortKey, intentSortDirection)}</button>
              <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleIntentSort('runtime')}>Runtime{sortIndicator('runtime', intentSortKey, intentSortDirection)}</button>
              <span role="columnheader">Blockers</span>
            </div>
            {sortedIntents.map((intent) => {
              const lifecycle = normalizeLifecycle(intent.lifecycle)
              const isFocused = intent.id === focusIntentId
              const isActive = intent.id === activeIntentId
              const progress = computeIntentProgress(intent.lifecycle)
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
                    <div className="intent-grid-progress">
                      <div className="intent-progress-track" aria-hidden="true">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <strong>{progress}%</strong>
                    </div>
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
                <CollapsibleBlock
                  title="Summary & Lifecycle"
                  icon={flag}
                  sectionKey="summary"
                  collapsed={collapsedSections.summary}
                  onToggle={toggleSection}
                  subtitle="Title and description are editable here."
                >
                  <p className="intent-id">{detail.id ?? selectedIntentId}</p>
                  <InlineEditableText
                    label="Title"
                    value={detail.title ?? ''}
                    field="title"
                    activeField={activeEditor}
                    draftValue={editorDraft}
                    onStartEdit={startEdit}
                    onChangeDraft={setEditorDraft}
                    onCancel={cancelEdit}
                    onSave={() => void saveEdit('title')}
                    saving={intentUpdateMutation.isPending}
                    error={editorError}
                  />
                  <InlineEditableText
                    label="Description"
                    value={detailDescription}
                    field="summaryText"
                    activeField={activeEditor}
                    draftValue={editorDraft}
                    onStartEdit={startEdit}
                    onChangeDraft={setEditorDraft}
                    onCancel={cancelEdit}
                    onSave={() => void saveEdit('summaryText')}
                    saving={intentUpdateMutation.isPending}
                    error={editorError}
                    multiline
                  />
                  <div className="intent-summary-metrics">
                    <div className="system-info-card">
                      <span className="runtime-overview-label">Lifecycle</span>
                      <strong className="system-info-title">{detail.lifecycle ?? detail.status ?? 'unknown'}</strong>
                    </div>
                    <div className="system-info-card">
                      <span className="runtime-overview-label">Intent progress</span>
                      <div className="intent-grid-progress">
                        <div className="intent-progress-track" aria-hidden="true">
                          <span style={{ width: `${detailProgress}%` }} />
                        </div>
                        <strong>{detailProgress}%</strong>
                      </div>
                    </div>
                  </div>
                  <LifecycleRail lifecycle={detail.lifecycle ?? detail.status} />
                </CollapsibleBlock>

                <CollapsibleBlock
                  title="Detail"
                  icon={flagTriangleRight}
                  sectionKey="detail"
                  collapsed={collapsedSections.detail}
                  onToggle={toggleSection}
                  subtitle="Operational fields only. No duplicated summary content."
                >
                  <div className="intent-drawer-detail-grid">
                    <div className="system-info-card">
                      <InlineEditableText
                        label="Current focus area"
                        value={detail.focusCurrent ?? ''}
                        field="focusCurrent"
                        activeField={activeEditor}
                        draftValue={editorDraft}
                        onStartEdit={startEdit}
                        onChangeDraft={setEditorDraft}
                        onCancel={cancelEdit}
                        onSave={() => void saveEdit('focusCurrent')}
                        saving={intentUpdateMutation.isPending}
                        error={editorError}
                        multiline
                      />
                      <p className="system-card-subtle">Updated: {formatTimestamp(detail.focusUpdatedAt)}</p>
                    </div>
                    <div className="system-info-card">
                      <InlineEditableText
                        label="Next action"
                        value={detail.focusNextAction ?? ''}
                        field="focusNextAction"
                        activeField={activeEditor}
                        draftValue={editorDraft}
                        onStartEdit={startEdit}
                        onChangeDraft={setEditorDraft}
                        onCancel={cancelEdit}
                        onSave={() => void saveEdit('focusNextAction')}
                        saving={intentUpdateMutation.isPending}
                        error={editorError}
                        multiline
                      />
                    </div>
                    <div className="system-info-card">
                      <InlineEditableText
                        label="Close condition"
                        value={detail.closeCondition ?? ''}
                        field="closeCondition"
                        activeField={activeEditor}
                        draftValue={editorDraft}
                        onStartEdit={startEdit}
                        onChangeDraft={setEditorDraft}
                        onCancel={cancelEdit}
                        onSave={() => void saveEdit('closeCondition')}
                        saving={intentUpdateMutation.isPending}
                        error={editorError}
                        multiline
                      />
                    </div>
                  </div>
                </CollapsibleBlock>

                <CollapsibleBlock
                  title="Metadata & Relations"
                  icon={network}
                  sectionKey="relations"
                  collapsed={collapsedSections.relations}
                  onToggle={toggleSection}
                  subtitle="Grouped matrix of related objects, runtime surfaces, and evidence."
                >
                  <div className="intent-relations-matrix">
                    {relationSections.map((section) => (
                      <article key={section.title} className="intent-relation-group">
                        <div className="intent-relation-group-head">
                          <span className="section-icon section-icon-kb" aria-hidden="true">
                            <Icon icon={network} />
                          </span>
                          <div>
                            <h4>{section.title}</h4>
                            <p className="system-card-subtle">Type, object, state, and evidence.</p>
                          </div>
                        </div>
                        <div className="intent-relation-table" role="table" aria-label={section.title}>
                          <div className="intent-relation-table-header" role="row">
                            <span role="columnheader">Type</span>
                            <span role="columnheader">Object</span>
                            <span role="columnheader">State</span>
                            <span role="columnheader">Evidence</span>
                          </div>
                          {section.rows.map((row) => (
                            <div key={`${section.title}-${row.type}`} className="intent-relation-table-row" role="row">
                              <span role="cell" className="intent-relation-type">{row.type}</span>
                              <span role="cell">{row.object}</span>
                              <span role="cell"><span className={`status-pill ${statusTone(normalizeLifecycle(row.state))}`}>{row.state}</span></span>
                              <span role="cell" className="intent-relation-evidence">{row.evidence}</span>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                  {detail.stagedFiles.length ? (
                    <div className="intent-staged-list">
                      {detail.stagedFiles.map((file) => (
                        <code key={file} className="intent-staged-chip">{file}</code>
                      ))}
                    </div>
                  ) : null}
                </CollapsibleBlock>

                <CollapsibleBlock
                  title="Tasks Grid"
                  icon={listTodo}
                  sectionKey="tasks"
                  collapsed={collapsedSections.tasks}
                  onToggle={toggleSection}
                  subtitle="Click a task row to expand row detail inline."
                >
                  {detail.tasks.length ? (
                    <div className="intent-task-grid">
                      <div className="intent-task-grid-header">
                        <span>Task</span>
                        <span>Section</span>
                        <span>Status</span>
                        <span>Signals</span>
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
                </CollapsibleBlock>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  )
}
