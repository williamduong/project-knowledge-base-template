'use strict';

// Focus state contract.
//
// Source surfaces this replaces:
// - HTTP: site/kbx-ui/server.mjs:3422-3457 (GET/POST /api/focus-state)
// - FE hook: site/uiv2/src/app/hooks/useShellStatus.ts (consumes nested bridge payload)
// - Storage: src/lib/focus-state.js — SQLite + JSON projection (R3 race victim)
// - Markdown projection: svfactory/focus.md (AUTO_SECTION block — out of scope)

const { z } = require('zod');
const { ApiResponse, IsoTimestamp, IntentLifecycle, defineOperation } = require('./common');

const CONTRACT_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Sub-entities
// ---------------------------------------------------------------------------

const MaintainerFocus = z.object({
  version_target: z.string(),
  current_phase: z.string(),
  current_branch: z.string(),
});

const CurrentFocus = z.object({
  intent_id: z.string().nullable(),
  intent_state: IntentLifecycle.nullable(),
  source: z.enum(['api', 'cli', 'manual', 'inferred']).nullable(),
  branch_name: z.string().nullable(),
  label: z.string().nullable(),
});

const FocusCheckpoint = z.object({
  intent_id: z.string().nullable(),
  event: z.string().nullable(),
  timestamp: IsoTimestamp.nullable(),
  branch: z.string().nullable(),
});

// Storage projection paths — informational, not authoritative.
const FocusSourceFiles = z.object({
  sqlite: z.string(),
  state: z.string(),
  markdown: z.string().optional(),
});

// ---------------------------------------------------------------------------
// State entity
// ---------------------------------------------------------------------------

const FocusState = z.object({
  schema_version: z.string(),
  source_type: z.string(),
  maintainer_focus: MaintainerFocus,
  current_focus: CurrentFocus,
  checkpoint: FocusCheckpoint,
  source_files: FocusSourceFiles.optional(),
});

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

const ReadRequest = z.void();

// POST body — only fields the writer accepts. Service layer rejects extras.
const WriteRequest = z.object({
  current_focus: CurrentFocus.partial().optional(),
  checkpoint: FocusCheckpoint.partial().optional(),
  maintainer_focus: MaintainerFocus.partial().optional(),
});

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

const ReadResponse = ApiResponse.extend({
  state: FocusState,
});

const WriteResponse = ApiResponse.extend({
  state: FocusState,
});

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

const operations = Object.freeze({
  read: defineOperation(ReadRequest, ReadResponse),
  write: defineOperation(WriteRequest, WriteResponse),
});

const httpRoutes = Object.freeze([
  { method: 'GET', path: '/api/focus-state', operation: 'read' },
  { method: 'POST', path: '/api/focus-state', operation: 'write' },
]);

const cliCommands = Object.freeze([
  { command: 'focus show', operation: 'read' },
  { command: 'focus set', operation: 'write' },
]);

module.exports = {
  CONTRACT_VERSION,
  MaintainerFocus,
  CurrentFocus,
  FocusCheckpoint,
  FocusSourceFiles,
  FocusState,
  ReadRequest,
  WriteRequest,
  ReadResponse,
  WriteResponse,
  operations,
  httpRoutes,
  cliCommands,
};
