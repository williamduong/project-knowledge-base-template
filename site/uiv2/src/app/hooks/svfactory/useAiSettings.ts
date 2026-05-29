import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../../shared/api/client'

export const aiSettingsQueryKey = ['system-ai-settings']

export type AiSettings = {
  schema_version: string
  provider: 'deepseek'
  ui_language: 'en' | 'vi'
  model: string
  endpoint: string
  system_prompt: string
  planning_harness_prompt: string
  app_primary_goals: string
  app_description: string
  has_api_key: boolean
  api_key_masked: string | null
  updated_at: string | null
}

export type AiSettingsResponse = {
  ok: boolean
  settings: AiSettings
  error?: string
}

export type AiPingResponse = {
  ok: boolean
  provider: string
  model?: string
  latencyMs?: number
  error?: string
}

export function useAiSettings() {
  return useQuery({
    queryKey: aiSettingsQueryKey,
    queryFn: () => apiGet<AiSettingsResponse>('/api/system/ai-settings'),
    staleTime: 15_000,
  })
}

export function useSaveAiSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<AiSettingsResponse>('/api/system/ai-settings', body),
    onSuccess: async (result) => {
      queryClient.setQueryData(aiSettingsQueryKey, result)
      await queryClient.invalidateQueries({ queryKey: aiSettingsQueryKey })
    },
  })
}

export function usePingAiSettings() {
  return useMutation({
    mutationFn: () => apiPost<AiPingResponse>('/api/system/ai-settings/ping'),
  })
}
