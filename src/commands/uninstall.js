const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { readStateFile } = require('../lib/state');
const { resolveProject } = require('../lib/project-resolver');

const KB_MANAGED_BLOCK_RE = /[\r\n]?<!--\s*KB-MANAGED:START\s*-->[\s\S]*?<!--\s*KB-MANAGED:END\s*-->[\r\n]?/g;

const USER_OWNED_IDE_FILES = [
  ['.github', 'copilot-instructions.md'],
  ['.cursorrules'],
];

function parseArgs(args) {
  const options = {
    keepAiFiles: false,
    removeHook: false,
    force: false,
    projectId: null,
  };

  for (let i = 0; i < (args || []).length; i++) {
    const current = args[i];
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

    if (current === '--project' && args[i + 1]) {
      options.projectId = args[++i];
      continue;
    }

    throw new Error('Unknown uninstall option "' + current + '". Supported: --keep-ai-files, --remove-hook, --force, --project <id>');
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
  const isKbManagedHook = content.includes('Installed by: kbx init --install-hooks') || content.includes('kbx doctor --strict');

  if (!isKbManagedHook) {
    warnings.push('Skipped .git/hooks/pre-commit (not recognized as kb-managed hook).');
    return;
  }

  if (!options.removeHook) {
    warnings.push('Kept .git/hooks/pre-commit. Re-run with --remove-hook to delete the kbx-managed hook.');
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
    path.join(workspaceRoot, '.cursor', 'rules', 'kbx.mdc'),
    path.join(workspaceRoot, '.github', 'agents', 'kbx.agent.md'),
    path.join(workspaceRoot, '.github', 'prompts', 'kbx-plan.prompt.md'),
    path.join(workspaceRoot, '.github', 'prompts', 'kbx-run.prompt.md'),
    path.join(workspaceRoot, '.github', 'prompts', 'kbx-ask.prompt.md'),
    path.join(workspaceRoot, '.github', 'hooks', 'revision-state-guard.json'),
  ];

  for (const filePath of files) {
    removePathIfExists(filePath, removed, workspaceRoot);
  }

  cleanupEmptyDir(path.join(workspaceRoot, '.cursor', 'rules'), workspaceRoot, removed);
  cleanupEmptyDir(path.join(workspaceRoot, '.cursor'), workspaceRoot, removed);
  cleanupEmptyDir(path.join(workspaceRoot, '.github', 'agents'), workspaceRoot, removed);
  cleanupEmptyDir(path.join(workspaceRoot, '.github', 'prompts'), workspaceRoot, removed);
  cleanupEmptyDir(path.join(workspaceRoot, '.github', 'hooks'), workspaceRoot, removed);
  cleanupEmptyDir(path.join(workspaceRoot, '.github'), workspaceRoot, removed);
}

function stripKbManagedBlocks({ workspaceRoot, state, removed, warnings }) {
  const candidatePaths = new Set();

  if (state && state.ideIntegration && Array.isArray(state.ideIntegration.targets)) {
    for (const target of state.ideIntegration.targets) {
      if (target && typeof target.file === 'string' && target.file) {
        candidatePaths.add(path.resolve(workspaceRoot, target.file));
      }
    }
  }

  for (const segments of USER_OWNED_IDE_FILES) {
    candidatePaths.add(path.join(workspaceRoot, ...segments));
  }

  for (const filePath of candidatePaths) {
    if (!fs.existsSync(filePath)) continue;
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      warnings.push(`Could not read ${toWorkspaceRelative(filePath, workspaceRoot)} to strip KB-MANAGED block: ${err.message}`);
      continue;
    }
    if (!KB_MANAGED_BLOCK_RE.test(content)) continue;
    KB_MANAGED_BLOCK_RE.lastIndex = 0;
    const cleaned = content.replace(KB_MANAGED_BLOCK_RE, '\n').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '') + '\n';
    try {
      fs.writeFileSync(filePath, cleaned, 'utf8');
      removed.push(`${toWorkspaceRelative(filePath, workspaceRoot)} (KB-MANAGED block)`);
    } catch (err) {
      warnings.push(`Could not write ${toWorkspaceRelative(filePath, workspaceRoot)} after stripping KB-MANAGED block: ${err.message}`);
    }
  }
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
  let workspaceRoot = path.resolve(cwd);

  // Mutation guard: throws ERR_PROJECT_AMBIGUOUS if multiple projects with no selector.
  const resolution = resolveProject({ projectId: options.projectId, cwd: workspaceRoot, workspaceRoot });
  if (resolution && resolution.type === 'project' && options.projectId) {
    workspaceRoot = resolution.project.repo_root;
  }

  const removed = [];
  const warnings = [];

  let context = null;
  let state = null;
  try {
    context = resolveExistingState({ workspaceRoot });
  } catch {
    warnings.push('No KB state found. Attempting to remove only generated AI helper files.');
  }

  if (context) {
    try {
      state = readStateFile({ statePath: context.statePath });
    } catch (err) {
      warnings.push(`Could not read state file: ${err.message}`);
    }
    removeKbContent({ workspaceRoot, context, options, removed, warnings });
  } else {
    // Fallback: state is missing/invalid but KB content directories may still exist.
    // Without state we cannot know storageMode; scan the two well-known candidates.
    const trackedKb = path.join(workspaceRoot, 'knowledge-base');
    const privateKb = path.join(workspaceRoot, '.git', 'project-kb');

    if (fs.existsSync(trackedKb)) {
      const stat = fs.lstatSync(trackedKb);
      if (stat.isSymbolicLink() || options.force) {
        removePathIfExists(trackedKb, removed, workspaceRoot);
      } else {
        warnings.push('Found knowledge-base/ but cannot determine storage mode (state.json missing). Re-run with --force to delete it.');
      }
    }

    if (fs.existsSync(privateKb)) {
      removePathIfExists(privateKb, removed, workspaceRoot);
    }
  }

  stripKbManagedBlocks({ workspaceRoot, state, removed, warnings });

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