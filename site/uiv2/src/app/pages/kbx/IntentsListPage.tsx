import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@iconify/react'
import flag from '@iconify-icons/lucide/flag'
import flagTriangleRight from '@iconify-icons/lucide/flag-triangle-right'
import listTodo from '@iconify-icons/lucide/list-todo'
import network from '@iconify-icons/lucide/network'
import goal from '@iconify-icons/lucide/goal'
import target from '@iconify-icons/lucide/target'
import activity from '@iconify-icons/lucide/activity'
import archive from '@iconify-icons/lucide/archive'
import chevronDown from '@iconify-icons/lucide/chevron-down'
import chevronLeft from '@iconify-icons/lucide/chevron-left'
import chevronRight from '@iconify-icons/lucide/chevron-right'
import chevronUp from '@iconify-icons/lucide/chevron-up'
import xIcon from '@iconify-icons/lucide/x'
import pencilLine from '@iconify-icons/lucide/pencil-line'
import circleDashed from '@iconify-icons/lucide/circle-dashed'
import listTree from '@iconify-icons/lucide/list-tree'
import plus from '@iconify-icons/lucide/plus'
import trash2 from '@iconify-icons/lucide/trash-2'
import { useIntentsList, type IntentListItem } from '../../hooks/kbx/useIntentsList'
import { useIntentDetail, type IntentTask } from '../../hooks/kbx/useIntentDetail'
import { useSystemSnapshot, systemSnapshotQueryKey } from '../../hooks/svfactory/useSystemSnapshot'
import {
  goalsTreeQueryKey,
  useGoalsTree,
  useCreateGoalMutation,
  useDeleteGoalMutation,
  useUpdateGoalMutation,
  type GoalRecord,
  type GoalTreeNode,
} from '../../hooks/kbx/useGoalsTree'
import { apiPatch } from '../../../shared/api/client'

type GoalCard = {
  id: string
  label: string
  metric: string
  state: string
  progress: number
  caption: string
  detail: string[]
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
  goals: string[]
  goalCount: number
}

type IntentHealthFilter = 'all' | 'active' | 'backlog' | 'closed' | 'archived' | 'dropped' | 'selected'
type IntentSortKey = 'title' | 'milestone' | 'lifecycle' | 'progress' | 'runtime'
type DetailSectionKey = 'summary' | 'detail' | 'relations' | 'tasks'
type EditableField = 'title' | 'summaryText' | 'focusCurrent' | 'focusNextAction' | 'closeCondition'

const INTENTS_PER_PAGE = 20
type IntentPatchResponse = {
  ok: boolean
  result?: {
    id?: string
    updated_fields?: string[]
    status?: string
  }
}

type MetadataEntry = {
  label: string
  value: string
  icon: typeof activity
  tooltip: string
}

type RelationEntry = {
  label: string
  value: string
  evidence?: string
  tooltip: string
}

type GoalComposerState = {
  nodeKey: string | null
  parentGoalId: string | null
  title: string
  description: string
}

type GoalEditorState = {
  goalId: string | null
  parentGoalId: string | null
  title: string
  description: string
}

function goalNodeKey(node: { entityLevel: string; entityId: string }) {
  return `${node.entityLevel}:${node.entityId}`
}

function goalStatusTone(code: string) {
  if (code === 'aligned') return 'status-good'
  if (code === 'mixed') return 'status-live'
  if (code === 'outside-main') return 'status-warn'
  return 'status-offline'
}

function goalProcessLabel(state: string | null | undefined) {
  const normalized = String(state || '').trim().toLowerCase()
  if (!normalized) return 'active'
  return normalized.replace(/[-_]+/g, ' ')
}

function flattenGoalNodes(root: GoalTreeNode | null): GoalTreeNode[] {
  if (!root) return []
  const queue = [root]
  const nodes: GoalTreeNode[] = []
  while (queue.length) {
    const current = queue.shift()
    if (!current) continue
    nodes.push(current)
    queue.push(...current.children)
  }
  return nodes
}

function findGoalNode(root: GoalTreeNode | null, entityLevel: string, entityId: string) {
  return flattenGoalNodes(root).find((node) => node.entityLevel === entityLevel && node.entityId === entityId) ?? null
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

function compactPath(value: string | null | undefined) {
  const text = String(value || '').trim()
  if (!text) return 'none'
  const parts = text.split(/[\\/]/).filter(Boolean)
  if (parts.length <= 3) return text
  return `.../${parts.slice(-3).join('/')}`
}

function sentenceCase(value: string | null | undefined) {
  const text = String(value || '').trim()
  if (!text) return 'n/a'
  return text.replace(/[-_]+/g, ' ')
}

function taskStateTone(value: string | null | undefined) {
  const normalized = normalizeLifecycle(value)
  if (normalized === 'done' || normalized === 'closed') return 'status-good'
  if (normalized === 'blocked' || normalized === 'dropped') return 'status-warn'
  if (normalized === 'warning') return 'status-warn'
  return 'status-neutral'
}

function summarizeTaskDetail(task: IntentTask) {
  return task.description ?? task.text ?? 'No task detail available.'
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
      const goals = bucketIntents
        .map((intent) => String(intent.goalText ?? intent.goal ?? '').trim())
        .filter(Boolean)

      return {
        id,
        label: id === 'legacy' ? 'Legacy' : id.toUpperCase(),
        progress,
        state,
        metrics: `${bucketIntents.length} intents · ${active} active · ${backlog} backlog`,
        objectives,
        goals,
        goalCount: goals.length,
      } satisfies MilestoneBlock
    })
    .sort((left, right) => versionRank(left.id) - versionRank(right.id))
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

