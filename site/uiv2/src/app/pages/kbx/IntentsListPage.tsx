import { Icon } from '@iconify/react'
import target from '@iconify-icons/lucide/target'
import blocks from '@iconify-icons/lucide/blocks'
import waypoints from '@iconify-icons/lucide/waypoints'
import listTodo from '@iconify-icons/lucide/list-todo'
import alertTriangle from '@iconify-icons/lucide/alert-triangle'
import search from '@iconify-icons/lucide/search'
import chevronRight from '@iconify-icons/lucide/chevron-right'
import x from '@iconify-icons/lucide/x'
import plus from '@iconify-icons/lucide/plus'
import sparkles from '@iconify-icons/lucide/sparkles'
import loader from '@iconify-icons/lucide/loader'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { PlanningNativeGraph } from '../../components/intents/PlanningNativeGraph'
import {
  addIntentKeyResultLink,
  addIntentToRelease,
  applyIntentAssistantPlan,
  generateIntentAssistantPlan,
  removeIntentFromRelease,
  removeIntentKeyResultLink,
  type PlanningAssistantResponse,
  usePlanningWorkspace,
  type PlanningIntent,
  type PlanningKeyResult,
  type PlanningObjective,
  type PlanningRelease,
  type PlanningTask,
} from '../../hooks/kbx/usePlanningWorkspace'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type IntentFilter = 'all' | 'linked' | 'missing-kr' | 'proposed' | 'out-of-scope' | 'active' | 'backlog' | 'closed'
type PlanningView = 'overview' | 'okr' | 'releases' | 'intents' | 'graph'
type AssistantDecision = 'bind-existing' | 'propose-new-okr' | 'out-of-scope'

type DetailRecord =
  | { kind: 'workspace'; title: string; summary: string; metrics: string[] }
  | { kind: 'objective'; objective: PlanningObjective }
  | { kind: 'key_result'; keyResult: PlanningKeyResult; intents: PlanningIntent[] }
  | { kind: 'release'; release: PlanningRelease }
  | { kind: 'intent'; intent: PlanningIntent; keyResults: PlanningKeyResult[] }
  | { kind: 'task'; task: PlanningTask; intent: PlanningIntent | null }

const SAMPLE_EDITORIAL_COPY =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
const SAMPLE_SUPPORTING_COPY =
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'

function withSampleCopy(value: string | null | undefined, fallback = SAMPLE_EDITORIAL_COPY) {
  const text = String(value ?? '').trim()
  return text || fallback
}

