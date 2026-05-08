const fs = require('fs');
const path = require('path');

const { detectKbArtifacts } = require('./kb-presence');

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

  // Distinguish fresh vs partial-corrupted to give the user actionable guidance.
  const presence = detectKbArtifacts(workspaceRoot);
  if (presence.classification === 'partial') {
    const leftovers = [
      presence.kbDir ? 'knowledge-base/' : null,
      presence.agentFile ? '.github/agents/kbx.agent.md' : null,
      presence.promptFile ? '.github/prompts/kbx-*.prompt.md' : null,
      presence.agentsMd ? 'AGENTS.md' : null,
    ].filter(Boolean).join(', ');
    throw new Error(
      `KB state appears partial or corrupted: state.json missing or invalid, but other artifacts exist (${leftovers}).\n` +
      `Do NOT run "kbx init" — it would overwrite existing KB content.\n` +
      `Run "kbx status" for recovery guidance, or restore state.json from git:\n` +
      `  git checkout HEAD -- knowledge-base/.kb/state.json`
    );
  }

  throw new Error(
    `No KB state found in workspace. Run "kbx init" first. Checked paths:\n- ${privateStatePath}\n- ${trackedStatePath}`
  );
}

module.exports = {
  resolveExistingState,
};