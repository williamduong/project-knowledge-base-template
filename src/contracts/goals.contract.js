'use strict';

// Goals contract.
//
// Source surfaces this replaces:
// - HTTP: site/kbx-ui/server.mjs:3205-3367 (GET tree, POST create, PATCH, DELETE)
// - HTTP projection logic: site/kbx-ui/server.mjs:1297-1430 (buildGoalsTreeSnapshot)
// - FE hook: site/uiv2/src/app/hooks/useGoalsTree.ts (untyped apiGet cast)
// - Storage: src/lib/goals-state.js (R1, R2, R3 — see intent v2-7-0-1)
//
// HIDDEN CONVENTIONS NOW EXPLICIT:
// - System root entity_id MUST be the literal 'workspace' (previously hardcoded
//   at server.mjs:1311). Encoded as z.literal(WORKSPACE_ENTITY_ID).
// - Milestone entity_id MUST match VERSION_BUCKET_REGEX or be LEGACY_BUCKET_ID
//   (previously derived inline at server.mjs:793-796). Encoded via MilestoneBucketId.
// - Lifecycle strings normalized via INTENT_LIFECYCLES (previously normalizeLifecycle()).

const { z } = require('zod');
const {
  ApiResponse,
  IsoTimestamp,
  EntityLevel,
  GoalStatus,
  IntentLifecycle,
  MilestoneBucketId,
  WORKSPACE_ENTITY_ID,
  defineOperation,
} = require('./common');

const CONTRACT_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Goal entity — discriminated by entity_level so conventions are enforced
// at parse time, not by hand-written ad-hoc checks.
// ---------------------------------------------------------------------------

const GoalBase = z.object({
  id: z.string().min(1),
  parent_goal_id: z.string().nullable(),
  title: z.string().min(1),
  description: z.string(),
  state: z.string(), // active | planned | deprecated | completed | custom
  rank: z.number().int(),
  created_at: IsoTimestamp,
  updated_at: IsoTimestamp,
});

const SystemGoal = GoalBase.extend({
  entity_level: z.literal('system'),
  entity_id: z.literal(WORKSPACE_ENTITY_ID), // ← convention locked
});

const MilestoneGoal = GoalBase.extend({
  entity_level: z.literal('milestone'),
  entity_id: MilestoneBucketId, // ← convention locked
});

const IntentGoal = GoalBase.extend({
  entity_level: z.literal('intent'),
  entity_id: z.string().min(1),
});

const TaskGoal = GoalBase.extend({
  entity_level: z.literal('task'),
  entity_id: z.string().min(1),
});

const Goal = z.discriminatedUnion('entity_level', [
  SystemGoal,
  MilestoneGoal,
  IntentGoal,
  TaskGoal,
]);

// Tree node — same shape regardless of level, but level constrains entity_id.
const GoalTreeNode = z.lazy(() => z.object({
  entityLevel: EntityLevel,
  entityId: z.string(),
  label: z.string(),
  summary: z.string().nullable(),
  runtimeState: z.string(),
  status: GoalStatus,
  goals: z.array(Goal.extend({
    childGoalCount: z.number().int().nonnegative(),
    canDelete: z.boolean(),
  }).partial({ entity_level: true, entity_id: true })),
  children: z.array(GoalTreeNode),
}));

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

const TreeRequest = z.void();

const CreateRequest = z.object({
  entity_level: EntityLevel,
  entity_id: z.string().min(1),
  parent_goal_id: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  state: z.string().optional(),
}).superRefine((data, ctx) => {
  // Convention enforcement at write time — closes R1.
  if (data.entity_level === 'system' && data.entity_id !== WORKSPACE_ENTITY_ID) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `System goal entity_id must be '${WORKSPACE_ENTITY_ID}', got '${data.entity_id}'`,
      path: ['entity_id'],
    });
  }
  if (data.entity_level === 'milestone') {
    const matchesRegex = /^v\d+(?:-\d+)?$/i.test(data.entity_id);
    if (!matchesRegex && data.entity_id !== 'legacy') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Milestone entity_id must match /^v\\d+(-\\d+)?$/ or be 'legacy', got '${data.entity_id}'`,
        path: ['entity_id'],
      });
    }
  }
});

const UpdateRequest = z.object({
  goalId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  parent_goal_id: z.string().nullable().optional(),
  state: z.string().optional(),
});

const DeleteRequest = z.object({
  goalId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

const TreeSummary = z.object({
  totalGoals: z.number().int().nonnegative(),
  coverage: z.object({
    system: z.number().int().nonnegative(),
    milestones: z.number().int().nonnegative(),
    intents: z.number().int().nonnegative(),
    tasks: z.number().int().nonnegative(),
  }),
  missingCounts: z.object({
    milestones: z.number().int().nonnegative(),
    intents: z.number().int().nonnegative(),
    tasks: z.number().int().nonnegative(),
  }),
  outsideCounts: z.object({
    milestones: z.number().int().nonnegative(),
    intents: z.number().int().nonnegative(),
    tasks: z.number().int().nonnegative(),
  }),
  entityCounts: z.object({
    milestones: z.number().int().nonnegative(),
    intents: z.number().int().nonnegative(),
    tasks: z.number().int().nonnegative(),
  }),
});

const TreeResponse = ApiResponse.extend({
  checkedAt: IsoTimestamp,
  summary: TreeSummary,
  root: GoalTreeNode,
});

const MutationResponse = ApiResponse.extend({
  goal: Goal.optional(),
  tree: TreeResponse,
});

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

const operations = Object.freeze({
  tree:   defineOperation(TreeRequest, TreeResponse),
  create: defineOperation(CreateRequest, MutationResponse),
  update: defineOperation(UpdateRequest, MutationResponse),
  delete: defineOperation(DeleteRequest, MutationResponse),
});

const httpRoutes = Object.freeze([
  { method: 'GET',    path: '/api/goals/tree',         operation: 'tree' },
  { method: 'POST',   path: '/api/goals',              operation: 'create' },
  { method: 'PATCH',  path: '/api/goals/:goalId',      operation: 'update' },
  { method: 'DELETE', path: '/api/goals/:goalId',      operation: 'delete' },
]);

const cliCommands = Object.freeze([
  { command: 'goals tree',              operation: 'tree' },
  { command: 'goals create',            operation: 'create' },
  { command: 'goals update <goalId>',   operation: 'update' },
  { command: 'goals delete <goalId>',   operation: 'delete' },
]);

module.exports = {
  CONTRACT_VERSION,
  GoalBase,
  SystemGoal,
  MilestoneGoal,
  IntentGoal,
  TaskGoal,
  Goal,
  GoalTreeNode,
  TreeRequest,
  CreateRequest,
  UpdateRequest,
  DeleteRequest,
  TreeSummary,
  TreeResponse,
  MutationResponse,
  operations,
  httpRoutes,
  cliCommands,
};
