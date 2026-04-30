const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { getGitMetadata } = require('../lib/git');
const { createInitialState, persistStateAndRender, readStateFile } = require('../lib/state');
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
    yes: false,
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

    if (current === '--yes') {
      options.yes = true;
      continue;
    }

    throw new Error(`Unknown init option \"${current}\".`);
  }

  if (options.mode) {
    validateMode(options.mode);
  }
  return options;
}

async function askConfirmation({ question }) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Init rerun requires interactive confirmation. Re-run with --yes to continue in non-interactive mode.');
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await new Promise((resolve) => {
      rl.question(question, (value) => resolve(String(value || '')));
    });

    return ['y', 'yes'].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
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
  const templatePlanPromptPath = path.join(repoRoot, 'template', '.github', 'prompts', 'kb-plan.prompt.md');
  const templateRunPromptPath = path.join(repoRoot, 'template', '.github', 'prompts', 'kb-run.prompt.md');

  const agentDestPath = path.join(workspaceRoot, '.github', 'agents', 'kb.agent.md');
  const planPromptDestPath = path.join(workspaceRoot, '.github', 'prompts', 'kb-plan.prompt.md');
  const runPromptDestPath = path.join(workspaceRoot, '.github', 'prompts', 'kb-run.prompt.md');

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
  if (fs.existsSync(templatePlanPromptPath)) {
    copyIfMissing(templatePlanPromptPath, planPromptDestPath);
  }
  if (fs.existsSync(templateRunPromptPath)) {
    copyIfMissing(templateRunPromptPath, runPromptDestPath);
  }

  return created;
}

function printHandoffPrompt({ workspaceRoot, visibleMountPath, detectedIDE }) {
  const adapterFile = detectedIDE === 'vscode' ? 'AGENTS.md' : (detectedIDE.charAt(0).toUpperCase() + detectedIDE.slice(1) + ' adapter');
  console.log('');
  console.log(`IDE: ${detectedIDE} (adapter: ${adapterFile})`);
  console.log('Next: /kb-plan, /kb-run, or @kb <question>  |  Verify: kb status');
}

async function runInit({ args, packageJson, cwd, repoRoot }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd, options.target);
  const modeProvided = Boolean(options.mode);

  // Auto-detect mode if not provided
  if (!options.mode) {
    options.mode = autoDetectMode({ workspaceRoot });
  }

  if (!modeProvided && options.mode === 'tracked') {
    console.log('Warning: no .git directory detected. Defaulting to tracked mode.');
    console.log('Tip: run "git init" first if you want private-git mode.');
  }

  const storagePaths = resolveStoragePaths({ workspaceRoot, mode: options.mode });

  if (!fs.existsSync(workspaceRoot)) {
    throw new Error(`Target workspace does not exist: ${workspaceRoot}`);
  }

  const contentExists = fs.existsSync(storagePaths.contentRoot) && fs.readdirSync(storagePaths.contentRoot).length > 0;
  const isRerun = contentExists;

  if (isRerun && !options.yes) {
    const confirmed = await askConfirmation({
      question: `KB content already exists at ${storagePaths.contentRoot}. Re-run init in refresh mode? [y/N]: `,
    });

    if (!confirmed) {
      throw new Error('Init cancelled by user. No changes were made.');
    }
  }

  if (!isRerun) {
    fs.mkdirSync(storagePaths.contentRoot, { recursive: true });
    copyTemplateContent({ sourceRoot: repoRoot, destinationRoot: storagePaths.contentRoot });

    // Keep Copilot agent/prompt files only at workspace root to avoid duplicate
    // @agent and /prompt entries from nested knowledge-base/.github.
    const nestedGithubPath = path.join(storagePaths.contentRoot, '.github');
    if (fs.existsSync(nestedGithubPath)) {
      fs.rmSync(nestedGithubPath, { recursive: true, force: true });
    }
  } else {
    console.log('KB content already exists. Running init in refresh mode (no template copy).');
  }

  const gitMetadata = getGitMetadata(workspaceRoot);
  const templateVersion = getTemplateVersion({ repoRoot });
  const brandScope = options.brand || path.basename(workspaceRoot);

  let state;
  if (isRerun && fs.existsSync(storagePaths.statePath)) {
    state = readStateFile({ statePath: storagePaths.statePath });
    state.cliVersion = packageJson.version;
    state.templateVersion = templateVersion;
    state.lastReconciledTemplateVersion = templateVersion;
    state.storageMode = options.mode;
    state.workspaceRoot = workspaceRoot;
    state.contentRoot = storagePaths.contentRoot;
    state.visibleMountPath = storagePaths.visibleMountPath;
    state.brandScope = options.brand || state.brandScope || brandScope;
    state.notes = 'Initialized by kb init refresh mode; existing KB content was preserved.';
  } else {
    state = createInitialState({
      packageVersion: packageJson.version,
      templateVersion,
      mode: options.mode,
      workspaceRoot,
      brandScope,
      gitMetadata,
      storagePaths,
    });
  }

  persistStateAndRender({
    statePath: storagePaths.statePath,
    renderedRevisionStatePath: storagePaths.renderedRevisionStatePath,
    state,
  });

  console.log(`Initialized KB (${options.mode}) in ${storagePaths.contentRoot}`);
  console.log(`State: ${storagePaths.statePath}`);
  if (options.mode === 'private-git') {
    console.log('Note: state.json lives under .git/ and is hidden from IDE file_search; use `kb status` to inspect.');
  }

  // Create agent and prompt template files
  const agentFiles = createAgentAndPromptFiles({ workspaceRoot, repoRoot });
  if (agentFiles.length > 0) {
    console.log(`Agent + prompts: ${agentFiles.join(', ')}`);
  }

  if (!options.skipAdapters) {
    // Detect IDE and generate appropriate adapter
    const ide = detectIDE();
    const adapterResult = generateAdapterFiles({ workspaceRoot, visibleMountPath: storagePaths.visibleMountPath, ideOverride: ide });
    if (adapterResult.created.length > 0) {
      console.log(`Adapter (${ide}): ${adapterResult.created.join(', ')}`);
    }

    if (adapterResult.skipped.length > 0) {
      console.log(`Adapter skipped (already exists): ${adapterResult.skipped.join(', ')}`);
    }
  }

  if (options.installHooks) {
    installPreCommitHook({ workspaceRoot });
  }

  // Run bootstrap and index silently (set env var to suppress verbose output)
  // In rerun mode we skip these steps by default to avoid modifying existing KB content.
  const isInitSilent = process.env.KB_INIT_SILENT !== 'false';
  const runBootstrapStep = !isRerun && !options.skipBootstrap;
  const runIndexStep = !isRerun && !options.skipIndex;

  if (isRerun && (!options.skipBootstrap || !options.skipIndex)) {
    console.log('Refresh mode: bootstrap/index were skipped to avoid unintended content changes.');
    console.log('Use "kb maintain" for routine refresh checks.');
  }

  if (runBootstrapStep) {
    if (isInitSilent) {
      process.env.KB_INIT_SILENT = 'true';
      await runBootstrap({ args: [], cwd: workspaceRoot });
      delete process.env.KB_INIT_SILENT;
    } else {
      console.log('\nRunning initial bootstrap to replace obvious placeholders...');
      await runBootstrap({ args: [], cwd: workspaceRoot });
    }
  }

  if (runIndexStep) {
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