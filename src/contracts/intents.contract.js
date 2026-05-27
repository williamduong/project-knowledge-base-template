'use strict';

const { z } = require('zod');
const {
  ApiResponse,
  IsoTimestamp,
  IntentLifecycle,
  defineOperation,
} = require('./common');

const CONTRACT_VERSION = '1.0.0';

const ChaosEstimate = z.object({
  currentScore: z.number().nullable(),
  currentLevel: z.string().nullable(),
  estimatedDelta: z.number().nullable(),
  projectedScore: z.number().nullable(),
  projectedLevel: z.string().nullable(),
  warning: z.string().nullable(),
});

const IntentListItem = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  lifecycle: z.string().nullable(),
  priority: z.string().nullable(),
  blocks: z.string().nullable(),
  mode: z.string().nullable(),
  strategic_mode: z.string().nullable(),
  taskCount: z.number().int().nonnegative().optional(),
  taskDoneCount: z.number().int().nonnegative().optional(),
  goal: z.string().nullable().optional(),
  goalText: z.string().nullable().optional(),
  focusCurrent: z.string().nullable().optional(),
  focusNextAction: z.string().nullable().optional(),
  chaosEstimate: ChaosEstimate.nullable().optional(),
});

const IntentTask = z.object({
  title: z.string().nullable(),
  status: z.string().nullable(),
  source: z.string().nullable(),
  description: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  done: z.boolean().optional(),
  section: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  explicitCommits: z.array(z.string()).optional(),
  relatedCommits: z.array(z.object({
    sha: z.string().nullable(),
    subject: z.string().nullable(),
    path: z.string().nullable(),
  })).optional(),
});

const IntentDetail = z.object({
  id: z.string().nullable(),
  title: z.string().nullable(),
  slug: z.string().nullable(),
  scope: z.string().nullable(),
  lifecycle: z.string().nullable(),
  status: z.string().nullable(),
  mode: z.string().nullable(),
  changeType: z.string().nullable(),
  goalText: z.string().nullable(),
  decisionSummary: z.string().nullable(),
  closeCondition: z.string().nullable(),
  goal: z.string().nullable(),
  summary: z.string().nullable(),
  focusCurrent: z.string().nullable(),
  focusNextAction: z.string().nullable(),
  focusUpdatedAt: z.string().nullable(),
  chaosEstimate: ChaosEstimate.nullable(),
  tasks: z.array(IntentTask),
  stagedFiles: z.array(z.string()),
  workspacePath: z.string().nullable(),
  sourceFile: z.string().nullable(),
});

const IntentListResponse = ApiResponse.extend({
  parsed: z.object({
    count: z.number().int().nonnegative(),
    intents: z.array(IntentListItem),
  }).nullable(),
  command: z.string().optional(),
  exitCode: z.number().int().optional(),
  stderr: z.string().optional(),
});

const IntentDetailResponse = ApiResponse.extend({
  detail: IntentDetail,
});

const IntentUpdateResult = z.object({
  id: z.string().min(1),
  updated_fields: z.array(z.string()),
  state: z.string().nullable().optional(),
  status: z.string().optional(),
}).passthrough();

const IntentMutationResponse = ApiResponse.extend({
  result: IntentUpdateResult.optional(),
  command: z.string().optional(),
  stdout: z.string().optional(),
  trace: z.array(z.object({
    timestamp: IsoTimestamp,
    step: z.string(),
    status: z.string(),
  })).optional(),
});

const IntentPreviewResponse = ApiResponse.extend({
  diff: z.object({
    files_changed: z.number().int().nonnegative(),
    insertions: z.number().int().nonnegative(),
    deletions: z.number().int().nonnegative(),
    files: z.array(z.string()).optional(),
  }).optional(),
  warnings: z.array(z.object({
    level: z.string(),
    message: z.string(),
  })).optional(),
});

const ListRequest = z.void();

const DetailRequest = z.object({
  intentId: z.string().min(1),
});

const CreateRequest = z.object({
  title: z.string().min(3),
  focus: z.string().optional(),
  next_action: z.string().optional(),
  decision_summary: z.string().optional(),
  intent_id: z.string().optional(),
  id: z.string().optional(),
});

const UpdateRequest = z.object({
  intentId: z.string().min(1),
  title: z.string().optional(),
  focus: z.string().optional(),
  next_action: z.string().optional(),
  decision_summary: z.string().optional(),
  goal_text: z.string().optional(),
  close_condition: z.string().optional(),
  state: z.string().optional(),
});

const ApproveRequest = z.object({
  intentId: z.string().min(1),
  approval_note: z.string().optional(),
});

const ApplyPreviewRequest = z.object({
  intentId: z.string().min(1),
});

const ApplyRequest = z.object({
  intentId: z.string().min(1),
  confirmed: z.boolean().optional(),
});

const operations = Object.freeze({
  list: defineOperation(ListRequest, IntentListResponse),
  detail: defineOperation(DetailRequest, IntentDetailResponse),
  create: defineOperation(CreateRequest, IntentMutationResponse),
  update: defineOperation(UpdateRequest, IntentMutationResponse),
  approve: defineOperation(ApproveRequest, IntentMutationResponse),
  applyPreview: defineOperation(ApplyPreviewRequest, IntentPreviewResponse),
  apply: defineOperation(ApplyRequest, IntentMutationResponse),
});

const httpRoutes = Object.freeze([
  { method: 'GET', path: '/api/intents', operation: 'list' },
  { method: 'GET', path: '/api/intents/:id/detail', operation: 'detail' },
  { method: 'POST', path: '/api/intents/create', operation: 'create' },
  { method: 'PATCH', path: '/api/intents/:id', operation: 'update' },
  { method: 'POST', path: '/api/intents/:id/approve', operation: 'approve' },
  { method: 'GET', path: '/api/intents/:id/apply-preview', operation: 'applyPreview' },
  { method: 'POST', path: '/api/intents/:id/apply', operation: 'apply' },
]);

const workspaceNotes = Object.freeze({
  canonicalEntities: [
    'Intent',
    'Intent detail fields from intent.md frontmatter',
    'Goal tree nodes linked to intents and tasks',
  ],
  currentProjections: [
    'Milestone buckets are inferred from intent ids',
    'Release lines are grouped from milestone buckets',
    'Task rows are parsed projections from intent.md and plan.md',
  ],
  currentGaps: [
    'ReleaseVersion is not a first-class entity yet',
    'Task CRUD is not yet a canonical mutation surface',
    'Intent-goal alignment still bridges through legacy goals state',
  ],
});

module.exports = {
  CONTRACT_VERSION,
  ChaosEstimate,
  IntentListItem,
  IntentTask,
  IntentDetail,
  IntentListResponse,
  IntentDetailResponse,
  IntentMutationResponse,
  IntentPreviewResponse,
  ListRequest,
  DetailRequest,
  CreateRequest,
  UpdateRequest,
  ApproveRequest,
  ApplyPreviewRequest,
  ApplyRequest,
  operations,
  httpRoutes,
  workspaceNotes,
};
