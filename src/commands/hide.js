const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { readStateFile } = require('../lib/state');

function runHide({ args, cwd }) {
  if (args && args.length > 0) {
    throw new Error(`Unknown hide option \"${args[0]}\".`);
  }

  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const state = readStateFile({ statePath: context.statePath });

  if (state.storageMode !== 'private-git') {
    throw new Error('hide is only available in private-git mode. Tracked mode stores KB directly in knowledge-base/.');
  }

  if (!fs.existsSync(context.visibleMountPath)) {
    console.log(`hide: no visible mount found at ${context.visibleMountPath}`);
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
}

module.exports = {
  runHide,
};