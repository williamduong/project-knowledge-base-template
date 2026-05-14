'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const { resolveExistingState } = require('../lib/context');
const { getGitMetadata } = require('../lib/git');
const {
  VALID_MODES,
  createIntentWorkspace,
  createBacklogIntent,
  activateBacklogIntent,
  readIntentMeta,
  listActiveIntentIds,
  listStagedFiles,
  validateStagedFilePaths,
  cancelIntent,
  suggestIntentId,
  intentWorkspacePath,
  classifyStagedFile,
  buildApplyRecord,
  applyStagedFiles,
  writeApplyRecord,
  archiveIntent,
  updateIntentFocus,
  closeIntent,
  sanitizeId,
  listIntentRecords,
  resolveIntentRecord,
  listStagedFilesFromWorkspace,
  deriveIntentStatus,
  writeIntentFrontmatter,
} = require('../lib/intent');
const { analyzeIntentConflicts, suggestApplyOrder, generateLessonCandidates } = require('../lib/intent-intelligence');
const { runRelease } = require('./release');
const { recordIntentCheckpoint } = require('../lib/intent-checkpoint');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = {
    sub: null,
    intentId: null,
    listScope: 'active',
    mode: 'quick',
    changeType: 'docs',
    yes: false,
    json: false,
    release: false,
    commitRange: null,
    extractTitle: null,
    extractType: 'docs',
    closeType: null,
    wave: null,
    reason: null,
    current: null,
    nextAction: null,
    lastUpdated: null,
    stale: false,
    aged: false,
    checkpointNote: null,
    goals: [],
    stageState: null,
    title: null,
    focusValue: null,
    nextActionValue: null,
    decisionSummaryValue: null,
    stateValue: null,
    intentType: null,
    strategicMode: null,
    urgency: null,
  };

  const setListScope = (scope) => {
    if (options.listScope !== 'active' && options.listScope !== scope) {
      throw new Error('kbx intent list accepts only one scope flag: --backlog | --closed | --archived | --all.');
    }
    options.listScope = scope;
  };

  const rest = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
    if (arg === '--json') { options.json = true; continue; }
    if (arg === '--yes' || arg === '-y') { options.yes = true; continue; }
    if (arg === '--stale') { options.stale = true; continue; }
    if (arg === '--aged') { options.aged = true; continue; }
    if (arg === '--backlog') { setListScope('backlog'); continue; }
    if (arg === '--closed') { setListScope('closed'); continue; }
    if (arg === '--archived') { setListScope('archived'); continue; }
    if (arg === '--all') { setListScope('all'); continue; }
    if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length).trim();
      continue;
    }
    if (arg.startsWith('--change-type=')) {
      options.changeType = arg.slice('--change-type='.length).trim();
      continue;
    }
    if (arg.startsWith('--title=')) {
      options.title = arg.slice('--title='.length).trim();
      options.extractTitle = options.title;
      continue;
    }
    if (arg === '--title') {
      options.title = String(args[i + 1] || '').trim();
      options.extractTitle = options.title;
      i += 1;
      continue;
    }
    if (arg.startsWith('--focus=')) {
      options.focusValue = arg.slice('--focus='.length).trim();
      continue;
    }
    if (arg === '--focus') {
      options.focusValue = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--next-action=')) {
      options.nextActionValue = arg.slice('--next-action='.length).trim();
      continue;
    }
    if (arg === '--next-action') {
      options.nextActionValue = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--decision-summary=')) {
      options.decisionSummaryValue = arg.slice('--decision-summary='.length).trim();
      continue;
    }
    if (arg === '--decision-summary') {
      options.decisionSummaryValue = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--type=')) {
      const value = arg.slice('--type='.length).trim();
      options.extractType = value;
      options.closeType = value;
      options.intentType = value;
      continue;
    }
    if (arg.startsWith('--intent-type=')) {
      options.intentType = arg.slice('--intent-type='.length).trim();
      continue;
    }
    if (arg.startsWith('--strategic-mode=')) {
      options.strategicMode = arg.slice('--strategic-mode='.length).trim();
      continue;
    }
    if (arg.startsWith('--urgency=')) {
      options.urgency = arg.slice('--urgency='.length).trim();
      continue;
    }
    if (arg.startsWith('--wave=')) {
      options.wave = arg.slice('--wave='.length).trim();
      continue;
    }
    if (arg.startsWith('--reason=')) {
      options.reason = arg.slice('--reason='.length).trim();
      continue;
    }
    if (arg.startsWith('--current=')) {
      options.current = arg.slice('--current='.length).trim();
      continue;
    }
    if (arg.startsWith('--next=')) {
      options.nextAction = arg.slice('--next='.length).trim();
      continue;
    }
    if (arg.startsWith('--date=')) {
      options.lastUpdated = arg.slice('--date='.length).trim();
      continue;
    }
    if (arg.startsWith('--note=')) {
      options.checkpointNote = arg.slice('--note='.length).trim();
      continue;
    }
    if (arg.startsWith('--goal=')) {
      const goal = arg.slice('--goal='.length).trim();
      if (goal) options.goals.push(goal);
      continue;
    }
    if (arg.startsWith('--state=')) {
      options.stateValue = arg.slice('--state='.length).trim();
      continue;
    }
    if (arg === '--state') {
      options.stateValue = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--release=')) {
      options.release = arg.slice('--release='.length).trim();
      continue;
    }
    if (arg === '--release') { options.release = true; continue; }
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    throw new Error(`Unknown intent option "${arg}". Run "kbx intent help" for usage.`);
  }

  if (rest.length === 0) {
    throw new Error('kbx intent requires a subcommand: create | draft | activate | status | list | focus | close | cancel | archive');
  }

  options.sub = rest[0];

  if (options.listScope !== 'active' && options.sub !== 'list') {
    throw new Error('List scope flags are only valid with "kbx intent list".');
  }

  if (options.sub === 'create') {
    // Optional positional ID
    if (rest.length >= 2) {
      options.intentId = rest[1];
    }
    if (!VALID_MODES.has(options.mode)) {
      throw new Error(`kbx intent create: invalid mode "${options.mode}". Supported: quick, full`);
    }
  } else if (options.sub === 'draft') {
    if (rest.length < 2) {
      throw new Error('kbx intent draft requires a slug.');
    }
    options.intentId = rest[1];
  } else if (options.sub === 'activate') {
    if (rest.length < 2) {
      throw new Error('kbx intent activate requires a backlog slug.');
    }
    options.intentId = rest[1];
    if (!options.wave) {
      throw new Error('kbx intent activate requires --wave=<version>.');
    }
    if (!VALID_MODES.has(options.mode)) {
      throw new Error(`kbx intent activate: invalid mode "${options.mode}". Supported: quick, full`);
    }
  } else if (options.sub === 'status') {
    if (rest.length >= 2) {
      options.intentId = rest[1];
    }
  } else if (options.sub === 'list') {
    // no positional args
  } else if (options.sub === 'cancel') {
    if (rest.length < 2) {
      throw new Error('kbx intent cancel requires an intent ID.');
    }
    options.intentId = rest[1];
  } else if (options.sub === 'focus') {
    if (rest.length < 2) {
      throw new Error('kbx intent focus requires an intent ID.');
    }
    options.intentId = rest[1];
    if (options.current === null && options.nextAction === null) {
      throw new Error('kbx intent focus requires --current or --next.');
    }
  } else if (options.sub === 'archive') {
    if (rest.length < 2) {
      throw new Error('kbx intent archive requires an intent ID.');
    }
    options.intentId = rest[1];
  } else if (options.sub === 'close') {
    if (rest.length < 2) {
      throw new Error('kbx intent close requires an intent ID.');
    }
    options.intentId = rest[1];
    if (options.closeType !== 'released' && options.closeType !== 'dropped') {
      throw new Error('kbx intent close requires --type=released|dropped.');
    }
    if (options.closeType === 'released' && !options.release) {
      throw new Error('kbx intent close --type=released requires --release=vX.Y.Z.');
    }
    if (options.closeType === 'dropped' && !options.reason) {
      throw new Error('kbx intent close --type=dropped requires --reason="...".');
    }
  } else if (options.sub === 'apply') {
    if (rest.length < 2) {
      throw new Error('kbx intent apply requires an intent ID.');
    }
    options.intentId = rest[1];
    if (args && args.includes('--release')) options.release = true;
  } else if (options.sub === 'apply-preview') {
    if (rest.length < 2) {
      throw new Error('kbx intent apply-preview requires an intent ID.');
    }
    options.intentId = rest[1];
  } else if (options.sub === 'update') {
    if (rest.length < 2) {
      throw new Error('kbx intent update requires an intent ID.');
    }
    options.intentId = rest[1];
    const hasAnyField = [
      options.title,
      options.focusValue,
      options.nextActionValue,
      options.decisionSummaryValue,
      options.stateValue,
      options.intentType,
      options.strategicMode,
      options.urgency,
      options.wave,
    ].some((value) => typeof value === 'string' && value.trim().length > 0);
    if (!hasAnyField) {
      throw new Error('kbx intent update requires at least one of: --title, --focus, --next-action, --decision-summary, --state, --intent-type/--type, --strategic-mode, --urgency, --wave.');
    }
  } else if (options.sub === 'help') {
    // no-op here, handled in runIntent
  } else if (options.sub === 'suggest-lessons') {
    // no positional args
  } else if (options.sub === 'cleanup') {
    // no positional args; optional --stale, --aged handled via flag parse above
  } else if (options.sub === 'extract') {
    // kbx intent extract <range> [--title="..."] [--type=...]
    if (rest.length < 2) {
      throw new Error('kbx intent extract requires a commit range (e.g. HEAD~5..HEAD)');
    }
    options.commitRange = rest[1];
  } else if (options.sub === 'checkpoint') {
    if (rest.length >= 2) {
      options.intentId = rest[1];
    }
  } else if (options.sub === 'align') {
    if (rest.length < 2) {
      throw new Error('kbx intent align requires an intent ID.');
    }
    options.intentId = rest[1];
    if (!options.goals || options.goals.length === 0) {
      throw new Error('kbx intent align requires at least one --goal="...".');
    }
  } else if (options.sub === 'approve') {
    if (rest.length < 2) {
      throw new Error('kbx intent approve requires an intent ID.');
    }
    options.intentId = rest[1];
  } else if (options.sub === 'stage') {
    if (rest.length < 2) {
      throw new Error('kbx intent stage requires an intent ID.');
    }
    options.intentId = rest[1];
    options.stageState = options.stateValue;
    if (options.stageState && !['staged', 'ready'].includes(options.stageState)) {
      throw new Error('kbx intent stage --state supports only: staged|ready');
    }
  } else if (options.sub === 'retro') {
    if (rest.length < 2) {
      throw new Error('kbx intent retro requires an intent ID.');
    }
    options.intentId = rest[1];
  } else {
    throw new Error(`kbx intent: unknown subcommand "${options.sub}". Supported: create, draft, activate, status, list, focus, update, align, approve, stage, retro, cleanup, close, cancel, archive, apply, apply-preview, suggest-lessons, extract, checkpoint`);
  }

  return options;
}

