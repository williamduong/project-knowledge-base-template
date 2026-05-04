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

function parseDiffNameStatus(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'string') {
    return [];
  }

  return rawOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      if (parts.length < 2) {
        return null;
      }

      const rawStatus = parts[0];
      // Status code is first letter (M/A/D/R/C/T/U). Rename/copy carry similarity score (e.g. R100).
      const status = rawStatus.charAt(0).toUpperCase();
      const isRenameOrCopy = status === 'R' || status === 'C';

      if (isRenameOrCopy && parts.length >= 3) {
        return {
          status,
          path: parts[2].replace(/\\/g, '/'),
          oldPath: parts[1].replace(/\\/g, '/'),
        };
      }

      return {
        status,
        path: parts[1].replace(/\\/g, '/'),
      };
    })
    .filter(Boolean);
}

function getChangedFilesSince(workspaceRoot, baseline, head = 'HEAD') {
  if (!baseline) {
    return [];
  }

  const raw = getGitDiffNameStatus(workspaceRoot, baseline, head);
  if (!raw) {
    return [];
  }

  return parseDiffNameStatus(raw);
}

function getWorkingTreeStatus(workspaceRoot) {
  const output = runGitCommand('git status --porcelain', workspaceRoot);
  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      raw: line,
      status: line.slice(0, 2).trim(),
      filePath: line.slice(3).trim().replace(/\\/g, '/'),
    }));
}

function isAncestor(workspaceRoot, ancestorSha, descendantSha = 'HEAD') {
  if (!ancestorSha || !descendantSha) {
    return false;
  }
  try {
    execSync(`git merge-base --is-ancestor ${ancestorSha} ${descendantSha}`, {
      cwd: workspaceRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getChangedFilesSince,
  getGitDiffNameStatus,
  getGitLogRange,
  getGitMetadata,
  getWorkingTreeStatus,
  isAncestor,
  parseDiffNameStatus,
  runGitCommand,
};