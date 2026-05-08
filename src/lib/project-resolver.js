'use strict';

/**
 * project-resolver.js
 *
 * Deterministic project resolution for multi-project workspaces.
 *
 * Core rule (KB-012):
 *   No mutation command may write state unless it has resolved exactly one
 *   project_id, or the command explicitly runs in workspace mode.
 *
 * Resolver precedence (highest first):
 *   1. --project <id>   explicit CLI flag
 *   2. --workspace      explicit workspace mode
 *   3. CWD lookup       nearest parent with .kbx/project.yaml
 *   4. workspace registry   .kbx-workspace/workspace.yaml active_project_id
 *
 * Error codes (all deterministic, no LLM path):
 *   ERR_PROJECT_UNKNOWN        --project <id> supplied but not found
 *   ERR_PROJECT_AMBIGUOUS      multiple candidates, no explicit selector
 *   ERR_PROJECT_DUPLICATE_ID   duplicate project_id in registry/discovery
 *   ERR_PROJECT_REQUIRED       mutation called without resolvable project context
 *   ERR_WORKSPACE_NOT_FOUND    --workspace used but no workspace.yaml exists
 */

const fs = require('fs');
const path = require('path');

const PROJECT_YAML_REL = '.kbx/project.yaml';
const WORKSPACE_YAML_REL = '.kbx-workspace/workspace.yaml';
const WORKSPACE_MAX_DEPTH = 10;

// ---------------------------------------------------------------------------
// YAML helpers (lightweight — no yaml dependency needed for key-value flat files)
// ---------------------------------------------------------------------------

/**
 * Parse a minimal flat YAML file with `key: value` lines.
 * Ignores comments (#) and blank lines.
 * Returns a plain object with string values.
 */
function parseMinimalYaml(text) {
  const result = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) result[key] = value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Per-repo .kbx/project.yaml
// ---------------------------------------------------------------------------

/**
 * Read project metadata from a repo root.
 * Returns null if not present.
 * Returns { project_id, display_name, kb_root, ...extras } on success.
 * Throws if file exists but project_id is missing/empty.
 */
function readProjectYaml(repoRoot) {
  const filePath = path.join(repoRoot, PROJECT_YAML_REL);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = parseMinimalYaml(raw);
  if (!parsed.project_id || !parsed.project_id.trim()) {
    throw new Object.assign(
      new Error(`project_id missing or empty in ${filePath}`),
      { code: 'ERR_PROJECT_INVALID_YAML', filePath }
    );
  }
  return {
    project_id: parsed.project_id.trim(),
    display_name: parsed.display_name || parsed.project_id.trim(),
    kb_root: parsed.kb_root || 'knowledge-base',
    repo_root: repoRoot,
  };
}

/**
 * Walk up from startDir looking for the nearest .kbx/project.yaml.
 * Stops at filesystem root or after WORKSPACE_MAX_DEPTH steps.
 * Returns project metadata or null if none found.
 */
