import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../shared/api/client'

export const systemSnapshotQueryKey = ['system-snapshot']

export type SystemSnapshotResponse = {
  ok: boolean
  metadata: {
    snapshotVersion: number
    generatedAt: string
    staleAt: string
    ttlMs: number
    reloadRecommended: boolean
    reloadReasons: string[]
    fingerprint: string
    headSha: string | null
    branchName: string | null
    focusIntentId: string | null
    activeIntentId: string | null
    workingTreeDirty: boolean
  }
  version: {
    ok: boolean
    stdout: string | null
    version: string | null
  }
  status: {
    ok: boolean
    exitCode: number
    parsed?: unknown
    stderr?: string
  }
  workspace: {
    ok: boolean
    summary: unknown
    currentFocus: unknown
    stderr?: string
  }
  sessionContext: {
    ok: boolean
    summary: unknown
    stderr?: string
  }
  runtimeServices: unknown
  rulesSummary: unknown
  system: unknown
  homeSummary: unknown
  diagnostics?: unknown
}

export function useSystemSnapshot() {
  return useQuery({
    queryKey: systemSnapshotQueryKey,
    queryFn: () => apiGet<SystemSnapshotResponse>('/api/system-snapshot'),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useRefreshSystemSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiPost<SystemSnapshotResponse>('/api/system-snapshot/refresh'),
    onSuccess: async (snapshot) => {
      queryClient.setQueryData(systemSnapshotQueryKey, snapshot)
      await queryClient.invalidateQueries({ queryKey: systemSnapshotQueryKey })
    },
  })
}