// ---------------------------------------------------------------------------
// Prompt helper
// ---------------------------------------------------------------------------

async function promptInput(message) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve('');
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function confirmPrompt(message) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(false);
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// ---------------------------------------------------------------------------
// Version guard helpers
// ---------------------------------------------------------------------------

function parseIntentVersionFromId(intentId) {
  if (!intentId || typeof intentId !== 'string') return null;
  const match = intentId.match(/^v(\d+(?:-\d+)*)/i);
  if (!match) return null;
  return match[1].split('-').map((part) => Number(part));
}

function compareVersionTuple(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const left = Number.isFinite(a[i]) ? a[i] : 0;
    const right = Number.isFinite(b[i]) ? b[i] : 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }
  return 0;
}

function enforceIntentVersionProgression(contentRoot, nextIntentId) {
  const nextVersion = parseIntentVersionFromId(nextIntentId);
  if (!nextVersion) {
    return { ok: true, reason: 'non-versioned-intent-id' };
  }

  // Enforce monotonic progression only against currently active intents.
  // Archive contains historical/superseded lines and should not block a new stable line.
  const candidates = [];
  for (const id of listActiveIntentIds(contentRoot)) {
    const parsed = parseIntentVersionFromId(id);
    if (parsed) candidates.push({ id, version: parsed, source: 'active' });
  }

  if (candidates.length === 0) {
    return { ok: true, reason: 'no-versioned-active-intents-found' };
  }

  let highest = candidates[0];
  for (const c of candidates.slice(1)) {
    if (compareVersionTuple(c.version, highest.version) > 0) {
      highest = c;
    }
  }

  const cmp = compareVersionTuple(nextVersion, highest.version);
  if (cmp <= 0) {
    return {
      ok: false,
      highest,
      nextVersion,
      reason: 'version-regression-or-equal',
    };
  }

  return { ok: true, reason: 'strictly-increasing' };
}

// ---------------------------------------------------------------------------
// Subcommand: create
// ---------------------------------------------------------------------------

async function runCreate(ctx, options, cwd) {
  const { mode, changeType, yes, json } = options;
  let intentId = options.intentId;

  // Suggest ID from branch if not provided
  if (!intentId) {
    const git = getGitMetadata(cwd);
    const suggested = suggestIntentId(git.branch);

    if (yes || json) {
      intentId = suggested;
    } else {
      console.log(`Suggested intent ID: ${suggested}`);
      const answer = await promptInput('Accept this ID? Press Enter to confirm, or type a custom ID: ');
      intentId = answer.length > 0 ? answer : suggested;
    }
  }

  // Basic ID validation
  if (!intentId || !/^[a-z0-9][a-z0-9-]{1,59}$/.test(intentId)) {
    throw new Error(
      `Invalid intent ID "${intentId}". Use lowercase alphanumeric + hyphens, 2-60 chars, start with alphanumeric.`
    );
  }

  const versionCheck = enforceIntentVersionProgression(ctx.contentRoot, intentId);
  if (!versionCheck.ok) {
    throw new Error(
      `Intent version must strictly move forward. ` +
      `Highest existing versioned intent is "${versionCheck.highest.id}" (${versionCheck.highest.source}). ` +
      `Requested: "${intentId}".`
    );
  }

  const wsPath = createIntentWorkspace(ctx.contentRoot, { intentId, mode, changeType });

  recordIntentCheckpoint({
    workspaceRoot: cwd,
    eventName: 'intent.create',
    intentId,
    note: options.checkpointNote || 'Intent created',
  });

  if (json) {
    console.log(JSON.stringify({
      command: 'kbx intent create',
      intent_id: intentId,
      mode,
      change_type: changeType,
      workspace: wsPath,
      status: 'created',
    }, null, 2));
  } else {
    console.log(`Intent "${intentId}" created (mode: ${mode}).`);
    console.log(`Workspace: ${wsPath}`);
    console.log('');
    console.log('Next steps:');
    console.log(`  1. Stage files in: ${wsPath}${path.sep}proposed-changes${path.sep}`);
    if (mode === 'full') {
      console.log(`  2. Fill plan.md and impact.md in the workspace.`);
      console.log(`  3. Update decision_summary in intent.md before applying.`);
    } else {
      console.log(`  2. Update decision_summary in intent.md before applying.`);
    }
    console.log(`  3. Run "kbx intent status ${intentId}" to review.`);
  }
}

async function runDraft(ctx, options) {
  const slug = sanitizeId(options.intentId);
  if (!slug) {
    throw new Error(`Invalid backlog slug "${options.intentId}".`);
  }
  const filePath = createBacklogIntent(ctx.contentRoot, { slug, title: slug, description: '' });
  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx intent draft',
      slug,
      path: filePath,
      status: 'created',
    }, null, 2));
    return;
  }
  console.log(`Backlog intent "${slug}" created.`);
  console.log(`Path: ${filePath}`);
}

async function runActivate(ctx, options) {
  const slug = sanitizeId(options.intentId);
  if (!slug) {
    throw new Error(`Invalid backlog slug "${options.intentId}".`);
  }
  const intentId = `v${String(options.wave).replace(/^v/i, '').replace(/\./g, '-')}-${slug}`;
  const wsPath = activateBacklogIntent(ctx.contentRoot, {
    slug,
    intentId,
    mode: options.mode,
    changeType: options.changeType,
    wave: options.wave,
  });
  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx intent activate',
      slug,
      intent_id: intentId,
      workspace: wsPath,
      status: 'activated',
    }, null, 2));
    return;
  }
  console.log(`Backlog intent "${slug}" activated as "${intentId}".`);
  console.log(`Workspace: ${wsPath}`);
}

function getListScopeOptions(scope) {
  return {
    includeBacklog: scope === 'backlog' || scope === 'all',
    includeActive: scope === 'active' || scope === 'all',
    includeClosed: scope === 'closed' || scope === 'all',
    includeArchived: scope === 'archived' || scope === 'all',
  };
}

