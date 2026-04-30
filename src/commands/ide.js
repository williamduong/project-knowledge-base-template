const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { readStateFile, persistStateAndRender } = require('../lib/state');
const { selectInjectionTargets, KB_AGENT_REF_PATH } = require('../lib/ide-detect');
const { injectBlock, removeBlock } = require('../lib/ide-inject');

function parseArgs(args) {
  const options = {
    action: null,
    json: false,
    dryRun: false,
  };

  for (const arg of args || []) {
    if (!options.action && (arg === 'enable' || arg === 'disable')) {
      options.action = arg;
      continue;
    }

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    throw new Error(`Unknown ide option "${arg}".`);
  }

  if (!options.action) {
    throw new Error('Missing ide action. Use "kb ide enable" or "kb ide disable".');
  }

  if (options.action === 'disable' && options.dryRun) {
    throw new Error('Option --dry-run is only supported for "kb ide enable".');
  }

  return options;
}

function printEnableText({ targets, results, dryRun }) {
  if (dryRun) {
    console.log('kb ide enable (dry-run)');
    if (targets.length === 0) {
      console.log('No IDE target files detected.');
    } else {
      console.log('Targets that would be updated:');
      for (const target of targets) {
        console.log(`  - ${target.file}`);
      }
    }
    return;
  }

  if (targets.length === 0) {
    console.log('KB integration enabled. No IDE target files detected; state marked enabled with zero targets.');
    return;
  }

  console.log('KB integration enabled. Reference block injected into:');
  for (const result of results) {
    console.log(`  - ${result.file} (${result.action})`);
  }
  console.log('To disable later: run "kb ide disable".');
}

function printDisableText({ results }) {
  console.log('KB integration disabled.');
  if (results.length === 0) {
    console.log('No previously tracked target files to clean.');
    return;
  }

  console.log('Cleanup results:');
  for (const result of results) {
    console.log(`  - ${result.file} (${result.action})`);
  }
}

function runIde({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const state = readStateFile({ statePath: context.statePath });

  if (options.action === 'enable') {
    const targets = selectInjectionTargets({ workspaceRoot });
    const injectedAt = new Date().toISOString();

    const results = options.dryRun
      ? targets.map((target) => ({ file: target.file, action: 'dry-run' }))
      : targets.map((target) => injectBlock({
          workspaceRoot,
          relFile: target.file,
          refPath: KB_AGENT_REF_PATH,
        }));

    if (!options.dryRun) {
      state.ideIntegration = {
        enabled: true,
        targets: targets.map((target) => ({ file: target.file, injectedAt })),
      };

      persistStateAndRender({
        statePath: context.statePath,
        renderedRevisionStatePath: context.renderedRevisionStatePath,
        state,
      });
    }

    if (options.json) {
      console.log(JSON.stringify({
        command: 'kb ide enable',
        dryRun: options.dryRun,
        workspaceRoot,
        enabled: true,
        targets: state.ideIntegration && Array.isArray(state.ideIntegration.targets)
          ? state.ideIntegration.targets
          : targets.map((target) => ({ file: target.file, injectedAt })),
        results,
      }, null, 2));
      return;
    }

    printEnableText({ targets, results, dryRun: options.dryRun });
    return;
  }

  const trackedTargets = state.ideIntegration && Array.isArray(state.ideIntegration.targets)
    ? state.ideIntegration.targets
    : [];

  const results = trackedTargets.map((target) => removeBlock({
    workspaceRoot,
    relFile: target.file,
  }));

  state.ideIntegration = {
    enabled: false,
    targets: [],
  };

  persistStateAndRender({
    statePath: context.statePath,
    renderedRevisionStatePath: context.renderedRevisionStatePath,
    state,
  });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kb ide disable',
      workspaceRoot,
      enabled: false,
      targets: [],
      results,
    }, null, 2));
    return;
  }

  printDisableText({ results });
}

module.exports = {
  runIde,
};
