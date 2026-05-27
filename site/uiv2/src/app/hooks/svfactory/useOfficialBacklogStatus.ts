import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../shared/api/client'

export type OfficialBacklogStatusResponse = {
  ok: boolean
  packPath: string
  packSummary: {
    goalCount: number
    releaseLineCount: number
    activeIntentCount: number
    backlogIntentCount: number
  }
  validation: {
    ok: boolean
    missingGoalIds: string[]
    activeIntents: {
      missing: string[]
      unexpected: string[]
    }
    backlogIntents: {
      missing: string[]
      unexpected: string[]
    }
  }
  releaseLines: Array<{
    id: string
    label: string
    sources: string[]
  }>
  activeIntentIds: string[]
  backlogIntentIds: string[]
  goalsState: {
    totalGoals: number
    systemGoals: number
    milestoneGoals: number
  }
}

export function useOfficialBacklogStatus() {
  return useQuery({
    queryKey: ['svfactory-official-backlog-status'],
    queryFn: () => apiGet<OfficialBacklogStatusResponse>('/api/svfactory/official-backlog/status'),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}
