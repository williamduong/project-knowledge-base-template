const { execSync } = require('child_process');

function runGitCommand(command, cwd) {
  try {
    return execSync(command, {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

function getGitMetadata(workspaceRoot) {
  const head = runGitCommand('git rev-parse HEAD', workspaceRoot);
  const branch = runGitCommand('git branch --show-current', workspaceRoot);
  const originUrl = runGitCommand('git config --get remote.origin.url', workspaceRoot);

  return {
    isGitRepo: Boolean(head),
    head,
    branch,
    originUrl,
  };
}

module.exports = {
  getGitMetadata,
};