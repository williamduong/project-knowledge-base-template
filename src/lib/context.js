const fs = require('fs');
const path = require('path');

function resolveExistingState({ workspaceRoot }) {
  const privateStatePath = path.join(workspaceRoot, '.git', 'project-kb', 'state.json');
  const trackedStatePath = path.join(workspaceRoot, 'knowledge-base', '.kb', 'state.json');

  if (fs.existsSync(privateStatePath)) {
    return {
      mode: 'private-git',
      statePath: privateStatePath,
      contentRoot: path.join(workspaceRoot, '.git', 'project-kb', 'content'),
      renderedRevisionStatePath: path.join(
        workspaceRoot,
        '.git',
        'project-kb',
        'content',
        '00-start-here',
        'repository-revision-state.md'
      ),
      visibleMountPath: path.join(workspaceRoot, 'knowledge-base'),
    };
  }

  if (fs.existsSync(trackedStatePath)) {
    return {
      mode: 'tracked',
      statePath: trackedStatePath,
      contentRoot: path.join(workspaceRoot, 'knowledge-base'),
      renderedRevisionStatePath: path.join(workspaceRoot, 'knowledge-base', '00-start-here', 'repository-revision-state.md'),
      visibleMountPath: path.join(workspaceRoot, 'knowledge-base'),
    };
  }

  throw new Error(
    `No KB state found in workspace. Run "kb init" first. Checked paths:\n- ${privateStatePath}\n- ${trackedStatePath}`
  );
}

module.exports = {
  resolveExistingState,
};