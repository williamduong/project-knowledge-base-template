import { Icon } from '@iconify/react'
import goalIcon from '@iconify-icons/lucide/target'
import checkIcon from '@iconify-icons/lucide/check'
import alertIcon from '@iconify-icons/lucide/alert-circle'
import layersIcon from '@iconify-icons/lucide/layers'
import chevronRightIcon from '@iconify-icons/lucide/chevron-right'
import chevronDownIcon from '@iconify-icons/lucide/chevron-down'
import { useState } from 'react'
import { useGoalsTree, useGoal, useGoalsStats, type Goal, type GoalDetail } from '../../hooks/kbx/useGoalsGraph'

type TreeNodeProps = {
  goal: Goal
  depth: number
  expandedNodes: Set<string>
  onToggleExpanded: (id: string) => void
  onSelectGoal: (id: string) => void
  selectedGoalId: string | null
}

function GoalTreeNode({ goal, depth, expandedNodes, onToggleExpanded, onSelectGoal, selectedGoalId }: TreeNodeProps) {
  const isExpanded = expandedNodes.has(goal.id)
  const hasChildren = goal.child_count > 0
  const isSelected = selectedGoalId === goal.id

  return (
    <>
      <div
        className={`goals-tree-row${isSelected ? ' goals-tree-row-selected' : ''}`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {hasChildren && (
          <button
            type="button"
            className="icon-tool-button goals-tree-toggle"
            onClick={() => onToggleExpanded(goal.id)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <Icon icon={isExpanded ? chevronDownIcon : chevronRightIcon} aria-hidden="true" />
          </button>
        )}
        {!hasChildren && (
          <span className="goals-tree-toggle-placeholder" />
        )}

        <button
          type="button"
          className="goals-tree-button"
          onClick={() => onSelectGoal(goal.id)}
        >
          <Icon icon={goalIcon} className="goals-tree-icon" aria-hidden="true" />
          <span className="goals-tree-title">{goal.title}</span>
          {goal.decision_count > 0 && (
            <span className="goals-tree-badge" title={`${goal.decision_count} decision(s)`}>
              {goal.decision_count}
            </span>
          )}
        </button>
      </div>

      {isExpanded && hasChildren && goal.children && (
        <>
          {goal.children.map((child) => (
            <GoalTreeNode
              key={child.id}
              goal={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              onToggleExpanded={onToggleExpanded}
              onSelectGoal={onSelectGoal}
              selectedGoalId={selectedGoalId}
            />
          ))}
        </>
      )}
    </>
  )
}

function statusColor(status: string): string {
  if (status === 'active') return 'status-good'
  if (status === 'draft') return 'status-neutral'
  if (status === 'deprecated') return 'status-warn'
  if (status === 'archived') return 'status-offline'
  return 'status-neutral'
}

function GoalDetailPanel({ goal }: { goal: GoalDetail | null }) {
  if (!goal) {
    return (
      <div className="goals-detail-empty">
        <Icon icon={goalIcon} className="goals-detail-empty-icon" aria-hidden="true" />
        <p>Select a goal to view details</p>
      </div>
    )
  }

  return (
    <div className="goals-detail-panel">
      <div className="goals-detail-header">
        <h2 className="goals-detail-title">{goal.title}</h2>
        <span className={`status-pill ${statusColor(goal.status)}`}>{goal.status}</span>
      </div>

      {goal.description && (
        <section className="goals-detail-section">
          <h3>Description</h3>
          <p className="goals-detail-text">{goal.description}</p>
        </section>
      )}

      {goal.parent_goal && (
        <section className="goals-detail-section">
          <h3>Parent Goal</h3>
          <p className="goals-detail-link">{goal.parent_goal.title}</p>
        </section>
      )}

      {goal.success_metrics && goal.success_metrics.length > 0 && (
        <section className="goals-detail-section">
          <h3>Success Metrics</h3>
          <ul className="goals-detail-list">
            {goal.success_metrics.map((metric, idx) => (
              <li key={idx} className="goals-detail-list-item">{metric}</li>
            ))}
          </ul>
        </section>
      )}

      {goal.decisions && goal.decisions.length > 0 && (
        <section className="goals-detail-section">
          <h3>Decisions ({goal.decisions.length})</h3>
          <div className="goals-decisions-list">
            {goal.decisions.map((dec) => (
              <div key={dec.decision_id} className="goals-decision-card">
                <Icon icon={checkIcon} className="goals-decision-icon" aria-hidden="true" />
                <span className="goals-decision-id">{dec.decision_id}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {goal.children && goal.children.length > 0 && (
        <section className="goals-detail-section">
          <h3>Child Goals ({goal.children.length})</h3>
          <div className="goals-children-list">
            {goal.children.map((child) => (
              <div key={child.id} className="goals-child-card">
                <Icon icon={layersIcon} className="goals-child-icon" aria-hidden="true" />
                <span className="goals-child-title">{child.title}</span>
                <span className={`status-pill ${statusColor(child.status)}`}>{child.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {goal.intents && goal.intents.length > 0 && (
        <section className="goals-detail-section">
          <h3>Implemented by Intents ({goal.intents.length})</h3>
          <div className="goals-intents-list">
            {goal.intents.map((intent) => (
              <div key={intent.id} className="goals-intent-card">
                <span className="goals-intent-title">{intent.title}</span>
                <span className={`status-pill ${statusColor(intent.status)}`}>{intent.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {goal.target_version && (
        <section className="goals-detail-section goals-detail-meta">
          <p><strong>Target Version:</strong> {goal.target_version}</p>
          <p><strong>Created:</strong> {new Date(goal.created_at).toLocaleDateString()}</p>
          <p><strong>Updated:</strong> {new Date(goal.updated_at).toLocaleDateString()}</p>
        </section>
      )}
    </div>
  )
}

export function GoalsPage() {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const goalsQuery = useGoalsTree()
  const goalQuery = useGoal(selectedGoalId)
  const statsQuery = useGoalsStats()

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedNodes)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpandedNodes(next)
  }

  return (
    <section className="workspace-page goals-page">
      {statsQuery.data && (
        <div className="goals-stats-bar">
          <span className="count-pill">{statsQuery.data.total} total</span>
          {Object.entries(statsQuery.data.by_status).map(([status, count]) => (
            <span key={status} className="status-pill">{status} {count}</span>
          ))}
        </div>
      )}

      <div className="goals-shell">
        {/* Left rail — goals tree */}
        <aside className="goals-left-rail">
          <div className="goals-rail-header">
            <h2 className="goals-rail-title">
              <Icon icon={goalIcon} aria-hidden="true" />
              Goals
            </h2>
          </div>

          {goalsQuery.isLoading ? (
            <div className="prototype-skeleton-stack">
              <span />
              <span />
              <span />
            </div>
          ) : goalsQuery.data && goalsQuery.data.length > 0 ? (
            <div className="goals-tree">
              {goalsQuery.data.map((goal) => (
                <GoalTreeNode
                  key={goal.id}
                  goal={goal}
                  depth={0}
                  expandedNodes={expandedNodes}
                  onToggleExpanded={toggleExpanded}
                  onSelectGoal={setSelectedGoalId}
                  selectedGoalId={selectedGoalId}
                />
              ))}
            </div>
          ) : (
            <p className="goals-empty">No goals found</p>
          )}
        </aside>

        {/* Right panel — goal details */}
        <section className="goals-detail surface-panel surface-panel-primary">
          {goalQuery.isLoading ? (
            <div className="prototype-skeleton-stack">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <GoalDetailPanel goal={goalQuery.data ?? null} />
          )}
        </section>
      </div>
    </section>
  )
}
