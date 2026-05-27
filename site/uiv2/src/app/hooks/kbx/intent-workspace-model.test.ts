import type { IntentListItem } from './useIntentsList'
import { buildMilestones, buildReleaseLines, deriveVersionBucket, formatReleaseLineLabel } from './intent-workspace-model'

const sampleIntents: IntentListItem[] = [
  {
    id: 'v2-7-nl-rules-to-cli-logic',
    title: 'Rules to CLI logic',
    lifecycle: 'active',
    priority: 'high',
    blocks: null,
    mode: 'normal',
    strategic_mode: null,
    taskCount: 3,
    taskDoneCount: 1,
    goal: 'Ground rules in runtime',
    goalText: 'Ground rules in runtime',
  },
  {
    id: 'v2-8-kbx-beta-bug-hunt',
    title: 'Bug hunt',
    lifecycle: 'closed',
    priority: 'medium',
    blocks: null,
    mode: 'normal',
    strategic_mode: null,
    taskCount: 2,
    taskDoneCount: 2,
    goal: 'Stabilize beta',
    goalText: 'Stabilize beta',
  },
]

describe('intent workspace model', () => {
  it('derives version buckets from intent ids', () => {
    expect(deriveVersionBucket(sampleIntents[0].id)).toBe('v2-7')
    expect(formatReleaseLineLabel('v2-7')).toBe('V2.7')
    expect(formatReleaseLineLabel('legacy')).toBe('Legacy')
  })

  it('builds milestone and release line projections from intent inventory', () => {
    const milestones = buildMilestones(sampleIntents)
    const releaseLines = buildReleaseLines(milestones)

    expect(milestones).toHaveLength(2)
    expect(milestones[0].id).toBe('v2-7')
    expect(milestones[1].id).toBe('v2-8')
    expect(releaseLines.map((line) => line.label)).toEqual(['V2.7', 'V2.8'])
  })
})
