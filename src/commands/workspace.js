'use strict';

/**
 * workspace.js — kbx workspace subcommands (KB-012)
 *
 * Subcommands:
 *   kbx workspace detect                   Scan CWD for repos with .kbx/project.yaml
 *   kbx workspace promote [--yes] [--json] Create/refresh .kbx-workspace/workspace.yaml
 *   kbx workspace verify  [--json]         Drift check against filesystem
 */

const fs = require('fs');
const path = require('path');

const {
  discoverProjects,
  buildWorkspaceYaml,
  verifyWorkspace,
  readWorkspaceYaml,
  WORKSPACE_YAML_REL,
} = require('../lib/project-resolver');

// ---------------------------------------------------------------------------
// CLI arg helpers
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const opts = {
    yes: false,
    json: false,
    activeProjectId: null,
  };
  let subcommand = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--yes' || a === '-y') { opts.yes = true; continue; }
    if (a === '--json') { opts.json = true; continue; }
    if (a === '--active' && args[i + 1]) { opts.activeProjectId = args[++i]; continue; }
    if (!subcommand && !a.startsWith('-')) { subcommand = a; continue; }
  }

  return { subcommand, opts };
}

// ---------------------------------------------------------------------------
// kbx workspace detect
// ---------------------------------------------------------------------------

async function detectWorkspace({ cwd, opts }) {
  const projects = discoverProjects(cwd);

  if (opts.json) {
    console.log(JSON.stringify({ projects: projects.map(p => ({ project_id: p.project_id, repo_root: p.repo_root })) }, null, 2));
    return;
  }

  if (projects.length === 0) {
    console.log('No KBX projects detected (no .kbx/project.yaml found).');
    return;
  }

  console.log(`Detected ${projects.length} KBX project(s) in ${cwd}:`);
  for (const p of projects) {
    const rel = path.relative(cwd, p.repo_root) || '.';
    console.log(`  ${p.project_id}  (${rel})`);
  }
}

// ---------------------------------------------------------------------------
// kbx workspace promote
// ---------------------------------------------------------------------------

async function promoteWorkspace({ cwd, opts }) {
  let projects;
  try {
    projects = discoverProjects(cwd);
  } catch (err) {
    if (err.code === 'ERR_PROJECT_DUPLICATE_ID') {
      console.error(`kbx workspace promote: ${err.message}`);
      console.error('Fix duplicate project_id values in .kbx/project.yaml before promoting.');
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  if (projects.length === 0) {
    console.error('kbx workspace promote: no KBX projects detected in current directory.');
    console.error('Run from a workspace root containing one or more repos with .kbx/project.yaml.');
    process.exitCode = 1;
    return;
  }

  const workspaceFile = path.join(cwd, WORKSPACE_YAML_REL);
  const activeProjectId = opts.activeProjectId || projects[0].project_id;
  const yaml = buildWorkspaceYaml(projects, cwd, activeProjectId);

  if (!opts.yes) {
    if (fs.existsSync(workspaceFile)) {
      console.log(`Workspace registry already exists at ${workspaceFile}`);
      console.log('Projects that would be registered:');
    } else {
      console.log('Would create workspace registry with:');
    }
    for (const p of projects) {
      const mark = p.project_id === activeProjectId ? ' (active)' : '';
      console.log(`  ${p.project_id}${mark}`);
    }
    console.log(`\nTarget: ${workspaceFile}`);
    console.log('Rerun with --yes to apply.');
    return;
  }

  // Write file
  const dir = path.dirname(workspaceFile);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(workspaceFile, yaml, 'utf8');

  if (opts.json) {
    console.log(JSON.stringify({
      status: 'ok',
      file: workspaceFile,
      projects: projects.map(p => p.project_id),
      active_project_id: activeProjectId,
    }, null, 2));
    return;
  }

  console.log(`Workspace registry created: ${workspaceFile}`);
  console.log(`Active project: ${activeProjectId}`);
  console.log(`Registered: ${projects.map(p => p.project_id).join(', ')}`);
}

// ---------------------------------------------------------------------------
// kbx workspace verify
// ---------------------------------------------------------------------------

async function verifyWorkspaceCmd({ cwd, opts }) {
  let result;
  try {
    result = verifyWorkspace(cwd);
  } catch (err) {
    if (err.code === 'ERR_WORKSPACE_NOT_FOUND') {
      if (opts.json) {
        console.log(JSON.stringify({ ok: false, error: 'ERR_WORKSPACE_NOT_FOUND', message: err.message }, null, 2));
      } else {
        console.error(`kbx workspace verify: ${err.message}`);
      }
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (result.ok) {
    const registry = readWorkspaceYaml(cwd);
    console.log(`Workspace OK — ${registry.projects.length} project(s) verified.`);
    return;
  }

  console.error('Workspace registry drift detected:');
  if (result.missing.length > 0) {
    console.error(`  Missing on disk: ${result.missing.join(', ')}`);
  }
  if (result.extra.length > 0) {
    console.error(`  Unregistered (run "kbx workspace promote --yes" to register): ${result.extra.join(', ')}`);
  }
  if (result.invalid.length > 0) {
    console.error(`  Invalid (project_id mismatch): ${result.invalid.join(', ')}`);
  }
  process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function runWorkspace({ args, cwd }) {
  const { subcommand, opts } = parseArgs(args || []);

  switch (subcommand) {
    case 'detect':
      return detectWorkspace({ cwd, opts });

    case 'promote':
      return promoteWorkspace({ cwd, opts });

    case 'verify':
      return verifyWorkspaceCmd({ cwd, opts });

    case undefined:
    case null:
    case 'help':
      console.log('Usage:');
      console.log('  kbx workspace detect                    Scan for KBX project repos');
      console.log('  kbx workspace promote [--yes] [--json]  Create workspace registry');
      console.log('  kbx workspace verify  [--json]          Check registry vs filesystem');
      return;

    default:
      console.error(`kbx workspace: unknown subcommand "${subcommand}". Try: detect, promote, verify`);
      process.exitCode = 1;
  }
}

module.exports = { runWorkspace };
