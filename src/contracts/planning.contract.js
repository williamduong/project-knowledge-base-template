'use strict';

const { z } = require('zod');

const PlanningEntityId = z.string().min(1);

const GoalKind = z.enum(['objective', 'key_result']);
const GoalState = z.enum(['draft', 'planned', 'active', 'completed', 'archived']);
const IntentGoalRelation = z.enum(['advances', 'satisfies']);
const ReleaseState = z.enum(['draft', 'planned', 'active', 'shipped', 'archived']);

const KeyResult = z.object({
  id: PlanningEntityId,
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  success_criteria: z.string().min(1),
  metric: z.string().default(''),
  target: z.string().default(''),
  state: GoalState.default('planned'),
});

const GoalNode = z.lazy(() => z.object({
  id: PlanningEntityId,
  code: z.string().min(1),
  kind: z.literal('objective'),
  title: z.string().min(1),
  description: z.string().default(''),
  success_criteria: z.string().min(1),
  state: GoalState.default('planned'),
  sub_goals: z.array(GoalNode).default([]),
  key_results: z.array(KeyResult).default([]),
}));

const IntentGoalLink = z.object({
  intent_id: z.string().min(1),
  relation: IntentGoalRelation,
  goal_id: z.string().min(1).optional(),
  key_result_id: z.string().min(1),
  notes: z.string().default(''),
});

const Release = z.object({
  id: PlanningEntityId,
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  state: ReleaseState.default('draft'),
  intent_ids: z.array(z.string().min(1)).default([]),
  target_goal_ids: z.array(z.string().min(1)).default([]),
});

const PlanningSeed = z.object({
  schema_version: z.string().min(1),
  mode: z.literal('svfactory-only'),
  north_star: z.object({
    id: PlanningEntityId,
    title: z.string().min(1),
    description: z.string().min(1),
  }),
  goals: z.array(GoalNode),
  releases: z.array(Release).default([]),
  intent_goal_links: z.array(IntentGoalLink).default([]),
});

module.exports = {
  GoalKind,
  GoalState,
  IntentGoalRelation,
  ReleaseState,
  KeyResult,
  GoalNode,
  IntentGoalLink,
  Release,
  PlanningSeed,
};
