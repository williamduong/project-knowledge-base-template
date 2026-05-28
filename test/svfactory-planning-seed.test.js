'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  loadPlanningSeed,
  buildPlanningGoalRecords,
  applySvfactoryPlanningSeed,
} = require('../src/lib/svfactory-planning-seed');

function tmpWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svfactory-planning-seed-'));
  fs.mkdirSync(path.join(root, 'svfactory'), { recursive: true });
  fs.mkdirSync(path.join(root, 'knowledge-base', 'intents', '_active', 'v2-10-code-graph'), { recursive: true });
  fs.mkdirSync(path.join(root, 'knowledge-base', 'intents', '_backlog'), { recursive: true });
  fs.writeFileSync(path.join(root, 'knowledge-base', 'intents', '_active', 'v2-10-code-graph', 'intent.md'), '---\nid: v2-10-code-graph\n---\n', 'utf8');
  fs.writeFileSync(path.join(root, 'knowledge-base', 'intents', '_backlog', 'v3-0-dna-graph-ontology-boundary.md'), '---\nid: v3-0-dna-graph-ontology-boundary\n---\n', 'utf8');
  return root;
}

test('planning seed flattens objectives and key results into system goal records', () => {
  const workspaceRoot = tmpWorkspace();
  const planningSeedPath = path.join(process.cwd(), 'svfactory', 'planning.seed.json');
  fs.copyFileSync(planningSeedPath, path.join(workspaceRoot, 'svfactory', 'planning.seed.json'));

  const { seed } = loadPlanningSeed(workspaceRoot);
  const records = buildPlanningGoalRecords(seed);

  assert.equal(records.some((record) => record.goal_kind === 'objective'), true);
  assert.equal(records.some((record) => record.goal_kind === 'key_result'), true);
  assert.equal(records.every((record) => record.entity_level === 'system' && record.entity_id === 'workspace'), true);
});

test('planning seed can be applied into workspace goal storage and emit review list', () => {
  const workspaceRoot = tmpWorkspace();
  const planningSeedPath = path.join(process.cwd(), 'svfactory', 'planning.seed.json');
  fs.copyFileSync(planningSeedPath, path.join(workspaceRoot, 'svfactory', 'planning.seed.json'));

  const result = applySvfactoryPlanningSeed(workspaceRoot);

  assert.equal(result.state.goals.length > 5, true);
  assert.equal(result.state.goals.some((goal) => goal.goal_kind === 'key_result'), true);
  assert.equal(result.review.intents_missing_goal_mapping.some((item) => item.intent_id === 'v2-10-code-graph'), true);
  assert.equal(fs.existsSync(result.reviewPath), true);
});