function excerpt(value: string | null | undefined, max = 150) {
  const text = withSampleCopy(value, SAMPLE_SUPPORTING_COPY).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trim()}…`
}

function countObjectiveBranches(objective: PlanningObjective): number {
  return objective.children.reduce((count, child) => count + 1 + countObjectiveBranches(child), 0)
}

function flattenObjectives(objectives: PlanningObjective[]): PlanningObjective[] {
  const bucket: PlanningObjective[] = []
  const walk = (nodes: PlanningObjective[]) => {
    nodes.forEach((node) => {
      bucket.push(node)
      walk(node.children)
    })
  }
  walk(objectives)
  return bucket
}

function intentTone(intent: PlanningIntent) {
  if (intent.validation_state === 'out-of-scope') return 'status-neutral'
  if (intent.validation_state !== 'linked') return 'status-warn'
  if (intent.lifecycle === 'active') return 'status-good'
  if (intent.lifecycle === 'closed' || intent.lifecycle === 'done' || intent.lifecycle === 'archived') return 'status-offline'
  return 'status-neutral'
}

function lifecycleLabel(value: string) {
  return String(value || 'unknown').replace(/[-_]+/g, ' ')
}

function validationLabel(intent: PlanningIntent, linkedKeyResultCount: number) {
  if (intent.validation_state === 'linked') return `${linkedKeyResultCount} KR linked`
  if (intent.validation_state === 'proposed-new-key-result') return 'new O/KR proposed'
  if (intent.validation_state === 'out-of-scope') return 'out of current goals'
  return 'key result required'
}

function parsePlanningView(value: string | null | undefined) {
  if (value === 'overview' || value === 'okr' || value === 'releases' || value === 'intents' || value === 'graph') {
    return value
  }

  return 'overview'
}

function MetricCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: string
  tone: string
  icon: typeof target
}) {
  return (
    <article className={`planning-metric-card ${tone}`}>
      <div className="planning-metric-head">
        <span className="section-icon section-icon-intent" aria-hidden="true">
          <Icon icon={icon} />
        </span>
        <span className="runtime-overview-label">{label}</span>
      </div>
      <strong>{value}</strong>
    </article>
  )
}

function StageTab({
  active,
  label,
  caption,
  onClick,
}: {
  active: boolean
  label: string
  caption: string
  onClick: () => void
}) {
  return (
    <button type="button" className={`planning-stage-tab${active ? ' active' : ''}`} onClick={onClick}>
      <strong>{label}</strong>
      <span>{caption}</span>
    </button>
  )
}

function UpdateKRDialog({
  open,
  intent,
  availableKeyResults,
  isRunning,
  isApplying,
  error,
  aiResult,
  onClose,
  onRunAI,
  onAcceptManual,
  onAcceptAI,
}: {
  open: boolean
  intent: PlanningIntent | null
  availableKeyResults: PlanningKeyResult[]
  isRunning: boolean
  isApplying: boolean
  error: string | null
  aiResult: PlanningAssistantResponse | null
  onClose: () => void
  onRunAI: () => void
  onAcceptManual: (krId: string | null) => void
  onAcceptAI: (krId: string, releaseId: string, decision: AssistantDecision) => void
}) {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('ai')
  const [manualKRId, setManualKRId] = useState('')
  const [manualOutOfScope, setManualOutOfScope] = useState(false)
  const [aiKRId, setAiKRId] = useState('')
  const [aiReleaseId, setAiReleaseId] = useState('')

  if (!open || !intent) return null

  const unusedKRs = availableKeyResults.filter((kr) => !intent.linked_key_result_ids.includes(kr.id))
  const decision = aiResult?.suggestion.decision
  const aiKRCandidates = aiResult?.suggestion.key_result_candidates ?? []
  const aiReleaseCandidates = aiResult?.suggestion.release_candidates ?? []

  const canAccept = activeTab === 'manual'
    ? Boolean(manualKRId || manualOutOfScope)
    : Boolean(aiResult && (decision === 'out-of-scope' || decision === 'propose-new-okr' || aiKRId))

  function handleAccept() {
    if (activeTab === 'manual') {
      onAcceptManual(manualOutOfScope ? null : manualKRId || null)
    } else if (aiResult) {
      onAcceptAI(aiKRId || '', aiReleaseId || '', decision || 'bind-existing')
    }
  }

  return (
    <div className="prototype-overlay-backdrop" role="dialog" aria-modal="true" aria-label="Update key result" onClick={onClose}>
      <div className="prototype-dialog planning-assistant-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="planning-assistant-dialog-header">
          <div>
            <p className="workspace-eyebrow">Update Key Result</p>
            <h2>{intent.title}</h2>
          </div>
          <button type="button" className="tool-button" aria-label="Close dialog" onClick={onClose}>Close</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <button type="button" className={`planning-stage-tab${activeTab === 'ai' ? ' active' : ''}`} onClick={() => setActiveTab('ai')}>
            <strong>AI Assisted</strong>
            <span>Let AI suggest the best KR</span>
          </button>
          <button type="button" className={`planning-stage-tab${activeTab === 'manual' ? ' active' : ''}`} onClick={() => setActiveTab('manual')}>
            <strong>Manual</strong>
            <span>Pick a KR yourself</span>
          </button>
        </div>

        <div className="planning-assistant-dialog-body">
          {activeTab === 'manual' ? (
            <div className="planning-detail-stack">
              <article className="planning-assistant-summary">
                <strong>Bind this intent to a key result</strong>
                <p>Choose an existing key result below.</p>
              </article>
              <div className="planning-inline-editor">
                <select
                  value={manualKRId}
                  onChange={(event) => setManualKRId(event.target.value)}
                  disabled={manualOutOfScope}
                >
                  <option value="">Select a key result…</option>
                  {unusedKRs.map((kr) => (
                    <option key={kr.id} value={kr.id}>
                      {kr.code} — {kr.title}
                    </option>
                  ))}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', padding: '0.5rem 0' }}>
                <input
                  type="checkbox"
                  checked={manualOutOfScope}
                  onChange={(event) => {
                    setManualOutOfScope(event.target.checked)
                    if (event.target.checked) setManualKRId('')
                  }}
                  style={{ width: 16, height: 16, accentColor: '#6ee7b7' }}
                />
                <span>Mark this intent as out of scope</span>
              </label>
            </div>
          ) : (
            <>
              <article className="planning-assistant-summary">
                <strong>AI-assisted key result binding</strong>
                <p>Let AI analyze this intent and recommend the best key result, or propose a new objective and key result if nothing fits.</p>
              </article>

              {!aiResult && !isRunning && !error ? (
                <div className="planning-assistant-dialog-body">
                  <button type="button" className="planning-mini-action" onClick={onRunAI}>
                    <Icon icon={sparkles} />
                    Run AI Decide
                  </button>
                  <p className="planning-inline-assistant-copy">AI will review the current intent, release lanes, and OKR graph to decide the best binding.</p>
                </div>
              ) : null}

              {isRunning ? (
                <div className="planning-assistant-dialog-body">
                  <article className="planning-assistant-summary">
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Icon icon={loader} style={{ animation: 'spin 0.85s linear infinite' }} />
                      AI is evaluating this intent
                    </strong>
                    <p>Reviewing the current intent, release lanes, and OKR graph to decide whether this should bind to an existing KR, create a new O/KR, or stay out of scope.</p>
                  </article>
                </div>
              ) : null}

              {!isRunning && error ? (
                <div className="planning-assistant-dialog-body">
                  <article className="planning-warning-card planning-error-card">
                    <strong>Assistant planning failed</strong>
                    <p>{error}</p>
                  </article>
                  <button type="button" className="planning-mini-action" onClick={onRunAI}>
                    <Icon icon={sparkles} />
                    Run AI Decide
                  </button>
                  <p className="planning-inline-assistant-copy">Click to retry. The AI may return a better response on the next attempt.</p>
                </div>
              ) : null}

              {!isRunning && aiResult ? (
                <>
                  <article className="planning-assistant-summary">
                    <strong>{decision === 'bind-existing' ? 'Bind existing KR' : decision === 'propose-new-okr' ? 'Create new O/KR' : 'Mark out of scope'}</strong>
                    <p>{aiResult.suggestion.summary}</p>
                    <p className="planning-detail-note">{aiResult.suggestion.why_now}</p>
                  </article>

                  {decision === 'bind-existing' ? (
                    <div className="planning-detail-stack">
                      <span className="runtime-overview-label">Select a key result</span>
                      <div className="planning-list-stack">
                        {aiKRCandidates.slice(0, 3).map((candidate) => (
                          <button
                            key={candidate.id}
                            type="button"
                            className={`planning-list-card${aiKRId === candidate.id ? ' selected' : ''}`}
                            onClick={() => {
                              setAiKRId(candidate.id)
                              const release = aiReleaseCandidates.find((r) => r.id === candidate.id) || aiReleaseCandidates[0]
                              if (release) setAiReleaseId(release.id)
                            }}
                          >
                            <div className="planning-list-card-head">
                              <div>
                                <span className="workspace-eyebrow">{candidate.objective_code} — {candidate.code}</span>
                                <strong>{candidate.title}</strong>
                              </div>
                              <span className={`status-pill ${candidate.confidence === 'high' ? 'status-good' : candidate.confidence === 'medium' ? 'status-neutral' : 'status-warn'}`}>
                                {candidate.confidence}
                              </span>
                            </div>
                            <p>{candidate.rationale}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {decision === 'propose-new-okr' ? (
                    <div className="planning-assistant-outcome-grid">
                      <article className="planning-assistant-outcome-card">
                        <span className="runtime-overview-label">New Objective</span>
                        <strong>{aiResult.suggestion.proposed_objective?.title || 'No objective proposed'}</strong>
                        <p>{aiResult.suggestion.proposed_objective?.description || 'Missing objective description.'}</p>
                      </article>
                      <article className="planning-assistant-outcome-card">
                        <span className="runtime-overview-label">New Key Result</span>
                        <strong>{aiResult.suggestion.proposed_key_result?.title || 'No key result proposed'}</strong>
                        <p>{aiResult.suggestion.proposed_key_result ? `${aiResult.suggestion.proposed_key_result.metric} · ${aiResult.suggestion.proposed_key_result.target}` : 'Missing KR definition.'}</p>
                      </article>
                    </div>
                  ) : null}

                  {decision === 'out-of-scope' ? (
                    <article className="planning-assistant-outcome-card">
                      <span className="runtime-overview-label">Out of Scope</span>
                      <strong>This intent is outside the current goals</strong>
                      <p>{aiResult.suggestion.out_of_scope_reason || 'No reason provided.'}</p>
                    </article>
                  ) : null}

                  {aiResult.suggestion.warnings.length ? (
                    <div className="planning-validation-list">
                      {aiResult.suggestion.warnings.map((warning) => (
                        <article key={warning} className="planning-warning-card planning-warning-info">
                          <p>{warning}</p>
                        </article>
                      ))}
                    </div>
                  ) : null}

                  <article className="planning-assistant-summary">
                    <strong>Next action if accepted</strong>
                    <p>{aiResult.suggestion.next_action}</p>
                  </article>
                </>
              ) : null}
            </>
          )}
        </div>

        <div className="planning-assistant-dialog-actions">
          <button type="button" className="tool-button" onClick={onClose} disabled={isApplying}>Cancel</button>
          {activeTab === 'ai' && aiResult && !isRunning ? (
            <button type="button" className="tool-button" onClick={onRunAI} disabled={isRunning || isApplying}>
              <Icon icon={sparkles} />
              Re-run AI
            </button>
          ) : null}
          {activeTab === 'ai' && isRunning ? (
            <button type="button" className="tool-button" disabled>
              <Icon icon={loader} style={{ animation: 'spin 0.85s linear infinite' }} />
              Running…
            </button>
          ) : null}
          <button type="button" className="planning-mini-action" onClick={handleAccept} disabled={!canAccept || isApplying}>
            <Icon icon={plus} />
            {isApplying ? 'Applying...' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ObjectiveTree({
  objective,
  selectedId,
  onSelect,
}: {
  objective: PlanningObjective
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="planning-objective-node">
      <button
        type="button"
        className={`planning-objective-button${selectedId === objective.id ? ' selected' : ''}`}
        onClick={() => onSelect(objective.id)}
      >
        <div>
          <span className="workspace-eyebrow">{objective.code}</span>
          <strong>{objective.title}</strong>
        </div>
        <span className="status-pill status-neutral">{objective.key_results.length} KR</span>
      </button>
      {objective.key_results.length ? (
        <div className="planning-objective-kr-list">
          {objective.key_results.map((keyResult) => (
            <button
              key={keyResult.id}
              type="button"
              className={`planning-key-result-chip${selectedId === keyResult.id ? ' selected' : ''}`}
              onClick={() => onSelect(keyResult.id)}
            >
              <Icon icon={blocks} />
              {keyResult.code}
            </button>
          ))}
        </div>
      ) : null}
      {objective.children.length ? (
        <div className="planning-objective-children">
          {objective.children.map((child) => (
            <ObjectiveTree key={child.id} objective={child} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DetailPanel({
  detail,
  onSelectNode,
}: {
  detail: DetailRecord | null
  onSelectNode: (id: string) => void
}) {
  if (!detail) {
    return (
      <article className="planning-detail-card">
        <p className="workspace-eyebrow">Selection</p>
        <h3>Pick one item to drill down</h3>
        <p>Start from overview, then move into OKR, releases, intents, or the native graph only when you need detail.</p>
      </article>
    )
  }

  if (detail.kind === 'workspace') {
    return (
      <article className="planning-detail-card">
        <p className="workspace-eyebrow">Workspace</p>
        <h3>{detail.title}</h3>
        <p>{excerpt(detail.summary, 220)}</p>
        <div className="planning-detail-metrics">
          {detail.metrics.map((metric) => (
            <span key={metric} className="meta-pill">{metric}</span>
          ))}
        </div>
      </article>
    )
  }

  if (detail.kind === 'objective') {
    return (
      <article className="planning-detail-card">
        <p className="workspace-eyebrow">Objective {detail.objective.code}</p>
        <h3>{detail.objective.title}</h3>
        <p>{excerpt(detail.objective.description, 200)}</p>
        <p className="planning-detail-note">{excerpt(detail.objective.success_criteria, 160)}</p>
        <div className="planning-detail-metrics">
          <span className="meta-pill">{detail.objective.key_results.length} key results</span>
          <span className="meta-pill">{countObjectiveBranches(detail.objective)} child objectives</span>
        </div>
        {detail.objective.key_results.length ? (
          <div className="planning-detail-list">
            <span className="runtime-overview-label">Key results</span>
            <div className="planning-chip-row">
              {detail.objective.key_results.map((keyResult) => (
                <button key={keyResult.id} type="button" className="planning-key-result-chip" onClick={() => onSelectNode(keyResult.id)}>
                  {keyResult.code}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </article>
    )
  }

  if (detail.kind === 'key_result') {
    return (
      <article className="planning-detail-card">
        <p className="workspace-eyebrow">Key Result {detail.keyResult.code}</p>
        <h3>{detail.keyResult.title}</h3>
        <p>{excerpt(detail.keyResult.description, 200)}</p>
        <div className="planning-detail-stack">
          <div>
            <span className="runtime-overview-label">Metric</span>
            <strong>{detail.keyResult.metric || 'Not set'}</strong>
          </div>
          <div>
            <span className="runtime-overview-label">Target</span>
            <strong>{detail.keyResult.target || 'Not set'}</strong>
          </div>
        </div>
        <p className="planning-detail-note">{excerpt(detail.keyResult.success_criteria, 160)}</p>
        <div className="planning-detail-list">
          <span className="runtime-overview-label">Linked intents</span>
          <div className="planning-chip-row">
            {detail.intents.length ? detail.intents.map((intent) => (
              <button key={intent.id} type="button" className={`meta-pill ${intentTone(intent)}`} onClick={() => onSelectNode(intent.id)}>
                {intent.title}
              </button>
            )) : <span className="meta-pill status-warn">No intent mapped yet</span>}
          </div>
        </div>
      </article>
    )
  }

  if (detail.kind === 'release') {
    return (
      <article className="planning-detail-card">
        <p className="workspace-eyebrow">Release {detail.release.code}</p>
        <h3>{detail.release.title}</h3>
        <p>{excerpt(detail.release.description, 200)}</p>
        <div className="planning-detail-metrics">
          <span className="meta-pill">{detail.release.progress}% complete</span>
          <span className="meta-pill">{detail.release.intents.length} intents</span>
          <span className="meta-pill">{detail.release.state}</span>
        </div>
        <div className="planning-detail-list">
          <span className="runtime-overview-label">Included intents</span>
          <div className="planning-link-list">
            {detail.release.intents.slice(0, 6).map((intent) => (
              <button key={intent.id} type="button" className="planning-link-row" onClick={() => onSelectNode(intent.id)}>
                <span>{intent.title}</span>
                <span className={`status-pill ${intentTone(intent)}`}>{lifecycleLabel(intent.lifecycle)}</span>
              </button>
            ))}
          </div>
        </div>
      </article>
    )
  }

  if (detail.kind === 'intent') {
    return (
      <article className="planning-detail-card">
        <p className="workspace-eyebrow">Intent</p>
        <h3>{detail.intent.title}</h3>
        <p>{excerpt(detail.intent.summary || detail.intent.goal_text, 220)}</p>
        <div className="planning-detail-metrics">
          <span className={`meta-pill ${intentTone(detail.intent)}`}>{lifecycleLabel(detail.intent.lifecycle)}</span>
          <span className="meta-pill">{detail.intent.task_count} tasks</span>
          <span className={`meta-pill ${detail.intent.validation_state === 'linked' ? 'status-good' : 'status-warn'}`}>
            {validationLabel(detail.intent, detail.keyResults.length)}
          </span>
        </div>
        {(detail.intent.focus_current || detail.intent.focus_next_action) ? (
          <div className="planning-detail-stack">
            <div>
              <span className="runtime-overview-label">Current focus</span>
              <p>{detail.intent.focus_current || 'Not set'}</p>
            </div>
            <div>
              <span className="runtime-overview-label">Next action</span>
              <p>{detail.intent.focus_next_action || 'Not set'}</p>
            </div>
          </div>
        ) : null}
        {detail.intent.out_of_scope_reason ? (
          <div className="planning-detail-list">
            <span className="runtime-overview-label">Out of scope reason</span>
            <p>{detail.intent.out_of_scope_reason}</p>
          </div>
        ) : null}
        {detail.intent.proposed_objective || detail.intent.proposed_key_result ? (
          <div className="planning-detail-list">
            <span className="runtime-overview-label">Pending proposal</span>
            <div className="planning-detail-stack">
              {detail.intent.proposed_objective ? <p>Objective: {detail.intent.proposed_objective.title}</p> : null}
              {detail.intent.proposed_key_result ? <p>Key result: {detail.intent.proposed_key_result.title}</p> : null}
            </div>
          </div>
        ) : null}
        {detail.keyResults.length ? (
          <div className="planning-detail-list">
            <span className="runtime-overview-label">Linked key results</span>
            <div className="planning-chip-row">
              {detail.keyResults.map((keyResult) => (
                <button key={keyResult.id} type="button" className="planning-key-result-chip" onClick={() => onSelectNode(keyResult.id)}>
                  {keyResult.code}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {detail.intent.tasks.length ? (
          <div className="planning-detail-list">
            <span className="runtime-overview-label">Tasks</span>
            <div className="planning-link-list">
              {detail.intent.tasks.slice(0, 5).map((task) => (
                <button key={task.id} type="button" className="planning-link-row" onClick={() => onSelectNode(task.id)}>
                  <span>{task.title}</span>
                  <span className="status-pill status-neutral">{lifecycleLabel(task.state)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </article>
    )
  }

  return (
    <article className="planning-detail-card">
      <p className="workspace-eyebrow">Task</p>
      <h3>{detail.task.title}</h3>
      <p>{excerpt(detail.task.description, 220)}</p>
      <div className="planning-detail-metrics">
        <span className="meta-pill">{lifecycleLabel(detail.task.state)}</span>
        <span className="meta-pill">{detail.task.section}</span>
        <span className="meta-pill">{detail.task.source}</span>
        {detail.intent ? <button type="button" className="meta-pill" onClick={() => onSelectNode(detail.intent!.id)}>{detail.intent.title}</button> : null}
      </div>
    </article>
  )
}

export function IntentsListPage() {
  const workspaceQuery = usePlanningWorkspace()
  const queryClient = useQueryClient()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('node')
  })
  const [intentFilter, setIntentFilter] = useState<IntentFilter>('all')
  const [activeView, setActiveView] = useState<PlanningView>(() => {
    if (typeof window === 'undefined') return 'overview'
    return parsePlanningView(new URLSearchParams(window.location.search).get('view'))
  })
  const [searchText, setSearchText] = useState('')
  const [releaseIntentDrafts, setReleaseIntentDrafts] = useState<Record<string, string>>({})
  const [updateKRDialogIntentId, setUpdateKRDialogIntentId] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<PlanningAssistantResponse | null>(null)
  const deferredSearch = useDeferredValue(searchText)

  const data = workspaceQuery.data

  useEffect(() => {
    if (!data?.graph.nodes.length) return
    if (selectedNodeId && data.graph.nodes.some((node) => node.id === selectedNodeId)) return
    setSelectedNodeId(data.workspace.id)
  }, [data, selectedNodeId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (activeView === 'overview') {
      url.searchParams.delete('view')
    } else {
      url.searchParams.set('view', activeView)
    }

    if (selectedNodeId) {
      url.searchParams.set('node', selectedNodeId)
    } else {
      url.searchParams.delete('node')
    }

    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [activeView, selectedNodeId])

  const objectiveList = useMemo(() => flattenObjectives(data?.objectives ?? []), [data?.objectives])
  const keyResultMap = useMemo(() => new Map((data?.keyResults ?? []).map((keyResult) => [keyResult.id, keyResult])), [data?.keyResults])
  const intentMap = useMemo(() => new Map((data?.intents ?? []).map((intent) => [intent.id, intent])), [data?.intents])
  const releaseMap = useMemo(() => new Map((data?.releases ?? []).map((release) => [release.id, release])), [data?.releases])
  const taskMap = useMemo(() => new Map((data?.intents ?? []).flatMap((intent) => intent.tasks.map((task) => [task.id, { task, intent }] as const))), [data?.intents])

  const filteredIntents = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    return (data?.intents ?? []).filter((intent) => {
      if (intentFilter === 'linked' && intent.validation_state !== 'linked') return false
      if (intentFilter === 'missing-kr' && intent.validation_state !== 'missing-key-result') return false
      if (intentFilter === 'proposed' && intent.validation_state !== 'proposed-new-key-result') return false
      if (intentFilter === 'out-of-scope' && intent.validation_state !== 'out-of-scope') return false
      if (intentFilter === 'active' && intent.lifecycle !== 'active') return false
      if (intentFilter === 'backlog' && intent.lifecycle !== 'backlog' && intent.lifecycle !== 'draft') return false
      if (intentFilter === 'closed' && !['closed', 'done', 'archived'].includes(intent.lifecycle)) return false
      if (!query) return true
      return `${intent.id} ${intent.title} ${intent.summary} ${intent.goal_text}`.toLowerCase().includes(query)
    })
  }, [data?.intents, deferredSearch, intentFilter])

  const graphNodes = useMemo(() => {
    if (!data) return []
    if (!deferredSearch.trim()) return data.graph.nodes
    const searchQuery = deferredSearch.trim().toLowerCase()
    return data.graph.nodes.filter((node) => `${node.label} ${node.detail} ${node.metrics.join(' ')}`.toLowerCase().includes(searchQuery))
  }, [data, deferredSearch])

  const graphNodeIds = useMemo(() => new Set(graphNodes.map((node) => node.id)), [graphNodes])
  const graphEdges = useMemo(() => {
    if (!data) return []
    return data.graph.edges.filter((edge) => graphNodeIds.has(edge.source) && graphNodeIds.has(edge.target))
  }, [data, graphNodeIds])

  const detail = useMemo<DetailRecord | null>(() => {
    if (!data || !selectedNodeId) return null
    if (selectedNodeId === data.workspace.id) {
      return {
        kind: 'workspace',
        title: data.workspace.title,
        summary: data.workspace.description,
        metrics: [
          `${data.summary.objectives} objectives`,
          `${data.summary.keyResults} key results`,
          `${data.summary.intents} intents`,
          `${data.summary.tasks} tasks`,
        ],
      }
    }

    const objective = objectiveList.find((item) => item.id === selectedNodeId)
    if (objective) return { kind: 'objective', objective }

    const keyResult = keyResultMap.get(selectedNodeId)
    if (keyResult) {
      const intents = (data.intents ?? []).filter((intent) => intent.linked_key_result_ids.includes(keyResult.id))
      return { kind: 'key_result', keyResult, intents }
    }

    const release = releaseMap.get(selectedNodeId)
    if (release) return { kind: 'release', release }

    const intent = intentMap.get(selectedNodeId)
    if (intent) {
      const linkedKeyResults = intent.linked_key_result_ids.map((id) => keyResultMap.get(id)).filter((item): item is PlanningKeyResult => Boolean(item))
      return { kind: 'intent', intent, keyResults: linkedKeyResults }
    }

    const taskRecord = taskMap.get(selectedNodeId)
    if (taskRecord) return { kind: 'task', task: taskRecord.task, intent: taskRecord.intent }

    return null
  }, [data, selectedNodeId, objectiveList, keyResultMap, releaseMap, intentMap, taskMap])

  const missingKeyResultIntents = useMemo(
    () => filteredIntents.filter((intent) => intent.validation_state === 'missing-key-result'),
    [filteredIntents],
  )

  const featuredRelease = useMemo(
    () => (data?.releases ?? []).find((release) => release.state === 'active') ?? (data?.releases ?? [])[0] ?? null,
    [data?.releases],
  )

  const prioritizedIntents = useMemo(() => {
    const bucket = [...filteredIntents]
    return bucket.sort((left, right) => {
      const leftScore = (left.validation_state === 'missing-key-result' ? 3 : left.validation_state === 'proposed-new-key-result' ? 2 : 0) + (left.lifecycle === 'active' ? 2 : 0)
      const rightScore = (right.validation_state === 'missing-key-result' ? 3 : right.validation_state === 'proposed-new-key-result' ? 2 : 0) + (right.lifecycle === 'active' ? 2 : 0)
      return rightScore - leftScore || left.id.localeCompare(right.id)
    })
  }, [filteredIntents])

  const topObjectives = useMemo(() => objectiveList.slice(0, 4), [objectiveList])
  const activeIntents = useMemo(() => filteredIntents.filter((intent) => intent.lifecycle === 'active').slice(0, 5), [filteredIntents])
  const linkedCoverage = data ? Math.round((data.summary.mappedIntents / Math.max(data.summary.intents, 1)) * 100) : 0
  const updateKRDialogIntent = updateKRDialogIntentId ? intentMap.get(updateKRDialogIntentId) ?? null : null

  function syncWorkspace(nextWorkspace: typeof data) {
    queryClient.setQueryData(['planning-workspace'], nextWorkspace)
  }

  const addIntentKeyResultMutation = useMutation({
    mutationFn: ({ intentId, keyResultId }: { intentId: string; keyResultId: string }) => addIntentKeyResultLink(intentId, keyResultId),
    onSuccess: (result) => {
      syncWorkspace(result.workspace)
      setUpdateKRDialogIntentId(null)
      setAiResult(null)
    },
  })

  const removeIntentKeyResultMutation = useMutation({
    mutationFn: ({ intentId, keyResultId }: { intentId: string; keyResultId: string }) => removeIntentKeyResultLink(intentId, keyResultId),
    onSuccess: (result) => {
      syncWorkspace(result.workspace)
    },
  })

  const addIntentToReleaseMutation = useMutation({
    mutationFn: ({ releaseId, intentId }: { releaseId: string; intentId: string }) => addIntentToRelease(releaseId, intentId),
    onSuccess: (result, variables) => {
      syncWorkspace(result.workspace)
      setReleaseIntentDrafts((current) => ({ ...current, [variables.releaseId]: '' }))
    },
  })

  const removeIntentFromReleaseMutation = useMutation({
    mutationFn: ({ releaseId, intentId }: { releaseId: string; intentId: string }) => removeIntentFromRelease(releaseId, intentId),
    onSuccess: (result) => {
      syncWorkspace(result.workspace)
    },
  })

  const assistantPlanMutation = useMutation({
    mutationFn: (intentId: string) => generateIntentAssistantPlan(intentId),
    onSuccess: (result) => {
      setAiResult(result)
    },
  })

  const assistantApplyMutation = useMutation({
    mutationFn: ({ intentId, body }: { intentId: string; body: PlanningAssistantResponse['suggestion'] }) => applyIntentAssistantPlan(intentId, body),
    onSuccess: (result) => {
      syncWorkspace(result.workspace)
      setUpdateKRDialogIntentId(null)
      setAiResult(null)
    },
  })

  function openUpdateKRDailog(intentId: string) {
    openView('intents', intentId)
    setUpdateKRDialogIntentId(intentId)
    setAiResult(null)
  }

  function runAIForDialog() {
    if (updateKRDialogIntentId) {
      assistantPlanMutation.mutate(updateKRDialogIntentId)
    }
  }

  function handleAcceptManual(krId: string | null) {
    if (!updateKRDialogIntent) return
    if (!krId) {
      markIntentOutOfScope(updateKRDialogIntent.id)
    } else {
      addIntentKeyResultMutation.mutate({ intentId: updateKRDialogIntent.id, keyResultId: krId })
    }
  }

  function handleAcceptAI(krId: string, releaseId: string, decision: AssistantDecision) {
    if (!updateKRDialogIntent || !aiResult) return
    void adoptAssistantRecommendation(updateKRDialogIntent, krId, releaseId, decision)
  }

  function openView(view: PlanningView, nodeId?: string | null) {
    setActiveView(view)
    if (nodeId) {
      setSelectedNodeId(nodeId)
    }
  }

  function intentOptionsForRelease(release: PlanningRelease) {
    const currentIntentIds = new Set(release.intents.map((intent) => intent.id))
    return (data?.intents ?? []).filter((intent) => !currentIntentIds.has(intent.id))
  }

  async function adoptAssistantRecommendation(intent: PlanningIntent, krId: string, releaseId: string, decision: AssistantDecision) {
    const suggestion = aiResult?.suggestion
    if (!suggestion) return
    await assistantApplyMutation.mutateAsync({
      intentId: intent.id,
      body: {
        ...suggestion,
        decision,
        primary_key_result_id: decision === 'bind-existing' ? (krId || null) : null,
        primary_release_id: releaseId || null,
      },
    })
  }

  async function markIntentOutOfScope(intentId: string) {
    const intent = intentMap.get(intentId)
    if (!intent) return
    await assistantApplyMutation.mutateAsync({
      intentId,
      body: {
        decision: 'out-of-scope',
        summary: `Intent ${intent.title} is intentionally kept outside the current OKR scope.`,
        why_now: 'This intent does not map cleanly to an existing key result, and the operator explicitly chose to keep it outside the active OKR system.',
        next_action: 'Keep it visible through the out-of-scope filter and revisit only if workspace goals change.',
        primary_key_result_id: null,
        primary_release_id: null,
        key_result_candidates: [],
        release_candidates: [],
        proposed_objective: null,
        proposed_key_result: null,
        out_of_scope_reason: 'Manually marked out of scope from the intent workspace.',
        warnings: [],
      },
    })
    setUpdateKRDialogIntentId(null)
  }

  if (workspaceQuery.isLoading) {
    return (
      <section className="workspace-page planning-workspace-page">
        <div className="prototype-skeleton-stack">
          <span />
          <span />
          <span />
        </div>
      </section>
    )
  }

  if (workspaceQuery.isError || !data) {
    return (
      <section className="workspace-page planning-workspace-page">
        <article className="planning-detail-card planning-error-card">
          <h2>Planning workspace unavailable</h2>
          <p>{workspaceQuery.error instanceof Error ? workspaceQuery.error.message : 'Graph workspace could not be loaded.'}</p>
        </article>
      </section>
    )
  }

  return (
    <section className="workspace-page planning-workspace-page">
      <div className="planning-hero">
        <div className="planning-hero-copy">
          <p className="workspace-eyebrow">Intent Workspace v3.0</p>
          <h1>{data.northStar.title}</h1>
          <p>{withSampleCopy(data.northStar.description)}</p>
          <div className="planning-hero-meta">
            <span className="meta-pill">{data.workspace.mode}</span>
            <span className="meta-pill">GraphDB native</span>
            <span className="meta-pill">Checked {new Date(data.checkedAt).toLocaleString()}</span>
          </div>
        </div>
        <div className="planning-metrics-grid">
          <MetricCard label="Objectives" value={String(data.summary.objectives)} tone="status-neutral" icon={target} />
          <MetricCard label="Key Results" value={String(data.summary.keyResults)} tone="status-good" icon={blocks} />
          <MetricCard label="Intents" value={String(data.summary.intents)} tone="status-live" icon={waypoints} />
          <MetricCard label="Tasks" value={String(data.summary.tasks)} tone="status-neutral" icon={listTodo} />
        </div>
      </div>

      <div className="planning-focus-strip">
        <article className="planning-focus-card">
          <p className="workspace-eyebrow">What matters now</p>
          <h3>{featuredRelease ? featuredRelease.title : 'Release view is ready'}</h3>
          <p>{featuredRelease ? excerpt(featuredRelease.description, 140) : 'Use releases as the first aggregation layer before drilling into individual intents.'}</p>
          <button type="button" className="planning-inline-action" onClick={() => openView('releases', featuredRelease?.id ?? null)}>
            Open releases
            <Icon icon={chevronRight} />
          </button>
        </article>
        <article className="planning-focus-card">
          <p className="workspace-eyebrow">Coverage</p>
          <h3>{linkedCoverage}% of intents mapped to KR</h3>
          <p>{data.summary.mappedIntents} linked intents already anchor execution to a measurable key result.</p>
          <button type="button" className="planning-inline-action" onClick={() => openView('okr')}>
            Open OKR explorer
            <Icon icon={chevronRight} />
          </button>
        </article>
        <article className="planning-focus-card planning-focus-card-warn">
          <p className="workspace-eyebrow">Needs action</p>
          <h3>{data.summary.intentsWithoutKeyResult} intents still missing KR</h3>
          <p>These stay visible as remediation work instead of blending into healthy execution records.</p>
          <button type="button" className="planning-inline-action" onClick={() => openView('intents', missingKeyResultIntents[0]?.id ?? null)}>
            Review remediation queue
            <Icon icon={chevronRight} />
          </button>
        </article>
      </div>

      <div className="planning-stage-nav">
        <StageTab active={activeView === 'overview'} label="Overview" caption="Start broad, then drill down" onClick={() => openView('overview', data.workspace.id)} />
        <StageTab active={activeView === 'okr'} label="OKR" caption="Objectives first, key results second" onClick={() => openView('okr')} />
        <StageTab active={activeView === 'releases'} label="Releases" caption="Milestones are intent bundles" onClick={() => openView('releases')} />
        <StageTab active={activeView === 'intents'} label="Intents" caption="Execution records and remediation" onClick={() => openView('intents')} />
        <StageTab active={activeView === 'graph'} label="Graph" caption="Native graph only when needed" onClick={() => openView('graph')} />
      </div>

      {activeView === 'overview' ? (
        <div className="planning-story-grid">
          <article className="planning-panel planning-story-card">
            <div className="planning-panel-head">
              <div>
                <p className="workspace-eyebrow">Top level</p>
                <h2>Overview before detail</h2>
              </div>
            </div>
            <div className="planning-overview-list">
              <button type="button" className="planning-link-row" onClick={() => openView('releases', featuredRelease?.id ?? null)}>
                <span>{featuredRelease ? featuredRelease.title : 'No release highlighted yet'}</span>
                <span className="meta-pill">{featuredRelease ? `${featuredRelease.intents.length} intents` : 'release'}</span>
              </button>
              <button type="button" className="planning-link-row" onClick={() => openView('okr', topObjectives[0]?.id ?? null)}>
                <span>{topObjectives[0] ? `${topObjectives[0].code} — ${topObjectives[0].title}` : 'No objective loaded'}</span>
                <span className="meta-pill">{topObjectives[0]?.key_results.length ?? 0} KR</span>
              </button>
              <button type="button" className="planning-link-row" onClick={() => openView('intents', activeIntents[0]?.id ?? null)}>
                <span>{activeIntents[0] ? activeIntents[0].title : 'No active intent in current filter'}</span>
                <span className={`meta-pill ${activeIntents[0] ? intentTone(activeIntents[0]) : 'status-neutral'}`}>{activeIntents[0] ? lifecycleLabel(activeIntents[0].lifecycle) : 'intent'}</span>
              </button>
            </div>
          </article>

          <article className="planning-panel planning-story-card">
            <div className="planning-panel-head">
              <div>
                <p className="workspace-eyebrow">Objectives</p>
                <h2>What the OKR layer is driving</h2>
              </div>
            </div>
            <div className="planning-list-stack">
              {topObjectives.map((objective) => (
                <button key={objective.id} type="button" className="planning-list-card" onClick={() => openView('okr', objective.id)}>
                  <div className="planning-list-card-head">
                    <div>
                      <span className="workspace-eyebrow">{objective.code}</span>
                      <strong>{objective.title}</strong>
                    </div>
                    <span className="status-pill status-neutral">{objective.key_results.length} KR</span>
                  </div>
                  <p>{excerpt(objective.description, 120)}</p>
                </button>
              ))}
            </div>
          </article>

          <article className="planning-panel planning-story-card">
            <div className="planning-panel-head">
              <div>
                <p className="workspace-eyebrow">Remediation</p>
                <h2>Intent must bind to KR</h2>
              </div>
            </div>
            <div className="planning-list-stack">
              {missingKeyResultIntents.slice(0, 5).map((intent) => (
                <article key={intent.id} className="planning-remediation-card planning-remediation-inline-card">
                  <button type="button" className="planning-remediation-summary" onClick={() => openView('intents', intent.id)}>
                    <div>
                      <strong>{intent.title}</strong>
                      <p>{intent.id}</p>
                    </div>
                    <Icon icon={chevronRight} />
                  </button>
                  <div className="planning-inline-assistant-row">
                    <button
                      type="button"
                      className="planning-inline-secondary-action"
                      onClick={() => openUpdateKRDailog(intent.id)}
                    >
                      <Icon icon={sparkles} />
                      <strong>Update KR</strong>
                    </button>
                    {intent.validation_state === 'proposed-new-key-result' ? (
                      <p className="planning-inline-assistant-result">
                        New O/KR proposed and pending acceptance
                      </p>
                    ) : intent.validation_state === 'out-of-scope' ? (
                      <p className="planning-inline-assistant-result">
                        Marked out of scope
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
              {!missingKeyResultIntents.length ? (
                <p className="system-card-subtle">No visible remediation item in the current scope.</p>
              ) : null}
            </div>
          </article>

          <article className="planning-panel planning-story-card">
            <div className="planning-panel-head">
              <div>
                <p className="workspace-eyebrow">Selection</p>
                <h2>Current drilldown</h2>
              </div>
            </div>
            <DetailPanel detail={detail} onSelectNode={setSelectedNodeId} />
          </article>
        </div>
      ) : null}

      {activeView === 'okr' ? (
        <div className="planning-stage-layout">
          <section className="planning-stage-primary">
            <article className="planning-panel">
              <div className="planning-panel-head">
                <div>
                  <p className="workspace-eyebrow">OKR Explorer</p>
                  <h2>Objectives first, then Key Results</h2>
                </div>
              </div>
              <p className="planning-section-copy">Start from the objective tree. Only after selecting an objective should the key results and linked intents become visible.</p>
              <div className="planning-objective-tree">
                {data.objectives.map((objective) => (
                  <ObjectiveTree key={objective.id} objective={objective} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />
                ))}
              </div>
            </article>
          </section>
          <aside className="planning-stage-aside">
            <DetailPanel detail={detail} onSelectNode={setSelectedNodeId} />
          </aside>
        </div>
      ) : null}

      {activeView === 'releases' ? (
        <div className="planning-stage-layout">
          <section className="planning-stage-primary">
            <article className="planning-panel">
              <div className="planning-panel-head">
                <div>
                  <p className="workspace-eyebrow">Release Lanes</p>
                  <h2>Milestones are collections of intents</h2>
                </div>
              </div>
              <div className="planning-release-grid">
                {data.releases.map((release) => (
                  <article key={release.id} className={`planning-release-card${selectedNodeId === release.id ? ' selected' : ''}`}>
                    <button type="button" className="planning-release-head" onClick={() => setSelectedNodeId(release.id)}>
                      <div>
                        <span className="workspace-eyebrow">{release.code}</span>
                        <h3>{release.title}</h3>
                      </div>
                      <span className={`status-pill ${release.state === 'active' ? 'status-good' : 'status-neutral'}`}>{release.state}</span>
                    </button>
                    <p>{excerpt(release.description, 140)}</p>
                    <div className="planning-release-progress">
                      <span style={{ width: `${release.progress}%` }} />
                    </div>
                    <div className="planning-release-meta">
                      <span>{release.progress}% complete</span>
                      <span>{release.intents.length} intents</span>
                    </div>
                    <div className="planning-release-members">
                      {release.intents.map((intent) => (
                        <div key={`${release.id}-${intent.id}`} className="planning-inline-chip">
                          <button type="button" className="planning-inline-chip-label" onClick={() => setSelectedNodeId(intent.id)}>
                            {intent.title}
                          </button>
                          {release.source_kind === 'declared' ? (
                            <button
                              type="button"
                              className="planning-inline-chip-remove"
                              onClick={() => removeIntentFromReleaseMutation.mutate({ releaseId: release.id, intentId: intent.id })}
                            >
                              <Icon icon={x} />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {release.source_kind === 'declared' ? (
                      <div className="planning-inline-editor">
                        <select
                          id={`release-intent-${release.id}`}
                          name={`release_intent_${release.id}`}
                          value={releaseIntentDrafts[release.id] ?? ''}
                          onChange={(event) => setReleaseIntentDrafts((current) => ({ ...current, [release.id]: event.target.value }))}
                        >
                          <option value="">Add intent to release</option>
                          {intentOptionsForRelease(release).map((intent) => (
                            <option key={intent.id} value={intent.id}>
                              {intent.id} - {intent.title}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="planning-mini-action"
                          disabled={!releaseIntentDrafts[release.id] || addIntentToReleaseMutation.isPending}
                          onClick={() => addIntentToReleaseMutation.mutate({ releaseId: release.id, intentId: releaseIntentDrafts[release.id] ?? '' })}
                        >
                          <Icon icon={plus} />
                          Add intent
                        </button>
                      </div>
                    ) : (
                      <p className="planning-section-copy">This release is derived from version buckets, so membership here is read-only.</p>
                    )}
                  </article>
                ))}
              </div>
            </article>
          </section>
          <aside className="planning-stage-aside">
            <DetailPanel detail={detail} onSelectNode={setSelectedNodeId} />
          </aside>
        </div>
      ) : null}

      {activeView === 'intents' ? (
        <div className="planning-stage-layout">
          <section className="planning-stage-primary">
            <article className="planning-toolbar">
              <label className="planning-search">
                <Icon icon={search} />
                <input
                  id="planning-intent-search"
                  name="planning_intent_search"
                  type="search"
                  placeholder="Search intents, summaries, or goal text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </label>
              <div className="planning-filter-row">
                {(['all', 'linked', 'missing-kr', 'proposed', 'out-of-scope', 'active', 'backlog', 'closed'] as IntentFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`status-pill planning-filter-pill${intentFilter === filter ? ' active' : ''}`}
                    onClick={() => setIntentFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </article>

            <article className="planning-panel">
              <div className="planning-panel-head">
                <div>
                  <p className="workspace-eyebrow">Intent Registry</p>
                  <h2>Execution records with remediation first</h2>
                </div>
              </div>
              <div className="planning-list-stack">
                {prioritizedIntents.map((intent) => (
                  <article
                    key={intent.id}
                    className={`planning-list-card planning-intent-list-card${selectedNodeId === intent.id ? ' selected' : ''}`}
                  >
                    <button type="button" className="planning-intent-list-card-main" onClick={() => setSelectedNodeId(intent.id)}>
                      <div className="planning-list-card-head">
                        <div>
                          <span className="workspace-eyebrow">{intent.id}</span>
                          <strong>{intent.title}</strong>
                        </div>
                        <span className={`status-pill ${intentTone(intent)}`}>{lifecycleLabel(intent.lifecycle)}</span>
                        {intent.validation_state === 'out-of-scope' ? (
                          <span className="status-pill status-out-of-scope">out of scope</span>
                        ) : null}
                      </div>
                      <p>{excerpt(intent.summary || intent.goal_text, 150)}</p>
                      <div className="planning-intent-card-meta">
                        <span>{intent.task_count} tasks</span>
                        <span>{intent.release_bucket}</span>
                        <span>{validationLabel(intent, intent.linked_key_result_ids.length)}</span>
                      </div>
                    </button>
                    <div className="planning-inline-editor-stack">
                      {intent.validation_state !== 'linked' ? (
                        <div className="planning-inline-assistant-row">
                          <button
                            type="button"
                            className="planning-inline-secondary-action"
                            onClick={() => openUpdateKRDailog(intent.id)}
                          >
                            <Icon icon={sparkles} />
                            <strong>Update KR</strong>
                          </button>
                          {intent.validation_state === 'proposed-new-key-result' ? (
                            <p className="planning-inline-assistant-result">
                              New O/KR proposed and pending acceptance
                            </p>
                          ) : intent.validation_state === 'out-of-scope' ? (
                            <p className="planning-inline-assistant-result">
                              Marked out of scope
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      {intent.linked_key_result_ids.length ? (
                        <div className="planning-release-members">
                          {intent.linked_key_result_ids.map((keyResultId) => {
                            const keyResult = keyResultMap.get(keyResultId)
                            return keyResult ? (
                              <div key={`${intent.id}-${keyResult.id}`} className="planning-inline-chip">
                                <button type="button" className="planning-inline-chip-label" onClick={() => setSelectedNodeId(keyResult.id)}>
                                  {keyResult.code}
                                </button>
                                <button
                                  type="button"
                                  className="planning-inline-chip-remove"
                                  onClick={() => removeIntentKeyResultMutation.mutate({ intentId: intent.id, keyResultId: keyResult.id })}
                                >
                                  <Icon icon={x} />
                                </button>
                              </div>
                            ) : null
                          })}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </section>
          <aside className="planning-stage-aside">
            <DetailPanel detail={detail} onSelectNode={setSelectedNodeId} />
          </aside>
        </div>
      ) : null}

      {activeView === 'graph' ? (
        <div className="planning-stage-layout">
          <section className="planning-stage-primary">
            <article className="planning-toolbar">
              <label className="planning-search">
                <Icon icon={search} />
                <input
                  id="planning-graph-search"
                  name="planning_graph_search"
                  type="search"
                  placeholder="Search graph nodes"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </label>
              <div className="planning-filter-row">
                <span className={`status-pill ${data.summary.intentsWithoutKeyResult ? 'status-warn' : 'status-good'}`}>
                  <Icon icon={alertTriangle} />
                  {data.summary.intentsWithoutKeyResult ? `${data.summary.intentsWithoutKeyResult} intents missing key result` : 'Graph workspace aligned'}
                </span>
              </div>
            </article>

            <article className="planning-panel planning-panel-graph">
              <div className="planning-panel-head">
                <div>
                  <p className="workspace-eyebrow">Native Graph</p>
                  <h2>Use only when structure matters</h2>
                </div>
              </div>
              <PlanningNativeGraph
                nodes={graphNodes}
                edges={graphEdges}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            </article>
          </section>
          <aside className="planning-stage-aside">
            <DetailPanel detail={detail} onSelectNode={setSelectedNodeId} />
            <article className="planning-panel">
              <div className="planning-panel-head">
                <div>
                  <p className="workspace-eyebrow">Warnings</p>
                  <h2>Graph validations</h2>
                </div>
              </div>
              <div className="planning-validation-list">
                {data.validation.warnings.slice(0, 10).map((warning) => (
                  <article key={warning.id} className={`planning-warning-card planning-warning-${warning.level}`}>
                    <strong>{warning.code}</strong>
                    <p>{warning.message}</p>
                  </article>
                ))}
              </div>
            </article>
          </aside>
        </div>
      ) : null}

      <UpdateKRDialog
        open={Boolean(updateKRDialogIntentId && updateKRDialogIntent)}
        intent={updateKRDialogIntent}
        availableKeyResults={data?.keyResults ?? []}
        isRunning={assistantPlanMutation.isPending && assistantPlanMutation.variables === updateKRDialogIntentId}
        isApplying={assistantApplyMutation.isPending}
        error={assistantPlanMutation.isError && assistantPlanMutation.variables === updateKRDialogIntentId
          ? (assistantPlanMutation.error instanceof Error ? assistantPlanMutation.error.message : 'Assistant planning failed.')
          : null}
        aiResult={aiResult}
        onClose={() => { setUpdateKRDialogIntentId(null); setAiResult(null) }}
        onRunAI={runAIForDialog}
        onAcceptManual={handleAcceptManual}
        onAcceptAI={handleAcceptAI}
      />
    </section>
  )
}