function collectIntentStatusFromRecord(record) {
  const rawMeta = record.meta || {};
  const workspacePath = record.workspacePath;
  const staged = workspacePath ? listStagedFilesFromWorkspace(workspacePath) : [];
  const pathIssues = validateStagedFilePaths(staged);
  const hasPlan = workspacePath ? fs.existsSync(path.join(workspacePath, 'plan.md')) : false;
  const hasImpact = workspacePath ? fs.existsSync(path.join(workspacePath, 'impact.md')) : false;
  const hasLesson = workspacePath ? fs.existsSync(path.join(workspacePath, 'lesson-candidate.md')) : false;
  const hasApplyRecord = workspacePath ? fs.existsSync(path.join(workspacePath, 'apply-record.json')) : false;
  const lifecycle = record.lifecycle || rawMeta.lifecycle || 'unknown';

  const meta = {
    ...rawMeta,
    lifecycle,
    status: deriveIntentStatus(lifecycle),
    mode: String(rawMeta.mode || ((hasPlan || hasImpact) ? 'full' : 'quick')),
  };

  const warnings = [];
  if (!rawMeta.schema_version && (rawMeta.status || rawMeta.lifecycle_state || rawMeta.legacy)) {
    warnings.push(`Legacy schema detected (no schema_version). Run "kbx migrate --to=v2.4.0" to persist canonical schema.`);
  }
  if (record.scope === 'active' && (!meta.decision_summary || meta.decision_summary === '')) {
    warnings.push('decision_summary is empty — fill it before applying.');
  }
  if (record.scope === 'active' && meta.mode === 'full' && !hasPlan) {
    warnings.push('plan.md missing — required for full mode.');
  }
  if (record.scope === 'active' && meta.mode === 'full' && !hasImpact) {
    warnings.push('impact.md missing — required for full mode.');
  }
  for (const issue of pathIssues) {
    warnings.push(`Staged file path issue: ${issue.file} — ${issue.issue}`);
  }

  return { record, meta, staged, hasPlan, hasImpact, hasLesson, hasApplyRecord, warnings };
}

// ---------------------------------------------------------------------------
// Subcommand: status
// ---------------------------------------------------------------------------

function collectIntentStatus(ctx, intentId) {
  const record = resolveIntentRecord(ctx.contentRoot, intentId);
  if (!record) {
    throw new Error(`Intent or backlog item "${intentId}" not found across backlog, active, closed, or archive state.`);
  }
  return collectIntentStatusFromRecord(record);
}

async function runStatus(ctx, options) {
  const { json } = options;

  if (options.intentId) {
    // Single intent status
    const info = collectIntentStatus(ctx, options.intentId);

    if (json) {
      console.log(JSON.stringify({
        command: 'kbx intent status',
        intent_id: info.record.id,
        slug: info.record.slug,
        scope: info.record.scope,
        path: info.record.workspacePath || info.record.metaPath,
        lifecycle: info.meta.lifecycle,
        mode: info.meta.mode,
        status: info.meta.status,
        close_type: info.meta.close_type || null,
        release_ref: info.meta.release_ref || null,
        drop_reason: info.meta.drop_reason || null,
        staged_count: info.staged.length,
        staged: info.staged,
        plan: info.hasPlan,
        impact: info.hasImpact,
        lesson_candidate: info.hasLesson,
        apply_record: info.hasApplyRecord,
        warnings: info.warnings,
      }, null, 2));
    } else {
      console.log(`Intent: ${info.record.id}`);
      if (info.record.slug) {
        console.log(`Slug:   ${info.record.slug}`);
      }
      console.log(`Scope:  ${info.record.scope}`);
      console.log(`Path:   ${info.record.workspacePath || info.record.metaPath}`);
      console.log(`Life:   ${info.meta.lifecycle}`);
      console.log(`Mode:   ${info.meta.mode}`);
      console.log(`Status: ${info.meta.status}`);
      if (info.meta.close_type) {
        console.log(`Close:  ${info.meta.close_type}`);
      }
      if (info.meta.release_ref) {
        console.log(`Release:${info.meta.release_ref}`);
      }
      if (info.meta.drop_reason) {
        console.log(`Reason: ${info.meta.drop_reason}`);
      }
      console.log(`Staged: ${info.staged.length} file(s)`);
      for (const f of info.staged) {
        console.log(`  - ${f}`);
      }
      if (info.meta.mode === 'full') {
        console.log(`Plan:   ${info.hasPlan ? 'present' : 'MISSING'}`);
        console.log(`Impact: ${info.hasImpact ? 'present' : 'MISSING'}`);
      }
      if (info.hasLesson) {
        console.log('Lesson candidate: present');
      }
      console.log(`Apply:  ${info.hasApplyRecord ? 'done' : 'not done'}`);
      if (info.warnings.length > 0) {
        console.log('');
        console.log('Warnings:');
        for (const w of info.warnings) {
          console.log(`  ! ${w}`);
        }
      }
    }

    recordIntentCheckpoint({
      workspaceRoot: ctx.workspaceRoot,
      eventName: 'intent.status',
      intentId: info.record.id,
      note: options.checkpointNote || 'Intent status inspected',
    });
    return;
  }

  const records = listIntentRecords(ctx.contentRoot);
  if (json) {
    const items = records.map((record) => {
      const info = collectIntentStatusFromRecord(record);
      return {
        id: record.id,
        slug: record.slug,
        scope: record.scope,
        lifecycle: info.meta.lifecycle,
        status: info.meta.status,
        mode: info.meta.mode,
        staged_count: info.staged.length,
        close_type: info.meta.close_type || null,
        release_ref: info.meta.release_ref || null,
        warnings: info.warnings.length,
      };
    });
    console.log(JSON.stringify({
      command: 'kbx intent status',
      count: items.length,
      intents: items,
    }, null, 2));
  } else {
    if (records.length === 0) {
      console.log('No intents found across backlog, active, closed, or archive state.');
    } else {
      console.log(`Intent status overview (${records.length}):`);
      for (const record of records) {
        const info = collectIntentStatusFromRecord(record);
        const warnMark = info.warnings.length > 0 ? ' [!]' : '';
        console.log(
          `  [${record.scope}] ${record.id} (${info.meta.lifecycle}, ${info.meta.mode}, ${info.staged.length} staged)${warnMark}`
        );
      }
      console.log('');
      console.log('Run "kbx intent status <id-or-slug>" for details on a specific intent.');
    }
  }

  recordIntentCheckpoint({
    workspaceRoot: ctx.workspaceRoot,
    eventName: 'intent.status.overview',
    note: options.checkpointNote || 'Intent status overview inspected',
  });
}

// ---------------------------------------------------------------------------
// Pager helper
// ---------------------------------------------------------------------------

