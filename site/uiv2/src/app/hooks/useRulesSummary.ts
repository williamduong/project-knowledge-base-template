import { useSystemSnapshot } from './useSystemSnapshot'

export type RulesSummaryResponse = {
  ok: boolean
  summary: {
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
        toolAssociationCoverage: number
        enforcementCoverage: number
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
  errors: {
    list: string | null
    lint: string | null
  }
}

export function useRulesSummary() {
  const snapshotQuery = useSystemSnapshot()

  return {
    ...snapshotQuery,
    data: snapshotQuery.data?.rulesSummary as RulesSummaryResponse | undefined,
    snapshotMetadata: snapshotQuery.data?.metadata,
  }
}
