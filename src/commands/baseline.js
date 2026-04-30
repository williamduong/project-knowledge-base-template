'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { resolveExistingState } = require('../lib/context');
const { getGitMetadata } = require('../lib/git');
const { readStateFile } = require('../lib/state');

function parseArgs(args) {
  const options = { sub: null, sha: null, toHead: false, yes: false, json: false };
  const rest = [];
  for (const arg of args || []) {
    if (arg === '--to-head') { options.toHead = true; continue; }
    if (arg === '--yes' || arg === '-y') { options.yes = true; continue; }
    if (arg === '--json') { options.json = true; continue; }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown baseline option "${arg}". Supported: --to-head, --yes, --json`);
    }
    rest.push(arg);
  }
  if (rest.length === 0) {
    throw new Error('kb baseline requires a subcommand: show | set');
  }
  options.sub = rest[0];
  if (options.sub === 'set') {
    if (!options.toHead && rest.length < 2) {
      throw new Error('kb baseline set requires <sha> or --to-head');
    }
    if (!options.toHead) {
      options.sha = rest[1];
    }
  } else if (options.sub === 'show') {
    if (rest.length > 1) throw new Error('kb baseline show takes no arguments');
  } else {
    throw new Error(`kb baseline: unknown subcommand "${options.sub}". Supported: show, set`);
  }
  return options;
}

function showBaseline(ctx, options) {
  const state = readStateFile({ statePath: ctx.statePath });
  const out = {
    command: 'kb baseline show',
    storage_mode: ctx.mode,
    baseline: state.sourceRepositoryGitBaseline || null,
    baseline_captured_at: state.baselineCapturedAt || null,
    last_drift_check_at: state.lastDriftCheckAt || null,
    drift_status: state.driftStatus || null,
    branch: state.sourceDefaultBranch || null,
  };
  if (options.json) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  console.log(`kb baseline: ${out.baseline || 'NOT_AVAILABLE'}`);
  console.log(`  branch        : ${out.branch || 'unknown'}`);
  console.log(`  captured_at   : ${out.baseline_captured_at || 'unknown'}`);
  console.log(`  last_drift    : ${out.last_drift_check_at || 'unknown'}`);
  console.log(`  drift_status  : ${out.drift_status || 'unknown'}`);
  console.log(`  storage_mode  : ${out.storage_mode}`);
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

async function setBaseline(ctx, workspaceRoot, options) {
  let targetSha = options.sha;
  if (options.toHead) {
    const git = getGitMetadata(workspaceRoot);
    if (!git.head) {
      throw new Error('kb baseline set --to-head: no git HEAD available.');
    }
    targetSha = git.head;
  }
  if (!targetSha) {
    throw new Error('kb baseline set: target SHA missing.');
  }

  const state = readStateFile({ statePath: ctx.statePath });
  const previous = state.sourceRepositoryGitBaseline || null;
  const today = new Date().toISOString().slice(0, 10);

  if (!options.yes && !options.json) {
    const ok = await confirmPrompt(
      `kb baseline set: change baseline ${previous || 'NOT_AVAILABLE'} → ${targetSha}?`
    );
    if (!ok) {
      console.log('kb baseline set: aborted.');
      process.exit(2);
    }
  }

  state.sourceRepositoryGitBaseline = targetSha;
  state.baselineCapturedAt = today;
  state.lastDriftCheckAt = today;
  state.driftStatus = 'aligned';

  fs.mkdirSync(path.dirname(ctx.statePath), { recursive: true });
  fs.writeFileSync(ctx.statePath, JSON.stringify(state, null, 2), 'utf8');

  const out = {
    command: 'kb baseline set',
    previous,
    new: targetSha,
    captured_at: today,
    state_path: ctx.statePath,
  };
  if (options.json) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  console.log(`kb baseline set: ${previous || 'NOT_AVAILABLE'} → ${targetSha}`);
  console.log(`  captured_at: ${today}`);
  console.log(`  state_path : ${ctx.statePath}`);
}

async function runBaseline({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const ctx = resolveExistingState({ workspaceRoot });
  if (options.sub === 'show') {
    showBaseline(ctx, options);
    return;
  }
  if (options.sub === 'set') {
    await setBaseline(ctx, workspaceRoot, options);
  }
}

module.exports = {
  runBaseline,
  parseArgs,
};
