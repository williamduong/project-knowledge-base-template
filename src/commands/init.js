const fs = require('fs');
const path = require('path');

const { getGitMetadata } = require('../lib/git');
const { createInitialState, renderRevisionStateMarkdown, writeStateFile } = require('../lib/state');
const { copyTemplateContent, getTemplateVersion } = require('../lib/template');
const { resolveStoragePaths, validateMode } = require('../lib/storage');

function parseArgs(args) {
  const options = {
    mode: 'private-git',
    target: process.cwd(),
    brand: null,
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

    throw new Error(`Unknown init option \"${current}\".`);
  }

  validateMode(options.mode);
  return options;
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

  writeStateFile({ statePath: storagePaths.statePath, state });

  const markdown = renderRevisionStateMarkdown(state);
  fs.mkdirSync(path.dirname(storagePaths.renderedRevisionStatePath), { recursive: true });
  fs.writeFileSync(storagePaths.renderedRevisionStatePath, markdown, 'utf8');

  console.log(`Initialized KB in ${storagePaths.contentRoot}`);
  console.log(`Storage mode: ${options.mode}`);
  console.log(`State file: ${storagePaths.statePath}`);
  console.log(`Rendered revision state: ${storagePaths.renderedRevisionStatePath}`);
}

module.exports = {
  runInit,
};