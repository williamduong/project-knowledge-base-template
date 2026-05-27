import { Icon } from '@iconify/react'
import decisionIcon from '@iconify-icons/lucide/scale'
import targetIcon from '@iconify-icons/lucide/target'
import checkIcon from '@iconify-icons/lucide/check'
import zoomIcon from '@iconify-icons/lucide/zoom-in'
import { useState } from 'react'
import { useDecisionsList, useDecision, useDecisionsStats, useDecisionImpact, type Decision, type DecisionDetail, type DecisionImpact } from '../../hooks/kbx/useDecisionsGraph'

function statusColor(status: string): string {
  if (status === 'active') return 'status-good'
  if (status === 'draft') return 'status-neutral'
  if (status === 'deprecated') return 'status-warn'
  if (status === 'archived') return 'status-offline'
  return 'status-neutral'
}

function DecisionListItem({ decision, isSelected, onSelect }: { decision: Decision; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      className={`decisions-list-item${isSelected ? ' decisions-list-item-selected' : ''}`}
      onClick={onSelect}
    >
      <div className="decisions-list-item-header">
        <Icon icon={decisionIcon} className="decisions-list-icon" aria-hidden="true" />
        <span className="decisions-list-title">{decision.title}</span>
        <span className={`status-pill ${statusColor(decision.status)}`}>{decision.status}</span>
      </div>
      {decision.goal_count > 0 && (
        <div className="decisions-list-meta">
          <Icon icon={targetIcon} aria-hidden="true" />
          <span>{decision.goal_count} goal{decision.goal_count !== 1 ? 's' : ''}</span>
        </div>
      )}
    </button>
  )
}

function DecisionDetailPanel({ decision, impact }: { decision: DecisionDetail | null; impact: DecisionImpact | null }) {
  if (!decision) {
    return (
      <div className="decisions-detail-empty">
        <Icon icon={decisionIcon} className="decisions-detail-empty-icon" aria-hidden="true" />
        <p>Select a decision to view details</p>
      </div>
    )
  }

  return (
    <div className="decisions-detail-panel">
      <div className="decisions-detail-header">
        <h2 className="decisions-detail-title">{decision.title}</h2>
        <span className={`status-pill ${statusColor(decision.status)}`}>{decision.status}</span>
      </div>

      {decision.decision && (
        <section className="decisions-detail-section">
          <h3>Decision</h3>
          <p className="decisions-detail-text">{decision.decision}</p>
        </section>
      )}

      {decision.rationale && (
        <section className="decisions-detail-section">
          <h3>Rationale</h3>
          <p className="decisions-detail-text">{decision.rationale}</p>
        </section>
      )}

      {decision.alternatives_considered && (
        <section className="decisions-detail-section">
          <h3>Alternatives Considered</h3>
          <p className="decisions-detail-text">{decision.alternatives_considered}</p>
        </section>
      )}

      {decision.impact_scope && (
        <section className="decisions-detail-section">
          <h3>Impact Scope</h3>
          <p className="decisions-detail-text">{decision.impact_scope}</p>
        </section>
      )}

      {impact && (
        <section className="decisions-detail-section decisions-impact">
          <h3>Impact Analysis</h3>
          <div className="decisions-impact-metrics">
            <div className="decisions-impact-card">
              <span className="decisions-impact-label">Direct Goals</span>
              <span className="decisions-impact-number">{impact.direct_goal_count}</span>
            </div>
            <div className="decisions-impact-card">
              <span className="decisions-impact-label">Child Goals</span>
              <span className="decisions-impact-number">{impact.child_goal_count}</span>
            </div>
            <div className="decisions-impact-card">
              <span className="decisions-impact-label">Total Impact</span>
              <span className="decisions-impact-number">{impact.total_goal_impact}</span>
            </div>
            <div className="decisions-impact-card">
              <span className="decisions-impact-label">Affected Intents</span>
              <span className="decisions-impact-number">{impact.affected_intent_count}</span>
            </div>
          </div>
        </section>
      )}

      {decision.affected_goals && decision.affected_goals.length > 0 && (
        <section className="decisions-detail-section">
          <h3>Affected Goals</h3>
          <div className="decisions-goals-list">
            {decision.affected_goals.map((goal) => (
              <div key={goal.id} className="decisions-goal-card">
                <div className="decisions-goal-header">
                  <Icon icon={targetIcon} aria-hidden="true" />
                  <span className="decisions-goal-title">{goal.title}</span>
                  <span className="decisions-goal-type">{goal.is_system_goal ? 'System Goal' : 'Milestone'}</span>
                </div>
                {goal.child_goals && goal.child_goals.length > 0 && (
                  <div className="decisions-goal-children">
                    <span className="decisions-goal-children-label">Inherits to:</span>
                    <div className="decisions-goal-children-list">
                      {goal.child_goals.map((child) => (
                        <span key={child.id} className="meta-pill">{child.title}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="decisions-detail-section decisions-detail-meta">
        {decision.decided_at && (
          <p><strong>Decided:</strong> {new Date(decision.decided_at).toLocaleDateString()}</p>
        )}
        {decision.extracted_from && (
          <p><strong>Source:</strong> {decision.extracted_from}</p>
        )}
        {decision.provenance && (
          <p><strong>Provenance:</strong> {decision.provenance}</p>
        )}
      </section>
    </div>
  )
}

export function DecisionsPage() {
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null)

  const decisionsQuery = useDecisionsList()
  const decisionQuery = useDecision(selectedDecisionId)
  const impactQuery = useDecisionImpact(selectedDecisionId)
  const statsQuery = useDecisionsStats()

  return (
    <section className="workspace-page decisions-page">
      {statsQuery.data && (
        <div className="decisions-stats-bar">
          <span className="count-pill">{statsQuery.data.total} total</span>
          {Object.entries(statsQuery.data.by_status).map(([status, count]) => (
            <span key={status} className="status-pill">{status} {count}</span>
          ))}
        </div>
      )}

      <div className="decisions-shell">
        {/* Left rail — decisions list */}
        <aside className="decisions-left-rail">
          <div className="decisions-rail-header">
            <h2 className="decisions-rail-title">
              <Icon icon={decisionIcon} aria-hidden="true" />
              Decisions
            </h2>
          </div>

          {decisionsQuery.isLoading ? (
            <div className="prototype-skeleton-stack">
              <span />
              <span />
              <span />
            </div>
          ) : decisionsQuery.data && decisionsQuery.data.length > 0 ? (
            <div className="decisions-list">
              {decisionsQuery.data.map((decision) => (
                <DecisionListItem
                  key={decision.id}
                  decision={decision}
                  isSelected={selectedDecisionId === decision.id}
                  onSelect={() => setSelectedDecisionId(decision.id)}
                />
              ))}
            </div>
          ) : (
            <p className="decisions-empty">No decisions found</p>
          )}
        </aside>

        {/* Right panel — decision details */}
        <section className="decisions-detail surface-panel surface-panel-primary">
          {decisionQuery.isLoading || impactQuery.isLoading ? (
            <div className="prototype-skeleton-stack">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <DecisionDetailPanel
              decision={decisionQuery.data ?? null}
              impact={impactQuery.data ?? null}
            />
          )}
        </section>
      </div>
    </section>
  )
}
