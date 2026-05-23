'use strict';

// Runtime Services contract — pilot surface for the contract layer (Phase 1).
//
// Source surfaces this replaces:
// - HTTP: site/kbx-ui/server.mjs:3114-3137 (GET /api/runtime-services, POST :id/ensure)
// - FE hook: site/uiv2/src/app/hooks/useRuntimeServices.ts (RuntimeServicesResponse,
//   EnsureRuntimeServiceResponse — both previously hand-typed, no validation)
// - CLI: none yet (gap — was UI-only). New CLI adapter will mirror operations.

const { z } = require('zod');
const { ApiResponse, IsoTimestamp, defineOperation } = require('./common');

const CONTRACT_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

const RuntimeService = z.object({
  id: z.string().min(1),
  label: z.string(),
  kind: z.string(),
  running: z.boolean(),
  healthy: z.boolean(),
  pid: z.number().int().positive().nullable(),
  host: z.string(),
  port: z.number().int().nonnegative().nullable(),
  source: z.string(),
  autoStart: z.boolean(),
  healthPath: z.string(),
});

const RuntimeServiceSchedule = z.object({
  id: z.string(),
  label: z.string(),
  cadence: z.string(),
  responsibility: z.string(),
  refreshedAt: IsoTimestamp.nullable().optional(),
  nextRunAt: IsoTimestamp.nullable().optional(),
  reason: z.string().optional(),
  state: z.string(),
});

const RuntimeServicesSummary = z.object({
  registeredCount: z.number().int().nonnegative(),
  runningCount: z.number().int().nonnegative(),
  healthyCount: z.number().int().nonnegative(),
  summaryLabel: z.string(),
  services: z.array(RuntimeService),
});

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

// `list` takes no input (GET endpoint, no query params used today).
const ListRequest = z.void();

// `ensure` takes the service id from URL params.
const EnsureRequest = z.object({
  id: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

const ListResponse = ApiResponse.extend({
  summary: RuntimeServicesSummary,
  refreshedAt: IsoTimestamp.nullable().optional(),
  nextRunAt: IsoTimestamp.nullable().optional(),
  intervalMs: z.number().int().nonnegative().optional(),
  schedules: z.array(RuntimeServiceSchedule).optional(),
  reason: z.string().optional(),
  lastError: z.string().nullable().optional(),
});

const EnsureResponse = ApiResponse.extend({
  action: z.string().optional(),
  error: z.string().optional(),
  service: RuntimeService.optional(),
});

// ---------------------------------------------------------------------------
// Operations — drives both HTTP adapter and CLI adapter wiring.
// ---------------------------------------------------------------------------

const operations = Object.freeze({
  list: defineOperation(ListRequest, ListResponse),
  ensure: defineOperation(EnsureRequest, EnsureResponse),
});

// HTTP route mapping. Adapter reads this to wire Express routes.
const httpRoutes = Object.freeze([
  { method: 'GET', path: '/api/runtime-services', operation: 'list' },
  { method: 'POST', path: '/api/runtime-services/:id/ensure', operation: 'ensure' },
]);

// CLI command mapping. Adapter reads this to register commands.
const cliCommands = Object.freeze([
  { command: 'runtime-services list', operation: 'list' },
  { command: 'runtime-services ensure <id>', operation: 'ensure' },
]);

module.exports = {
  CONTRACT_VERSION,
  // entities
  RuntimeService,
  RuntimeServiceSchedule,
  RuntimeServicesSummary,
  // requests
  ListRequest,
  EnsureRequest,
  // responses
  ListResponse,
  EnsureResponse,
  // operation registry
  operations,
  httpRoutes,
  cliCommands,
};
