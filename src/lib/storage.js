const path = require('path');
const fs = require('fs');

const MODES = new Set(['private-git', 'tracked']);

function validateMode(mode) {
  if (!MODES.has(mode)) {
    throw new Error(`Unsupported storage mode \"${mode}\". Supported modes: private-git, tracked.`);
  }
}

function resolveStoragePaths({ workspaceRoot, mode }) {
  validateMode(mode);

  if (mode === 'private-git') {
    const gitDir = path.join(workspaceRoot, '.git');
    if (!fs.existsSync(gitDir)) {
      throw new Error('private-git mode requires a git repository with a .git directory.');
    }

    return {
      statePath: path.join(gitDir, 'project-kb', 'state.json'),
      contentRoot: path.join(gitDir, 'project-kb', 'content'),
      renderedRevisionStatePath: path.join(gitDir, 'project-kb', 'content', '00-start-here', 'repository-revision-state.md'),
      visibleMountPath: path.join(workspaceRoot, 'knowledge-base'),
    };
  }

  return {
    statePath: path.join(workspaceRoot, 'knowledge-base', '.kb', 'state.json'),
    contentRoot: path.join(workspaceRoot, 'knowledge-base'),
    renderedRevisionStatePath: path.join(workspaceRoot, 'knowledge-base', '00-start-here', 'repository-revision-state.md'),
    visibleMountPath: path.join(workspaceRoot, 'knowledge-base'),
  };
}

module.exports = {
  resolveStoragePaths,
  validateMode,
};