async function printWithPager(lines) {
  const output = lines.join('\n');
  const isTTY = process.stdout.isTTY;
  const termRows = (isTTY && process.stdout.rows) ? process.stdout.rows : Infinity;

  if (!isTTY || lines.length <= termRows) {
    console.log(output);
    return;
  }

  const { spawnSync } = require('child_process');
  const isWin = process.platform === 'win32';
  const pagerCmd = isWin ? 'more' : 'less';
  const pagerArgs = isWin ? [] : ['-R'];
  const result = spawnSync(pagerCmd, pagerArgs, {
    input: output,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: isWin,
  });
  if (result.error) {
    console.log(output);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: list
// ---------------------------------------------------------------------------

async function runList(ctx, options) {
  const { json, listScope } = options;
  const records = listIntentRecords(ctx.contentRoot, getListScopeOptions(listScope));
  const items = records.map((record) => {
    const info = collectIntentStatusFromRecord(record);
    return {
      id: record.scope === 'archived' ? record.folderName : record.id,
      intent_id: record.id,
      slug: record.slug,
      scope: record.scope,
      lifecycle: info.meta.lifecycle,
      status: info.meta.status,
      mode: info.meta.mode,
      staged_count: info.staged.length,
      close_type: info.meta.close_type || null,
      release_ref: info.meta.release_ref || null,
      warnings: info.warnings.length,
    };
  });

  if (json) {
    console.log(JSON.stringify({
      command: 'kbx intent list',
      scope: listScope,
      count: items.length,
      intents: items,
    }, null, 2));

    recordIntentCheckpoint({
      workspaceRoot: ctx.workspaceRoot,
      eventName: 'intent.list',
      note: options.checkpointNote || `Intent list inspected (scope: ${listScope})`,
    });
    return;
  }

  if (items.length === 0) {
    console.log(`No ${listScope} intents.`);
    return;
  }

  const COL_ID = 42;
  const COL_SCOPE = 9;
  const COL_LIFECYCLE = 10;
  const COL_STATUS = 10;
  const COL_MODE = 7;
  const COL_CLOSE = 8;
  const COL_RELEASE = 10;
  const lines = [];
  lines.push(`Intent list (${listScope}, ${items.length}):`);
  lines.push('');
  lines.push(
    '  ' + 'ID'.padEnd(COL_ID) +
    '  ' + 'SCOPE'.padEnd(COL_SCOPE) +
    '  ' + 'LIFECYCLE'.padEnd(COL_LIFECYCLE) +
    '  ' + 'STATUS'.padEnd(COL_STATUS) +
    '  ' + 'MODE'.padEnd(COL_MODE) +
    '  ' + 'CLOSE'.padEnd(COL_CLOSE) +
    '  ' + 'RELEASE'.padEnd(COL_RELEASE) +
    '  STAGED'
  );
  lines.push(
    '  ' + '-'.repeat(COL_ID) +
    '  ' + '-'.repeat(COL_SCOPE) +
    '  ' + '-'.repeat(COL_LIFECYCLE) +
    '  ' + '-'.repeat(COL_STATUS) +
    '  ' + '-'.repeat(COL_MODE) +
    '  ' + '-'.repeat(COL_CLOSE) +
    '  ' + '-'.repeat(COL_RELEASE) +
    '  ------'
  );
  for (const item of items) {
    const warn = item.warnings > 0 ? ' [!]' : '';
    lines.push(
      '  ' + String(item.id).padEnd(COL_ID) +
      '  ' + String(item.scope).padEnd(COL_SCOPE) +
      '  ' + String(item.lifecycle).padEnd(COL_LIFECYCLE) +
      '  ' + String(item.status).padEnd(COL_STATUS) +
      '  ' + String(item.mode).padEnd(COL_MODE) +
      '  ' + String(item.close_type || '-').padEnd(COL_CLOSE) +
      '  ' + String(item.release_ref || '-').padEnd(COL_RELEASE) +
      '  ' + item.staged_count + warn
    );
  }
  lines.push('');
  lines.push('Run "kbx intent status <id-or-slug>" for details.');

  await printWithPager(lines);

  recordIntentCheckpoint({
    workspaceRoot: ctx.workspaceRoot,
    eventName: 'intent.list',
    note: options.checkpointNote || `Intent list inspected (scope: ${listScope})`,
  });
}

// ---------------------------------------------------------------------------
// Subcommand: cancel
// ---------------------------------------------------------------------------

async function runCancel(ctx, options) {
  const { intentId, yes, json } = options;

  if (!yes && !json) {
    const ok = await confirmPrompt(`Cancel intent "${intentId}"? This deprecated alias will close it as dropped.`);
    if (!ok) {
      if (json) {
        console.log(JSON.stringify({ command: 'kbx intent cancel', intent_id: intentId, status: 'aborted' }, null, 2));
      } else {
        console.log('kbx intent cancel: aborted.');
      }
      return;
    }
  }

  const closedPath = cancelIntent(ctx.contentRoot, intentId);

  if (json) {
    console.log(JSON.stringify({
      command: 'kbx intent cancel',
      intent_id: intentId,
      deprecated: true,
      close_type: 'dropped',
      drop_reason: 'cancelled via legacy command',
      status: 'closed',
      path: closedPath,
    }, null, 2));
  } else {
    console.log(`Intent "${intentId}" closed as dropped via deprecated cancel alias.`);
    console.log(`Path: ${closedPath}`);
  }
}

async function runCleanup(ctx, options) {
  const { json, stale: filterStale, aged: filterAged } = options;
  const STALE_DAYS = 14;
  const AGED_DAYS = 30;
  const now = Date.now();

  const findings = [];

  // Scan active intents
  const activeRecords = listIntentRecords(ctx.contentRoot, {
    includeBacklog: false, includeActive: true, includeClosed: false, includeArchived: false,
  });

  for (const record of activeRecords) {
    const meta = record.meta || {};
    const id = record.id;

    // D40 rule 1+2: focus block missing fields
    const focus = meta.focus && typeof meta.focus === 'object' ? meta.focus : null;
    if (!focus || !focus.current || String(focus.current).trim() === '') {
      findings.push({
        severity: 'critical',
        intent_id: id,
        rule: 'missing-focus-current',
        message: 'focus.current is required for active intent',
        suggested_command: `kbx intent focus ${id} --current "..." --next "..."`,
      });
    }
    if (!focus || !focus.next_action || String(focus.next_action).trim() === '') {
      findings.push({
        severity: 'critical',
        intent_id: id,
        rule: 'missing-focus-next-action',
        message: 'focus.next_action is required for active intent',
        suggested_command: `kbx intent focus ${id} --next "..."`,
      });
    }

    // D40 rule 3: stale focus
    if (focus && focus.last_updated) {
      const lastUpdated = new Date(focus.last_updated).getTime();
      if (!Number.isNaN(lastUpdated)) {
        const ageDays = (now - lastUpdated) / (1000 * 60 * 60 * 24);
        if (ageDays > STALE_DAYS) {
          findings.push({
            severity: 'warning',
            intent_id: id,
            rule: 'stale-focus',
            message: `focus.last_updated is ${Math.floor(ageDays)} days old (threshold: ${STALE_DAYS})`,
            suggested_command: `kbx intent focus ${id} --current "..." --next "..."`,
          });
        }
      }
    } else if (!focus || !focus.last_updated) {
      findings.push({
        severity: 'warning',
        intent_id: id,
        rule: 'missing-focus-last-updated',
        message: 'focus.last_updated is missing',
        suggested_command: `kbx intent focus ${id} --current "..." --next "..."`,
      });
    }

    // D40 rule 4: missing architecture_position.wave
    if (!meta.architecture_position || !meta.architecture_position.wave) {
      findings.push({
        severity: 'warning',
        intent_id: id,
        rule: 'missing-wave',
        message: 'architecture_position.wave is missing',
        suggested_command: null,
      });
    }

    // D40 rule 5: missing v2.4 required fields (post-v2.4 intents only, i.e. no legacy flag)
    if (!meta.legacy) {
      if (!meta.type) {
        findings.push({ severity: 'warning', intent_id: id, rule: 'missing-type', message: 'type field is missing (required for post-v2.4 intents)', suggested_command: null });
      }
      if (!meta.strategic_mode) {
        findings.push({ severity: 'warning', intent_id: id, rule: 'missing-strategic-mode', message: 'strategic_mode is missing (required for post-v2.4 intents)', suggested_command: null });
      }
      if (!meta.urgency) {
        findings.push({ severity: 'warning', intent_id: id, rule: 'missing-urgency', message: 'urgency is missing (required for post-v2.4 intents)', suggested_command: null });
      }
    }
  }

  // D40 rule 6: closed intents aged beyond threshold
  const closedRecords = listIntentRecords(ctx.contentRoot, {
    includeBacklog: false, includeActive: false, includeClosed: true, includeArchived: false,
  });

  for (const record of closedRecords) {
    const meta = record.meta || {};
    const id = record.id;
    const closedAt = meta.closed_at ? new Date(meta.closed_at).getTime() : null;
    if (closedAt && !Number.isNaN(closedAt)) {
      const ageDays = (now - closedAt) / (1000 * 60 * 60 * 24);
      if (ageDays > AGED_DAYS) {
        findings.push({
          severity: 'warning',
          intent_id: id,
          rule: 'closed-aged',
          message: `Closed ${Math.floor(ageDays)} days ago (threshold: ${AGED_DAYS}). Candidate for archive.`,
          suggested_command: `kbx intent archive ${id}`,
        });
      }
    }
  }

  // Filter by flag
  const filtered = findings.filter((f) => {
    if (filterStale && !filterAged) {
      return f.rule !== 'closed-aged';
    }
    if (filterAged && !filterStale) {
      return f.rule === 'closed-aged';
    }
    return true;
  });

  const critical = filtered.filter((f) => f.severity === 'critical');
  const warnings = filtered.filter((f) => f.severity === 'warning');

  if (json) {
    console.log(JSON.stringify({
      command: 'kbx intent cleanup',
      critical: critical.length,
      warning: warnings.length,
      findings: filtered,
    }, null, 2));
    return;
  }

  console.log('Intent cleanup report');
  console.log(`  critical: ${critical.length}`);
  console.log(`  warning:  ${warnings.length}`);

  if (critical.length > 0) {
    console.log('');
    console.log('CRITICAL');
    for (const f of critical) {
      console.log(`  - ${f.intent_id}: ${f.message}`);
      if (f.suggested_command) {
        console.log(`    fix: ${f.suggested_command}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.log('');
    console.log('WARNING');
    for (const f of warnings) {
      console.log(`  - ${f.intent_id}: ${f.message}`);
      if (f.suggested_command) {
        console.log(`    suggestion: ${f.suggested_command}`);
      }
    }
  }

  if (filtered.length === 0) {
    console.log('');
    console.log('No issues found.');
  }
}

async function runFocus(ctx, options) {
  const metaPath = updateIntentFocus(ctx.contentRoot, options.intentId, {
    current: options.current,
    nextAction: options.nextAction,
    lastUpdated: options.lastUpdated,
  });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx intent focus',
      intent_id: options.intentId,
      current: options.current,
      next_action: options.nextAction,
      last_updated: options.lastUpdated || new Date().toISOString().slice(0, 10),
      path: metaPath,
      status: 'updated',
    }, null, 2));
    return;
  }

  console.log(`Updated focus for "${options.intentId}".`);
  console.log(`Path: ${metaPath}`);
}

function updateIntentRecordMeta(record, updater) {
  if (!record || !record.metaPath) {
    throw new Error('Intent record metadata path not found.');
  }
  const meta = { ...(record.meta || {}) };
  const next = updater(meta) || meta;
  writeIntentFrontmatter(record.metaPath, next);
  return next;
}

async function runAlign(ctx, options) {
  const record = resolveIntentRecord(ctx.contentRoot, options.intentId);
  if (!record || !record.metaPath) {
    throw new Error(`Intent "${options.intentId}" not found across backlog, active, closed, or archive state.`);
  }
  if (record.scope !== 'active' && record.scope !== 'backlog') {
    throw new Error(`kbx intent align requires an active/backlog intent. Current scope: ${record.scope}`);
  }

  const goals = Array.from(new Set((options.goals || []).map((g) => String(g).trim()).filter(Boolean)));
  if (goals.length === 0) {
    throw new Error('kbx intent align requires at least one non-empty goal.');
  }

  const updated = updateIntentRecordMeta(record, (meta) => {
    meta.linked_goals = goals;
    meta.alignment_checked_at = new Date().toISOString();
    return meta;
  });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx intent align',
      intent_id: record.id,
      linked_goals: updated.linked_goals,
      alignment_checked_at: updated.alignment_checked_at,
      status: 'aligned',
    }, null, 2));
    return;
  }

  console.log(`Intent "${record.id}" aligned to ${goals.length} goal(s).`);
}

async function runApprove(ctx, options) {
  const record = resolveIntentRecord(ctx.contentRoot, options.intentId);
  if (!record || !record.metaPath) {
    throw new Error(`Intent "${options.intentId}" not found across backlog, active, closed, or archive state.`);
  }
  if (record.scope !== 'active') {
    throw new Error(`kbx intent approve requires an active intent. Current scope: ${record.scope}`);
  }

  const approvedAt = new Date().toISOString();
  const updated = updateIntentRecordMeta(record, (meta) => {
    meta.approved = true;
    meta.approved_at = approvedAt;
    if (options.checkpointNote) {
      meta.approval_note = options.checkpointNote;
    }
    meta.state = 'approved';
    return meta;
  });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx intent approve',
      intent_id: record.id,
      approved: Boolean(updated.approved),
      approved_at: updated.approved_at,
      status: 'approved',
    }, null, 2));
    return;
  }

  console.log(`Intent "${record.id}" approved.`);
}

async function runStage(ctx, options) {
  const record = resolveIntentRecord(ctx.contentRoot, options.intentId);
  if (!record || !record.metaPath) {
    throw new Error(`Intent "${options.intentId}" not found across backlog, active, closed, or archive state.`);
  }
  if (record.scope !== 'active') {
    throw new Error(`kbx intent stage requires an active intent. Current scope: ${record.scope}`);
  }

  const meta = record.meta || {};
  if (meta.approved !== true) {
    throw new Error('kbx intent stage requires prior approval. Run: kbx intent approve <id>');
  }

  const stagedAt = new Date().toISOString();
  const nextState = options.stageState || 'staged';
  const updated = updateIntentRecordMeta(record, (nextMeta) => {
    nextMeta.state = nextState;
    nextMeta.staged_at = stagedAt;
    return nextMeta;
  });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx intent stage',
      intent_id: record.id,
      state: updated.state,
      staged_at: updated.staged_at,
      status: 'staged',
    }, null, 2));
    return;
  }

  console.log(`Intent "${record.id}" staged (${nextState}).`);
}

async function runRetro(ctx, options) {
  const record = resolveIntentRecord(ctx.contentRoot, options.intentId);
  if (!record || !record.metaPath) {
    throw new Error(`Intent "${options.intentId}" not found across backlog, active, closed, or archive state.`);
  }

  let note = options.checkpointNote || '';
  if (!note) {
    note = await promptInput('Retro note: ');
  }

  const completedAt = new Date().toISOString();
  const updated = updateIntentRecordMeta(record, (meta) => {
    meta.retro_completed = true;
    meta.retro_completed_at = completedAt;
    if (note) {
      meta.retro_note = note;
    }
    return meta;
  });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx intent retro',
      intent_id: record.id,
      retro_completed: Boolean(updated.retro_completed),
      retro_completed_at: updated.retro_completed_at,
      status: 'retro-completed',
    }, null, 2));
    return;
  }

  console.log(`Retro completed for "${record.id}".`);
}

async function runUpdate(ctx, options) {
  const record = resolveIntentRecord(ctx.contentRoot, options.intentId);
  if (!record || !record.metaPath) {
    throw new Error(`Intent "${options.intentId}" not found across backlog, active, closed, or archive state.`);
  }
  if (record.scope !== 'active') {
    throw new Error(`kbx intent update requires an active intent. Current scope: ${record.scope}`);
  }

  const updatedFields = [];

  const strategicModeAllowList = new Set([
    'Survival',
    'Creation',
    'Optimization',
    'Exploration',
    'Investigation',
    'Simplification',
  ]);
  const urgencyAllowList = new Set([
    'Immediate',
    'Time-Sensitive',
    'Scheduled',
    'Opportunistic',
  ]);

  if (options.strategicMode && !strategicModeAllowList.has(options.strategicMode)) {
    throw new Error(`Invalid strategic mode "${options.strategicMode}". Allowed: ${Array.from(strategicModeAllowList).join(', ')}`);
  }
  if (options.urgency && !urgencyAllowList.has(options.urgency)) {
    throw new Error(`Invalid urgency "${options.urgency}". Allowed: ${Array.from(urgencyAllowList).join(', ')}`);
  }
  if (options.wave && !/^v?\d+(?:\.\d+){0,2}$/i.test(options.wave)) {
    throw new Error(`Invalid wave "${options.wave}". Expected vX, vX.Y, or vX.Y.Z.`);
  }

  const updated = updateIntentRecordMeta(record, (meta) => {
    if (options.title) {
      meta.title = options.title;
      updatedFields.push('title');
    }

    const hasFocusUpdate = Boolean(options.focusValue) || Boolean(options.nextActionValue);
    if (hasFocusUpdate) {
      const focus = meta.focus && typeof meta.focus === 'object' ? { ...meta.focus } : {};
      if (options.focusValue) {
        focus.current = options.focusValue;
        updatedFields.push('focus');
      }
      if (options.nextActionValue) {
        focus.next_action = options.nextActionValue;
        updatedFields.push('next_action');
      }
      focus.last_updated = new Date().toISOString().slice(0, 10);
      meta.focus = focus;
    }

    if (options.decisionSummaryValue) {
      meta.decision_summary = options.decisionSummaryValue;
      updatedFields.push('decision_summary');
    }

    if (options.stateValue) {
      meta.state = options.stateValue;
      updatedFields.push('state');
    }

    if (options.intentType) {
      meta.type = options.intentType;
      updatedFields.push('type');
    }

    if (options.strategicMode) {
      meta.strategic_mode = options.strategicMode;
      updatedFields.push('strategic_mode');
    }

    if (options.urgency) {
      meta.urgency = options.urgency;
      updatedFields.push('urgency');
    }

    if (options.wave) {
      const architecturePosition = meta.architecture_position && typeof meta.architecture_position === 'object'
        ? { ...meta.architecture_position }
        : {};
      architecturePosition.wave = options.wave.startsWith('v') ? options.wave : `v${options.wave}`;
      meta.architecture_position = architecturePosition;
      updatedFields.push('architecture_position.wave');
    }

    meta.updated_at = new Date().toISOString();
    return meta;
  });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx intent update',
      intent_id: record.id,
      updated_fields: updatedFields,
      state: updated.state || null,
      status: 'updated',
    }, null, 2));
    return;
  }

  console.log(`Intent "${record.id}" updated: ${updatedFields.join(', ') || 'metadata'}.`);
}

async function runApplyPreview(ctx, options) {
  const record = resolveIntentRecord(ctx.contentRoot, options.intentId);
  if (!record || !record.metaPath) {
    throw new Error(`Intent "${options.intentId}" not found across backlog, active, closed, or archive state.`);
  }
  if (record.scope !== 'active') {
    throw new Error(`kbx intent apply-preview requires an active intent. Current scope: ${record.scope}`);
  }

  const intentId = record.id;
  const meta = readIntentMeta(ctx.contentRoot, intentId);
  const staged = listStagedFiles(ctx.contentRoot, intentId);
  const pathIssues = validateStagedFilePaths(staged);
  const classified = staged.map((file) => ({
    file,
    op: classifyStagedFile(ctx.contentRoot, intentId, file),
  }));

  let conflictSummary = null;
  try {
    conflictSummary = analyzeIntentConflicts(ctx.contentRoot, intentId);
  } catch {
    conflictSummary = null;
  }

  const warnings = [];
  if (!meta.decision_summary || meta.decision_summary === '') {
    warnings.push({ level: 'warn', message: 'decision_summary is empty.' });
  }
  for (const issue of pathIssues) {
    warnings.push({ level: 'warn', message: `${issue.file}: ${issue.issue}` });
  }
  if (conflictSummary && conflictSummary.conflict_count > 0) {
    warnings.push({
      level: 'warn',
      message: `${conflictSummary.conflict_count} potential overlap(s) detected with other active intents.`,
    });
  }

  const payload = {
    command: 'kbx intent apply-preview',
    intent_id: intentId,
    files_changed: classified.length,
    insertions: 0,
    deletions: 0,
    files: classified,
    warnings,
    conflict_summary: conflictSummary,
    status: 'preview',
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`Apply preview for "${intentId}": ${classified.length} file(s).`);
  for (const file of classified) {
    const prefix = file.op === 'new' ? '+' : '~';
    console.log(`  ${prefix} ${file.file}`);
  }
  if (warnings.length > 0) {
    console.log('Warnings:');
    for (const w of warnings) {
      console.log(`  - ${w.message}`);
    }
  }
}

async function runArchive(ctx, options) {
  const record = resolveIntentRecord(ctx.contentRoot, options.intentId);
  if (!record) {
    throw new Error(`Intent "${options.intentId}" not found across backlog, active, closed, or archive state.`);
  }
  if (record.scope === 'active' || record.scope === 'closed') {
    const meta = record.meta || {};
    if (meta.retro_completed !== true) {
      throw new Error(
        `P006 violation: intent "${options.intentId}" cannot be archived before retro is completed. ` +
        'Set frontmatter `retro_completed: true` after running retro.'
      );
    }
  }

  const archivePath = archiveIntent(ctx.contentRoot, options.intentId, new Date().toISOString());
  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx intent archive',
      intent_id: options.intentId,
      archive_path: archivePath,
      status: 'archived',
    }, null, 2));
    return;
  }
  console.log(`Intent "${options.intentId}" archived.`);
  console.log(`Archive: ${archivePath}`);
}

async function runClose(ctx, options) {
  const closeType = options.closeType;
  const closedPath = closeIntent(ctx.contentRoot, options.intentId, {
    closeType,
    releaseRef: closeType === 'released' ? options.release : null,
    dropReason: closeType === 'dropped' ? options.reason : null,
  });

  recordIntentCheckpoint({
    workspaceRoot: ctx.workspaceRoot,
    eventName: 'intent.close',
    intentId: options.intentId,
    note: options.checkpointNote || `Intent closed as ${closeType}`,
  });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx intent close',
      intent_id: options.intentId,
      close_type: closeType,
      path: closedPath,
      status: 'closed',
    }, null, 2));
    return;
  }
  console.log(`Intent "${options.intentId}" closed as ${closeType}.`);
  console.log(`Path: ${closedPath}`);
}

async function runCheckpoint(ctx, options, cwd) {
  const result = recordIntentCheckpoint({
    workspaceRoot: cwd,
    eventName: 'intent.checkpoint.manual',
    intentId: options.intentId,
    note: options.checkpointNote || 'Manual checkpoint requested',
  });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx intent checkpoint',
      intent_id: options.intentId || null,
      skipped: Boolean(result.skipped),
      reason: result.reason || null,
      focus_file: result.relFocus || null,
      status: result.skipped ? 'skipped' : 'committed',
    }, null, 2));
    return;
  }

  if (result.skipped) {
    console.log('Intent checkpoint skipped: no focus.md found (svfactory/focus.md or kb-root/focus.md).');
    return;
  }

  console.log('Intent checkpoint committed.');
  console.log(`File: ${result.relFocus}`);
}

// ---------------------------------------------------------------------------
// Subcommand: apply
// ---------------------------------------------------------------------------

async function runApply(ctx, options, cwd) {
  const { intentId, yes, json, release } = options;

  // 1. Read meta + staged files
  const meta = readIntentMeta(ctx.contentRoot, intentId);
  const staged = listStagedFiles(ctx.contentRoot, intentId);

  if (staged.length === 0) {
    throw new Error(`Intent "${intentId}" has no staged files in proposed-changes/. Nothing to apply.`);
  }

  // Path validation: reject if any file is directly under proposed-changes/ root (I1)
  const pathIssues = validateStagedFilePaths(staged);
  if (pathIssues.length > 0) {
    const msgs = pathIssues.map((p) => `  - ${p.file}: ${p.issue}`).join('\n');
    throw new Error(`Intent "${intentId}" has staged file path issues:\n${msgs}\nFix paths before applying.`);
  }

  // Warn if decision_summary empty (I2 — warn, do not block)
  if (!meta.decision_summary || meta.decision_summary === '') {
    console.warn(`WARNING: decision_summary is empty in intent "${intentId}". Fill it in intent.md before applying.`);
  }

  // P004 hard gate: full-mode intents must pass impact pre-check before apply.
  const wsPath = intentWorkspacePath(ctx.contentRoot, intentId);
  if (meta.mode === 'full') {
    const impactDocPath = path.join(wsPath, 'impact.md');
    if (!fs.existsSync(impactDocPath)) {
      throw new Error(
        `P004 violation: full-mode intent "${intentId}" is missing impact.md. ` +
        'Run impact assessment before apply.'
      );
    }

    const cliPath = path.resolve(__dirname, '..', '..', 'bin', 'kbx.js');
    const impactFailures = [];
    for (const file of staged) {
      const result = spawnSync(process.execPath, [cliPath, 'impact', file, '--json'], {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
      });
      if ((result.status || 0) !== 0) {
        impactFailures.push({
          file,
          status: result.status,
          stderr: (result.stderr || '').trim(),
        });
      }
    }

    if (impactFailures.length > 0) {
      const lines = impactFailures
        .slice(0, 8)
        .map((f) => `  - ${f.file}: ${f.stderr || `impact exit ${f.status}`}`)
        .join('\n');
      throw new Error(
        `P004 violation: impact pre-apply gate failed for ${impactFailures.length} file(s).\n${lines}\n` +
        'Fix impact issues before applying.'
      );
    }
  }

  // v2.0 Phase 1 primitive: advanced conflict context (warn, non-blocking)
  let conflictSummary = null;
  try {
    conflictSummary = analyzeIntentConflicts(ctx.contentRoot, intentId);
  } catch (_) {
    conflictSummary = null;
  }

  // Classify files as new (+) or modified (~) for preview (I8)
  const classified = staged.map((f) => ({
    file: f,
    op: classifyStagedFile(ctx.contentRoot, intentId, f),
  }));

  // 2. Show preview
  if (!json) {
    console.log(`Will write ${staged.length} file(s) to KB core:`);
    for (const { file, op } of classified) {
      const prefix = op === 'new' ? '+' : '~';
      console.log(`  ${prefix} ${file}`);
    }
    const wsPath = intentWorkspacePath(ctx.contentRoot, intentId);
    const hasLesson = fs.existsSync(path.join(wsPath, 'lesson-candidate.md'));
    if (hasLesson) console.log('  (lesson-candidate.md will be preserved in archive)');
    if (conflictSummary && conflictSummary.conflict_count > 0) {
      const applyOrder = suggestApplyOrder(conflictSummary);
      console.log('');
      console.log(`Conflict context: ${conflictSummary.conflict_count} potential overlap(s) with other active intents.`);
      for (const c of conflictSummary.conflicts.slice(0, 5)) {
        console.log(
          `  [${String(c.risk || '').toUpperCase()}] vs ${c.against_intent_id}` +
          `  (exact:${c.signals.exact_file_overlap}, dir:${c.signals.same_directory_overlap},` +
          ` domain:${c.signals.same_domain_overlap}, graph:${c.signals.graph_neighbor_overlap})`
        );
      }
      console.log(`  Strategy: [${applyOrder.strategy}] ${applyOrder.reason}`);
      for (const step of applyOrder.steps) {
        console.log(`    - ${step}`);
      }
    }
    if (release) console.log('  --release: release pipeline will run after apply.');
    console.log('');
  }

  if (!yes && !json) {
    const ok = await confirmPrompt('Confirm apply?');
    if (!ok) {
      console.log('kbx intent apply: aborted.');
      return;
    }
  }

  // 3. Apply files (write staged → KB core)
  const applyResults = applyStagedFiles(ctx.contentRoot, intentId, staged);

  // 4. Build + write apply-record.json
  const appliedAt = new Date().toISOString();
  const record = buildApplyRecord({ meta, stagedFiles: staged, appliedAt });
  const applyRecordPath = writeApplyRecord(ctx.contentRoot, intentId, record);
  // 5. Write AI decision transparency record into the active workspace.
  if (conflictSummary) {
    const { suggestApplyOrder: _suggestApplyOrder } = require('../lib/intent-intelligence');
    const applyOrderDecision = _suggestApplyOrder(conflictSummary);
    const decisionRecord = {
      type: 'conflict-strategy',
      intent_id: intentId,
      decided_at: appliedAt,
      evidence: {
        conflict_count: conflictSummary.conflict_count,
        high_risk_count: conflictSummary.high_risk_count,
        medium_risk_count: conflictSummary.medium_risk_count,
        conflicts: conflictSummary.conflicts.map(c => ({
          against_intent_id: c.against_intent_id,
          risk: c.risk,
          signals: c.signals,
        })),
      },
      strategy: applyOrderDecision.strategy,
      reason: applyOrderDecision.reason,
      requires_user_approval: applyOrderDecision.strategy === 'resolve-first',
      confidence: conflictSummary.conflict_count === 0 ? 'n/a'
        : conflictSummary.high_risk_count > 0 ? 'strong'
        : conflictSummary.medium_risk_count > 0 ? 'provisional'
        : 'low-confidence',
    };
    try {
      fs.writeFileSync(
        path.join(wsPath, 'ai-decision-context.json'),
        JSON.stringify(decisionRecord, null, 2),
        'utf8'
      );
    } catch {
      // Non-fatal: transparency record is best-effort
    }
  }

  if (json) {
    console.log(JSON.stringify({
      command: 'kbx intent apply',
      intent_id: intentId,
      applied_files: applyResults,
      apply_record: record,
      apply_record_path: applyRecordPath,
      workspace: wsPath,
      conflict_summary: conflictSummary,
      status: 'applied',
    }, null, 2));
  } else {
    console.log(`Intent "${intentId}" applied.`);
    console.log(`  ${applyResults.filter((r) => r.op === 'new').length} new, ${applyResults.filter((r) => r.op === 'modified').length} modified.`);
    console.log(`  Apply record: ${applyRecordPath}`);
    console.log('  Intent remains active until you explicitly close it.');
  }

  // 6. --release: trigger AFTER apply (I4)
  if (release) {
    if (!json) console.log('\nRunning release pipeline...');
    runRelease({ args: ['run'], cwd });
  }
}

// ---------------------------------------------------------------------------
// suggest-lessons
// ---------------------------------------------------------------------------

async function runSuggestLessons(ctx, options) {
  const { json } = options;
  const candidates = generateLessonCandidates(ctx.contentRoot);

  if (json) {
    console.log(JSON.stringify({
      command: 'kbx intent suggest-lessons',
      candidate_count: candidates.length,
      candidates,
    }, null, 2));
    return;
  }

  if (candidates.length === 0) {
    console.log('No lesson candidates found. Archive more intents to build pattern evidence.');
    return;
  }

  console.log(`Found ${candidates.length} lesson candidate(s) from archived intent patterns:\n`);
  for (const c of candidates) {
    console.log(`  [${c.id}] pattern: ${c.pattern_type}`);
    console.log(`    domain: ${c.domain}`);
    console.log(`    rule: ${c.rule}`);
    console.log(`    reason: ${c.reason}`);
    console.log(`    evidence: ${c.evidence.join(', ')}`);
    console.log('');
  }
  console.log('These are candidates only. Review and promote manually to lessons-index.md if appropriate.');
}

// ---------------------------------------------------------------------------
// Subcommand: extract (v2.1.0)
// ---------------------------------------------------------------------------

async function runExtract(ctx, options, cwd) {
  const { json, extractTitle, extractType, commitRange, yes } = options;
  const { getChangedFilesSince, runGitCommand } = require('../lib/git');

  if (!commitRange) {
    throw new Error('kbx intent extract: missing commit range (e.g. HEAD~5..HEAD)');
  }

  // 1. Get changed files in range
  const changedFiles = getChangedFilesSince(cwd, commitRange.split('..')[0], commitRange.split('..')[1] || 'HEAD');
  if (!changedFiles || changedFiles.length === 0) {
    throw new Error(`kbx intent extract: no changes found in range "${commitRange}"`);
  }

  // 2. Filter KB files (knowledge-base/<tier>/ only, skip intents/, .kb/, code)
  const kbFiles = changedFiles.filter((f) => {
    const p = f.path.replace(/\\/g, '/');
    const isKbFile = p.startsWith('knowledge-base/') && !p.includes('/intents/') && !p.includes('/.kb/');
    return isKbFile && f.status !== 'D'; // Skip deleted
  });

  if (kbFiles.length === 0) {
    throw new Error(`kbx intent extract: no KB files found in range "${commitRange}". Only knowledge-base/ tier files are extracted.`);
  }

  // 3. Get commit messages for changelog
  const logOutput = runGitCommand(`git log --oneline ${commitRange}`, cwd);
  const commits = logOutput ? logOutput.split('\n').filter(Boolean) : [];

  // 4. Suggest ID from title or timestamp
  let intentId = extractTitle ? sanitizeId(extractTitle) : null;
  if (!intentId) {
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    intentId = `extracted-${ts}`;
  }

  // 5. Generate archive intent structure with snapshot
  const archiveRoot = require('../lib/intent').archiveIntentsRoot(ctx.contentRoot);
  fs.mkdirSync(archiveRoot, { recursive: true });

  const now = new Date().toISOString();
  const archiveName = `${intentId}-${now.replace(/[-:T]/g, '').slice(0, 14)}`;
  const archivePath = path.join(archiveRoot, archiveName);
  fs.mkdirSync(archivePath, { recursive: true });

  // 6. Build intent.md (status=applied, source=extracted)
  const intentMdContent = [
    '---',
    `id: ${intentId}`,
    `mode: quick`,
    `status: applied`,
    `created_at: ${now}`,
    `change_type: ${extractType || 'docs'}`,
    `change_scope: []`,
    `impact_signals: []`,
    `decision_summary: "Retroactively extracted from commit range ${commitRange}"`,
    `review_after: null`,
    `extraction_source: retroactive`,
    '---',
    '',
    `# Intent: ${intentId}`,
    '',
    '## Summary',
    '',
    extractTitle ? extractTitle : `Extracted from commit range: ${commitRange}`,
    '',
    '## Staged Files',
    '',
  ];

  for (const f of kbFiles) {
    intentMdContent.push(`- ${f.path}`);
  }

  intentMdContent.push('');

  fs.writeFileSync(path.join(archivePath, 'intent.md'), intentMdContent.join('\n'), 'utf8');

  // 7. Create proposed-changes/ with snapshot
  const proposedPath = path.join(archivePath, 'proposed-changes');
  fs.mkdirSync(proposedPath, { recursive: true });

  for (const f of kbFiles) {
    const sourcePath = path.join(ctx.contentRoot, f.path);
    if (fs.existsSync(sourcePath)) {
      const relPath = path.relative(ctx.contentRoot, sourcePath);
      const destPath = path.join(proposedPath, relPath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(sourcePath, destPath);
    }
  }

  // 8. Write changelog.md
  const changelogLines = [
    '# Changelog',
    '',
    `Extracted from: ${commitRange}`,
    '',
    '## Commits',
    '',
  ];

  for (const commit of commits) {
    changelogLines.push(`- ${commit}`);
  }

  fs.writeFileSync(path.join(archivePath, 'changelog.md'), changelogLines.join('\n'), 'utf8');

  if (json) {
    console.log(JSON.stringify({
      command: 'kbx intent extract',
      intent_id: intentId,
      commit_range: commitRange,
      kb_files_count: kbFiles.length,
      kb_files: kbFiles.map(f => f.path),
      archive_path: archivePath,
      status: 'extracted',
    }, null, 2));
  } else {
    console.log(`Extracted intent: ${intentId}`);
    console.log(`Commit range: ${commitRange}`);
    console.log(`KB files: ${kbFiles.length}`);
    for (const f of kbFiles) {
      console.log(`  - ${f.path}`);
    }
    console.log(`Archive: ${archivePath}`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function runIntent({ args, cwd }) {
  const options = parseArgs(args);

  if (options.sub === 'help') {
    printHelp();
    return;
  }

  const ctx = resolveExistingState({ workspaceRoot: cwd });
  ctx.workspaceRoot = cwd;

  if (options.sub === 'create') {
    await runCreate(ctx, options, cwd);
  } else if (options.sub === 'draft') {
    await runDraft(ctx, options);
  } else if (options.sub === 'activate') {
    await runActivate(ctx, options);
  } else if (options.sub === 'status') {
    await runStatus(ctx, options);
  } else if (options.sub === 'list') {
    await runList(ctx, options);
  } else if (options.sub === 'focus') {
    await runFocus(ctx, options);
  } else if (options.sub === 'update') {
    await runUpdate(ctx, options);
  } else if (options.sub === 'align') {
    await runAlign(ctx, options);
  } else if (options.sub === 'approve') {
    await runApprove(ctx, options);
  } else if (options.sub === 'stage') {
    await runStage(ctx, options);
  } else if (options.sub === 'retro') {
    await runRetro(ctx, options);
  } else if (options.sub === 'close') {
    await runClose(ctx, options);
  } else if (options.sub === 'cancel') {
    await runCancel(ctx, options);
  } else if (options.sub === 'archive') {
    await runArchive(ctx, options);
  } else if (options.sub === 'apply') {
    await runApply(ctx, options, cwd);
  } else if (options.sub === 'apply-preview') {
    await runApplyPreview(ctx, options);
  } else if (options.sub === 'suggest-lessons') {
    await runSuggestLessons(ctx, options);
  } else if (options.sub === 'cleanup') {
    await runCleanup(ctx, options);
  } else if (options.sub === 'extract') {
    await runExtract(ctx, options, cwd);
  } else if (options.sub === 'checkpoint') {
    await runCheckpoint(ctx, options, cwd);
  }
}

function printHelp() {
  console.log('kbx intent — Intent workspace management');
  console.log('');
  console.log('Usage:');
  console.log('  kbx intent create [<id>] [--mode=quick|full] [--change-type=<type>] [--yes] [--json]');
  console.log('  kbx intent draft <slug> [--json]');
  console.log('  kbx intent activate <slug> --wave=vX.Y [--mode=quick|full] [--change-type=<type>] [--json]');
  console.log('  kbx intent status [<id-or-slug>] [--json]');
  console.log('  kbx intent list [--backlog|--closed|--archived|--all] [--json]');
  console.log('  kbx intent focus <id> [--current="..."] [--next="..."] [--date=YYYY-MM-DD] [--json]');
  console.log('  kbx intent update <id> [--title="..."] [--focus="..."] [--next-action="..."] [--decision-summary="..."] [--state="..."] [--json]');
  console.log('  kbx intent align <id> --goal="..." [--goal="..."] [--json]');
  console.log('  kbx intent approve <id> [--note="..."] [--json]');
  console.log('  kbx intent stage <id> [--state=staged|ready] [--json]');
  console.log('  kbx intent retro <id> [--note="..."] [--json]');
  console.log('  kbx intent cleanup [--stale] [--aged] [--json]');
  console.log('  kbx intent apply <id> [--release] [--yes] [--json]');
  console.log('  kbx intent apply-preview <id> [--json]');
  console.log('  kbx intent close <id> --type=released --release=vX.Y.Z [--json]');
  console.log('  kbx intent close <id> --type=dropped --reason="..." [--json]');
  console.log('  kbx intent cancel <id> [--yes] [--json]');
  console.log('  kbx intent archive <id> [--json]');
  console.log('  kbx intent suggest-lessons [--json]');
  console.log('  kbx intent extract <range> [--title="..."] [--type=<type>] [--json]');
  console.log('  kbx intent checkpoint [<id>] [--note="..."] [--json]');
  console.log('');
  console.log('Subcommands:');
  console.log('  create          Create a new intent workspace.');
  console.log('                  Suggests ID from current git branch; prompts to confirm or edit.');
  console.log('                  --mode=quick|full     quick (default): low ceremony, no plan.md/impact.md required.');
  console.log('                  --change-type=<type>  docs (default), feature, fix, refactor, governance.');
  console.log('                  --yes                 Accept suggested ID and skip confirmation prompt.');
  console.log('  draft           Create a backlog intent markdown file in intents/_backlog/.');
  console.log('  activate        Move a backlog intent into _active/ and assign a version-scoped intent ID.');
  console.log('  status          Show status of one intent across backlog, active, closed, or archive state.');
  console.log('                  Without <id>: overview across all states.');
  console.log('  list            List intents by scope. Default scope is active only.');
  console.log('                  Flags: --backlog, --closed, --archived, --all');
  console.log('  focus           Update focus block fields on an active intent.');
  console.log('  update          Update active intent metadata fields used by bridge mutation endpoints.');
  console.log('  align           Attach one or more linked goals to intent metadata (P003 alignment).');
  console.log('  approve         Mark an active intent as approved and timestamp approval.');
  console.log('  stage           Transition an approved intent into staged/ready state.');
  console.log('  retro           Record retro completion; required before archive (P006).');
  console.log('  cleanup         Advisory scan — reports stale/missing-focus active intents and aged closed intents.');
  console.log('                  --stale  Focus on active intents with stale/missing focus (default: 14 day threshold).');
  console.log('                  --aged   Focus on closed intents eligible for archive (default: 30 day threshold).');
  console.log('                  --json   Machine-readable output. Never auto-mutates.');
  console.log('  apply           Write staged files from proposed-changes/ to the KB content root.');
  console.log('                  Builds apply-record.json and keeps the intent active until explicit close.');
  console.log('                  --release  Trigger release pipeline after apply (apply must complete first).');
  console.log('                  --yes      Skip confirmation prompt.');
  console.log('  apply-preview   Show dry-run summary for staged files and warnings; no mutations.');
  console.log('  close           Move an active intent into _closed/released or _closed/dropped.');
  console.log('  cancel          Deprecated alias for close --type=dropped. Keeps history instead of deleting.');
  console.log('  archive         Move an active or closed intent workspace into _archive/.');
  console.log('  suggest-lessons Scan archived intents for recurring patterns and suggest lesson candidates.');
  console.log('                  Candidates are human-reviewable; none are written automatically.');
  console.log('                  --json  Output candidates as JSON.');
  console.log('  extract         Retroactively extract ad-hoc commits into an archived intent.');
  console.log('                  <range>      Commit range (e.g. HEAD~5..HEAD).');
  console.log('                  --title="..." Optional title for the extracted intent.');
  console.log('                  --type=<type> Change type: docs (default), feature, fix, refactor.');
  console.log('                  Creates intent in _archive/ with snapshot of changed KB files.');
  console.log('  checkpoint      Write a focus.md checkpoint entry and commit immediately.');
  console.log('                  Triggered automatically on create/list/status/close when focus.md exists.');
  console.log('');
}

module.exports = {
  runIntent,
  runApply,
  runSuggestLessons,
  parseArgs,
  printHelp,
  parseIntentVersionFromId,
  compareVersionTuple,
  enforceIntentVersionProgression,
};
