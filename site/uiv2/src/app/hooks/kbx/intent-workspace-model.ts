import type { IntentListItem } from './useIntentsList'

export type IntentMilestoneProjection = {
  id: string
  label: string
  progress: number
  state: 'draft' | 'backlog' | 'active' | 'closed'
  metrics: string
  objectives: string[]
  goals: string[]
  goalCount: number
}

export type IntentReleaseLineProjection = {
  id: string
  label: string
  milestoneCount: number
  intentCount: number
  progress: number
  state: 'draft' | 'backlog' | 'active' | 'closed'
  metrics: string
  summary: string
}

export function clampIntentProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function deriveVersionBucket(intentId: string) {
  const match = String(intentId || '').match(/^(v\d+(?:-\d+)?)/i)
  return match?.[1]?.toLowerCase() ?? 'legacy'
}

export function versionRank(versionId: string) {
  const numbers = String(versionId || '')
    .replace(/^v/i, '')
    .split('-')
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part))
  return numbers.reduce((accumulator, value, index) => accumulator + value / 10 ** (index * 2), 0)
}

export function formatReleaseLineLabel(bucketId: string) {
  if (bucketId === 'legacy') return 'Legacy'
  return bucketId.replace(/^v(\d+)-(\d+)$/i, 'v$1.$2').toUpperCase()
}

function normalizeLifecycle(value: string | null | undefined) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return 'unknown'
  if (text === 'active') return 'active'
  if (text === 'backlog') return 'backlog'
  if (text === 'closed' || text === 'released') return 'closed'
  if (text === 'archive' || text === 'archived') return 'archived'
  if (text === 'draft') return 'draft'
  if (text === 'open') return 'backlog'
  return text.replace(/\s+/g, '-')
}

function summarizeMilestoneState(intents: IntentListItem[]) {
  const total = intents.length || 1
  const active = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'active').length
  const draft = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'draft').length
  const backlog = intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'backlog').length
  const closed = intents.filter((intent) => ['closed', 'archived'].includes(normalizeLifecycle(intent.lifecycle))).length
  const progress = clampIntentProgress((closed / total) * 100)

  if (active > 0) return { state: 'active' as const, progress }
  if (backlog > 0) return { state: 'backlog' as const, progress }
  if (draft > 0) return { state: 'draft' as const, progress }
  return { state: 'closed' as const, progress: closed === total ? 100 : progress }
}

export function buildMilestones(intents: IntentListItem[]): IntentMilestoneProjection[] {
  const buckets = new Map<string, IntentListItem[]>()

  for (const intent of intents) {
    const bucket = deriveVersionBucket(intent.id)
    const current = buckets.get(bucket) ?? []
    current.push(intent)
    buckets.set(bucket, current)
  }

  return Array.from(buckets.entries())
    .map(([id, bucketIntents]) => {
      const { progress, state } = summarizeMilestoneState(bucketIntents)
      const active = bucketIntents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'active').length
      const backlog = bucketIntents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'backlog').length
      const objectives = bucketIntents
        .slice(0, 3)
        .map((intent) => intent.title?.replace(/^"|"$/g, '') || intent.id)
      const goals = bucketIntents
        .map((intent) => String(intent.goalText ?? intent.goal ?? '').trim())
        .filter(Boolean)

      return {
        id,
        label: id === 'legacy' ? 'Legacy' : id.toUpperCase(),
        progress,
        state,
        metrics: `${bucketIntents.length} intents · ${active} active · ${backlog} backlog`,
        objectives,
        goals,
        goalCount: goals.length,
      }
    })
    .sort((left, right) => versionRank(left.id) - versionRank(right.id))
}

export function buildReleaseLines(milestones: IntentMilestoneProjection[]): IntentReleaseLineProjection[] {
  return milestones.map((milestone) => ({
    id: milestone.id,
    label: formatReleaseLineLabel(milestone.id),
    milestoneCount: 1,
    intentCount: Number.parseInt(milestone.metrics, 10) || milestone.objectives.length,
    progress: milestone.progress,
    state: milestone.state,
    metrics: milestone.metrics,
    summary: milestone.objectives[0] ?? 'No milestone objective captured yet.',
  }))
}
