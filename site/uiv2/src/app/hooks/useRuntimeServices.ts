import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../shared/api/client'

export type RuntimeService = {
  id: string
  label: string
  kind: string
  running: boolean
  healthy: boolean
  pid: number | null
  host: string
  port: number | null
  source: string
  autoStart: boolean
  healthPath: string
}

export type RuntimeServicesSummary = {
  registeredCount: number
  runningCount: number
  healthyCount: number
  summaryLabel: string
  services: RuntimeService[]
}

export type RuntimeServicesResponse = {
  ok: boolean
  summary: RuntimeServicesSummary
  refreshedAt?: string | null
  nextRunAt?: string | null
  intervalMs?: number
  schedules?: Array<{
    id: string
    label: string
    cadence: string
    responsibility: string
    refreshedAt?: string | null
    nextRunAt?: string | null
    reason?: string
    state: string
  }>
  reason?: string
  lastError?: string | null
}

export type EnsureRuntimeServiceResponse = {
  ok: boolean
  action?: string
  error?: string
  service?: RuntimeService
}

const runtimeServicesQueryKey = ['runtime-services']

export function useRuntimeServices() {
  return useQuery({
    queryKey: runtimeServicesQueryKey,
    queryFn: () => apiGet<RuntimeServicesResponse>('/api/runtime-services'),
    refetchInterval: 60_000,
    staleTime: 15_000,
  })
}

export function useEnsureRuntimeService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (serviceId: string) => apiPost<EnsureRuntimeServiceResponse>(`/api/runtime-services/${serviceId}/ensure`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: runtimeServicesQueryKey })
    },
  })
}
