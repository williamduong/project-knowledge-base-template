import { useMutation, useQueryClient } from '@tanstack/react-query'
import { systemSnapshotQueryKey } from '../svfactory/useSystemSnapshot'
import { apiGet, apiPatch, apiPost } from '../../../shared/api/client'
import { goalsTreeQueryKey } from './useGoalsTree'
import { intentContextQueryKey } from './intent-alignment-graph-model'

export type IntentMutationResult = {
  id?: string
  intent_id?: string
  updated_fields?: string[]
  state?: string | null
  status?: string
  [key: string]: unknown
}

export type IntentMutationResponse = {
  ok: boolean
  result?: IntentMutationResult
  command?: string
  stdout?: string
  trace?: Array<{
    timestamp: string
    step: string
    status: string
  }>
}

export type IntentPreviewResponse = {
  ok: boolean
  diff?: {
    files_changed: number
    insertions: number
    deletions: number
    files?: string[]
  }
  warnings?: Array<{
    level: string
    message: string
  }>
}

type IntentCreateInput = {
  title: string
  focus?: string
  next_action?: string
  decision_summary?: string
  intent_id?: string
}

type IntentUpdateInput = {
  id: string
  body: Record<string, string>
}

function invalidateIntentWorkspace(queryClient: ReturnType<typeof useQueryClient>, intentId?: string | null) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['intents-list'] }),
    queryClient.invalidateQueries({ queryKey: goalsTreeQueryKey }),
    queryClient.invalidateQueries({ queryKey: intentContextQueryKey }),
    queryClient.invalidateQueries({ queryKey: systemSnapshotQueryKey }),
    ...(intentId ? [queryClient.invalidateQueries({ queryKey: ['intent-detail', intentId] })] : []),
  ])
}

export function useCreateIntentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: IntentCreateInput) => apiPost<IntentMutationResponse>('/api/intents/create', body),
    onSuccess: async (response) => {
      const nextIntentId = String(response.result?.id ?? response.result?.intent_id ?? '').trim() || null
      await invalidateIntentWorkspace(queryClient, nextIntentId)
    },
  })
}

export function useUpdateIntentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: IntentUpdateInput) => apiPatch<IntentMutationResponse>(`/api/intents/${encodeURIComponent(id)}`, body),
    onSuccess: async (response, variables) => {
      const nextIntentId = String(response.result?.id ?? response.result?.intent_id ?? variables.id).trim() || variables.id
      await invalidateIntentWorkspace(queryClient, nextIntentId)
    },
  })
}

export function useApproveIntentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approval_note }: { id: string; approval_note?: string }) =>
      apiPost<IntentMutationResponse>(`/api/intents/${encodeURIComponent(id)}/approve`, approval_note ? { approval_note } : {}),
    onSuccess: async (response, variables) => {
      const nextIntentId = String(response.result?.id ?? response.result?.intent_id ?? variables.id).trim() || variables.id
      await invalidateIntentWorkspace(queryClient, nextIntentId)
    },
  })
}

export function useIntentApplyPreviewMutation() {
  return useMutation({
    mutationFn: (id: string) => apiGet<IntentPreviewResponse>(`/api/intents/${encodeURIComponent(id)}/apply-preview`),
  })
}

export function useApplyIntentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost<IntentMutationResponse>(`/api/intents/${encodeURIComponent(id)}/apply`, { confirmed: true }),
    onSuccess: async (response, intentId) => {
      const nextIntentId = String(response.result?.id ?? response.result?.intent_id ?? intentId).trim() || intentId
      await invalidateIntentWorkspace(queryClient, nextIntentId)
    },
  })
}
