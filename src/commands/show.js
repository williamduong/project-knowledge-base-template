const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { readStateFile } = require('../lib/state');

function runShow({ args, cwd }) {
  if (args && args.length > 0) {
    throw new Error(`Unknown show option \"${args[0]}\".`);
  }

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
      throw new Error(
        `Visible mount path already exists and is not a link: ${context.visibleMountPath}. Remove it manually first.`
      );
    }

    console.log(`show: mount already exists at ${context.visibleMountPath}`);
    return;
  }

  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(context.contentRoot, context.visibleMountPath, linkType);

  console.log(`show: mounted ${context.contentRoot} -> ${context.visibleMountPath}`);
}

module.exports = {
  runShow,
};