import { Icon } from '@iconify/react'
import wrench from '@iconify-icons/lucide/wrench'
import bot from '@iconify-icons/lucide/bot'
import shield from '@iconify-icons/lucide/shield'
import { useToolsRegistry } from '../../hooks/svfactory/useToolsRegistry'

function statusTone(status: string) {
  if (status === 'ready') return 'status-good'
  if (status === 'planned') return 'status-warn'
  return 'status-neutral'
}

export function ToolsWorkspacePage() {
  const { query, filteredTools, statuses, statusFilter, setStatusFilter, summary } = useToolsRegistry()

  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">SVFactory Mode</p>
          <h1>Tools</h1>
          <p>Tools are the governed action registry. Agents should act through these surfaces instead of improvising direct mutation paths into code or documents.</p>
        </div>
        <div className="toolbar-actions">
          <span className="meta-pill">{summary?.total ?? 0} registered tools</span>
          <span className="meta-pill">Intent-first</span>
        </div>
      </header>

      <div className="workspace-grid single-column-grid">
        <section className="surface-panel surface-panel-primary">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Registry</p>
              <div className="section-title-row">
                <span className="section-icon section-icon-runtime" aria-hidden="true">
                  <Icon icon={wrench} />
                </span>
                <h2>Deterministic Tool Surfaces</h2>
              </div>
            </div>
            <span className="count-pill">{query.isLoading ? 'Loading' : `${filteredTools.length} tools`}</span>
          </div>

          <div className="runtime-overview-grid compact-runtime-overview-grid">
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Ready</span>
              <strong>{summary?.byStatus.ready ?? 0}</strong>
            </div>
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Planned</span>
              <strong>{summary?.byStatus.planned ?? 0}</strong>
            </div>
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Intent Workspace</span>
              <strong>{summary?.byWorkspace.intent ?? 0}</strong>
            </div>
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Policy</span>
              <strong>Registry-first</strong>
            </div>
          </div>

          <div className="rules-inline-filters">
            <label className="rules-filter-field">
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="home-dashboard-grid">
          <section className="home-dashboard-section">
            <div className="home-section-heading">
              <p className="workspace-eyebrow">Tool Cards</p>
              <h2>Registry Slice</h2>
            </div>

            <div className="rules-pack-grid">
              {filteredTools.map((tool) => (
                <article key={tool.id} className="rules-pack-card">
                  <div className="rules-pack-header">
                    <strong>{tool.label}</strong>
                    <span className={`status-pill ${statusTone(tool.status)}`}>{tool.status}</span>
                  </div>
                  <p className="rules-cell-copy">{tool.summary}</p>
                  <p className="rules-cell-copy">{tool.execution.method} {tool.execution.path}</p>
                  <p className="rules-cell-copy">Contract {tool.inputContract} → {tool.outputContract}</p>
                </article>
              ))}
              {!query.isLoading && filteredTools.length === 0 ? (
                <p className="rules-cell-copy">No tools match the current filter.</p>
              ) : null}
            </div>
          </section>

          <section className="home-dashboard-section">
            <div className="home-section-heading">
              <p className="workspace-eyebrow">Agent Contract</p>
              <h2>Why Tools Matter</h2>
            </div>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Allowed Actors</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-intent" aria-hidden="true">
                      <Icon icon={bot} />
                    </span>
                    <h2>Shared Registry</h2>
                  </div>
                </div>
              </div>
              <p className="rules-cell-copy">Codex, Claude, Copilot, and human operators should share the same deterministic action registry.</p>
              <div className="home-inline-summary-row">
                <span className="meta-pill">No free-form code surgery</span>
                <span className="meta-pill">Contract-aware mutations</span>
                <span className="meta-pill">Traceable side effects</span>
              </div>
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Safety</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-cron" aria-hidden="true">
                      <Icon icon={shield} />
                    </span>
                    <h2>Governed Execution</h2>
                  </div>
                </div>
              </div>
              <p className="rules-cell-copy">Each tool announces its workspace, status, transport, and side effects before it becomes part of Flow or DNA release packaging.</p>
            </article>
          </section>
        </section>
      </div>
    </section>
  )
}
