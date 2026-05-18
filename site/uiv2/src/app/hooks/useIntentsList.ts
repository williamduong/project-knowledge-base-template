import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../shared/api/client'

export type IntentListItem = {
  id: string
  title: string
  lifecycle: string | null
  priority: string | null
  blocks: string | null
  mode: string | null
  strategic_mode: string | null
}

export type IntentsListResponse = {
  ok: boolean
  parsed: {
    count: number
    intents: IntentListItem[]
  } | null
  command?: string
  exitCode?: number
  stderr?: string
}

export function useIntentsList() {
  return useQuery({
    queryKey: ['intents-list'],
    queryFn: () => apiGet<IntentsListResponse>('/api/intents'),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}
