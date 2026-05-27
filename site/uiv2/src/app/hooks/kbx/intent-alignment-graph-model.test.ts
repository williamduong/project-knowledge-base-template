import {
  buildIntentContextPath,
  emptyIntentAlignmentGraph,
  resolveIntentContextTarget,
} from './intent-alignment-graph-model'

describe('intent alignment graph query model', () => {
  it('prefers selected intent, then focus intent, then active intent when resolving context target', () => {
    expect(resolveIntentContextTarget({
      selectedIntentId: 'v2-10-code-graph',
      focusIntentId: 'v2-7-0-1-ui-state-contract',
      activeIntentId: 'v2-8-kbx-beta-bug-hunt',
    })).toEqual({
      id: 'v2-10-code-graph',
      kind: 'intent',
    })

    expect(resolveIntentContextTarget({
      selectedIntentId: null,
      focusIntentId: 'v2-7-0-1-ui-state-contract',
      activeIntentId: 'v2-8-kbx-beta-bug-hunt',
    })).toEqual({
      id: 'v2-7-0-1-ui-state-contract',
      kind: 'intent',
    })

    expect(resolveIntentContextTarget({
      selectedIntentId: null,
      focusIntentId: null,
      activeIntentId: null,
    })).toEqual({
      id: 'workspace',
      kind: 'workspace',
    })
  })

  it('builds the context explorer path with explicit query controls', () => {
    expect(buildIntentContextPath({
      selectedIntentId: 'v2-10-code-graph',
      focusIntentId: null,
      activeIntentId: null,
      depth: 2,
      mode: 'focus',
      includeTasks: false,
      includeUnlinked: false,
    })).toBe('/api/intents/context?id=v2-10-code-graph&kind=intent&depth=2&mode=focus&include_tasks=false&include_unlinked=false')
  })

  it('exposes an empty graph placeholder while the query is loading', () => {
    expect(emptyIntentAlignmentGraph.center.id).toBe('workspace:svfactory')
    expect(emptyIntentAlignmentGraph.query.kind).toBe('workspace')
    expect(emptyIntentAlignmentGraph.nodes).toEqual([])
  })
})
