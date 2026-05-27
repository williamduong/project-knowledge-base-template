'use strict';

const TOOL_REGISTRY = Object.freeze([
  {
    id: 'svfactory.official_backlog_status',
    label: 'Inspect Official Backlog Pack',
    workspace: 'intent',
    kind: 'inspection',
    status: 'ready',
    allowedContexts: ['svfactory'],
    allowedActors: ['human', 'codex', 'claude', 'copilot'],
    execution: {
      transport: 'http',
      method: 'GET',
      path: '/api/svfactory/official-backlog/status',
    },
    inputContract: 'none',
    outputContract: 'svfactory.officialBacklogStatus',
    summary: 'Inspect the locked official SVFactory backlog pack before mutating goals or intent inventory.',
    sideEffects: [],
  },
  {
    id: 'svfactory.official_backlog_reset_seed',
    label: 'Reset And Seed Official Backlog',
    workspace: 'intent',
    kind: 'mutation',
    status: 'ready',
    allowedContexts: ['svfactory'],
    allowedActors: ['human', 'codex', 'claude', 'copilot'],
    execution: {
      transport: 'http',
      method: 'POST',
      path: '/api/svfactory/official-backlog/reset-seed',
    },
    inputContract: 'svfactory.officialBacklogResetSeed',
    outputContract: 'svfactory.officialBacklogResetSeed',
    summary: 'Backup current goal artifacts, rebuild the official SVFactory backlog projection, and reseed governance goals into the knowledge graph.',
    sideEffects: ['backs up goals.state.json and goals-state.db before reseeding the official backlog'],
  },
  {
    id: 'intent.create_draft',
    label: 'Create Draft Intent',
    workspace: 'intent',
    kind: 'mutation',
    status: 'ready',
    allowedContexts: ['svfactory'],
    allowedActors: ['human', 'codex', 'claude', 'copilot'],
    execution: {
      transport: 'http',
      method: 'POST',
      path: '/api/intents/create',
    },
    inputContract: 'intents.create',
    outputContract: 'intents.create',
    summary: 'Create a new draft intent through the canonical bridge route.',
    sideEffects: ['writes a new intent draft via kbx CLI'],
  },
  {
    id: 'intent.update_fields',
    label: 'Update Intent Fields',
    workspace: 'intent',
    kind: 'mutation',
    status: 'ready',
    allowedContexts: ['svfactory'],
    allowedActors: ['human', 'codex', 'claude', 'copilot'],
    execution: {
      transport: 'http',
      method: 'PATCH',
      path: '/api/intents/:id',
    },
    inputContract: 'intents.update',
    outputContract: 'intents.update',
    summary: 'Update editable intent metadata such as title, focus, next action, summary, and close condition.',
    sideEffects: ['mutates intent frontmatter through the canonical bridge route'],
  },
  {
    id: 'goal.create',
    label: 'Create Goal',
    workspace: 'intent',
    kind: 'mutation',
    status: 'ready',
    allowedContexts: ['svfactory'],
    allowedActors: ['human', 'codex', 'claude', 'copilot'],
    execution: {
      transport: 'http',
      method: 'POST',
      path: '/api/goals',
    },
    inputContract: 'goals.create',
    outputContract: 'goals.create',
    summary: 'Create a goal node in the system > milestone > intent > task tree.',
    sideEffects: ['mutates legacy goals state and rebuilds the goal tree snapshot'],
  },
  {
    id: 'goal.update',
    label: 'Update Goal',
    workspace: 'intent',
    kind: 'mutation',
    status: 'ready',
    allowedContexts: ['svfactory'],
    allowedActors: ['human', 'codex', 'claude', 'copilot'],
    execution: {
      transport: 'http',
      method: 'PATCH',
      path: '/api/goals/:goalId',
    },
    inputContract: 'goals.update',
    outputContract: 'goals.update',
    summary: 'Update goal title, description, parent link, or state.',
    sideEffects: ['mutates legacy goals state and rebuilds the goal tree snapshot'],
  },
  {
    id: 'goal.delete',
    label: 'Delete Goal',
    workspace: 'intent',
    kind: 'mutation',
    status: 'ready',
    allowedContexts: ['svfactory'],
    allowedActors: ['human', 'codex', 'claude', 'copilot'],
    execution: {
      transport: 'http',
      method: 'DELETE',
      path: '/api/goals/:goalId',
    },
    inputContract: 'goals.delete',
    outputContract: 'goals.delete',
    summary: 'Delete a goal node when it has no children.',
    sideEffects: ['mutates legacy goals state and rebuilds the goal tree snapshot'],
  },
  {
    id: 'intent.apply_preview',
    label: 'Preview Intent Apply',
    workspace: 'intent',
    kind: 'inspection',
    status: 'ready',
    allowedContexts: ['svfactory'],
    allowedActors: ['human', 'codex', 'claude', 'copilot'],
    execution: {
      transport: 'http',
      method: 'GET',
      path: '/api/intents/:id/apply-preview',
    },
    inputContract: 'intents.applyPreview',
    outputContract: 'intents.applyPreview',
    summary: 'Preview the file-level diff before applying an intent.',
    sideEffects: [],
  },
  {
    id: 'intent.apply',
    label: 'Apply Intent',
    workspace: 'intent',
    kind: 'mutation',
    status: 'ready',
    allowedContexts: ['svfactory'],
    allowedActors: ['human', 'codex', 'claude', 'copilot'],
    execution: {
      transport: 'http',
      method: 'POST',
      path: '/api/intents/:id/apply',
    },
    inputContract: 'intents.apply',
    outputContract: 'intents.apply',
    summary: 'Apply an approved intent through the bridge route.',
    sideEffects: ['writes planned mutations through kbx CLI apply flow'],
  },
  {
    id: 'task.patch_from_source',
    label: 'Patch Task From Source',
    workspace: 'intent',
    kind: 'planned',
    status: 'planned',
    allowedContexts: ['svfactory'],
    allowedActors: ['human', 'codex', 'claude', 'copilot'],
    execution: {
      transport: 'pending',
      method: 'PATCH',
      path: 'intent source files',
    },
    inputContract: 'pending',
    outputContract: 'pending',
    summary: 'Future task mutation surface for parsed task rows that are still sourced from intent.md and plan.md.',
    sideEffects: ['will edit source markdown once task entities are normalized'],
  },
]);

function listTools() {
  return TOOL_REGISTRY.slice();
}

function listToolsByWorkspace(workspace) {
  return TOOL_REGISTRY.filter((tool) => tool.workspace === workspace);
}

function summarizeTools() {
  return TOOL_REGISTRY.reduce((summary, tool) => {
    summary.total += 1;
    summary.byStatus[tool.status] = (summary.byStatus[tool.status] ?? 0) + 1;
    summary.byWorkspace[tool.workspace] = (summary.byWorkspace[tool.workspace] ?? 0) + 1;
    return summary;
  }, {
    total: 0,
    byStatus: {},
    byWorkspace: {},
  });
}

module.exports = {
  listTools,
  listToolsByWorkspace,
  summarizeTools,
};
