import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@iconify/react'
import flag from '@iconify-icons/lucide/flag'
import flagTriangleRight from '@iconify-icons/lucide/flag-triangle-right'
import layers3 from '@iconify-icons/lucide/layers-3'
import files from '@iconify-icons/lucide/files'
import shieldAlert from '@iconify-icons/lucide/shield-alert'
import { useIntentsList } from '../hooks/useIntentsList'
import { useIntentDetail } from '../hooks/useIntentDetail'
import { useSystemSnapshot, systemSnapshotQueryKey } from '../hooks/useSystemSnapshot'

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

export function IntentsListPage() {
  const queryClient = useQueryClient()
  const intentsQuery = useIntentsList()
  const systemSnapshotQuery = useSystemSnapshot()
  const intents = intentsQuery.data?.parsed?.intents ?? []
  const snapshotMetadata = systemSnapshotQuery.data?.metadata
  const focusIntentId = snapshotMetadata?.focusIntentId ?? null
  const activeIntentId = snapshotMetadata?.activeIntentId ?? null
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null)

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

  const detailQuery = useIntentDetail(selectedIntentId)
  const detail = detailQuery.data?.detail ?? null

  const activeCount = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'active').length
  const backlogCount = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'backlog').length
  const closedCount = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'closed').length
  const droppedCount = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'dropped').length
  const selectedTaskCount = detail?.tasks?.length ?? 0
  const selectedStagedFilesCount = detail?.stagedFiles?.length ?? 0
  const selectedPendingTask = detail?.tasks?.find((task) => task.status !== 'done') ?? detail?.tasks?.[0] ?? null
  const detailStatus = detail ? formatIntentStatus(detail) : 'Select an intent'

  const refreshAll = async () => {
    await Promise.all([
      intentsQuery.refetch(),
      detailQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: systemSnapshotQueryKey }),
    ])
  }

  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">Intent Workspace</p>
          <h1>Intents</h1>
          <p className="intent-page-summary">
            Live queue and detail now read from the bridge. Mutations stay intentionally deferred until the runtime contract is fully real.
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

      <div className="workspace-grid intent-workspace-grid intent-workspace-live-grid">
        <section className="surface-panel surface-panel-primary">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Inventory</p>
              <h2>Intent Queue</h2>
            </div>
            <div className="panel-toolbar-meta">
              <span className="count-pill">{intents.length} total</span>
              <span className="count-pill">{activeCount} active</span>
              <span className="count-pill">{focusIntentId ?? 'no focus'}</span>
            </div>
          </div>

          <div className="intent-runtime-summary">
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Backlog</span>
              <strong>{backlogCount}</strong>
            </div>
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Closed</span>
              <strong>{closedCount}</strong>
            </div>
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Dropped</span>
              <strong>{droppedCount}</strong>
            </div>
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Snapshot</span>
              <strong>{snapshotMetadata?.generatedAt ? 'live' : 'pending'}</strong>
            </div>
          </div>

          {intentsQuery.isLoading ? (
            <div className="intent-empty-state">
              <h3>Loading intent queue</h3>
              <p>Fetching live intent inventory from the bridge.</p>
            </div>
          ) : intentsQuery.isError ? (
            <div className="intent-empty-state intent-empty-state-danger">
              <h3>Intent queue unavailable</h3>
              <p>{intentsQuery.error instanceof Error ? intentsQuery.error.message : 'Unknown intent list error.'}</p>
            </div>
          ) : !intents.length ? (
            <div className="intent-empty-state">
              <h3>No intents found</h3>
              <p>The workspace did not return any intent records yet.</p>
            </div>
          ) : (
            <div className="intent-table" role="table" aria-label="Intent list">
              <div className="intent-table-header" role="row">
                <span role="columnheader">Intent</span>
                <span role="columnheader">Lifecycle</span>
                <span role="columnheader">Priority</span>
                <span role="columnheader">Mode</span>
                <span role="columnheader">Block</span>
              </div>
              {intents.map((intent) => {
                const lifecycle = normalizeLifecycle(intent.lifecycle)
                const isFocused = intent.id === focusIntentId
                const isSelected = intent.id === selectedIntentId
                return (
                  <button
                    key={intent.id}
                    className={`intent-row intent-row-button${isSelected ? ' selected' : ''}`}
                    role="row"
                    type="button"
                    onClick={() => setSelectedIntentId(intent.id)}
                  >
                    <div className="intent-main-cell" role="cell">
                      <div className="intent-title-row">
                        <h3>{intent.title}</h3>
                        {isFocused ? <span className="meta-pill meta-pill-focus">Focus</span> : null}
                      </div>
                      <p className="intent-id">{intent.id}</p>
                      <p className="intent-focus">
                        {intent.strategic_mode ?? 'No strategic mode metadata'}
                      </p>
                    </div>
                    <div role="cell">
                      <span className={`status-pill status-${lifecycle}`}>{intent.lifecycle ?? 'unknown'}</span>
                    </div>
                    <div role="cell">
                      <span className="meta-pill">{intent.priority ?? 'n/a'}</span>
                    </div>
                    <p role="cell">{intent.mode ?? 'normal'}</p>
                    <p role="cell">{intent.blocks ?? 'No blocking note'}</p>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="surface-panel surface-panel-primary intent-detail-panel">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Selection</p>
              <h2>Intent Detail</h2>
            </div>
            <div className="panel-toolbar-meta">
              <span className="count-pill">{selectedIntentId ?? 'no selection'}</span>
              <span className="count-pill">{detailStatus}</span>
            </div>
          </div>

          {!selectedIntentId ? (
            <div className="intent-empty-state">
              <h3>Select an intent</h3>
              <p>Choose a row from the live queue to inspect focus, tasks, chaos, and staged files.</p>
            </div>
          ) : detailQuery.isLoading ? (
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
            <div className="intent-detail-stack">
              <article className="intent-hero-card">
                <div className="intent-hero-copy">
                  <div className="section-title-row">
                    <span className="section-icon section-icon-intent" aria-hidden="true">
                      <Icon icon={flag} />
                    </span>
                    <div>
                      <h3>{detail.title ?? detail.id ?? 'Untitled intent'}</h3>
                      <p className="intent-id">{detail.id ?? selectedIntentId}</p>
                    </div>
                  </div>
                  <p className="intent-detail-summary">
                    {detail.summary ?? detail.goal ?? 'No narrative summary has been extracted from intent.md yet.'}
                  </p>
                </div>
                <div className="intent-hero-badges">
                  <span className={`status-pill status-${normalizeLifecycle(detail.lifecycle)}`}>{detail.lifecycle ?? 'unknown'}</span>
                  <span className="meta-pill">{detail.mode ?? 'normal'}</span>
                  <span className="meta-pill">{detail.changeType ?? 'unspecified'}</span>
                </div>
              </article>

              <div className="system-info-grid two-column-grid">
                <article className="system-info-card">
                  <div className="section-title-row">
                    <span className="section-icon section-icon-intent" aria-hidden="true">
                      <Icon icon={flagTriangleRight} />
                    </span>
                    <h3>Focus</h3>
                  </div>
                  <strong className="system-info-title">{detail.focusCurrent ?? 'No current focus recorded'}</strong>
                  <p>Next action: {detail.focusNextAction ?? 'pending'}</p>
                  <p className="system-card-subtle">Updated: {formatTimestamp(detail.focusUpdatedAt)}</p>
                </article>

                <article className="system-info-card">
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={shieldAlert} />
                    </span>
                    <h3>Chaos Estimate</h3>
                  </div>
                  <strong className="system-info-title">
                    {detail.chaosEstimate?.projectedScore ?? detail.chaosEstimate?.currentScore ?? 'n/a'}
                  </strong>
                  <p>
                    {detail.chaosEstimate?.projectedLevel ?? detail.chaosEstimate?.currentLevel ?? 'No live chaos estimate attached to this intent.'}
                  </p>
                  {detail.chaosEstimate?.warning ? <p className="runtime-warning-text">{detail.chaosEstimate.warning}</p> : null}
                </article>
              </div>

              <article className="surface-panel compact-note-panel intent-detail-card">
                <div className="panel-toolbar">
                  <div>
                    <p className="workspace-eyebrow">Work Breakdown</p>
                    <h3>Tasks</h3>
                  </div>
                  <span className="count-pill">{selectedTaskCount} tracked</span>
                </div>
                {selectedTaskCount ? (
                  <div className="intent-task-list">
                    {detail.tasks.slice(0, 6).map((task, index) => (
                      <article key={`${task.title ?? 'task'}-${index}`} className="intent-task-card">
                        <div className="intent-task-head">
                          <strong>{task.title ?? 'Untitled task'}</strong>
                          <span className={`status-pill status-${normalizeLifecycle(task.status)}`}>{task.status ?? 'unknown'}</span>
                        </div>
                        <p>{task.source ?? 'Task source unavailable'}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rules-cell-copy">No task lines were extracted from `intent.md` or `plan.md` for this intent.</p>
                )}
                {selectedPendingTask ? (
                  <p className="intent-inline-note">Current task candidate: {selectedPendingTask.title ?? 'No title'}.</p>
                ) : null}
              </article>

              <article className="surface-panel compact-note-panel intent-detail-card">
                <div className="panel-toolbar">
                  <div>
                    <p className="workspace-eyebrow">Workspace Provenance</p>
                    <h3>Sources</h3>
                  </div>
                  <span className="count-pill">{selectedStagedFilesCount} staged</span>
                </div>
                <div className="intent-source-grid">
                  <div className="system-info-card">
                    <div className="section-title-row">
                      <span className="section-icon section-icon-kb" aria-hidden="true">
                        <Icon icon={layers3} />
                      </span>
                      <h3>Decision Summary</h3>
                    </div>
                    <p>{detail.decisionSummary ?? 'No decision summary captured yet.'}</p>
                  </div>
                  <div className="system-info-card">
                    <div className="section-title-row">
                      <span className="section-icon section-icon-runtime" aria-hidden="true">
                        <Icon icon={files} />
                      </span>
                      <h3>Source Files</h3>
                    </div>
                    <p><code>{detail.sourceFile ?? 'none'}</code></p>
                    <p><code>{detail.workspacePath ?? 'none'}</code></p>
                  </div>
                </div>
                {selectedStagedFilesCount ? (
                  <div className="intent-staged-list">
                    {detail.stagedFiles.map((file) => (
                      <code key={file} className="intent-staged-chip">{file}</code>
                    ))}
                  </div>
                ) : (
                  <p className="rules-cell-copy">No staged file list was extracted from the current intent metadata.</p>
                )}
              </article>
            </div>
          )}
        </section>

        <section className="surface-panel compact-note-panel">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Phase 1 Boundary</p>
              <h2>Deferred Actions</h2>
            </div>
          </div>
          <ul className="signal-list">
            <li>Create draft remains deferred because bridge create still passes unsupported CLI flags.</li>
            <li>Inline edit stays hidden until `kbx intent update` becomes a real deterministic surface.</li>
            <li>Approve and apply-preview remain deferred because the bridge contracts are ahead of CLI truth.</li>
            <li>Apply can be promoted next because `kbx intent apply` is already real and gate-aware.</li>
            <li>Search still uses mock intent rows and should be re-based after this page is stabilized.</li>
          </ul>
        </section>
      </div>
    </section>
  )
}
