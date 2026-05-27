import { useQuery } from '@tanstack/react-query'

export interface DecisionGoal {
  id: string
  title: string
  type: 'system' | 'milestone'
}

export interface Decision {
  id: string
  title: string
  decision: string
  rationale: string
  alternatives_considered: string
  impact_scope: string
  status: string
  decided_at: string
  affected_goals: DecisionGoal[]
  goal_count: number
}

export interface DecisionAffectedGoalDetail {
  id: string
  title: string
  status: string
  is_system_goal: boolean
  child_goals: Array<{ id: string; title: string; status: string }>
}

export interface DecisionDetail extends Omit<Decision, 'affected_goals'> {
  affected_goals: Array<{
    id: string
    title: string
    status: string
    is_system_goal: boolean
    child_goals: Array<{ id: string; title: string; status: string }>
  }>
  extracted_from?: string
  provenance?: string
}

export interface GoalDecisionContext {
  goal_id: string
  goal_title: string
  direct_decisions: Array<{
    id: string
    title: string
    decision: string
    rationale: string
    status: string
    inherited: false
  }>
  inherited_decisions: Array<{
    id: string
    title: string
    decision: string
    rationale: string
    status: string
    inherited: true
    inherited_from: string
  }>
  total_decisions: number
}

export interface DecisionImpact {
  decision_id: string
  decision_title: string
  direct_goal_count: number
  child_goal_count: number
  total_goal_impact: number
  affected_intent_count: number
  affected_intents: string[]
}

export interface DecisionsStats {
  total: number
  by_status: Record<string, number>
}

// Fetch all decisions
export function useDecisionsList() {
  return useQuery({
    queryKey: ['decisions', 'list'],
    queryFn: async () => {
      const response = await fetch('/api/graph/decisions')
      if (!response.ok) throw new Error(`Failed to fetch decisions: ${response.statusText}`)
      return (await response.json()) as Decision[]
    },
  })
}

// Fetch single decision with full context
export function useDecision(decisionId: string | null) {
  return useQuery({
    queryKey: ['decisions', decisionId],
    queryFn: async () => {
      if (!decisionId) return null
      const response = await fetch(`/api/graph/decisions/${encodeURIComponent(decisionId)}`)
      if (!response.ok) throw new Error(`Failed to fetch decision: ${response.statusText}`)
      return (await response.json()) as DecisionDetail
    },
    enabled: !!decisionId,
  })
}

// Fetch decisions for a specific goal (with inheritance)
export function useDecisionsForGoal(goalId: string | null) {
  return useQuery({
    queryKey: ['decisions', 'goal', goalId],
    queryFn: async () => {
      if (!goalId) return null
      const response = await fetch(`/api/graph/goals/${encodeURIComponent(goalId)}/decisions`)
      if (!response.ok) throw new Error(`Failed to fetch goal decisions: ${response.statusText}`)
      return (await response.json()) as GoalDecisionContext
    },
    enabled: !!goalId,
  })
}

// Fetch decisions by status
export function useDecisionsByStatus(status: string | null) {
  return useQuery({
    queryKey: ['decisions', 'status', status],
    queryFn: async () => {
      if (!status) return []
      const response = await fetch(`/api/graph/decisions?status=${encodeURIComponent(status)}`)
      if (!response.ok) throw new Error(`Failed to fetch decisions by status: ${response.statusText}`)
      return (await response.json()) as Decision[]
    },
    enabled: !!status,
  })
}

// Fetch decision impact analysis
export function useDecisionImpact(decisionId: string | null) {
  return useQuery({
    queryKey: ['decisions', 'impact', decisionId],
    queryFn: async () => {
      if (!decisionId) return null
      const response = await fetch(`/api/graph/decisions/${encodeURIComponent(decisionId)}/impact`)
      if (!response.ok) throw new Error(`Failed to fetch decision impact: ${response.statusText}`)
      return (await response.json()) as DecisionImpact
    },
    enabled: !!decisionId,
  })
}

// Fetch decisions statistics
export function useDecisionsStats() {
  return useQuery({
    queryKey: ['decisions', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/graph/decisions/stats')
      if (!response.ok) throw new Error(`Failed to fetch decisions stats: ${response.statusText}`)
      return (await response.json()) as DecisionsStats
    },
  })
}
