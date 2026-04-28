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
  const isInsideWorkTree = runGitCommand('git rev-parse --is-inside-work-tree', workspaceRoot);
  const head = runGitCommand('git rev-parse HEAD', workspaceRoot);
  const branch = runGitCommand('git branch --show-current', workspaceRoot);
  const originUrl = runGitCommand('git config --get remote.origin.url', workspaceRoot);

  return {
    isGitRepo: isInsideWorkTree === 'true',
    head,
    branch,
    originUrl,
  };
}

function getGitLogRange(workspaceRoot, fromRevision, toRevision = 'HEAD') {
  if (!fromRevision) {
    return null;
  }

  return runGitCommand(`git log --stat ${fromRevision}..${toRevision}`, workspaceRoot);
}

function getGitDiffNameStatus(workspaceRoot, fromRevision, toRevision = 'HEAD') {
  if (!fromRevision) {
    return null;
  }

  return runGitCommand(`git diff --name-status ${fromRevision}..${toRevision}`, workspaceRoot);
}

module.exports = {
  getGitDiffNameStatus,
  getGitLogRange,
  getGitMetadata,
  runGitCommand,
};