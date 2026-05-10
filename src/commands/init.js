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
const { discoverProjects } = require('../lib/project-resolver');

function parseArgs(args) {
  const options = {
    mode: null, // Will be auto-detected if not provided
    target: process.cwd(),
    brand: null,
    projectId: null,
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
    if (current === '--project') {
      options.projectId = args[index + 1];
      index += 1;
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
# KB doc-gate: run kbx doctor before every commit.
# Installed by: kbx init --install-hooks
kbx doctor --strict
`;

  fs.mkdirSync(path.dirname(hookPath), { recursive: true });
  fs.writeFileSync(hookPath, hookContent, { encoding: 'utf8', mode: 0o755 });
  console.log('\nPre-commit hook installed: .git/hooks/pre-commit');
}

function autoDetectMode({ workspaceRoot }) {
  // Auto-detect mode based on git presence
  return fs.existsSync(path.join(workspaceRoot, '.git')) ? 'private-git' : 'tracked';
}

function createAgentAndPromptFiles({ workspaceRoot, repoRoot, overwrite = false }) {
  const templateAgentPath = path.join(repoRoot, 'template', '.github', 'agents', 'kbx.agent.template.md');
  const templatePlanPromptPath = path.join(repoRoot, 'template', '.github', 'prompts', 'kbx-plan.prompt.template.md');
  const templateRunPromptPath = path.join(repoRoot, 'template', '.github', 'prompts', 'kbx-run.prompt.template.md');
  const templateAskPromptPath = path.join(repoRoot, 'template', '.github', 'prompts', 'kbx-ask.prompt.template.md');
  const templateHookPath = path.join(repoRoot, 'template', '.github', 'hooks', 'revision-state-guard.json');

  const agentDestPath = path.join(workspaceRoot, '.github', 'agents', 'kbx.agent.md');
  const planPromptDestPath = path.join(workspaceRoot, '.github', 'prompts', 'kbx-plan.prompt.md');
  const runPromptDestPath = path.join(workspaceRoot, '.github', 'prompts', 'kbx-run.prompt.md');
  const askPromptDestPath = path.join(workspaceRoot, '.github', 'prompts', 'kbx-ask.prompt.md');
  const hookDestPath = path.join(workspaceRoot, '.github', 'hooks', 'revision-state-guard.json');

  const created = [];

  function copyFile(srcPath, dstPath) {
    if (!overwrite && fs.existsSync(dstPath)) {
      return;
    }

    fs.mkdirSync(path.dirname(dstPath), { recursive: true });
    const content = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(dstPath, content, 'utf8');
    created.push(path.relative(workspaceRoot, dstPath));
  }

  if (fs.existsSync(templateAgentPath)) {
    copyFile(templateAgentPath, agentDestPath);
  }
  if (fs.existsSync(templatePlanPromptPath)) {
    copyFile(templatePlanPromptPath, planPromptDestPath);
  }
  if (fs.existsSync(templateRunPromptPath)) {
    copyFile(templateRunPromptPath, runPromptDestPath);
  }
  if (fs.existsSync(templateAskPromptPath)) {
    copyFile(templateAskPromptPath, askPromptDestPath);
  }
  if (fs.existsSync(templateHookPath)) {
    copyFile(templateHookPath, hookDestPath);
  }

  return created;
}

function printHandoffPrompt({ workspaceRoot, visibleMountPath, detectedIDE, mode }) {
  const adapterFile = detectedIDE === 'vscode' ? 'AGENTS.md' : (detectedIDE.charAt(0).toUpperCase() + detectedIDE.slice(1) + ' adapter');
  console.log('');
  console.log(`IDE: ${detectedIDE} (adapter: ${adapterFile})`);
  
  if (mode === 'tracked') {
    console.log('Note: Tracked mode requires explicit baseline. Run: kbx baseline set --to-head');
  }
  
  console.log('Next: /kbx-plan, /kbx-run, /kbx-ask <question>  |  Verify: kbx status');
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
    state.notes = 'Initialized by kbx init refresh mode; existing KB content was preserved.';
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

  // Write .kbx/project.yaml if not already present (KB-012 deterministic resolution).
  // project_id defaults to --project flag, then --brand, then folder name.
  const projectId = (options.projectId || options.brand || path.basename(workspaceRoot))
    .toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const kbxDir = path.join(workspaceRoot, '.kbx');
  const projectYamlPath = path.join(kbxDir, 'project.yaml');
  if (!fs.existsSync(projectYamlPath)) {
    fs.mkdirSync(kbxDir, { recursive: true });
    const svFactoryRootRel = path.relative(workspaceRoot, storagePaths.contentRoot).replace(/\\/g, '/');
    fs.writeFileSync(projectYamlPath, [
      `project_id: ${projectId}`,
      `display_name: ${options.brand || path.basename(workspaceRoot)}`,
      `svfactory_root: ${svFactoryRootRel}`,
    ].join('\n') + '\n', 'utf8');
    console.log(`Project identity: .kbx/project.yaml (project_id: ${projectId})`);
  }

  // Check for workspace ambiguity: warn if other projects exist in parent dir without a workspace registry.
  const parentDir = path.dirname(workspaceRoot);
  if (parentDir !== workspaceRoot) {
    try {
      const siblings = discoverProjects(parentDir).filter(p => p.repo_root !== workspaceRoot);
      if (siblings.length > 0) {
        console.log(`Tip: ${siblings.length} other KBX project(s) detected in parent directory.`);
        console.log(`     Run "kbx workspace promote" from ${parentDir} to create a workspace registry.`);
      }
    } catch (_) {
      // non-fatal: discovery errors (e.g. duplicate ids) do not block init
    }
  }

  console.log(`Initialized KB (${options.mode}) in ${storagePaths.contentRoot}`);
  console.log(`State: ${storagePaths.statePath}`);
  if (options.mode === 'private-git') {
    console.log('Note: state.json lives under .git/ and is hidden from IDE file_search; use `kbx status` to inspect.');
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
  printHandoffPrompt({ workspaceRoot, visibleMountPath: storagePaths.visibleMountPath, detectedIDE, mode: options.mode });
}

module.exports = {
  runInit,
  createAgentAndPromptFiles,
};
