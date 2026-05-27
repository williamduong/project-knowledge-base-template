import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '../../../shared/api/client'

export const goalsTreeQueryKey = ['goals-tree']

export type GoalStatus = {
  code: 'aligned' | 'outside-main' | 'missing-goals' | 'mixed'
  label: string
}

export type GoalRecord = {
  id: string
  entityLevel: 'system' | 'milestone' | 'intent' | 'task'
  entityId: string
  parentGoalId: string | null
  title: string
  description: string
  state: string
  rank: number
  createdAt: string
  updatedAt: string
  childGoalCount: number
  canDelete: boolean
}

export type GoalTreeNode = {
  entityLevel: 'system' | 'milestone' | 'intent' | 'task'
  entityId: string
  label: string
  summary: string | null
  runtimeState: string
  status: GoalStatus
  goals: GoalRecord[]
  children: GoalTreeNode[]
}

export type GoalsTreeResponse = {
  ok: boolean
  checkedAt: string
  summary: {
    totalGoals: number
    coverage: {
      system: number
      milestones: number
      intents: number
      tasks: number
    }
    missingCounts: {
      milestones: number
      intents: number
      tasks: number
    }
    outsideCounts: {
      milestones: number
      intents: number
      tasks: number
    }
    entityCounts: {
      milestones: number
      intents: number
      tasks: number
    }
  }
  root: GoalTreeNode
}

type GoalMutationResponse = {
  ok: boolean
  tree: GoalsTreeResponse
}

type GoalCreateInput = {
  entity_level: GoalTreeNode['entityLevel']
  entity_id: string
  title: string
  description?: string
  parent_goal_id?: string | null
  state?: string
}

type GoalUpdateInput = {
  goalId: string
  title?: string
  description?: string
  parent_goal_id?: string | null
  state?: string
}

export function useGoalsTree() {
  return useQuery({
    queryKey: goalsTreeQueryKey,
    queryFn: () => apiGet<GoalsTreeResponse>('/api/goals/tree'),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useCreateGoalMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: GoalCreateInput) => apiPost<GoalMutationResponse>('/api/goals', body),
    onSuccess: async (response) => {
      queryClient.setQueryData(goalsTreeQueryKey, response.tree)
      await queryClient.invalidateQueries({ queryKey: goalsTreeQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['intents-list'] })
    },
  })
}

export function useUpdateGoalMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, ...body }: GoalUpdateInput) => apiPatch<GoalMutationResponse>(`/api/goals/${encodeURIComponent(goalId)}`, body),
    onSuccess: async (response) => {
      queryClient.setQueryData(goalsTreeQueryKey, response.tree)
      await queryClient.invalidateQueries({ queryKey: goalsTreeQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['intents-list'] })
      await queryClient.invalidateQueries({ queryKey: ['intent-detail'] })
    },
  })
}

export function useDeleteGoalMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (goalId: string) => apiDelete<GoalMutationResponse>(`/api/goals/${encodeURIComponent(goalId)}`),
    onSuccess: async (response) => {
      queryClient.setQueryData(goalsTreeQueryKey, response.tree)
      await queryClient.invalidateQueries({ queryKey: goalsTreeQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['intents-list'] })
      await queryClient.invalidateQueries({ queryKey: ['intent-detail'] })
    },
  })
}
