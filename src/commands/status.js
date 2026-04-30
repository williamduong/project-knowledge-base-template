const fs = require('fs');
const path = require('path');

const { detectKbArtifacts } = require('../lib/kb-presence');
const { resolveExistingState } = require('../lib/context');
const { readStateFile } = require('../lib/state');

function parseArgs(args) {
  const options = { json: false };
  for (const arg of args || []) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    throw new Error(`Unknown status option "${arg}".`);
  }
  return options;
}

function relPath(target, root) {
  if (!target) return '';
  const rel = path.relative(root, target).replace(/\\/g, '/');
  return rel || '.';
}

function runStatus({ args, cwd, packageJson }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const artifacts = detectKbArtifacts(workspaceRoot);

  let context = null;
  let state = null;
  let stateError = null;
  try {
    context = resolveExistingState({ workspaceRoot });
  } catch (err) {
    stateError = err.message;
  }
  if (context) {
    try {
      state = readStateFile({ statePath: context.statePath });
    } catch (err) {
      stateError = `State file unreadable: ${err.message}`;
    }
  }

  const presence = artifacts.classification; // 'fresh' | 'healthy' | 'partial'

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kb status',
      cliVersion: packageJson && packageJson.version,
      workspaceRoot,
      presence,
      artifacts,
      state: state ? {
        schemaVersion: state.schemaVersion,
        cliVersion: state.cliVersion,
        templateVersion: state.templateVersion,
        storageMode: state.storageMode,
        brandScope: state.brandScope,
        metadataPolicy: state.metadataPolicy,
        ideIntegration: state.ideIntegration,
        driftStatus: state.driftStatus,
      } : null,
      stateError,
    }, null, 2));
    return;
  }

  console.log('kb status');
  console.log(`- workspace: ${workspaceRoot}`);
  console.log(`- presence : ${presence}`);
  console.log('- artifacts:');
  console.log(`    knowledge-base/                           : ${artifacts.kbDir ? 'yes' : 'no'}`);
  console.log(`    .github/agents/kb.agent.md                : ${artifacts.agentFile ? 'yes' : 'no'}`);
  console.log(`    .github/prompts/kb-plan|kb-run.prompt.md  : ${artifacts.promptFile ? 'yes' : 'no'}`);
  console.log(`    knowledge-base/.kb/state.json (or .git/project-kb): ${artifacts.stateFile ? 'yes' : 'no'}`);

  if (presence === 'partial') {
    console.log('');
    console.log('WARNING: KB state appears partial or corrupted.');
    console.log('Other KB artifacts exist but state.json is missing or invalid.');
    console.log('Do NOT run "kb init" — it would overwrite existing KB content.');
    console.log('Recover with one of:');
    console.log('  1. git checkout HEAD -- knowledge-base/.kb/state.json');
    console.log('  2. kb uninstall --force   then   kb init --yes   (clean reinstall)');
    return;
  }

  if (presence === 'fresh') {
    console.log('');
    console.log('No KB detected in this workspace. Run: kb init');
    return;
  }

  if (state) {
    console.log('- state:');
    console.log(`    schemaVersion   : ${state.schemaVersion}`);
    console.log(`    cliVersion      : ${state.cliVersion}`);
    console.log(`    templateVersion : ${state.templateVersion}`);
    console.log(`    storageMode     : ${state.storageMode}`);
    console.log(`    brandScope      : ${state.brandScope}`);
    console.log(`    metadataPolicy  : ${state.metadataPolicy}`);
    console.log(`    ideIntegration  : enabled=${state.ideIntegration && state.ideIntegration.enabled}, targets=${(state.ideIntegration && state.ideIntegration.targets || []).length}`);
    console.log(`    driftStatus     : ${state.driftStatus}`);
    if (context && context.contentRoot) {
      console.log(`    contentRoot     : ${relPath(context.contentRoot, workspaceRoot)}`);
    }
  } else if (stateError) {
    console.log(`- state error: ${stateError}`);
  }
}

module.exports = {
  runStatus,
};
