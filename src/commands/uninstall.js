const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');

function parseArgs(args) {
  const options = {
    keepAiFiles: false,
    removeHook: false,
    force: false,
  };

  for (const current of args || []) {
    if (current === '--keep-ai-files') {
      options.keepAiFiles = true;
      continue;
    }

    if (current === '--remove-hook') {
      options.removeHook = true;
      continue;
    }

    if (current === '--force') {
      options.force = true;
      continue;
    }

    throw new Error('Unknown uninstall option "' + current + '". Supported: --keep-ai-files, --remove-hook, --force');
  }

  return options;
}

function toWorkspaceRelative(targetPath, workspaceRoot) {
  const rel = path.relative(workspaceRoot, targetPath).replace(/\\/g, '/');
  return rel || '.';
}

function removePathIfExists(targetPath, removed, workspaceRoot) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
  removed.push(toWorkspaceRelative(targetPath, workspaceRoot));
}

function cleanupEmptyDir(dirPath, workspaceRoot, removed) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  if (!fs.lstatSync(dirPath).isDirectory()) {
    return;
  }

  if (fs.readdirSync(dirPath).length > 0) {
    return;
  }

  fs.rmdirSync(dirPath);
  removed.push(toWorkspaceRelative(dirPath, workspaceRoot));
}

function removeManagedPreCommitHook({ workspaceRoot, options, removed, warnings }) {
  const hookPath = path.join(workspaceRoot, '.git', 'hooks', 'pre-commit');
  if (!fs.existsSync(hookPath)) {
    return;
  }

  const content = fs.readFileSync(hookPath, 'utf8');
  const isKbManagedHook = content.includes('Installed by: kb init --install-hooks') || content.includes('kb doctor --strict');

  if (!isKbManagedHook) {
    warnings.push('Skipped .git/hooks/pre-commit (not recognized as kb-managed hook).');
    return;
  }

  if (!options.removeHook) {
    warnings.push('Kept .git/hooks/pre-commit. Re-run with --remove-hook to delete the kb-managed hook.');
    return;
  }

  fs.rmSync(hookPath, { force: true });
  removed.push('.git/hooks/pre-commit');
}

function removeGeneratedAiFiles({ workspaceRoot, removed }) {
  const files = [
    path.join(workspaceRoot, 'AGENTS.md'),
    path.join(workspaceRoot, 'CLAUDE.md'),
    path.join(workspaceRoot, '.windsurfrules'),
    path.join(workspaceRoot, '.clinerules'),
    path.join(workspaceRoot, '.cursor', 'rules', 'kb.mdc'),
    path.join(workspaceRoot, '.github', 'agents', 'kb.agent.md'),
    path.join(workspaceRoot, '.github', 'prompts', 'kb-build.prompt.md'),
    path.join(workspaceRoot, '.github', 'prompts', 'kb-maintain.prompt.md'),
  ];

  for (const filePath of files) {
    removePathIfExists(filePath, removed, workspaceRoot);
  }

  cleanupEmptyDir(path.join(workspaceRoot, '.cursor', 'rules'), workspaceRoot, removed);
  cleanupEmptyDir(path.join(workspaceRoot, '.cursor'), workspaceRoot, removed);
  cleanupEmptyDir(path.join(workspaceRoot, '.github', 'agents'), workspaceRoot, removed);
  cleanupEmptyDir(path.join(workspaceRoot, '.github', 'prompts'), workspaceRoot, removed);
  cleanupEmptyDir(path.join(workspaceRoot, '.github'), workspaceRoot, removed);
}

function removeKbContent({ workspaceRoot, context, options, removed, warnings }) {
  if (context.mode === 'tracked') {
    removePathIfExists(context.contentRoot, removed, workspaceRoot);
    return;
  }

  if (fs.existsSync(context.visibleMountPath)) {
    const mountInfo = fs.lstatSync(context.visibleMountPath);
    if (mountInfo.isSymbolicLink()) {
      fs.rmSync(context.visibleMountPath, { recursive: true, force: true });
      removed.push(toWorkspaceRelative(context.visibleMountPath, workspaceRoot));
    } else if (options.force) {
      fs.rmSync(context.visibleMountPath, { recursive: true, force: true });
      removed.push(toWorkspaceRelative(context.visibleMountPath, workspaceRoot));
    } else {
      warnings.push(
        'Skipped knowledge-base because it is not a link in private-git mode. Re-run with --force if you want to delete it.'
      );
    }
  }

  const privateKbRoot = path.join(workspaceRoot, '.git', 'project-kb');
  removePathIfExists(privateKbRoot, removed, workspaceRoot);
}

function runUninstall({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);

  const removed = [];
  const warnings = [];

  let context = null;
  try {
    context = resolveExistingState({ workspaceRoot });
  } catch {
    warnings.push('No KB state found. Attempting to remove only generated AI helper files.');
  }

  if (context) {
    removeKbContent({ workspaceRoot, context, options, removed, warnings });
  }

  if (!options.keepAiFiles) {
    removeGeneratedAiFiles({ workspaceRoot, removed });
  }

  removeManagedPreCommitHook({ workspaceRoot, options, removed, warnings });

  console.log('kb uninstall summary:');
  if (removed.length === 0) {
    console.log('- No files removed.');
  } else {
    console.log('- Removed:');
    for (const item of removed) {
      console.log('  + ' + item);
    }
  }

  if (warnings.length > 0) {
    console.log('- Notes:');
    for (const note of warnings) {
      console.log('  ~ ' + note);
    }
  }
}

module.exports = {
  runUninstall,
};