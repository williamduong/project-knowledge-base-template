import { useQuery } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost } from '../../../shared/api/client'

export type PlanningGraphNodeKind = 'workspace' | 'objective' | 'key_result' | 'release' | 'intent' | 'task'

export type PlanningGraphNode = {
  id: string
  kind: PlanningGraphNodeKind
  label: string
  state: string
  detail: string
  metrics: string[]
  warning?: boolean
}

export type PlanningGraphEdge = {
  id: string
  kind: string
  source: string
  target: string
}

export type PlanningTask = {
  id: string
  title: string
  description: string
  state: string
  section: string
  source: string
  task_index: number
  explicit_commits?: string[]
  tags?: string[]
}

export type PlanningIntent = {
  id: string
  title: string
  lifecycle: string
  mode: string
  change_type: string
  summary: string
  goal_text: string
  decision_summary: string
  close_condition: string
  focus_current: string
  focus_next_action: string
  focus_updated_at: string | null
  progress: number
  runtime_state: string
  release_bucket: string
  task_count: number
  completed_task_count: number
  validation_state: 'linked' | 'missing-key-result' | 'proposed-new-key-result' | 'out-of-scope'
  linked_key_result_ids: string[]
  assistant_decision?: 'bind-existing' | 'propose-new-okr' | 'out-of-scope' | null
  assistant_summary?: string
  assistant_why_now?: string
  assistant_next_action?: string
  assistant_release_id?: string | null
  proposed_objective?: {
    title: string
    description: string
    success_criteria: string
  } | null
  proposed_key_result?: {
    title: string
    description: string
    success_criteria: string
    metric: string
    target: string
  } | null
  out_of_scope_reason?: string | null
  assistant_warnings?: string[]
  staged_files: string[]
  source_file: string | null
  workspace_path: string | null
  scope: string
  tasks: PlanningTask[]
}

export type PlanningKeyResult = {
  id: string
  code: string
  title: string
  description: string
  success_criteria: string
  metric: string
  target: string
  state: string
  parent_objective_id: string
}

export type PlanningObjective = {
  id: string
  code: string
  title: string
  description: string
  success_criteria: string
  state: string
  parent_objective_id: string | null
  children: PlanningObjective[]
  key_results: PlanningKeyResult[]
}

export type PlanningRelease = {
  id: string
  code: string
  title: string
  description: string
  state: string
  release_bucket: string
  intent_ids: string[]
  target_goal_ids: string[]
  source_kind: 'declared' | 'derived'
  progress: number
  intents: PlanningIntent[]
}

export type PlanningWarning = {
  id: string
  code: string
  level: 'warning' | 'info'
  message: string
  entity_ids: string[]
}

export type PlanningWorkspaceResponse = {
  checkedAt: string
  source: {
    seedPath: string | null
    reviewPath: string | null
  }
  workspace: {
    id: string
    title: string
    description: string
    mode: string
  }
  northStar: {
    id: string
    title: string
    description: string
  }
  summary: {
    objectives: number
    keyResults: number
    intents: number
    tasks: number
    releases: number
    intentsWithoutKeyResult: number
    mappedIntents: number
  }
  validation: {
    warnings: PlanningWarning[]
    missingKeyResultIntentIds: string[]
  }
  objectives: PlanningObjective[]
  keyResults: PlanningKeyResult[]
  intents: PlanningIntent[]
  releases: PlanningRelease[]
  graph: {
    nodes: PlanningGraphNode[]
    edges: PlanningGraphEdge[]
  }
}

export type PlanningWorkspaceMutationResponse = {
  ok: boolean
  workspace: PlanningWorkspaceResponse
}

export type PlanningAssistantCandidateBase = {
  id: string
  code: string
  title: string
  description: string
  state: string
  rationale: string
  confidence: 'high' | 'medium' | 'low'
}

export type PlanningAssistantKeyResultCandidate = PlanningAssistantCandidateBase & {
  metric: string
  target: string
  objective_id: string | null
  objective_code: string | null
  objective_title: string | null
}

export type PlanningAssistantReleaseCandidate = PlanningAssistantCandidateBase & {
  release_bucket: string
  source_kind: 'declared' | 'derived'
  progress: number
  already_included: boolean
}

export type PlanningAssistantSuggestion = {
  decision: 'bind-existing' | 'propose-new-okr' | 'out-of-scope'
  summary: string
  why_now: string
  next_action: string
  primary_key_result_id: string | null
  primary_release_id: string | null
  key_result_candidates: PlanningAssistantKeyResultCandidate[]
  release_candidates: PlanningAssistantReleaseCandidate[]
  proposed_objective: {
    title: string
    description: string
    success_criteria: string
  } | null
  proposed_key_result: {
    title: string
    description: string
    success_criteria: string
    metric: string
    target: string
  } | null
  out_of_scope_reason: string | null
  warnings: string[]
}

export type PlanningAssistantResponse = {
  ok: boolean
  intent_id: string
  provider: string
  model: string
  generated_at: string
  suggestion: PlanningAssistantSuggestion
}

export type PlanningAssistantApplyResponse = {
  ok: boolean
  workspace: PlanningWorkspaceResponse
}

export function usePlanningWorkspace() {
  return useQuery({
    queryKey: ['planning-workspace'],
    queryFn: () => apiGet<PlanningWorkspaceResponse>('/api/graph/planning/workspace'),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function addIntentKeyResultLink(intentId: string, keyResultId: string) {
  return apiPost<PlanningWorkspaceMutationResponse>(`/api/graph/planning/intents/${encodeURIComponent(intentId)}/key-results/${encodeURIComponent(keyResultId)}`, {
    relation: 'advances',
  })
}

export function removeIntentKeyResultLink(intentId: string, keyResultId: string) {
  return apiDelete<PlanningWorkspaceMutationResponse>(`/api/graph/planning/intents/${encodeURIComponent(intentId)}/key-results/${encodeURIComponent(keyResultId)}`)
}

export function addIntentToRelease(releaseId: string, intentId: string) {
  return apiPost<PlanningWorkspaceMutationResponse>(`/api/graph/planning/releases/${encodeURIComponent(releaseId)}/intents/${encodeURIComponent(intentId)}`)
}

export function removeIntentFromRelease(releaseId: string, intentId: string) {
  return apiDelete<PlanningWorkspaceMutationResponse>(`/api/graph/planning/releases/${encodeURIComponent(releaseId)}/intents/${encodeURIComponent(intentId)}`)
}

export function generateIntentAssistantPlan(intentId: string) {
  return apiPost<PlanningAssistantResponse>(`/api/graph/planning/intents/${encodeURIComponent(intentId)}/assistant-plan`)
}

export function applyIntentAssistantPlan(intentId: string, body: PlanningAssistantSuggestion) {
  return apiPost<PlanningAssistantApplyResponse>(`/api/graph/planning/intents/${encodeURIComponent(intentId)}/assistant-apply`, body)
}
