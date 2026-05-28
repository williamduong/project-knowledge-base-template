'use strict';

const COLLECTIONS = {
  WORKSPACES: 'pw_workspaces',
  OBJECTIVES: 'pw_objectives',
  KEY_RESULTS: 'pw_key_results',
  INTENTS: 'pw_intents',
  TASKS: 'pw_tasks',
  RELEASES: 'pw_releases',
};

const EDGE_COLLECTIONS = {
  CONTAINS: 'pw_contains',
  HAS_KEY_RESULT: 'pw_has_key_result',
  ADVANCES: 'pw_advances',
  HAS_TASK: 'pw_has_task',
  BELONGS_TO_RELEASE: 'pw_belongs_to_release',
  DEPENDS_ON: 'pw_depends_on',
};

const NODE_KIND = {
  WORKSPACE: 'workspace',
  OBJECTIVE: 'objective',
  KEY_RESULT: 'key_result',
  INTENT: 'intent',
  TASK: 'task',
  RELEASE: 'release',
};

const GRAPH_DEFINITION = {
  name: 'planning_workspace_graph',
  edgeDefinitions: [
    {
      collection: EDGE_COLLECTIONS.CONTAINS,
      from: [COLLECTIONS.WORKSPACES, COLLECTIONS.OBJECTIVES, COLLECTIONS.RELEASES],
      to: [COLLECTIONS.OBJECTIVES, COLLECTIONS.INTENTS],
    },
    {
      collection: EDGE_COLLECTIONS.HAS_KEY_RESULT,
      from: [COLLECTIONS.OBJECTIVES],
      to: [COLLECTIONS.KEY_RESULTS],
    },
    {
      collection: EDGE_COLLECTIONS.ADVANCES,
      from: [COLLECTIONS.INTENTS],
      to: [COLLECTIONS.KEY_RESULTS],
    },
    {
      collection: EDGE_COLLECTIONS.HAS_TASK,
      from: [COLLECTIONS.INTENTS],
      to: [COLLECTIONS.TASKS],
    },
    {
      collection: EDGE_COLLECTIONS.BELONGS_TO_RELEASE,
      from: [COLLECTIONS.INTENTS],
      to: [COLLECTIONS.RELEASES],
    },
    {
      collection: EDGE_COLLECTIONS.DEPENDS_ON,
      from: [COLLECTIONS.INTENTS],
      to: [COLLECTIONS.INTENTS],
    },
  ],
};

const INDEXES = [
  { collection: COLLECTIONS.OBJECTIVES, type: 'hash', fields: ['id'] },
  { collection: COLLECTIONS.OBJECTIVES, type: 'hash', fields: ['parent_objective_id'] },
  { collection: COLLECTIONS.KEY_RESULTS, type: 'hash', fields: ['id'] },
  { collection: COLLECTIONS.KEY_RESULTS, type: 'hash', fields: ['parent_objective_id'] },
  { collection: COLLECTIONS.INTENTS, type: 'hash', fields: ['id'] },
  { collection: COLLECTIONS.INTENTS, type: 'hash', fields: ['lifecycle'] },
  { collection: COLLECTIONS.INTENTS, type: 'hash', fields: ['validation_state'] },
  { collection: COLLECTIONS.INTENTS, type: 'hash', fields: ['release_bucket'] },
  { collection: COLLECTIONS.TASKS, type: 'hash', fields: ['intent_id'] },
  { collection: COLLECTIONS.RELEASES, type: 'hash', fields: ['id'] },
  { collection: COLLECTIONS.RELEASES, type: 'hash', fields: ['release_bucket'] },
];

module.exports = {
  COLLECTIONS,
  EDGE_COLLECTIONS,
  NODE_KIND,
  GRAPH_DEFINITION,
  INDEXES,
};
