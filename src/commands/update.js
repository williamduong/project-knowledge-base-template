const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { getTemplateVersion } = require('../lib/template');
const { persistStateAndRender, readStateFile } = require('../lib/state');
const { performSync } = require('./sync');

function parseArgs(args) {
  const options = {
    acceptBaseline: false,
  };

  for (const current of args) {
    if (current === '--accept-baseline') {
      options.acceptBaseline = true;
      continue;
    }

    throw new Error(`Unknown update option \"${current}\".`);
  }

  return options;
}

function runUpdate({ args, cwd, repoRoot }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);

  const syncResult = performSync({ cwd: workspaceRoot, options });
  console.log(`update: sync status = ${syncResult.status}`);

  const context = resolveExistingState({ workspaceRoot });
  const state = readStateFile({ statePath: context.statePath });
  const latestTemplateVersion = getTemplateVersion({ repoRoot });

  if (state.templateVersion !== latestTemplateVersion) {
    const previousVersion = state.templateVersion;
    state.templateVersion = latestTemplateVersion;
    state.lastReconciledTemplateVersion = latestTemplateVersion;
    state.versionLineage = `${previousVersion} -> ${latestTemplateVersion}`;
    state.notes = `Template version refreshed during update (${previousVersion} -> ${latestTemplateVersion}).`;

    persistStateAndRender({
      statePath: context.statePath,
      renderedRevisionStatePath: context.renderedRevisionStatePath,
      state,
    });

    console.log(`update: template version updated ${previousVersion} -> ${latestTemplateVersion}`);
    return;
  }

  console.log(`update: template version already current (${state.templateVersion})`);
}

module.exports = {
  runUpdate,
};