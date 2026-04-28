const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { persistStateAndRender, readStateFile } = require('../lib/state');

function parseArgs(args) {
  const options = {
    backupExisting: false,
  };

  for (const current of args || []) {
    if (current === '--backup-existing') {
      options.backupExisting = true;
      continue;
    }

    throw new Error(`Unknown show option \"${current}\".`);
  }

  return options;
}

function runShow({ args, cwd }) {
  const options = parseArgs(args);

  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const state = readStateFile({ statePath: context.statePath });

  if (state.storageMode !== 'private-git') {
    console.log('show: tracked mode keeps KB visible at knowledge-base/. No mount action required.');
    return;
  }

  if (!fs.existsSync(context.contentRoot)) {
    throw new Error(`KB content root not found: ${context.contentRoot}`);
  }

  if (fs.existsSync(context.visibleMountPath)) {
    const mountInfo = fs.lstatSync(context.visibleMountPath);
    if (!mountInfo.isSymbolicLink()) {
      if (!options.backupExisting) {
        throw new Error(
          `Visible mount path already exists and is not a link: ${context.visibleMountPath}. Use --backup-existing to move it aside safely.`
        );
      }

      const backupPath = `${context.visibleMountPath}.kb-backup-${Date.now()}`;
      fs.renameSync(context.visibleMountPath, backupPath);
      state.lastShowBackupPath = backupPath;

      persistStateAndRender({
        statePath: context.statePath,
        renderedRevisionStatePath: context.renderedRevisionStatePath,
        state,
      });

      console.log(`show: existing directory moved to backup ${backupPath}`);
    } else {
      console.log(`show: mount already exists at ${context.visibleMountPath}`);
      return;
    }
  }

  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(context.contentRoot, context.visibleMountPath, linkType);

  console.log(`show: mounted ${context.contentRoot} -> ${context.visibleMountPath}`);
}

module.exports = {
  runShow,
};