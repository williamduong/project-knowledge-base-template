import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../shared/api/client'

export type IntentTask = {
  title: string | null
  status: string | null
  source: string | null
  description?: string | null
  text?: string | null
  done?: boolean
  section?: string | null
  tags?: string[]
  explicitCommits?: string[]
  relatedCommits?: Array<{
    sha: string | null
    subject: string | null
    path: string | null
  }>
}

export type IntentDetail = {
  id: string | null
  title: string | null
  slug: string | null
  scope: string | null
  lifecycle: string | null
  status: string | null
  mode: string | null
  changeType: string | null
  goalText: string | null
  decisionSummary: string | null
  closeCondition: string | null
  goal: string | null
  summary: string | null
  focusCurrent: string | null
  focusNextAction: string | null
  focusUpdatedAt: string | null
  chaosEstimate: {
    currentScore: number | null
    currentLevel: string | null
    estimatedDelta: number | null
    projectedScore: number | null
    projectedLevel: string | null
    warning: string | null
  } | null
  tasks: IntentTask[]
  stagedFiles: string[]
  workspacePath: string | null
  sourceFile: string | null
}

export type IntentDetailResponse = {
  ok: boolean
  detail: IntentDetail
}

export function useIntentDetail(intentId: string | null) {
  return useQuery({
    queryKey: ['intent-detail', intentId],
    queryFn: () => apiGet<IntentDetailResponse>(`/api/intents/${encodeURIComponent(intentId || '')}/detail`),
    enabled: Boolean(intentId),
    staleTime: 15_000,
  })
}
