'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { updateAiSettings } = require('../../src/lib/ai-settings');
const {
  selectKeyResultCandidates,
  selectReleaseCandidates,
  generateIntentPlanSuggestion,
} = require('../../src/lib/planning-assistant');

function createWorkspaceFixture() {
  return {
    workspace: {
      id: 'svfactory',
      title: 'Planning Workspace',
      description: 'Workspace for intent and release planning.',
      mode: 'svfactory-only',
    },
    northStar: {
      id: 'north-star',
      title: 'North Star',
      description: 'Keep execution tied to measurable outcomes.',
    },
    summary: {
      objectives: 2,
      keyResults: 3,
      intents: 1,
      tasks: 2,
      releases: 2,
      intentsWithoutKeyResult: 1,
      mappedIntents: 0,
    },
    objectives: [
      {
        id: 'obj-release',
        code: 'O1',
        title: 'Clarify release execution',
        description: 'Make release planning traceable.',
        success_criteria: 'Releases map cleanly to intents.',
        state: 'active',
        parent_objective_id: null,
        children: [],
        key_results: [],
      },
    ],
    keyResults: [
      {
        id: 'kr-release-fit',
        code: 'KR1',
        title: 'Map active intents to the correct release lane',
        description: 'Ensure intent and release fit is explicit.',
        success_criteria: 'All active intents are assigned correctly.',
        metric: 'coverage',
        target: '100%',
        state: 'active',
        parent_objective_id: 'obj-release',
      },
      {
        id: 'kr-docs',
        code: 'KR2',
        title: 'Improve onboarding docs',
        description: 'Document workflows.',
        success_criteria: 'Docs updated.',
        metric: 'docs',
        target: '1 pack',
        state: 'planned',
        parent_objective_id: 'obj-release',
      },
      {
        id: 'kr-graph',
        code: 'KR3',
        title: 'Render graph view faster',
        description: 'Tune graph performance.',
        success_criteria: 'Graph opens quickly.',
        metric: 'latency',
        target: '<2s',
        state: 'planned',
        parent_objective_id: 'obj-release',
      },
    ],
    intents: [
      {
        id: 'v3-0-release-alignment',
        title: 'Release alignment assistant',
        lifecycle: 'active',
        mode: 'manual',
        change_type: 'feature',
        summary: 'Help the operator place this intent into the right release and measurable KR.',
        goal_text: 'Need release alignment and KR mapping.',
        decision_summary: '',
        close_condition: '',
        focus_current: 'Choose the best release lane and KR.',
        focus_next_action: 'Review the best recommendation.',
        focus_updated_at: null,
        progress: 20,
        runtime_state: 'active',
        release_bucket: 'v3-0',
        task_count: 2,
        completed_task_count: 0,
        validation_state: 'missing-key-result',
        linked_key_result_ids: [],
        staged_files: [],
        source_file: null,
        workspace_path: null,
        scope: 'planning',
        tasks: [
          { id: 't1', title: 'Review intent', description: '', state: 'todo', section: 'now', source: 'intent', task_index: 0 },
          { id: 't2', title: 'Map release', description: '', state: 'todo', section: 'next', source: 'intent', task_index: 1 },
        ],
      },
    ],
    releases: [
      {
        id: 'release-v3-0',
        code: 'R3.0',
        title: 'v3.0 General Planning',
        description: 'Primary release lane for v3.0 planning work.',
        state: 'active',
        release_bucket: 'v3-0',
        intent_ids: [],
        target_goal_ids: [],
        source_kind: 'declared',
        progress: 35,
        intents: [],
      },
      {
        id: 'release-v2-10',
        code: 'R2.10',
        title: 'v2.10 Graph Work',
        description: 'Legacy graph stream.',
        state: 'planned',
        release_bucket: 'v2-10',
        intent_ids: [],
        target_goal_ids: [],
        source_kind: 'declared',
        progress: 80,
        intents: [],
      },
    ],
  };
}

test('planning assistant ranks the most relevant key result and release first', () => {
  const workspace = createWorkspaceFixture();
  const intent = workspace.intents[0];

  const keyResults = selectKeyResultCandidates(workspace, intent);
  const releases = selectReleaseCandidates(workspace, intent);

  assert.equal(keyResults[0].id, 'kr-release-fit');
  assert.equal(releases[0].id, 'release-v3-0');
});

test('planning assistant enriches provider output into UI-ready suggestion payload', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-assistant-'));
  updateAiSettings(workspaceRoot, {
    api_key: 'deepseek-test-key',
    model: 'deepseek-v4-flash',
  });

  const workspace = createWorkspaceFixture();

  const suggestion = await generateIntentPlanSuggestion(
    workspaceRoot,
    workspace,
    'v3-0-release-alignment',
    {
      providerOverride: {
        extract: async () => ({
          decision: 'propose-new-okr',
          summary: 'This intent needs one measurable KR and one release lane.',
          why_now: 'Without a KR and release, it stays ambiguous and hard to track.',
          next_action: 'Draft a new objective/KR proposal and keep the release aligned to v3.0.',
          primary_key_result_id: null,
          primary_release_id: 'release-v3-0',
          proposed_objective: {
            title: 'Stabilize planning operator surfaces',
            description: 'Create a clearer operator surface for planning and release triage.',
            success_criteria: 'Operator can resolve planning ambiguity without editing JSON by hand.',
          },
          proposed_key_result: {
            title: 'Triage unresolved intents with one-click assistant decisions',
            description: 'Allow the operator to accept AI triage for bind, propose, or out-of-scope flows.',
            success_criteria: 'Assistant triage covers all unresolved intents in the queue.',
            metric: 'triaged intents',
            target: '100%',
          },
          out_of_scope_reason: null,
          key_result_candidates: [
            { id: 'kr-release-fit', rationale: 'Directly measures release alignment.', confidence: 'high' },
          ],
          release_candidates: [
            { id: 'release-v3-0', rationale: 'Matches the intent bucket and active stream.', confidence: 'high' },
          ],
          warnings: ['No KR is currently linked to this intent.'],
        }),
      },
    },
  );

  assert.equal(suggestion.ok, true);
  assert.equal(suggestion.intent_id, 'v3-0-release-alignment');
  assert.equal(suggestion.suggestion.decision, 'propose-new-okr');
  assert.equal(suggestion.suggestion.primary_key_result_id, null);
  assert.equal(suggestion.suggestion.primary_release_id, 'release-v3-0');
  assert.equal(suggestion.suggestion.proposed_objective?.title, 'Stabilize planning operator surfaces');
  assert.equal(suggestion.suggestion.key_result_candidates[0].code, 'KR1');
  assert.equal(suggestion.suggestion.release_candidates[0].code, 'R3.0');
});
