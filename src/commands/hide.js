const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { persistStateAndRender, readStateFile } = require('../lib/state');

function parseArgs(args) {
  const options = {
    restoreBackup: false,
  };

  for (const current of args || []) {
    if (current === '--restore-backup') {
      options.restoreBackup = true;
      continue;
    }

    throw new Error(`Unknown hide option \"${current}\".`);
  }

  return options;
}

function runHide({ args, cwd }) {
  const options = parseArgs(args);

  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const state = readStateFile({ statePath: context.statePath });

  if (state.storageMode !== 'private-git') {
    throw new Error('hide is only available in private-git mode. Tracked mode stores KB directly in knowledge-base/.');
  }

  if (!fs.existsSync(context.visibleMountPath)) {
    console.log(`hide: no visible mount found at ${context.visibleMountPath}`);

    if (options.restoreBackup && state.lastShowBackupPath && fs.existsSync(state.lastShowBackupPath)) {
      fs.renameSync(state.lastShowBackupPath, context.visibleMountPath);
      console.log(`hide: restored backup ${state.lastShowBackupPath} -> ${context.visibleMountPath}`);
      state.lastShowBackupPath = null;

      persistStateAndRender({
        statePath: context.statePath,
        renderedRevisionStatePath: context.renderedRevisionStatePath,
        state,
      });
    }

    return;
  }

  const mountInfo = fs.lstatSync(context.visibleMountPath);
  if (!mountInfo.isSymbolicLink()) {
    throw new Error(
      `Visible mount path is not a link: ${context.visibleMountPath}. Refusing to remove non-link directory.`
    );
  }

  fs.rmSync(context.visibleMountPath, { recursive: true, force: true });
  console.log(`hide: removed visible mount ${context.visibleMountPath}`);

  if (options.restoreBackup && state.lastShowBackupPath && fs.existsSync(state.lastShowBackupPath)) {
    fs.renameSync(state.lastShowBackupPath, context.visibleMountPath);
    console.log(`hide: restored backup ${state.lastShowBackupPath} -> ${context.visibleMountPath}`);
    state.lastShowBackupPath = null;

    persistStateAndRender({
      statePath: context.statePath,
      renderedRevisionStatePath: context.renderedRevisionStatePath,
      state,
    });
  }
}

module.exports = {
  runHide,
};