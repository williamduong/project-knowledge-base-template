'use strict';

// Shared contract primitives.
// Every literal or regex previously hardcoded in server.mjs / src/lib/ goes here.

const { z } = require('zod');

// ---------------------------------------------------------------------------
// Convention constants — replace magic strings scattered across codebase.
// ---------------------------------------------------------------------------

// System root identifier. Previously hardcoded at site/kbx-ui/server.mjs:1311,
// 1411 as the literal string 'workspace'. Locked here.
const WORKSPACE_ENTITY_ID = 'workspace';

// Milestone bucket regex. Previously derived inline at
// site/kbx-ui/server.mjs:793-796 from intent IDs. Locked here.
const VERSION_BUCKET_REGEX = /^v\d+(?:-\d+)?$/i;

// Bucket label used when intent ID does not match VERSION_BUCKET_REGEX.
// Previously magic string at site/kbx-ui/server.mjs:1359.
const LEGACY_BUCKET_ID = 'legacy';

// Intent lifecycle states. Previously normalized inline by normalizeLifecycle()
// in site/kbx-ui/server.mjs. Locked enum here.
const INTENT_LIFECYCLES = ['active', 'backlog', 'archive', 'closed'];

// Entity levels supported by the goals tree. Drives discriminated unions.
const ENTITY_LEVELS = ['system', 'milestone', 'intent', 'task'];

// Goal coverage status codes consumed by UI. Previously hardcoded at
// site/kbx-ui/server.mjs (classifyGoalCoverage).
const GOAL_STATUS_CODES = ['aligned', 'outside-main', 'missing-goals', 'mixed'];

// ---------------------------------------------------------------------------
// Shared schemas.
// ---------------------------------------------------------------------------

// Every response that crosses the FE↔BE boundary extends ApiResponse.
// `ok` MUST be present so frontend can branch deterministically.
const ApiResponse = z.object({
  ok: z.boolean(),
});

// Error envelope used when a request fails. Routes either return the success
// response shape or this envelope, never both shapes intermixed.
const ApiError = ApiResponse.extend({
  ok: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});

// Pagination cursor — reserved for surfaces that need it (intents list, KB
// browse). Optional in every response that may grow.
const PaginationCursor = z.object({
  next: z.string().nullable(),
  total: z.number().int().nonnegative().optional(),
});

// ISO 8601 timestamp string. Adapters MUST format as ISO before responding;
// services MAY accept Date and convert.
const IsoTimestamp = z.string().datetime({ offset: true });

// Entity level discriminator. Reusable in any schema that varies by level.
const EntityLevel = z.enum(ENTITY_LEVELS);

// Goal status object. Reused by goals tree nodes at every level.
const GoalStatus = z.object({
  code: z.enum(GOAL_STATUS_CODES),
  label: z.string(),
});

// Intent lifecycle enum. Use this instead of free-form strings.
const IntentLifecycle = z.enum(INTENT_LIFECYCLES);

// Milestone bucket identifier. Either matches version regex, or the legacy
// sentinel. Anything else fails parse.
const MilestoneBucketId = z.union([
  z.string().regex(VERSION_BUCKET_REGEX),
  z.literal(LEGACY_BUCKET_ID),
]);

// ---------------------------------------------------------------------------
// Operation map helper.
// ---------------------------------------------------------------------------

// Each contract file exposes an `operations` map. This helper documents the
// expected shape; adapters consume it to wire routes/commands uniformly.
function defineOperation(request, response) {
  return Object.freeze({ request, response });
}

module.exports = {
  // constants
  WORKSPACE_ENTITY_ID,
  VERSION_BUCKET_REGEX,
  LEGACY_BUCKET_ID,
  INTENT_LIFECYCLES,
  ENTITY_LEVELS,
  GOAL_STATUS_CODES,
  // schemas
  ApiResponse,
  ApiError,
  PaginationCursor,
  IsoTimestamp,
  EntityLevel,
  GoalStatus,
  IntentLifecycle,
  MilestoneBucketId,
  // helpers
  defineOperation,
};
