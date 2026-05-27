'use strict';

const { z } = require('zod');
const {
  ApiResponse,
  EntityLevel,
  defineOperation,
} = require('./common');

const CONTRACT_VERSION = '1.0.0';

const IntentContextNodeKind = z.enum([
  'workspace',
  'release-line',
  'milestone',
  'intent',
  'task',
  'goal',
]);

const IntentContextEdgeKind = z.enum([
  'contains',
  'belongs-to-release',
  'tracks',
  'sub-goal',
  'projected-intent',
]);

const IntentContextWarningCode = z.enum([
  'focus-intent-missing',
  'intent-missing-goal',
  'milestone-missing-coverage',
  'task-missing-goal',
  'task-outside-main',
  'release-without-intents',
  'goal-without-active-intent',
]);

const IntentContextSourceKind = z.enum([
  'canonical',
  'projected',
  'derived-task',
  'official',
  'computed',
]);

const IntentContextNode = z.object({
  id: z.string().min(1),
  kind: IntentContextNodeKind,
  label: z.string(),
  shortLabel: z.string(),
  state: z.string(),
  entityLevel: EntityLevel.optional(),
  entityId: z.string().min(1).optional(),
  ownerIntentId: z.string().nullable().optional(),
  focus: z.boolean().optional(),
  active: z.boolean().optional(),
  selected: z.boolean().optional(),
  warning: z.boolean().optional(),
  detail: z.string().nullable().optional(),
  metrics: z.array(z.string()),
  pathBucket: z.string().optional(),
  sourceKind: IntentContextSourceKind,
});

const IntentContextEdge = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  kind: IntentContextEdgeKind,
  emphasis: z.enum(['focus', 'warning', 'normal']).optional(),
  sourceKind: IntentContextSourceKind.optional(),
});

const IntentContextWarning = z.object({
  id: z.string().min(1),
  code: IntentContextWarningCode,
  level: z.enum(['warning', 'info']),
  message: z.string(),
  nodeIds: z.array(z.string()),
});

const IntentContextSummary = z.object({
  releaseLines: z.number().int().nonnegative(),
  milestones: z.number().int().nonnegative(),
  intents: z.number().int().nonnegative(),
  tasks: z.number().int().nonnegative(),
  goals: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
  linkedIntents: z.number().int().nonnegative(),
  unlinkedIntents: z.number().int().nonnegative(),
  focusIntentId: z.string().nullable(),
  activeIntentId: z.string().nullable(),
});

const ContextQuery = z.object({
  id: z.string().min(1),
  kind: IntentContextNodeKind,
  depth: z.number().int().min(0).max(3),
  mode: z.enum(['focus', 'alignment', 'full']),
  include_tasks: z.boolean(),
  include_unlinked: z.boolean(),
});

const ContextCenter = z.object({
  id: z.string().min(1),
  kind: IntentContextNodeKind,
});

const ContextSources = z.object({
  intent: z.string(),
  goals: z.string(),
  milestones: z.string(),
  releaseLines: z.string(),
  tasks: z.string(),
});

const IntentContextResponse = ApiResponse.extend({
  checkedAt: z.string().datetime({ offset: true }),
  center: ContextCenter,
  query: ContextQuery,
  nodes: z.array(IntentContextNode),
  edges: z.array(IntentContextEdge),
  warnings: z.array(IntentContextWarning),
  summary: IntentContextSummary,
  focusNodeId: z.string().nullable(),
  defaultMode: z.enum(['focus', 'alignment', 'full']),
  sources: ContextSources,
});

const ContextRequest = z.object({
  id: z.string().min(1),
  kind: IntentContextNodeKind.optional(),
  depth: z.coerce.number().int().min(0).max(3).optional(),
  mode: z.enum(['focus', 'alignment', 'full']).optional(),
  include_tasks: z.coerce.boolean().optional(),
  include_unlinked: z.coerce.boolean().optional(),
});

const operations = Object.freeze({
  context: defineOperation(ContextRequest, IntentContextResponse),
});

const httpRoutes = Object.freeze([
  { method: 'GET', path: '/api/intents/context', operation: 'context' },
]);

module.exports = {
  CONTRACT_VERSION,
  IntentContextNodeKind,
  IntentContextEdgeKind,
  IntentContextWarningCode,
  IntentContextSourceKind,
  IntentContextNode,
  IntentContextEdge,
  IntentContextWarning,
  IntentContextSummary,
  ContextQuery,
  ContextCenter,
  ContextSources,
  ContextRequest,
  IntentContextResponse,
  operations,
  httpRoutes,
};
