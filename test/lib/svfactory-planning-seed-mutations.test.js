'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  loadPlanningSeed,
  loadPlanningReview,
  addIntentKeyResultLink,
  removeIntentKeyResultLink,
  addIntentToRelease,
  removeIntentFromRelease,
  applyAssistantDecision,
} = require('../../src/lib/svfactory-planning-seed');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function buildWorkspaceRoot() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-seed-mutations-'));
  writeJson(path.join(workspaceRoot, 'knowledge-base', '.kb', 'state.json'), { storageMode: 'tracked' });
  writeJson(path.join(workspaceRoot, 'svfactory', 'planning.seed.json'), {
    schema_version: '0.1.0',
    mode: 'svfactory-only',
    north_star: {
      id: 'ns-1',
      title: 'North star',
      description: 'Description',
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
          {
            id: 'kr-2',
            code: 'KR2',
            title: 'Key result 2',
            description: 'KR description 2',
            success_criteria: 'KR2 succeeds',
            metric: 'latency',
            target: '1 click',
            state: 'planned',
          },
        ],
      },
    ],
    releases: [
      {
        id: 'release-a',
        code: 'v1.0',
        title: 'Release A',
        description: 'Release',
        state: 'active',
        intent_ids: ['intent-a'],
        target_goal_ids: [],
      },
    ],
    intent_goal_links: [],
  });
  writeText(path.join(workspaceRoot, 'knowledge-base', 'intents', '_active', 'intent-a', 'intent.md'), `---
id: intent-a
title: Intent A
lifecycle: active
---

# Intent
`);
  writeText(path.join(workspaceRoot, 'knowledge-base', 'intents', '_active', 'intent-b', 'intent.md'), `---
id: intent-b
title: Intent B
lifecycle: backlog
---

# Intent
`);
  return workspaceRoot;
}

test('planning seed mutations add and remove intent key result links', () => {
  const workspaceRoot = buildWorkspaceRoot();

  addIntentKeyResultLink(workspaceRoot, {
    intentId: 'intent-b',
    keyResultId: 'kr-2',
    relation: 'advances',
    notes: 'manual link',
  });

  let loaded = loadPlanningSeed(workspaceRoot).seed;
  assert.equal(loaded.intent_goal_links.length, 1);
  assert.equal(loaded.intent_goal_links[0].intent_id, 'intent-b');
  assert.equal(loaded.intent_goal_links[0].key_result_id, 'kr-2');

  removeIntentKeyResultLink(workspaceRoot, {
    intentId: 'intent-b',
    keyResultId: 'kr-2',
  });

  loaded = loadPlanningSeed(workspaceRoot).seed;
  assert.equal(loaded.intent_goal_links.length, 0);
});

test('planning seed mutations add and remove release intent membership', () => {
  const workspaceRoot = buildWorkspaceRoot();

  addIntentToRelease(workspaceRoot, {
    releaseId: 'release-a',
    intentId: 'intent-b',
  });

  let loaded = loadPlanningSeed(workspaceRoot).seed;
  assert.deepEqual(loaded.releases[0].intent_ids, ['intent-a', 'intent-b']);

  removeIntentFromRelease(workspaceRoot, {
    releaseId: 'release-a',
    intentId: 'intent-a',
  });

  loaded = loadPlanningSeed(workspaceRoot).seed;
  assert.deepEqual(loaded.releases[0].intent_ids, ['intent-b']);
});

test('assistant decision can store a new O/KR proposal without forcing a KR link', () => {
  const workspaceRoot = buildWorkspaceRoot();

  const result = applyAssistantDecision(workspaceRoot, {
    intentId: 'intent-b',
    decision: 'propose-new-okr',
    summary: 'No existing KR fits cleanly.',
    whyNow: 'A weak bind would make the ontology noisy.',
    nextAction: 'Review the proposed objective and key result.',
    proposedObjective: {
      title: 'Reduce planning ambiguity',
      description: 'Make manual planning decisions easier to resolve.',
      success_criteria: 'Operators can classify unresolved intents quickly.',
    },
    proposedKeyResult: {
      title: 'Resolve unresolved intents through assistant triage',
      description: 'Draft a measurable path instead of forcing bad mappings.',
      success_criteria: 'Manual remediation is faster and clearer.',
      metric: 'triaged intents',
      target: '100%',
    },
  });

  const loadedSeed = loadPlanningSeed(workspaceRoot).seed;
  const review = loadPlanningReview(workspaceRoot).review;
  const createdObjective = loadedSeed.goals.find((goal) => goal.title === 'Reduce planning ambiguity');
  assert.ok(createdObjective);
  assert.equal(createdObjective.code, 'G2');
  assert.equal(createdObjective.key_results.length, 1);
  assert.equal(createdObjective.key_results[0].title, 'Resolve unresolved intents through assistant triage');
  assert.equal(loadedSeed.intent_goal_links.length, 1);
  assert.equal(loadedSeed.intent_goal_links[0].intent_id, 'intent-b');
  assert.equal(loadedSeed.intent_goal_links[0].key_result_id, createdObjective.key_results[0].id);
  assert.equal(review.assistant_triage['intent-b'].decision, 'propose-new-okr');
  assert.equal(review.assistant_triage['intent-b'].status, 'applied');
  assert.equal(review.assistant_triage['intent-b'].proposed_key_result.title, 'Resolve unresolved intents through assistant triage');
  assert.equal(review.assistant_triage['intent-b'].key_result_id, createdObjective.key_results[0].id);
  assert.equal(result.review.assistant_triage['intent-b'].objective_id, createdObjective.id);
});

test('assistant decision can mark an intent out of scope', () => {
  const workspaceRoot = buildWorkspaceRoot();

  applyAssistantDecision(workspaceRoot, {
    intentId: 'intent-b',
    decision: 'out-of-scope',
    summary: 'This work does not map to current OKRs.',
    whyNow: 'Forcing it into the current tree would blur planning signals.',
    nextAction: 'Keep it visible until the goals change or a new OKR is created.',
    outOfScopeReason: 'The intent is exploratory maintenance work outside the current release objectives.',
  });

  const review = loadPlanningReview(workspaceRoot).review;
  assert.equal(review.assistant_triage['intent-b'].decision, 'out-of-scope');
  assert.equal(review.assistant_triage['intent-b'].status, 'pending-review');
  assert.equal(
    review.assistant_triage['intent-b'].out_of_scope_reason,
    'The intent is exploratory maintenance work outside the current release objectives.',
  );
});
