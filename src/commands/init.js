const fs = require('fs');
const path = require('path');

const { getGitMetadata } = require('../lib/git');
const { createInitialState, persistStateAndRender } = require('../lib/state');
const { copyTemplateContent, getTemplateVersion } = require('../lib/template');
const { resolveStoragePaths, validateMode } = require('../lib/storage');
const { generateAdapterFiles } = require('../lib/adapters');

function parseArgs(args) {
  const options = {
    mode: 'private-git',
    target: process.cwd(),
    brand: null,
    skipAdapters: false,
    installHooks: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === '--mode') {
      options.mode = args[index + 1];
      index += 1;
      continue;
    }

    if (current === '--target') {
      options.target = args[index + 1];
      index += 1;
      continue;
    }

    if (current === '--brand') {
      options.brand = args[index + 1];
      index += 1;
      continue;
    }

    if (current === '--skip-adapters') {
      options.skipAdapters = true;
      continue;
    }

    if (current === '--install-hooks') {
      options.installHooks = true;
      continue;
    }

    throw new Error(`Unknown init option \"${current}\".`);
  }

  validateMode(options.mode);
  return options;
}

function installPreCommitHook({ workspaceRoot }) {
  const hookPath = path.join(workspaceRoot, '.git', 'hooks', 'pre-commit');
  if (fs.existsSync(hookPath)) {
    console.log('\nPre-commit hook already exists (skipped): .git/hooks/pre-commit');
    return;
  }

  const hookContent = `#!/bin/sh
# KB doc-gate: run kb doctor before every commit.
# Installed by: kb init --install-hooks
kb doctor --strict
`;

  fs.mkdirSync(path.dirname(hookPath), { recursive: true });
  fs.writeFileSync(hookPath, hookContent, { encoding: 'utf8', mode: 0o755 });
  console.log('\nPre-commit hook installed: .git/hooks/pre-commit');
}

async function runInit({ args, packageJson, cwd, repoRoot }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd, options.target);
  const storagePaths = resolveStoragePaths({ workspaceRoot, mode: options.mode });

  if (!fs.existsSync(workspaceRoot)) {
    throw new Error(`Target workspace does not exist: ${workspaceRoot}`);
  }

  if (fs.existsSync(storagePaths.contentRoot) && fs.readdirSync(storagePaths.contentRoot).length > 0) {
    throw new Error(`Target KB content already exists: ${storagePaths.contentRoot}`);
  }

  fs.mkdirSync(storagePaths.contentRoot, { recursive: true });
  copyTemplateContent({ sourceRoot: repoRoot, destinationRoot: storagePaths.contentRoot });

  const gitMetadata = getGitMetadata(workspaceRoot);
  const templateVersion = getTemplateVersion({ repoRoot });
  const brandScope = options.brand || path.basename(workspaceRoot);

  const state = createInitialState({
    packageVersion: packageJson.version,
    templateVersion,
    mode: options.mode,
    workspaceRoot,
    brandScope,
    gitMetadata,
    storagePaths,
  });

  persistStateAndRender({
    statePath: storagePaths.statePath,
    renderedRevisionStatePath: storagePaths.renderedRevisionStatePath,
    state,
  });

  console.log(`Initialized KB in ${storagePaths.contentRoot}`);
  console.log(`Storage mode: ${options.mode}`);
  console.log(`State file: ${storagePaths.statePath}`);
  console.log(`Rendered revision state: ${storagePaths.renderedRevisionStatePath}`);

  if (!options.skipAdapters) {
    const adapterResult = generateAdapterFiles({ workspaceRoot, visibleMountPath: storagePaths.visibleMountPath });
    if (adapterResult.created.length > 0) {
      console.log(`\nAI adapter files created:`);
      for (const f of adapterResult.created) {
        console.log(`  + ${f}`);
      }
    }

    if (adapterResult.skipped.length > 0) {
      console.log(`\nAI adapter files already exist (skipped):`);
      for (const f of adapterResult.skipped) {
        console.log(`  ~ ${f}`);
      }
    }
  }

  if (options.installHooks) {
    installPreCommitHook({ workspaceRoot });
  }
}

module.exports = {
  runInit,
};