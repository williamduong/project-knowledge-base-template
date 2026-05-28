'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildWorkspaceSnapshot } = require('../../src/graph-db/planning/snapshot');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

test('buildWorkspaceSnapshot projects OKR tree and flags intents without key results', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-workspace-'));

  writeJson(path.join(workspaceRoot, 'knowledge-base', '.kb', 'state.json'), { storageMode: 'tracked' });
  writeJson(path.join(workspaceRoot, 'svfactory', 'planning.seed.json'), {
    schema_version: '0.1.0',
    mode: 'svfactory-only',
    north_star: {
      id: 'ns-1',
      title: 'North star',
      description: 'Build the planning workspace',
    },
    goals: [
      {
        id: 'g-1',
        code: 'G1',
        kind: 'objective',
        title: 'Objective',
        description: 'Objective description',
        success_criteria: 'Objective succeeds',
        state: 'active',
        sub_goals: [],
        key_results: [
          {
            id: 'kr-1',
            code: 'KR1',
            title: 'Key result',
            description: 'KR description',
            success_criteria: 'KR succeeds',
            metric: 'coverage',
            target: '100%',
            state: 'active',
          },
        ],
      },
    ],
    releases: [],
    intent_goal_links: [
      {
        intent_id: 'linked-intent',
        relation: 'advances',
        key_result_id: 'kr-1',
      },
    ],
  });

  writeText(path.join(workspaceRoot, 'knowledge-base', 'intents', '_active', 'linked-intent', 'intent.md'), `---
id: linked-intent
title: Linked intent
lifecycle: active
focus:
  current: wire graph
  next_action: ship route
---

# Intent: linked-intent

## Summary

> Linked summary

## Plan

- [ ] build graph route
`);

  writeText(path.join(workspaceRoot, 'knowledge-base', 'intents', '_active', 'missing-intent', 'intent.md'), `---
id: missing-intent
title: Missing link intent
lifecycle: backlog
---

# Intent: missing-intent

## Summary

> Missing summary

## Plan

1. draft migration
`);

  writeJson(path.join(workspaceRoot, 'svfactory', 'planning-intent-review.json'), {
    generated_at: new Date().toISOString(),
    north_star: 'North star',
    active_intent_ids: ['linked-intent', 'missing-intent'],
    backlog_intent_ids: [],
    linked_intent_ids: ['linked-intent'],
    intents_missing_goal_mapping: [],
    assistant_triage: {
      'missing-intent': {
        decision: 'propose-new-okr',
        summary: 'Needs a new KR proposal.',
        proposed_objective: {
          title: 'New objective',
          description: 'Objective description',
          success_criteria: 'Objective succeeds',
        },
        proposed_key_result: {
          title: 'New KR',
          description: 'KR description',
          success_criteria: 'KR succeeds',
          metric: 'coverage',
          target: '100%',
        },
      },
    },
  });

  const snapshot = buildWorkspaceSnapshot({ workspaceRoot });

  assert.equal(snapshot.summary.objectives, 1);
  assert.equal(snapshot.summary.keyResults, 1);
  assert.equal(snapshot.summary.intents, 2);
  assert.equal(snapshot.summary.tasks, 2);
  assert.deepEqual(snapshot.validation.missingKeyResultIntentIds, []);

  const linkedIntent = snapshot.intents.find((intent) => intent.id === 'linked-intent');
  const missingIntent = snapshot.intents.find((intent) => intent.id === 'missing-intent');
  assert.ok(linkedIntent);
  assert.ok(missingIntent);
  assert.equal(linkedIntent.validation_state, 'linked');
  assert.equal(missingIntent.validation_state, 'proposed-new-key-result');
  assert.equal(missingIntent.proposed_key_result.title, 'New KR');
  assert.equal(linkedIntent.tasks.length, 1);
});
