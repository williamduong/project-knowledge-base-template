import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../shared/api/client'

export type HomeSummaryResponse = {
  ok: boolean
  summary: {
    generatedAt: string
    workspace: {
      activeIntentCount: number | null
      activeIntentId: string | null
      releaseCurrent: string | null
      releaseLatest: string | null
      hasWorkingTreeChanges: boolean
    }
    session: {
      sessionIntentId: string | null
      sessionIntentSource: string
      sessionLabel: string
      checkpointEvent: string | null
      checkpointIntentId: string | null
      checkpointTimestamp: string | null
      focusFile: string | null
      activeIntentIds: string[]
      intent: {
        id: string | null
        title: string | null
        goal: string | null
        summary: string | null
        lifecycle: string | null
        status: string | null
        focusCurrent: string | null
        focusNextAction: string | null
        chaosEstimate: {
          currentScore: number | null
          currentLevel: string | null
          estimatedDelta: number | null
          projectedScore: number | null
          projectedLevel: string | null
          warning: string | null
        } | null
      } | null
      currentTask: {
        title: string | null
        status: string | null
        source: string | null
      } | null
    }
    goal: {
      text: string | null
      summary: string | null
      focusCurrent: string | null
      focusNextAction: string | null
      checkpointEvent: string | null
      checkpointTimestamp: string | null
    }
    pipeline: {
      ok: boolean
      file: string | null
      stepCount: number
      confirmCount: number
      failOnNonzeroCount: number
      steps: Array<{
        index: number
        name: string
        description: string | null
        confirm: boolean
        when: string | null
      }>
      error?: string
    }
    rules: {
      ok: boolean
      count: number
      hardCount: number
      masterCount: number
      softCount: number
      packCount: number
      linted: number | null
      violationCount: number
      errorCount: number
      warnCount: number
      rules: Array<{
        id: string | null
        title: string | null
        severity: string | null
        kind: string | null
        layer: string | null
        scope: string[]
        priority: string | null
        dependsOn: string[]
        overrideMode: string | null
        tools: string[]
        precedence: number | null
        description: string | null
        sourceDoc: string | null
        sourceAnchor: string | null
      }>
      packs: Array<{
        id: string | null
        title: string | null
        context: string | null
        description: string | null
        ruleIds: string[]
        stats: {
          count: number
          hardCount: number
          masterCount: number
          softCount: number
          toolCoverage: number
        }
      }>
      precedence: Array<{
        level: number
        label: string
        description: string
      }>
      violations: Array<{
        ruleId: string | null
        severity: string | null
        file: string | null
        line: number | null
        message: string | null
      }>
      topRules: Array<{
        id: string | null
        title: string | null
        severity: string | null
        kind: string | null
        precedence: number | null
        description: string | null
        sourceDoc: string | null
      }>
      topViolations: Array<{
        ruleId: string | null
        severity: string | null
        file: string | null
        message: string | null
      }>
    }
    runtime: {
      registeredCount: number
      runningCount: number
      healthyCount: number
      summaryLabel: string
      services: Array<{
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
      }>
      refreshedAt: string | null
      nextRunAt: string | null
      lastError: string | null
    }
    system: {
      result: string | null
      nodeVersion: string | null
      workspaceRoot: string | null
      checkSummary: {
        pass: number
        warn: number
        error: number
        info: number
      }
    }
    milestones: Array<{
      id: string
      label: string
      detail: string
      status: string
    }>
  }
  errors: Record<string, string | null>
}

export function useHomeSummary() {
  return useQuery({
    queryKey: ['home-summary'],
    queryFn: () => apiGet<HomeSummaryResponse>('/api/home-summary'),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}