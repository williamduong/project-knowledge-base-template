const fs = require('fs');
const path = require('path');

const { getGitMetadata } = require('../lib/git');
const { createInitialState, persistStateAndRender } = require('../lib/state');
const { copyTemplateContent, getTemplateVersion } = require('../lib/template');
const { resolveStoragePaths, validateMode } = require('../lib/storage');
const { generateAdapterFiles, detectIDE } = require('../lib/adapters');
const { runBootstrap } = require('./bootstrap');
const { runIndex } = require('./index');

function parseArgs(args) {
  const options = {
    mode: null, // Will be auto-detected if not provided
    target: process.cwd(),
    brand: null,
    skipAdapters: false,
    installHooks: false,
    skipBootstrap: false,
    skipIndex: false,
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

    if (current === '--skip-bootstrap') {
      options.skipBootstrap = true;
      continue;
    }

    if (current === '--skip-index') {
      options.skipIndex = true;
      continue;
    }

    throw new Error(`Unknown init option \"${current}\".`);
  }

  if (options.mode) {
    validateMode(options.mode);
  }
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

function autoDetectMode({ workspaceRoot }) {
  // Auto-detect mode based on git presence
  return fs.existsSync(path.join(workspaceRoot, '.git')) ? 'private-git' : 'tracked';
}

function createAgentAndPromptFiles({ workspaceRoot, repoRoot }) {
  const templateAgentPath = path.join(repoRoot, 'template', '.github', 'agents', 'kb.agent.md');
  const templateBuildPromptPath = path.join(repoRoot, 'template', '.github', 'prompts', 'kb-build.prompt.md');
  const templateMaintainPromptPath = path.join(repoRoot, 'template', '.github', 'prompts', 'kb-maintain.prompt.md');

  const agentDestPath = path.join(workspaceRoot, '.github', 'agents', 'kb.agent.md');
  const buildPromptDestPath = path.join(workspaceRoot, '.github', 'prompts', 'kb-build.prompt.md');
  const maintainPromptDestPath = path.join(workspaceRoot, '.github', 'prompts', 'kb-maintain.prompt.md');

  const created = [];

  function copyIfMissing(srcPath, dstPath) {
    if (fs.existsSync(dstPath)) {
      return;
    }

    fs.mkdirSync(path.dirname(dstPath), { recursive: true });
    const content = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(dstPath, content, 'utf8');
    created.push(path.relative(workspaceRoot, dstPath));
  }

  if (fs.existsSync(templateAgentPath)) {
    copyIfMissing(templateAgentPath, agentDestPath);
  }
  if (fs.existsSync(templateBuildPromptPath)) {
    copyIfMissing(templateBuildPromptPath, buildPromptDestPath);
  }
  if (fs.existsSync(templateMaintainPromptPath)) {
    copyIfMissing(templateMaintainPromptPath, maintainPromptDestPath);
  }

  return created;
}

function printHandoffPrompt({ workspaceRoot, visibleMountPath, detectedIDE }) {
  const buildPromptPath = path.join(workspaceRoot, '.github', 'prompts', 'kb-build.prompt.md');

  console.log('\n' + '='.repeat(70));
  console.log('Next Steps: Paste this into Copilot Chat to build your KB');
  console.log('='.repeat(70));
  console.log('');
  console.log('@kb Build Knowledge Base from Source');
  console.log('');
  console.log('---');
  console.log('(See detailed instructions in: ' + buildPromptPath + ')');
  console.log('');
  console.log('Optional: Use @kb with these maintenance prompts:');
  console.log('  @kb Maintain Knowledge Base (periodic sync + drift detection)');
  console.log('  (stored in: .github/prompts/kb-maintain.prompt.md)');
  console.log('');
  console.log('IDE detected: ' + detectedIDE);
  const adapterFile = detectedIDE === 'vscode' ? 'AGENTS.md' : (detectedIDE.charAt(0).toUpperCase() + detectedIDE.slice(1) + ' adapter');
  console.log('  AI adapter configured at: ' + adapterFile);
  console.log('='.repeat(70) + '\n');
}

async function runInit({ args, packageJson, cwd, repoRoot }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd, options.target);

  // Auto-detect mode if not provided
  if (!options.mode) {
    options.mode = autoDetectMode({ workspaceRoot });
  }

  const storagePaths = resolveStoragePaths({ workspaceRoot, mode: options.mode });

  if (!fs.existsSync(workspaceRoot)) {
    throw new Error(`Target workspace does not exist: ${workspaceRoot}`);
  }

  if (fs.existsSync(storagePaths.contentRoot) && fs.readdirSync(storagePaths.contentRoot).length > 0) {
    throw new Error(`Target KB content already exists: ${storagePaths.contentRoot}`);
  }

  fs.mkdirSync(storagePaths.contentRoot, { recursive: true });
  copyTemplateContent({ sourceRoot: repoRoot, destinationRoot: storagePaths.contentRoot });

  // Keep Copilot agent/prompt files only at workspace root to avoid duplicate
  // @agent and /prompt entries from nested knowledge-base/.github.
  const nestedGithubPath = path.join(storagePaths.contentRoot, '.github');
  if (fs.existsSync(nestedGithubPath)) {
    fs.rmSync(nestedGithubPath, { recursive: true, force: true });
  }

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

  // Create agent and prompt template files
  const agentFiles = createAgentAndPromptFiles({ workspaceRoot, repoRoot });
  if (agentFiles.length > 0) {
    console.log('\nAI agent & prompt files created:');
    for (const f of agentFiles) {
      console.log(`  + ${f}`);
    }
  }

  if (!options.skipAdapters) {
    // Detect IDE and generate appropriate adapter
    const ide = detectIDE();
    const adapterResult = generateAdapterFiles({ workspaceRoot, visibleMountPath: storagePaths.visibleMountPath, ideOverride: ide });
    if (adapterResult.created.length > 0) {
      console.log(`\nAI adapter files created (${ide}):`);
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

  // Run bootstrap and index silently (set env var to suppress verbose output)
  const isInitSilent = process.env.KB_INIT_SILENT !== 'false';
  if (!options.skipBootstrap) {
    if (isInitSilent) {
      process.env.KB_INIT_SILENT = 'true';
      await runBootstrap({ args: [], cwd: workspaceRoot });
      delete process.env.KB_INIT_SILENT;
    } else {
      console.log('\nRunning initial bootstrap to replace obvious placeholders...');
      await runBootstrap({ args: [], cwd: workspaceRoot });
    }
  }

  if (!options.skipIndex) {
    if (isInitSilent) {
      process.env.KB_INIT_SILENT = 'true';
      await runIndex({ args: [], cwd: workspaceRoot });
      delete process.env.KB_INIT_SILENT;
    } else {
      console.log('\nBuilding initial KB index summary...');
      await runIndex({ args: [], cwd: workspaceRoot });
    }
  }

  // Print handoff prompt for Copilot
  const detectedIDE = detectIDE();
  printHandoffPrompt({ workspaceRoot, visibleMountPath: storagePaths.visibleMountPath, detectedIDE });
}

module.exports = {
  runInit,
};