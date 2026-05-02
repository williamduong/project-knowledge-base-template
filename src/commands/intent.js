'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { resolveExistingState } = require('../lib/context');
const { getGitMetadata } = require('../lib/git');
const {
  VALID_MODES,
  createIntentWorkspace,
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
} = require('../lib/intent');
const { analyzeIntentConflicts } = require('../lib/intent-intelligence');
const { runRelease } = require('./release');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = {
    sub: null,
    intentId: null,
    mode: 'quick',
    changeType: 'docs',
    yes: false,
    json: false,
    release: false,
  };

  const rest = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
    if (arg === '--json') { options.json = true; continue; }
    if (arg === '--yes' || arg === '-y') { options.yes = true; continue; }
    if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length).trim();
      continue;
    }
    if (arg.startsWith('--change-type=')) {
      options.changeType = arg.slice('--change-type='.length).trim();
      continue;
    }
    if (arg === '--release') { options.release = true; continue; }
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    throw new Error(`Unknown intent option "${arg}". Run "kb intent help" for usage.`);
  }

  if (rest.length === 0) {
    throw new Error('kb intent requires a subcommand: create | status | list | cancel');
  }

  options.sub = rest[0];

  if (options.sub === 'create') {
    // Optional positional ID
    if (rest.length >= 2) {
      options.intentId = rest[1];
    }
    if (!VALID_MODES.has(options.mode)) {
      throw new Error(`kb intent create: invalid mode "${options.mode}". Supported: quick, full`);
    }
  } else if (options.sub === 'status') {
    if (rest.length >= 2) {
      options.intentId = rest[1];
    }
  } else if (options.sub === 'list') {
    // no positional args
  } else if (options.sub === 'cancel') {
    if (rest.length < 2) {
      throw new Error('kb intent cancel requires an intent ID.');
    }
    options.intentId = rest[1];
  } else if (options.sub === 'apply') {
    if (rest.length < 2) {
      throw new Error('kb intent apply requires an intent ID.');
    }
    options.intentId = rest[1];
    if (args && args.includes('--release')) options.release = true;
  } else if (options.sub === 'help') {
    // no-op here, handled in runIntent
  } else {
    throw new Error(`kb intent: unknown subcommand "${options.sub}". Supported: create, status, list, cancel, apply`);
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

  const wsPath = createIntentWorkspace(ctx.contentRoot, { intentId, mode, changeType });

  if (json) {
    console.log(JSON.stringify({
      command: 'kb intent create',
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
    console.log(`  3. Run "kb intent status ${intentId}" to review.`);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: status
// ---------------------------------------------------------------------------

function collectIntentStatus(ctx, intentId) {
  const meta = readIntentMeta(ctx.contentRoot, intentId);
  const staged = listStagedFiles(ctx.contentRoot, intentId);
  const pathIssues = validateStagedFilePaths(staged);
  const wsPath = intentWorkspacePath(ctx.contentRoot, intentId);
  const hasPlan = fs.existsSync(path.join(wsPath, 'plan.md'));
  const hasImpact = fs.existsSync(path.join(wsPath, 'impact.md'));
  const hasLesson = fs.existsSync(path.join(wsPath, 'lesson-candidate.md'));
  const hasApplyRecord = fs.existsSync(path.join(wsPath, 'apply-record.json'));

  const warnings = [];
  if (!meta.decision_summary || meta.decision_summary === '') {
    warnings.push('decision_summary is empty — fill it before applying.');
  }
  if (meta.mode === 'full' && !hasPlan) {
    warnings.push('plan.md missing — required for full mode.');
  }
  if (meta.mode === 'full' && !hasImpact) {
    warnings.push('impact.md missing — required for full mode.');
  }
  for (const issue of pathIssues) {
    warnings.push(`Staged file path issue: ${issue.file} — ${issue.issue}`);
  }

  return { meta, staged, hasPlan, hasImpact, hasLesson, hasApplyRecord, warnings };
}

async function runStatus(ctx, options) {
  const { json } = options;

  if (options.intentId) {
    // Single intent status
    const info = collectIntentStatus(ctx, options.intentId);

    if (json) {
      console.log(JSON.stringify({
        command: 'kb intent status',
        intent_id: options.intentId,
        mode: info.meta.mode,
        status: info.meta.status,
        staged_count: info.staged.length,
        staged: info.staged,
        plan: info.hasPlan,
        impact: info.hasImpact,
        lesson_candidate: info.hasLesson,
        apply_record: info.hasApplyRecord,
        warnings: info.warnings,
      }, null, 2));
    } else {
      console.log(`Intent: ${options.intentId}`);
      console.log(`Mode:   ${info.meta.mode}`);
      console.log(`Status: ${info.meta.status}`);
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
    return;
  }

  // No specific ID: show summary of all active intents
  const ids = listActiveIntentIds(ctx.contentRoot);
  if (json) {
    console.log(JSON.stringify({
      command: 'kb intent status',
      active_count: ids.length,
      active_intents: ids,
    }, null, 2));
  } else {
    if (ids.length === 0) {
      console.log('No active intents. Use "kb intent create" to start one.');
    } else {
      console.log(`Active intents (${ids.length}):`);
      for (const id of ids) {
        const info = collectIntentStatus(ctx, id);
        const warnMark = info.warnings.length > 0 ? ' [!]' : '';
        console.log(`  ${id} (${info.meta.mode}, ${info.staged.length} staged)${warnMark}`);
      }
      console.log('');
      console.log('Run "kb intent status <id>" for details on a specific intent.');
    }
  }
}

// ---------------------------------------------------------------------------
// Subcommand: list
// ---------------------------------------------------------------------------

async function runList(ctx, options) {
  const { json } = options;
  const ids = listActiveIntentIds(ctx.contentRoot);

  if (json) {
    console.log(JSON.stringify({
      command: 'kb intent list',
      active_count: ids.length,
      active_intents: ids,
    }, null, 2));
    return;
  }

  if (ids.length === 0) {
    console.log('No active intents.');
    return;
  }
  console.log(`Active intents (${ids.length}):`);
  for (const id of ids) {
    console.log(`  ${id}`);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: cancel
// ---------------------------------------------------------------------------

async function runCancel(ctx, options) {
  const { intentId, yes, json } = options;

  if (!yes && !json) {
    const ok = await confirmPrompt(`Cancel and delete intent "${intentId}"? This cannot be undone.`);
    if (!ok) {
      if (json) {
        console.log(JSON.stringify({ command: 'kb intent cancel', intent_id: intentId, status: 'aborted' }, null, 2));
      } else {
        console.log('kb intent cancel: aborted.');
      }
      return;
    }
  }

  const wsPath = cancelIntent(ctx.contentRoot, intentId);

  if (json) {
    console.log(JSON.stringify({
      command: 'kb intent cancel',
      intent_id: intentId,
      status: 'cancelled',
      removed_path: wsPath,
    }, null, 2));
  } else {
    console.log(`Intent "${intentId}" cancelled and workspace removed.`);
  }
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
      console.log('');
      console.log(`Conflict context: ${conflictSummary.conflict_count} potential overlap(s) with other active intents.`);
      for (const c of conflictSummary.conflicts.slice(0, 5)) {
        console.log(
          `  [${String(c.risk || '').toUpperCase()}] vs ${c.against_intent_id}` +
          `  (exact:${c.signals.exact_file_overlap}, dir:${c.signals.same_directory_overlap},` +
          ` domain:${c.signals.same_domain_overlap}, graph:${c.signals.graph_neighbor_overlap})`
        );
      }
      if (conflictSummary.high_risk_count > 0) {
        console.log('  WARNING: high-risk overlap detected; consider apply ordering or merge strategy.');
      }
    }
    if (release) console.log('  --release: release pipeline will run after apply.');
    console.log('');
  }

  if (!yes && !json) {
    const ok = await confirmPrompt('Confirm apply?');
    if (!ok) {
      console.log('kb intent apply: aborted.');
      return;
    }
  }

  // 3. Apply files (write staged → KB core)
  const applyResults = applyStagedFiles(ctx.contentRoot, intentId, staged);

  // 4. Build + write apply-record.json
  const appliedAt = new Date().toISOString();
  const record = buildApplyRecord({ meta, stagedFiles: staged, appliedAt });
  writeApplyRecord(ctx.contentRoot, intentId, record);

  // 5. Archive intent workspace (I3: timestamp suffix prevents collision)
  const archivePath = archiveIntent(ctx.contentRoot, intentId, appliedAt);

  if (json) {
    console.log(JSON.stringify({
      command: 'kb intent apply',
      intent_id: intentId,
      applied_files: applyResults,
      apply_record: record,
      conflict_summary: conflictSummary,
      archive_path: archivePath,
      status: 'applied',
    }, null, 2));
  } else {
    console.log(`Intent "${intentId}" applied.`);
    console.log(`  ${applyResults.filter((r) => r.op === 'new').length} new, ${applyResults.filter((r) => r.op === 'modified').length} modified.`);
    console.log(`  Archived to: ${archivePath}`);
  }

  // 6. --release: trigger AFTER apply (I4)
  if (release) {
    if (!json) console.log('\nRunning release pipeline...');
    runRelease({ args: ['run'], cwd });
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

  if (options.sub === 'create') {
    await runCreate(ctx, options, cwd);
  } else if (options.sub === 'status') {
    await runStatus(ctx, options);
  } else if (options.sub === 'list') {
    await runList(ctx, options);
  } else if (options.sub === 'cancel') {
    await runCancel(ctx, options);
  } else if (options.sub === 'apply') {
    await runApply(ctx, options, cwd);
  }
}

function printHelp() {
  console.log('kb intent — Intent workspace management');
  console.log('');
  console.log('Usage:');
  console.log('  kb intent create [<id>] [--mode=quick|full] [--change-type=<type>] [--yes] [--json]');
  console.log('  kb intent status [<id>] [--json]');
  console.log('  kb intent list [--json]');
  console.log('  kb intent apply <id> [--release] [--yes] [--json]');
  console.log('  kb intent cancel <id> [--yes] [--json]');
  console.log('');
  console.log('Subcommands:');
  console.log('  create  Create a new intent workspace.');
  console.log('          Suggests ID from current git branch; prompts to confirm or edit.');
  console.log('          --mode=quick|full     quick (default): low ceremony, no plan.md/impact.md required.');
  console.log('          --change-type=<type>  docs (default), feature, fix, refactor, governance.');
  console.log('          --yes                 Accept suggested ID and skip confirmation prompt.');
  console.log('  status  Show status of one or all active intents.');
  console.log('          With <id>: full detail including staged files and warnings.');
  console.log('          Without <id>: summary of all active intents.');
  console.log('  list    List active intent IDs.');
  console.log('  apply   Write staged files from proposed-changes/ to the KB content root.');
  console.log('          Builds apply-record.json, archives workspace, then optionally runs release.');
  console.log('          --release  Trigger release pipeline after apply (apply must complete first).');
  console.log('          --yes      Skip confirmation prompt.');
  console.log('  cancel  Delete an active intent workspace (irreversible).');
}

module.exports = {
  runIntent,
  runApply,
  parseArgs,
  printHelp,
};