function findProjectByCwd(startDir) {
  let current = path.resolve(startDir);
  for (let depth = 0; depth < WORKSPACE_MAX_DEPTH; depth++) {
    const meta = readProjectYaml(current);
    if (meta) return meta;
    const parent = path.dirname(current);
    if (parent === current) break; // filesystem root
    current = parent;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Workspace registry .kbx-workspace/workspace.yaml
// ---------------------------------------------------------------------------

/**
 * Read the workspace registry from workspaceRoot.
 * Returns null if not present.
 * Returns { active_project_id, projects: [{project_id, repo_root}] }.
 * Throws if duplicate project_ids are found.
 */
function readWorkspaceYaml(workspaceRoot) {
  const filePath = path.join(workspaceRoot, WORKSPACE_YAML_REL);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return parseWorkspaceYaml(raw, workspaceRoot);
}

/**
 * Parse workspace.yaml text into structured registry.
 * Exposed for testability.
 */
function parseWorkspaceYaml(text, workspaceRoot) {
  const lines = text.split(/\r?\n/);
  let active_project_id = null;
  const projects = [];
  let inProjects = false;
  let currentEntry = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('active_project_id:')) {
      active_project_id = line.slice('active_project_id:'.length).trim().replace(/^['"]|['"]$/g, '') || null;
      continue;
    }

    if (line === 'projects:') {
      inProjects = true;
      continue;
    }

    if (inProjects) {
      if (line.startsWith('- project_id:')) {
        if (currentEntry) projects.push(currentEntry);
        currentEntry = {
          project_id: line.slice('- project_id:'.length).trim().replace(/^['"]|['"]$/g, ''),
          repo_root: null,
        };
      } else if (line.startsWith('repo_root:') && currentEntry) {
        const rel = line.slice('repo_root:'.length).trim().replace(/^['"]|['"]$/g, '');
        currentEntry.repo_root = workspaceRoot
          ? path.resolve(workspaceRoot, rel)
          : rel;
      }
    }
  }
  if (currentEntry) projects.push(currentEntry);

  // Detect duplicate project_ids
  const seen = new Set();
  for (const p of projects) {
    if (seen.has(p.project_id)) {
      throw Object.assign(
        new Error(`Duplicate project_id "${p.project_id}" found in ${WORKSPACE_YAML_REL}`),
        { code: 'ERR_PROJECT_DUPLICATE_ID', project_id: p.project_id }
      );
    }
    seen.add(p.project_id);
  }

  return { active_project_id, projects };
}

// ---------------------------------------------------------------------------
// Workspace discovery
// ---------------------------------------------------------------------------

/**
 * Discover all repos with .kbx/project.yaml under workspaceRoot (depth 1).
 * Returns an array of project metadata objects.
 * Throws if duplicate project_ids are found across repos.
 */
function discoverProjects(workspaceRoot) {
  const entries = fs.existsSync(workspaceRoot)
    ? fs.readdirSync(workspaceRoot, { withFileTypes: true })
    : [];

  const candidates = [];

  // Also check workspaceRoot itself
  const selfMeta = readProjectYaml(workspaceRoot);
  if (selfMeta) candidates.push(selfMeta);

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const childRoot = path.join(workspaceRoot, entry.name);
    try {
      const meta = readProjectYaml(childRoot);
      if (meta) candidates.push(meta);
    } catch (_) {
      // skip invalid entries during discovery
    }
  }

  // Detect duplicate project_ids across discovered repos
  const seen = new Set();
  for (const p of candidates) {
    if (seen.has(p.project_id)) {
      throw Object.assign(
        new Error(`Duplicate project_id "${p.project_id}" found during workspace discovery`),
        { code: 'ERR_PROJECT_DUPLICATE_ID', project_id: p.project_id }
      );
    }
    seen.add(p.project_id);
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * Resolve project context given CLI options and runtime environment.
 *
 * @param {object} opts
 * @param {string} [opts.projectId]       value of --project flag
 * @param {boolean} [opts.workspaceMode]  true when --workspace flag passed
 * @param {string} opts.cwd               current working directory
 * @param {string} [opts.workspaceRoot]   VS Code workspace root (optional)
 *
 * @returns {{ type: 'project', project: object }
 *           | { type: 'workspace', workspaceRoot: string }}
 *
 * @throws  Error with .code === 'ERR_PROJECT_*' on deterministic failure
 */
function resolveProject(opts) {
  const { projectId, workspaceMode, cwd, workspaceRoot } = opts || {};

  // Precedence 1: explicit --project <id>
  if (projectId) {
    return resolveExplicit({ projectId, cwd, workspaceRoot });
  }

  // Precedence 2: explicit --workspace
  if (workspaceMode) {
    return resolveWorkspaceMode({ workspaceRoot });
  }

  // Precedence 3: CWD lookup
  const cwdProject = findProjectByCwd(cwd);
  if (cwdProject) {
    return { type: 'project', project: cwdProject };
  }

  // Precedence 4: workspace registry active_project_id
  if (workspaceRoot) {
    const registry = readWorkspaceYaml(workspaceRoot);
    if (registry && registry.active_project_id) {
      const match = registry.projects.find(p => p.project_id === registry.active_project_id);
      if (match) return { type: 'project', project: match };
    }

    // Detect ambiguous multi-project workspace
    const discovered = discoverProjects(workspaceRoot);
    if (discovered.length > 1) {
      throw Object.assign(
        new Error(
          `Multiple KBX projects detected in workspace (${discovered.map(p => p.project_id).join(', ')}). ` +
          `Use --project <id> to select, or run "kbx workspace promote" to configure a workspace registry.`
        ),
        { code: 'ERR_PROJECT_AMBIGUOUS', candidates: discovered.map(p => p.project_id) }
      );
    }
    if (discovered.length === 1) {
      return { type: 'project', project: discovered[0] };
    }
  }

  return null;
}

/**
 * Resolve with explicit --project <id>.
 * Searches CWD chain, then workspace registry, then workspace discovery.
 */
function resolveExplicit({ projectId, cwd, workspaceRoot }) {
  // Check CWD chain first
  const cwdProject = findProjectByCwd(cwd);
  if (cwdProject && cwdProject.project_id === projectId) {
    return { type: 'project', project: cwdProject };
  }

  // Check workspace registry
  if (workspaceRoot) {
    const registry = readWorkspaceYaml(workspaceRoot);
    if (registry) {
      const match = registry.projects.find(p => p.project_id === projectId);
      if (match) return { type: 'project', project: match };
    }
    // Check workspace discovery
    const discovered = discoverProjects(workspaceRoot);
    const found = discovered.find(p => p.project_id === projectId);
    if (found) return { type: 'project', project: found };
  }

  throw Object.assign(
    new Error(`Project "${projectId}" not found. Check .kbx/project.yaml in your repositories.`),
    { code: 'ERR_PROJECT_UNKNOWN', project_id: projectId }
  );
}

/**
 * Resolve workspace mode.
 * workspaceRoot must have .kbx-workspace/workspace.yaml.
 */
function resolveWorkspaceMode({ workspaceRoot }) {
  if (!workspaceRoot) {
    throw Object.assign(
      new Error('--workspace requires a workspace root. Set workspaceRoot or run from workspace directory.'),
      { code: 'ERR_WORKSPACE_NOT_FOUND' }
    );
  }
  const filePath = path.join(workspaceRoot, WORKSPACE_YAML_REL);
  if (!fs.existsSync(filePath)) {
    throw Object.assign(
      new Error(
        `No workspace registry found at ${filePath}. ` +
        `Run "kbx workspace promote" first to create a workspace registry.`
      ),
      { code: 'ERR_WORKSPACE_NOT_FOUND', filePath }
    );
  }
  return { type: 'workspace', workspaceRoot };
}

// ---------------------------------------------------------------------------
// Mutation guard
// ---------------------------------------------------------------------------

/**
 * Assert a project is resolved before a mutation command proceeds.
 * Throws ERR_PROJECT_REQUIRED if resolution is null.
 * Must be called by every mutation command before writing state.
 *
 * @param {object|null} resolution - result of resolveProject()
 * @param {string} commandName     - name of the calling command (for error message)
 */
function assertProjectResolved(resolution, commandName) {
  if (!resolution) {
    throw Object.assign(
      new Error(
        `"${commandName}" requires a project context. ` +
        `Run from a directory with .kbx/project.yaml, or pass --project <id>.`
      ),
      { code: 'ERR_PROJECT_REQUIRED', commandName }
    );
  }
}

// ---------------------------------------------------------------------------
// Workspace promote helper
// ---------------------------------------------------------------------------

/**
 * Build workspace.yaml content from discovered projects.
 * Used by `kbx workspace promote`.
 *
 * @param {object[]} projects   array of {project_id, repo_root}
 * @param {string} workspaceRoot  root to make repo paths relative to
 * @param {string|null} [activeProjectId]
 * @returns {string}  YAML content string
 */
function buildWorkspaceYaml(projects, workspaceRoot, activeProjectId = null) {
  const lines = [
    '# KBX Workspace Registry',
    '# Generated by kbx workspace promote.',
    '# Edit active_project_id to set the default project for ambiguous commands.',
    '',
    `active_project_id: ${activeProjectId || (projects[0] && projects[0].project_id) || ''}`,
    '',
    'projects:',
  ];

  for (const p of projects) {
    const rel = workspaceRoot
      ? path.relative(workspaceRoot, p.repo_root).replace(/\\/g, '/')
      : p.repo_root;
    lines.push(`  - project_id: ${p.project_id}`);
    lines.push(`    repo_root: ${rel}`);
  }

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Workspace verify helper
// ---------------------------------------------------------------------------

/**
 * Verify workspace registry against filesystem reality.
 * Returns drift report: { ok, missing, extra, invalid }.
 *
 * @param {string} workspaceRoot
 * @returns {{ ok: boolean, missing: string[], extra: string[], invalid: string[] }}
 */
function verifyWorkspace(workspaceRoot) {
  const registry = readWorkspaceYaml(workspaceRoot);
  if (!registry) {
    throw Object.assign(
      new Error(`No workspace registry found at ${path.join(workspaceRoot, WORKSPACE_YAML_REL)}. Run "kbx workspace promote" first.`),
      { code: 'ERR_WORKSPACE_NOT_FOUND' }
    );
  }

  const missing = [];
  const invalid = [];

  for (const p of registry.projects) {
    const yamlPath = path.join(p.repo_root, PROJECT_YAML_REL);
    if (!fs.existsSync(yamlPath)) {
      missing.push(p.project_id);
    } else {
      try {
        const live = readProjectYaml(p.repo_root);
        if (live.project_id !== p.project_id) {
          invalid.push(p.project_id);
        }
      } catch (_) {
        invalid.push(p.project_id);
      }
    }
  }

  // Check for discovered repos not in registry
  let discovered = [];
  try {
    discovered = discoverProjects(workspaceRoot);
  } catch (_) {
    // duplicate detection etc — not relevant for verify diff calculation
  }
  const registeredIds = new Set(registry.projects.map(p => p.project_id));
  const extra = discovered
    .filter(p => !registeredIds.has(p.project_id))
    .map(p => p.project_id);

  return {
    ok: missing.length === 0 && extra.length === 0 && invalid.length === 0,
    missing,
    extra,
    invalid,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PROJECT_YAML_REL,
  WORKSPACE_YAML_REL,
  parseMinimalYaml,
  parseWorkspaceYaml,
  readProjectYaml,
  findProjectByCwd,
  readWorkspaceYaml,
  discoverProjects,
  resolveProject,
  assertProjectResolved,
  buildWorkspaceYaml,
  verifyWorkspace,
};