function GoalCardView({ card, onClick }: { card: GoalCard; onClick?: () => void }) {
  const content = (
    <>
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
        {card.detail.map((line) => (
          <p key={`${card.id}-${line}`} className="intent-goal-detail-line">{line}</p>
        ))}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={`intent-goal-card intent-goal-card-${card.tone} intent-goal-card-button`} onClick={onClick}>
        {content}
      </button>
    )
  }

  return (
    <article className={`intent-goal-card intent-goal-card-${card.tone}`}>
      {content}
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
  const taskId = `T-${String(index + 1).padStart(2, '0')}`
  return (
    <div className={`intent-task-grid-row intent-task-grid-row-${normalizeLifecycle(task.status)}${expanded ? ' expanded' : ''}`}>
      <button className="intent-task-grid-button" type="button" onClick={onToggle}>
        <span className="intent-task-id">{taskId}</span>
        <span>{task.title ?? `Task ${index + 1}`}</span>
        <span className={`status-pill ${taskStateTone(task.status)}`}>{task.status ?? 'open'}</span>
      </button>
      {expanded ? (
        <div className="intent-task-grid-detail">
          <p>{summarizeTaskDetail(task)}</p>
          <div className="intent-task-detail-meta">
            {task.section ? <span className="intent-path-chip">group: {task.section}</span> : null}
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

function GoalTreeNodeView({
  node,
  depth,
  expandedNodes,
  onToggle,
  composerState,
  onComposerOpen,
  onComposerCancel,
  onComposerChange,
  onCreateGoal,
  editorState,
  onEditorOpen,
  onEditorCancel,
  onEditorChange,
  onUpdateGoal,
  onDeleteGoal,
  pending,
  error,
  parentGoalOptions,
}: {
  node: GoalTreeNode
  depth: number
  expandedNodes: Set<string>
  onToggle: (nodeKey: string) => void
  composerState: GoalComposerState
  onComposerOpen: (node: GoalTreeNode, parentGoalId?: string | null) => void
  onComposerCancel: () => void
  onComposerChange: (patch: Partial<GoalComposerState>) => void
  onCreateGoal: (node: GoalTreeNode) => void
  editorState: GoalEditorState
  onEditorOpen: (goal: GoalRecord) => void
  onEditorCancel: () => void
  onEditorChange: (patch: Partial<GoalEditorState>) => void
  onUpdateGoal: (goal: GoalRecord) => void
  onDeleteGoal: (goal: GoalRecord) => void
  pending: boolean
  error: string | null
  parentGoalOptions: GoalRecord[]
}) {
  const nodeKey = goalNodeKey(node)
  const isOpen = expandedNodes.has(nodeKey)
  const isComposing = composerState.nodeKey === nodeKey
  const hasChildren = node.children.length > 0
  const paddingLeft = `${depth * 18}px`
  const activeEditorGoal = node.goals.find((goalItem) => goalItem.id === editorState.goalId) ?? null

  return (
    <div className={`goal-tree-node goal-tree-node-${node.entityLevel}`}>
      <div className="goal-tree-row" style={{ paddingLeft }}>
        <button type="button" className="goal-tree-toggle" onClick={() => onToggle(nodeKey)} aria-label={isOpen ? 'Collapse goals node' : 'Expand goals node'}>
          <Icon icon={hasChildren ? (isOpen ? chevronDown : chevronRight) : circleDashed} />
        </button>
        <div className="goal-tree-copy">
          <div className="goal-tree-head">
            <strong>{node.label}</strong>
            <span className={`status-pill ${goalStatusTone(node.status.code)}`}>{node.status.label}</span>
            <span className={`status-pill ${statusTone(normalizeLifecycle(node.runtimeState))}`}>{node.runtimeState}</span>
          </div>
          {node.summary ? <p className="goal-tree-summary">{node.summary}</p> : null}

          <div className="goal-tree-goal-list">
            {node.goals.map((goalItem) => {
              const isEditing = editorState.goalId === goalItem.id
              return (
                <div key={goalItem.id} className="goal-tree-goal-item">
                  {isEditing ? (
                    <div className="goal-tree-goal-editor">
                      <input
                        value={editorState.title}
                        onChange={(event) => onEditorChange({ title: event.target.value })}
                        placeholder="Goal title"
                      />
                      <textarea
                        rows={2}
                        value={editorState.description}
                        onChange={(event) => onEditorChange({ description: event.target.value })}
                        placeholder="Goal detail"
                      />
                      {node.entityLevel !== 'system' && parentGoalOptions.length ? (
                        <select
                          value={editorState.parentGoalId ?? ''}
                          onChange={(event) => onEditorChange({ parentGoalId: event.target.value || null })}
                        >
                          <option value="">Outside main goals</option>
                          {parentGoalOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.title}</option>
                          ))}
                        </select>
                      ) : null}
                      <div className="goal-tree-actions">
                        <button className="tool-button tool-button-primary" type="button" onClick={() => onUpdateGoal({ ...goalItem, parentGoalId: editorState.parentGoalId, title: editorState.title, description: editorState.description })} disabled={pending}>
                          {pending ? 'Saving...' : 'Save'}
                        </button>
                        <button className="tool-button" type="button" onClick={onEditorCancel}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="goal-tree-goal-copy">
                        <div className="goal-tree-goal-copy-head">
                          <span>{goalItem.title}</span>
                          <span className={`status-pill ${statusTone(normalizeLifecycle(goalItem.state))}`}>{goalProcessLabel(goalItem.state)}</span>
                          {goalItem.childGoalCount > 0 ? <span className="intent-path-chip">{goalItem.childGoalCount} child</span> : null}
                        </div>
                        {goalItem.description ? <p>{goalItem.description}</p> : null}
                      </div>
                      <div className="goal-tree-actions">
                        <button className="icon-tool-button" type="button" onClick={() => onEditorOpen(goalItem)} aria-label="Edit goal">
                          <Icon icon={pencilLine} />
                        </button>
                        <button className="icon-tool-button" type="button" onClick={() => onDeleteGoal(goalItem)} disabled={!goalItem.canDelete} aria-label="Delete goal">
                          <Icon icon={trash2} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            {!node.goals.length ? <p className="goal-tree-empty">{node.entityLevel === 'system' ? 'No system goals yet.' : 'No goals on this object yet.'}</p> : null}
          </div>

          {isComposing ? (
            <div className="goal-tree-goal-editor goal-tree-compose">
              <input
                value={composerState.title}
                onChange={(event) => onComposerChange({ title: event.target.value })}
                placeholder="Goal title"
              />
              <textarea
                rows={2}
                value={composerState.description}
                onChange={(event) => onComposerChange({ description: event.target.value })}
                placeholder="Goal detail"
              />
              {node.entityLevel !== 'system' && parentGoalOptions.length ? (
                <select
                  value={composerState.parentGoalId ?? ''}
                  onChange={(event) => onComposerChange({ parentGoalId: event.target.value || null })}
                >
                  <option value="">Outside main goals</option>
                  {parentGoalOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.title}</option>
                  ))}
                </select>
              ) : null}
              <div className="goal-tree-actions">
                <button className="tool-button tool-button-primary" type="button" onClick={() => onCreateGoal(node)} disabled={pending}>
                  {pending ? 'Adding...' : 'Add goal'}
                </button>
                <button className="tool-button" type="button" onClick={onComposerCancel}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="tool-button goal-tree-add-button" type="button" onClick={() => onComposerOpen(node, parentGoalOptions[0]?.id ?? null)}>
              <Icon icon={plus} />
              Add {node.entityLevel} goal
            </button>
          )}

          {error && (isComposing || Boolean(activeEditorGoal)) ? <p className="runtime-warning-text">{error}</p> : null}
        </div>
      </div>
      {isOpen && hasChildren ? (
        <div className="goal-tree-children">
          {node.children.map((child) => (
            <GoalTreeNodeView
              key={goalNodeKey(child)}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              composerState={composerState}
              onComposerOpen={onComposerOpen}
              onComposerCancel={onComposerCancel}
              onComposerChange={onComposerChange}
              onCreateGoal={onCreateGoal}
              editorState={editorState}
              onEditorOpen={onEditorOpen}
              onEditorCancel={onEditorCancel}
              onEditorChange={onEditorChange}
              onUpdateGoal={onUpdateGoal}
              onDeleteGoal={onDeleteGoal}
              pending={pending}
              error={error}
              parentGoalOptions={node.goals}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function IntentsListPage() {
  const queryClient = useQueryClient()
  const intentsQuery = useIntentsList()
  const systemSnapshotQuery = useSystemSnapshot()
  const goalsTreeQuery = useGoalsTree()
  const intents = intentsQuery.data?.parsed?.intents ?? []
  const snapshot = systemSnapshotQuery.data
  const goalsTree = goalsTreeQuery.data?.root ?? null
  const goalsSummary = goalsTreeQuery.data?.summary ?? null
  const snapshotMetadata = snapshot?.metadata
  const focusIntentId = snapshotMetadata?.focusIntentId ?? null
  const activeIntentId = snapshotMetadata?.activeIntentId ?? null
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [goalsDrawerOpen, setGoalsDrawerOpen] = useState(false)
  const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(null)
  const [milestoneActiveIndex, setMilestoneActiveIndex] = useState(0)
  const [healthFilter, setHealthFilter] = useState<IntentHealthFilter>('all')
  const [intentSortKey, setIntentSortKey] = useState<IntentSortKey>('milestone')
  const [intentSortDirection, setIntentSortDirection] = useState<'asc' | 'desc'>('desc')
  const [intentPage, setIntentPage] = useState(1)
  const [collapsedSections, setCollapsedSections] = useState<Record<DetailSectionKey, boolean>>({
    summary: false,
    detail: false,
    relations: false,
    tasks: false,
  })
  const [activeEditor, setActiveEditor] = useState<EditableField | null>(null)
  const [editorDraft, setEditorDraft] = useState('')
  const [editorError, setEditorError] = useState<string | null>(null)
  const [goalComposer, setGoalComposer] = useState<GoalComposerState>({
    nodeKey: null,
    parentGoalId: null,
    title: '',
    description: '',
  })
  const [goalEditor, setGoalEditor] = useState<GoalEditorState>({
    goalId: null,
    parentGoalId: null,
    title: '',
    description: '',
  })
  const [goalTreeError, setGoalTreeError] = useState<string | null>(null)
  const [expandedGoalNodes, setExpandedGoalNodes] = useState<Set<string>>(new Set(['system:workspace']))
  const milestoneRailRef = useRef<HTMLDivElement | null>(null)

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
    setGoalEditor({ goalId: null, parentGoalId: null, title: '', description: '' })
    setGoalComposer({ nodeKey: null, parentGoalId: null, title: '', description: '' })
    setGoalTreeError(null)
  }, [selectedIntentId])

  useEffect(() => {
    if (!goalsTree) return
    const next = new Set<string>(['system:workspace'])
    for (const milestone of goalsTree.children) {
      next.add(goalNodeKey(milestone))
    }
    if (selectedIntentId) {
      next.add(`intent:${selectedIntentId}`)
    }
    setExpandedGoalNodes((current) => new Set([...current, ...next]))
  }, [goalsTree, selectedIntentId])

  useEffect(() => {
    if (!drawerOpen && !goalsDrawerOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [drawerOpen, goalsDrawerOpen])

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
        queryClient.invalidateQueries({ queryKey: goalsTreeQueryKey }),
      ])
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Intent update failed.'
      setEditorError(message)
    },
  })

  const createGoalMutation = useCreateGoalMutation()
  const updateGoalMutation = useUpdateGoalMutation()
  const deleteGoalMutation = useDeleteGoalMutation()

  const lifecycleCounts = useMemo(() => ({
    active: intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'active').length,
    backlog: intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'backlog').length,
    closed: intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'closed').length,
    archived: intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'archived').length,
    dropped: intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'dropped').length,
  }), [intents])
  const milestones = useMemo(() => buildMilestones(intents), [intents])
  const currentIntentRecord = useMemo(
    () => intents.find((intent) => intent.id === selectedIntentId) ?? intents.find((intent) => intent.id === focusIntentId) ?? null,
    [focusIntentId, intents, selectedIntentId],
  )
  const selectedIntentGoalNode = useMemo(
    () => findGoalNode(goalsTree, 'intent', selectedIntentId ?? ''),
    [goalsTree, selectedIntentId],
  )
  const currentFocusSummary = detail?.focusCurrent ?? currentIntentRecord?.focusCurrent ?? null
  const currentNextAction = detail?.focusNextAction ?? currentIntentRecord?.focusNextAction ?? null
  const currentChaos = detail?.chaosEstimate ?? currentIntentRecord?.chaosEstimate ?? null
  const intentsWithGoals = goalsSummary?.coverage.intents ?? 0
  const milestonesWithGoals = goalsSummary?.coverage.milestones ?? 0
  const selectedTaskGoalCount = selectedIntentGoalNode?.children.filter((taskNode) => taskNode.status.code === 'aligned').length ?? 0
  const selectedTaskMissingGoalCount = selectedIntentGoalNode?.children.filter((taskNode) => taskNode.status.code === 'missing-goals').length ?? 0
  const goalHealthProgress = useMemo(() => {
    if (!goalsSummary) return 0
    const totalEntities = goalsSummary.entityCounts.milestones + goalsSummary.entityCounts.intents + goalsSummary.entityCounts.tasks
    const alignedEntities = goalsSummary.coverage.milestones + goalsSummary.coverage.intents + goalsSummary.coverage.tasks
    return totalEntities ? clampProgress((alignedEntities / totalEntities) * 100) : 0
  }, [goalsSummary])
  const intentHealthProgress = intents.length
    ? clampProgress(((lifecycleCounts.active + lifecycleCounts.closed + lifecycleCounts.archived) / intents.length) * 100)
    : 0
  const goalCards = useMemo<GoalCard[]>(() => [
    {
      id: 'system-goals',
      label: 'System Goals',
      metric: `${goalsTree?.goals.length ?? 0} system goals`,
      state: goalsSummary?.missingCounts.milestones || goalsSummary?.missingCounts.intents || goalsSummary?.missingCounts.tasks ? 'needs coverage' : 'aligned',
      progress: goalHealthProgress,
      caption: `Milestones ${milestonesWithGoals}/${(goalsSummary?.entityCounts.milestones ?? milestones.length ?? 0)} · Selected tasks ${selectedTaskGoalCount}/${(selectedIntentGoalNode?.children.length ?? detail?.tasks.length ?? 0)}`,
      detail: [
        goalsTree?.goals.length ? `${goalsTree.goals.length} workspace-level goals are now tracked in the OKR tree.` : 'No system goals exist yet. Add at least one root goal.',
        selectedTaskMissingGoalCount > 0 ? `${selectedTaskMissingGoalCount} selected tasks still have no child goal.` : 'Selected tasks are linked into the goal tree.',
      ],
      icon: goal,
      tone: goalsTree?.goals.length && !goalsSummary?.missingCounts.milestones && !goalsSummary?.missingCounts.intents ? 'done' : 'warning',
    },
    {
      id: 'focus-details',
      label: 'Focus Details',
      metric: currentIntentRecord?.id ?? 'no focus intent',
      state: currentFocusSummary ? 'tracked' : 'missing',
      progress: currentFocusSummary && currentNextAction ? 100 : currentFocusSummary ? 72 : 24,
      caption: currentFocusSummary ?? 'No detailed focus summary surfaced yet.',
      detail: [
        currentNextAction ? `Next: ${currentNextAction}` : 'Next action is not recorded yet.',
        detail?.focusUpdatedAt ? `Updated: ${formatTimestamp(detail.focusUpdatedAt)}` : 'Focus timestamp unavailable.',
      ],
      icon: flagTriangleRight,
      tone: currentFocusSummary ? 'active' : 'warning',
    },
    {
      id: 'chaos-estimate',
      label: 'Chaos & Estimate',
      metric: currentChaos?.projectedScore != null || currentChaos?.currentScore != null
        ? `${currentChaos?.projectedScore ?? currentChaos?.currentScore}`
        : 'n/a',
      state: currentChaos?.projectedLevel ?? currentChaos?.currentLevel ?? 'unknown',
      progress: clampProgress(Number(currentChaos?.projectedScore ?? currentChaos?.currentScore ?? 0)),
      caption: currentChaos?.warning ?? 'No chaos warning attached to the selected intent.',
      detail: [
        `Current: ${currentChaos?.currentScore ?? 'n/a'} · ${currentChaos?.currentLevel ?? 'n/a'}`,
        `Projected: ${currentChaos?.projectedScore ?? 'n/a'} · ${currentChaos?.projectedLevel ?? 'n/a'}`,
      ],
      icon: activity,
      tone: currentChaos?.warning ? 'warning' : currentChaos ? 'active' : 'neutral',
    },
    {
      id: 'intent-health',
      label: 'Intent Health',
      metric: `${lifecycleCounts.active} active / ${intents.length || 0}`,
      state: lifecycleCounts.dropped > 0 ? 'attention' : snapshotMetadata?.reloadRecommended ? 'reload' : 'stable',
      progress: intentHealthProgress,
      caption: `Backlog ${lifecycleCounts.backlog} · Closed ${lifecycleCounts.closed} · Archived ${lifecycleCounts.archived}`,
      detail: [
        lifecycleCounts.dropped > 0 ? `${lifecycleCounts.dropped} dropped intents still need review.` : 'No dropped intents in the current workspace slice.',
        snapshotMetadata?.reloadRecommended ? `Snapshot reload recommended: ${snapshotMetadata.reloadReasons.join(', ')}` : 'Snapshot and intent list are currently aligned enough for operator work.',
      ],
      icon: network,
      tone: lifecycleCounts.dropped > 0 || snapshotMetadata?.reloadRecommended ? 'warning' : 'done',
    },
  ], [
    currentChaos,
    currentFocusSummary,
    currentIntentRecord?.id,
    currentNextAction,
    detail?.focusUpdatedAt,
    goalHealthProgress,
    goalsSummary?.entityCounts.milestones,
    goalsSummary?.missingCounts.intents,
    goalsSummary?.missingCounts.milestones,
    goalsSummary?.missingCounts.tasks,
    goalsTree?.goals.length,
    intentHealthProgress,
    intents.length,
    lifecycleCounts.active,
    lifecycleCounts.archived,
    lifecycleCounts.backlog,
    lifecycleCounts.closed,
    lifecycleCounts.dropped,
    milestones.length,
    selectedTaskGoalCount,
    selectedIntentGoalNode?.children.length,
    selectedTaskMissingGoalCount,
    snapshotMetadata?.reloadReasons,
    snapshotMetadata?.reloadRecommended,
  ])

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

  useEffect(() => {
    setIntentPage(1)
  }, [healthFilter, intentSortDirection, intentSortKey])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sortedIntents.length / INTENTS_PER_PAGE))
    if (intentPage > maxPage) {
      setIntentPage(maxPage)
    }
  }, [intentPage, sortedIntents.length])

  useEffect(() => {
    const maxIndex = Math.max(0, milestones.length - 1)
    if (milestoneActiveIndex > maxIndex) {
      setMilestoneActiveIndex(maxIndex)
    }
  }, [milestoneActiveIndex, milestones.length])

  useEffect(() => {
    const rail = milestoneRailRef.current
    if (!rail) return
    const target = rail.querySelector<HTMLElement>(`[data-milestone-index="${milestoneActiveIndex}"]`)
    if (!target) return
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    })
  }, [milestoneActiveIndex, milestones.length])

  const intentPageCount = Math.max(1, Math.ceil(sortedIntents.length / INTENTS_PER_PAGE))
  const pagedIntents = useMemo(() => {
    const startIndex = (intentPage - 1) * INTENTS_PER_PAGE
    return sortedIntents.slice(startIndex, startIndex + INTENTS_PER_PAGE)
  }, [intentPage, sortedIntents])
  const intentPageStart = sortedIntents.length ? (intentPage - 1) * INTENTS_PER_PAGE + 1 : 0
  const intentPageEnd = sortedIntents.length ? Math.min(intentPage * INTENTS_PER_PAGE, sortedIntents.length) : 0

  const refreshAll = async () => {
    await Promise.all([
      intentsQuery.refetch(),
      detailQuery.refetch(),
      goalsTreeQuery.refetch(),
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

  const toggleGoalNode = (nodeKey: string) => {
    setExpandedGoalNodes((current) => {
      const next = new Set(current)
      if (next.has(nodeKey)) {
        next.delete(nodeKey)
      } else {
        next.add(nodeKey)
      }
      return next
    })
  }

  const openGoalComposer = (node: GoalTreeNode, parentGoalId?: string | null) => {
    setGoalComposer({
      nodeKey: goalNodeKey(node),
      parentGoalId: parentGoalId ?? null,
      title: '',
      description: '',
    })
    setGoalTreeError(null)
  }

  const cancelGoalComposer = () => {
    setGoalComposer({ nodeKey: null, parentGoalId: null, title: '', description: '' })
    setGoalTreeError(null)
  }

  const openGoalEditor = (goalItem: GoalRecord) => {
    setGoalEditor({
      goalId: goalItem.id,
      parentGoalId: goalItem.parentGoalId,
      title: goalItem.title,
      description: goalItem.description,
    })
    setGoalTreeError(null)
  }

  const cancelGoalEditor = () => {
    setGoalEditor({ goalId: null, parentGoalId: null, title: '', description: '' })
    setGoalTreeError(null)
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

  const createGoalForNode = async (node: GoalTreeNode) => {
    try {
      await createGoalMutation.mutateAsync({
        entity_level: node.entityLevel,
        entity_id: node.entityId,
        title: goalComposer.title.trim(),
        description: goalComposer.description.trim(),
        parent_goal_id: goalComposer.parentGoalId ?? null,
      })
      cancelGoalComposer()
    } catch (error) {
      setGoalTreeError(error instanceof Error ? error.message : 'Create goal failed.')
    }
  }

  const saveGoalUpdate = async (goalItem: GoalRecord) => {
    try {
      await updateGoalMutation.mutateAsync({
        goalId: goalItem.id,
        title: goalItem.title,
        description: goalItem.description,
        parent_goal_id: goalItem.parentGoalId ?? null,
      })
      cancelGoalEditor()
    } catch (error) {
      setGoalTreeError(error instanceof Error ? error.message : 'Update goal failed.')
    }
  }

  const removeGoal = async (goalItem: GoalRecord) => {
    try {
      await deleteGoalMutation.mutateAsync(goalItem.id)
      if (goalEditor.goalId === goalItem.id) {
        cancelGoalEditor()
      }
    } catch (error) {
      setGoalTreeError(error instanceof Error ? error.message : 'Delete goal failed.')
    }
  }

  const detailDescription = detail ? (detail.decisionSummary ?? detail.summary ?? detail.goal ?? '') : ''
  const detailProgress = detail ? computeIntentProgress(detail.lifecycle) : 0
  const detailTaskCount = detail?.tasks.length ?? 0
  const detailTaskDoneCount = detail?.tasks.filter((task) => task.done || normalizeLifecycle(task.status) === 'done').length ?? 0
  const metadataEntries: MetadataEntry[] = detail ? [
    {
      label: 'Lifecycle',
      value: sentenceCase(detail.lifecycle ?? detail.status ?? 'unknown'),
      icon: circleDashed,
      tooltip: 'Current process state of the intent in the lifecycle rail.',
    },
    {
      label: 'Scope',
      value: sentenceCase(detail.scope),
      icon: listTree,
      tooltip: 'Declared operating scope of the intent, such as repo-wide or feature-local.',
    },
    {
      label: 'Mode',
      value: sentenceCase(detail.mode),
      icon: circleDashed,
      tooltip: 'Execution mode recorded for this intent, usually how strictly it should be governed.',
    },
    {
      label: 'Change type',
      value: sentenceCase(detail.changeType),
      icon: target,
      tooltip: 'Nature of the intended change, such as feature, refactor, governance, or docs.',
    },
    {
      label: 'Milestone',
      value: intentVersionLabel(detail.id ?? selectedIntentId ?? ''),
      icon: archive,
      tooltip: 'Version or milestone bucket inferred from the intent id.',
    },
    {
      label: 'Progress',
      value: `${detailProgress}% · ${detailTaskDoneCount}/${detailTaskCount} tasks done`,
      icon: activity,
      tooltip: 'UI progress estimate derived from lifecycle plus extracted task completion count.',
    },
    ...(detail.chaosEstimate?.projectedLevel || detail.chaosEstimate?.currentLevel
      ? [{
          label: 'Chaos',
          value: `${detail.chaosEstimate?.projectedScore ?? detail.chaosEstimate?.currentScore ?? 'n/a'} · ${detail.chaosEstimate?.projectedLevel ?? detail.chaosEstimate?.currentLevel}`,
          icon: activity,
          tooltip: 'Risk or instability estimate attached to this intent when the runtime has one.',
        }]
      : []),
  ] : []
  const relationEntries: RelationEntry[] = detail ? [
    ...(detail.goal ? [{
      label: 'Goal',
      value: detail.goal,
      evidence: compactPath(detail.sourceFile),
      tooltip: 'Primary outcome the intent is trying to achieve, extracted from the intent record.',
    }] : []),
    {
      label: 'Milestone / Version',
      value: intentVersionLabel(detail.id ?? selectedIntentId ?? ''),
      evidence: detail.id ?? 'unknown',
      tooltip: 'Version line or milestone bucket this intent belongs to.',
    },
    ...(detail.workspacePath ? [{
      label: 'Workspace',
      value: compactPath(detail.workspacePath),
      evidence: 'intent workspace',
      tooltip: 'Intent-owned workspace folder where plan, impact, and proposed changes live.',
    }] : []),
    ...(detail.sourceFile ? [{
      label: 'Source document',
      value: compactPath(detail.sourceFile),
      evidence: 'intent record',
      tooltip: 'The canonical source file that defines this intent entry.',
    }] : []),
    ...(detail.stagedFiles.length ? [{
      label: 'Staged files',
      value: `${detail.stagedFiles.length} linked file${detail.stagedFiles.length === 1 ? '' : 's'}`,
      evidence: detail.stagedFiles.slice(0, 3).map((file) => compactPath(file)).join(' · '),
      tooltip: 'Files explicitly attached to the intent as staged or governed evidence.',
    }] : []),
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
            <GoalCardView
              key={card.id}
              card={card}
              onClick={card.id === 'system-goals' ? () => setGoalsDrawerOpen(true) : undefined}
            />
          ))}
        </div>

        <section className="surface-panel surface-panel-primary intent-milestone-strip-shell">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Milestones</p>
              <h2>Version rail</h2>
            </div>
            <div className="intent-milestone-nav">
              <span className="runtime-overview-label">{milestones.length ? `${milestoneActiveIndex + 1} / ${milestones.length}` : 'No milestones'}</span>
              <button
                className="icon-tool-button"
                type="button"
                onClick={() => setMilestoneActiveIndex((current) => Math.max(0, current - 1))}
                disabled={milestoneActiveIndex === 0}
                aria-label="Previous milestones"
              >
                <Icon icon={chevronLeft} aria-hidden="true" />
              </button>
              <button
                className="icon-tool-button"
                type="button"
                onClick={() => setMilestoneActiveIndex((current) => Math.min(Math.max(0, milestones.length - 1), current + 1))}
                disabled={milestoneActiveIndex >= Math.max(0, milestones.length - 1)}
                aria-label="Next milestones"
              >
                <Icon icon={chevronRight} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="intent-milestone-rail compact" ref={milestoneRailRef}>
            {milestones.map((milestone, index) => (
              <article
                key={milestone.id}
                className={`intent-milestone-card intent-milestone-card-${milestoneVisualState(milestone.state)}`}
                data-tooltip={`${milestone.metrics} | ${milestone.objectives.join(' · ')}`}
                data-milestone-index={index}
                tabIndex={0}
              >
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
                <div className="intent-milestone-objective-inline">
                  {milestone.objectives[0] ?? 'No milestone objective captured yet.'}
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
              <span role="columnheader">Tasks</span>
              <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleIntentSort('progress')}>Progress{sortIndicator('progress', intentSortKey, intentSortDirection)}</button>
              <button className="rules-column-button" type="button" role="columnheader" onClick={() => toggleIntentSort('runtime')}>Runtime{sortIndicator('runtime', intentSortKey, intentSortDirection)}</button>
              <span role="columnheader">Blockers</span>
            </div>
            {pagedIntents.map((intent) => {
              const lifecycle = normalizeLifecycle(intent.lifecycle)
              const isFocused = intent.id === focusIntentId
              const isActive = intent.id === activeIntentId
              const progress = computeIntentProgress(intent.lifecycle)
              return (
                <article
                  key={intent.id}
                  className={`rules-table-row intent-registry-row intent-lifecycle-${lifecycle}${selectedIntentId === intent.id ? ' selected' : ''}`}
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
                    <span className="meta-pill">
                      {(intent.taskDoneCount ?? 0)}/{(intent.taskCount ?? 0)}
                    </span>
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
            {!pagedIntents.length ? (
              <article className="rules-table-empty" role="row">
                <h3>No intents match this filter</h3>
                <p>Try another lifecycle pill in the intent health bar.</p>
              </article>
            ) : null}
          </div>
        )}
        {sortedIntents.length ? (
          <div className="intent-pagination-bar">
            <span className="runtime-overview-label">Showing {intentPageStart}-{intentPageEnd} of {sortedIntents.length}</span>
            <div className="intent-pagination-actions">
              <button
                className="tool-button"
                type="button"
                onClick={() => setIntentPage((current) => Math.max(1, current - 1))}
                disabled={intentPage === 1}
              >
                Previous
              </button>
              <span className="meta-pill">Page {intentPage} / {intentPageCount}</span>
              <button
                className="tool-button"
                type="button"
                onClick={() => setIntentPage((current) => Math.min(intentPageCount, current + 1))}
                disabled={intentPage >= intentPageCount}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {goalsDrawerOpen ? (
        <div className="prototype-overlay-backdrop" onClick={() => setGoalsDrawerOpen(false)}>
          <aside className="prototype-drawer intent-goal-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="panel-toolbar intent-detail-toolbar">
              <div>
                <p className="workspace-eyebrow">Goal Module</p>
                <h2>System Goals</h2>
              </div>
              <button className="icon-tool-button" type="button" onClick={() => setGoalsDrawerOpen(false)} aria-label="Close goals drawer">
                <Icon icon={xIcon} />
              </button>
            </div>

            <div className="intent-drawer-stack">
              <article className="intent-drawer-block">
                <div className="panel-toolbar">
                  <div>
                    <p className="workspace-eyebrow">Goal Health</p>
                    <h3>Coverage across the 4-layer OKR tree</h3>
                  </div>
                </div>
                <div className="kb-health-bar intent-health-bar">
                  <div className="kb-health-group">
                    <span className="runtime-overview-label">System</span>
                    <span className={`status-pill ${goalsTree?.goals.length ? 'status-good' : 'status-warn'}`}>
                      {goalsTree?.goals.length ?? 0} root goals
                    </span>
                  </div>
                  <div className="kb-health-group">
                    <span className="runtime-overview-label">Milestones</span>
                    <span className={`status-pill ${goalsSummary?.missingCounts.milestones ? 'status-warn' : 'status-good'}`}>
                      {milestonesWithGoals}/{goalsSummary?.entityCounts.milestones ?? 0} aligned
                    </span>
                  </div>
                  <div className="kb-health-group">
                    <span className="runtime-overview-label">Intents</span>
                    <span className={`status-pill ${goalsSummary?.missingCounts.intents ? 'status-warn' : 'status-good'}`}>
                      {intentsWithGoals}/{goalsSummary?.entityCounts.intents ?? 0} aligned
                    </span>
                  </div>
                  <div className="kb-health-group">
                    <span className="runtime-overview-label">Tasks</span>
                    <span className={`status-pill ${selectedTaskMissingGoalCount === 0 ? 'status-good' : 'status-warn'}`}>
                      {selectedTaskGoalCount}/{selectedIntentGoalNode?.children.length ?? detail?.tasks.length ?? 0} selected aligned
                    </span>
                  </div>
                  <div className="kb-health-next">
                    <span className="runtime-overview-label">Tree rule</span>
                    <span className="kb-health-next-text">System &gt; milestone &gt; intent &gt; task. Child goals can link upward; parent goals cannot be deleted while child goals exist.</span>
                  </div>
                </div>
              </article>

              <article className="intent-drawer-block">
                <div className="panel-toolbar">
                  <div>
                    <p className="workspace-eyebrow">Goal Tree</p>
                    <h3>System &gt; milestone &gt; intent &gt; task</h3>
                  </div>
                </div>
                {goalsTreeQuery.isLoading ? (
                  <p className="rules-cell-copy">Loading goal tree...</p>
                ) : goalsTree ? (
                  <div className="goal-tree-shell">
                    <GoalTreeNodeView
                      node={goalsTree}
                      depth={0}
                      expandedNodes={expandedGoalNodes}
                      onToggle={toggleGoalNode}
                      composerState={goalComposer}
                      onComposerOpen={openGoalComposer}
                      onComposerCancel={cancelGoalComposer}
                      onComposerChange={(patch) => setGoalComposer((current) => ({ ...current, ...patch }))}
                      onCreateGoal={(node) => void createGoalForNode(node)}
                      editorState={goalEditor}
                      onEditorOpen={openGoalEditor}
                      onEditorCancel={cancelGoalEditor}
                      onEditorChange={(patch) => setGoalEditor((current) => ({ ...current, ...patch }))}
                      onUpdateGoal={(goalItem) => void saveGoalUpdate(goalItem)}
                      onDeleteGoal={(goalItem) => void removeGoal(goalItem)}
                      pending={createGoalMutation.isPending || updateGoalMutation.isPending || deleteGoalMutation.isPending}
                      error={goalTreeError}
                      parentGoalOptions={[]}
                    />
                  </div>
                ) : (
                  <p className="rules-cell-copy">Goal tree is unavailable right now.</p>
                )}
              </article>
            </div>
          </aside>
        </div>
      ) : null}

      {drawerOpen && selectedIntentId ? (
        <div className="prototype-overlay-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside className="prototype-drawer intent-detail-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="panel-toolbar intent-detail-toolbar">
              <div>
                <p className="workspace-eyebrow">Intent Detail</p>
                <h2>{selectedIntentId}</h2>
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
                  subtitle="Title and lifecycle only."
                >
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
                  <LifecycleRail lifecycle={detail.lifecycle ?? detail.status} />
                </CollapsibleBlock>

                <CollapsibleBlock
                  title="Detail"
                  icon={flagTriangleRight}
                  sectionKey="detail"
                  collapsed={collapsedSections.detail}
                  onToggle={toggleSection}
                  subtitle="Editable operational fields and narrative."
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
                    <div className="system-info-card">
                      <span className="runtime-overview-label">Source file</span>
                      <div className="intent-static-value">
                        <span>{compactPath(detail.sourceFile)}</span>
                      </div>
                    </div>
                  </div>
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
                </CollapsibleBlock>

                <CollapsibleBlock
                  title="Metadata"
                  icon={network}
                  sectionKey="relations"
                  collapsed={collapsedSections.relations}
                  onToggle={toggleSection}
                  subtitle="Runtime metadata first. Related objects only appear when the intent actually links to them."
                >
                  <div className="intent-metadata-compact">
                    {metadataEntries.map((entry) => (
                      <article key={entry.label} className="intent-metadata-chip-card">
                        <div className="intent-relation-row-head">
                          <span className="section-icon section-icon-kb" aria-hidden="true">
                            <Icon icon={entry.icon} />
                          </span>
                          <span className="runtime-overview-label" data-tooltip={entry.tooltip} tabIndex={0}>{entry.label}</span>
                        </div>
                        <span className="intent-relation-object">{entry.value}</span>
                      </article>
                    ))}
                  </div>
                  {relationEntries.length ? (
                    <div className="intent-relation-compact-list">
                      {relationEntries.map((entry) => (
                        <div key={`${entry.label}-${entry.value}`} className="intent-relation-compact-row">
                          <span className="runtime-overview-label" data-tooltip={entry.tooltip} tabIndex={0}>{entry.label}</span>
                          <div className="intent-relation-compact-copy">
                            <span className="intent-relation-object">{entry.value}</span>
                            {entry.evidence ? <span className="intent-relation-evidence">{entry.evidence}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rules-cell-copy">No explicit linked objects were extracted for this intent yet.</p>
                  )}
                </CollapsibleBlock>

                <CollapsibleBlock
                  title="Tasks Grid"
                  icon={listTodo}
                  sectionKey="tasks"
                  collapsed={collapsedSections.tasks}
                  onToggle={toggleSection}
                  subtitle="Legacy-style compact task board with expandable row detail."
                >
                  {detail.tasks.length ? (
                    <div className="intent-task-grid">
                      <div className="intent-task-grid-header">
                        <span>ID</span>
                        <span>Task</span>
                        <span>Status</span>
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
