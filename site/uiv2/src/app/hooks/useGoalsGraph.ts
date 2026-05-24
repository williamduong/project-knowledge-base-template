import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Goal {
  id: string
  title: string
  description: string
  status: string
  parent_goal_id: string | null
  success_metrics: string[]
  target_version: string
  created_at: string
  updated_at: string
  children?: Goal[]
  child_count: number
  decisions: Array<{ decision_id: string; goal_id: string }>
  decision_count: number
}

export interface GoalDetail extends Goal {
  parent_goal: { id: string; title: string } | null
  children: Array<{ id: string; title: string; status: string }>
  intents: Array<{ id: string; title: string; status: string }>
}

export interface GoalsStats {
  total: number
  by_status: Record<string, number>
}

// Fetch goals tree (with hierarchy)
export function useGoalsTree() {
  return useQuery({
    queryKey: ['goals', 'tree'],
    queryFn: async () => {
      const response = await fetch('/api/graph/goals/tree')
      if (!response.ok) throw new Error(`Failed to fetch goals tree: ${response.statusText}`)
      return (await response.json()) as Goal[]
    },
  })
}

// Fetch single goal with full context
export function useGoal(goalId: string | null) {
  return useQuery({
    queryKey: ['goals', goalId],
    queryFn: async () => {
      if (!goalId) return null
      const response = await fetch(`/api/graph/goals/${encodeURIComponent(goalId)}`)
      if (!response.ok) throw new Error(`Failed to fetch goal: ${response.statusText}`)
      return (await response.json()) as GoalDetail
    },
    enabled: !!goalId,
  })
}

// Fetch goals for a specific intent
export function useGoalsForIntent(intentId: string | null) {
  return useQuery({
    queryKey: ['goals', 'intent', intentId],
    queryFn: async () => {
      if (!intentId) return []
      const response = await fetch(`/api/graph/intents/${encodeURIComponent(intentId)}/goals`)
      if (!response.ok) throw new Error(`Failed to fetch intent goals: ${response.statusText}`)
      return (await response.json()) as Goal[]
    },
    enabled: !!intentId,
  })
}

// Fetch goals statistics
export function useGoalsStats() {
  return useQuery({
    queryKey: ['goals', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/graph/goals/stats')
      if (!response.ok) throw new Error(`Failed to fetch goals stats: ${response.statusText}`)
      return (await response.json()) as GoalsStats
    },
  })
}
