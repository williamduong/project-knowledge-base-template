'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  resolveAiSettingsPaths,
  readAiSettings,
  updateAiSettings,
} = require('../../src/lib/ai-settings');

test('ai settings persist encrypted api key and text context fields', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-settings-'));

  const saved = updateAiSettings(workspaceRoot, {
    api_key: 'deepseek-secret-key',
    model: 'deepseek-reasoner',
    system_prompt: 'system prompt',
    planning_harness_prompt: 'harness prompt',
    app_primary_goals: 'goal one\ngoal two',
    app_description: 'desc',
  });

  assert.equal(saved.has_api_key, true);
  assert.equal(saved.api_key_masked, 'deep***********-key');
  assert.equal(saved.model, 'deepseek-reasoner');
  assert.equal(saved.system_prompt, 'system prompt');
  assert.equal(saved.planning_harness_prompt, 'harness prompt');
  assert.equal(saved.app_primary_goals, 'goal one\ngoal two');
  assert.equal(saved.app_description, 'desc');

  const paths = resolveAiSettingsPaths(workspaceRoot);
  const rawFile = fs.readFileSync(paths.settingsPath, 'utf8');
  assert.match(rawFile, /encrypted_api_key/);
  assert.doesNotMatch(rawFile, /deepseek-secret-key/);

  const loaded = readAiSettings(workspaceRoot);
  assert.equal(loaded.has_api_key, true);
  assert.equal(loaded.api_key, 'deepseek-secret-key');
});

test('ai settings can clear stored api key without losing text config', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-settings-clear-'));

  updateAiSettings(workspaceRoot, {
    api_key: 'deepseek-secret-key',
    system_prompt: 'keep me',
  });

  const cleared = updateAiSettings(workspaceRoot, {
    clear_api_key: true,
  });

  assert.equal(cleared.has_api_key, false);
  assert.equal(cleared.api_key_masked, null);
  assert.equal(cleared.system_prompt, 'keep me');
});
