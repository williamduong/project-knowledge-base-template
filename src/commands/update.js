const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { getTemplateVersion } = require('../lib/template');
const { persistStateAndRender, readStateFile } = require('../lib/state');
const { performSync } = require('./sync');
const { createAgentAndPromptFiles } = require('./init');
const { resolveProject } = require('../lib/project-resolver');

function parseArgs(args) {
  const options = {
    acceptBaseline: false,
    refreshPrompts: false,
  };

  for (const current of args) {
    if (current === '--accept-baseline') {
      options.acceptBaseline = true;
      continue;
    }

    if (current === '--refresh-prompts') {
      options.refreshPrompts = true;
      continue;
    }

    throw new Error(`Unknown update option \"${current}\".`);
  }

  return options;
}

function runUpdate({ args, cwd, repoRoot }) {
  const options = parseArgs(args);
  let workspaceRoot = path.resolve(cwd);

  // Mutation guard: throws ERR_PROJECT_AMBIGUOUS if multiple projects with no selector.
  // Returns null for legacy single-repo KBs without .kbx/project.yaml (backward compat).
  const resolution = resolveProject({ projectId: options.projectId, cwd: workspaceRoot, workspaceRoot });
  if (resolution && resolution.type === 'project' && options.projectId) {
    workspaceRoot = resolution.project.repo_root;
  }

  if (options.refreshPrompts) {
    const refreshed = createAgentAndPromptFiles({ workspaceRoot, repoRoot, overwrite: true });
    if (refreshed.length > 0) {
      console.log('update: refreshed agent + prompt + hook files from template:');
      for (const f of refreshed) {
        console.log(`  ~ ${f}`);
      }
    } else {
      console.log('update: no agent/prompt template files found to refresh.');
    }
    return;
  }

  const syncResult = performSync({ cwd: workspaceRoot, options });
  console.log(`update: sync status = ${syncResult.status}`);

  const context = resolveExistingState({ workspaceRoot });
  const state = readStateFile({ statePath: context.statePath });
  const latestTemplateVersion = getTemplateVersion({ repoRoot });

  if (state.templateVersion !== latestTemplateVersion) {
    const previousVersion = state.templateVersion;
    const cmp = compareSemver(previousVersion, latestTemplateVersion);

    if (cmp > 0) {
      console.log(`update: state template version (${previousVersion}) is newer than bundled template (${latestTemplateVersion}). Refusing to downgrade.`);
      console.log('update: your global kb CLI is older than the workspace state. Run: npm i -g @williamduong/kb@latest');
      return;
    }

    state.templateVersion = latestTemplateVersion;
    state.lastReconciledTemplateVersion = latestTemplateVersion;
    state.versionLineage = `${previousVersion} -> ${latestTemplateVersion}`;
    state.notes = `Template version refreshed during update (${previousVersion} -> ${latestTemplateVersion}).`;

    persistStateAndRender({
      statePath: context.statePath,
      renderedRevisionStatePath: context.renderedRevisionStatePath,
      state,
    });

    console.log(`update: template version updated ${previousVersion} -> ${latestTemplateVersion}`);
    return;
  }

  console.log(`update: template version already current (${state.templateVersion})`);
}

function compareSemver(a, b) {
  const pa = String(a || '0.0.0').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0.0.0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

module.exports = {
  runUpdate,
};