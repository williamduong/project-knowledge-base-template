'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseMinimalYaml,
  parseWorkspaceYaml,
  readProjectYaml,
  findProjectByCwd,
  discoverProjects,
  resolveProject,
  assertProjectResolved,
  buildWorkspaceYaml,
  verifyWorkspace,
  PROJECT_YAML_REL,
  WORKSPACE_YAML_REL,
} = require('../../src/lib/project-resolver');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-resolver-'));
}

function writeProjectYaml(repoRoot, fields = {}) {
  const dir = path.join(repoRoot, '.kbx');
  fs.mkdirSync(dir, { recursive: true });
  const content = [
    `project_id: ${fields.project_id || 'test-project'}`,
    fields.display_name ? `display_name: ${fields.display_name}` : null,
    fields.svfactory_root ? `svfactory_root: ${fields.svfactory_root}` : null,
  ].filter(Boolean).join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'project.yaml'), content);
}

function writeWorkspaceYaml(workspaceRoot, content) {
  const dir = path.join(workspaceRoot, '.kbx-workspace');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'workspace.yaml'), content);
}

// ---------------------------------------------------------------------------
// Test 1 — resolve explicit project (--project <id> found)
// ---------------------------------------------------------------------------

test('resolve explicit project: returns project when --project matches a repo in CWD chain', () => {
  const root = tmpDir();
  writeProjectYaml(root, { project_id: 'alpha' });

  const result = resolveProject({ projectId: 'alpha', cwd: root });
  assert.equal(result.type, 'project');
  assert.equal(result.project.project_id, 'alpha');
});

test('resolve explicit project: returns project when --project matches workspace registry', () => {
  const ws = tmpDir();
  const repoA = path.join(ws, 'repo-a');
  fs.mkdirSync(repoA);
  writeProjectYaml(repoA, { project_id: 'repo-a' });
  const repoB = path.join(ws, 'repo-b');
  fs.mkdirSync(repoB);
  writeProjectYaml(repoB, { project_id: 'repo-b' });

  writeWorkspaceYaml(ws, [
    'active_project_id: repo-a',
    'projects:',
    '  - project_id: repo-a',
    '    repo_root: repo-a',
    '  - project_id: repo-b',
    '    repo_root: repo-b',
  ].join('\n') + '\n');

  const result = resolveProject({ projectId: 'repo-b', cwd: ws, workspaceRoot: ws });
  assert.equal(result.type, 'project');
  assert.equal(result.project.project_id, 'repo-b');
});

// ---------------------------------------------------------------------------
// Test 2 — reject unknown project (ERR_PROJECT_UNKNOWN)
// ---------------------------------------------------------------------------

test('reject unknown project: throws ERR_PROJECT_UNKNOWN for --project not found', () => {
  const root = tmpDir();
  writeProjectYaml(root, { project_id: 'alpha' });

  assert.throws(
    () => resolveProject({ projectId: 'nonexistent', cwd: root }),
    (err) => {
      assert.equal(err.code, 'ERR_PROJECT_UNKNOWN');
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// Test 3 — resolve by cwd (no explicit flag)
// ---------------------------------------------------------------------------

test('resolve by cwd: finds project.yaml in current directory', () => {
  const root = tmpDir();
  writeProjectYaml(root, { project_id: 'cwd-project' });

  const result = resolveProject({ cwd: root });
  assert.equal(result.type, 'project');
  assert.equal(result.project.project_id, 'cwd-project');
});

test('resolve by cwd: walks up to find project.yaml in parent', () => {
  const root = tmpDir();
  writeProjectYaml(root, { project_id: 'parent-project' });
  const nested = path.join(root, 'src', 'components');
  fs.mkdirSync(nested, { recursive: true });

  const result = resolveProject({ cwd: nested });
  assert.equal(result.type, 'project');
  assert.equal(result.project.project_id, 'parent-project');
});

test('resolve by cwd: returns null when no project.yaml found', () => {
  const root = tmpDir();
  // no project.yaml written
  const result = resolveProject({ cwd: root });
  assert.equal(result, null);
});

// ---------------------------------------------------------------------------
// Test 4 — fail ambiguous from workspace root (ERR_PROJECT_AMBIGUOUS)
// ---------------------------------------------------------------------------

test('fail ambiguous from workspace root: throws ERR_PROJECT_AMBIGUOUS with multiple projects', () => {
  const ws = tmpDir();
  const repoA = path.join(ws, 'repo-a');
  const repoB = path.join(ws, 'repo-b');
  fs.mkdirSync(repoA);
  fs.mkdirSync(repoB);
  writeProjectYaml(repoA, { project_id: 'repo-a' });
  writeProjectYaml(repoB, { project_id: 'repo-b' });

  assert.throws(
    () => resolveProject({ cwd: ws, workspaceRoot: ws }),
    (err) => {
      assert.equal(err.code, 'ERR_PROJECT_AMBIGUOUS');
      assert.ok(Array.isArray(err.candidates));
      assert.ok(err.candidates.includes('repo-a'));
      assert.ok(err.candidates.includes('repo-b'));
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// Test 5 — detect multiple projects (discoverProjects)
// ---------------------------------------------------------------------------

test('detect multiple projects: discoverProjects returns all repos with project.yaml', () => {
  const ws = tmpDir();
  const repoA = path.join(ws, 'repo-a');
  const repoB = path.join(ws, 'repo-b');
  const noKbx = path.join(ws, 'repo-c'); // no .kbx/project.yaml
  fs.mkdirSync(repoA);
  fs.mkdirSync(repoB);
  fs.mkdirSync(noKbx);
  writeProjectYaml(repoA, { project_id: 'repo-a' });
  writeProjectYaml(repoB, { project_id: 'repo-b' });

  const projects = discoverProjects(ws);
  const ids = projects.map(p => p.project_id);
  assert.ok(ids.includes('repo-a'), `expected repo-a in ${JSON.stringify(ids)}`);
  assert.ok(ids.includes('repo-b'), `expected repo-b in ${JSON.stringify(ids)}`);
  assert.ok(!ids.includes('repo-c'), 'repo-c should not appear (no .kbx/project.yaml)');
});

// ---------------------------------------------------------------------------
// Test 6 — reject duplicate project_id (ERR_PROJECT_DUPLICATE_ID)
// ---------------------------------------------------------------------------

test('reject duplicate project_id: discoverProjects throws on duplicate project_id', () => {
  const ws = tmpDir();
  const repoA = path.join(ws, 'repo-a');
  const repoB = path.join(ws, 'repo-b');
  fs.mkdirSync(repoA);
  fs.mkdirSync(repoB);
  writeProjectYaml(repoA, { project_id: 'same-id' });
  writeProjectYaml(repoB, { project_id: 'same-id' });

  assert.throws(
    () => discoverProjects(ws),
    (err) => {
      assert.equal(err.code, 'ERR_PROJECT_DUPLICATE_ID');
      assert.equal(err.project_id, 'same-id');
      return true;
    }
  );
});

test('reject duplicate project_id: parseWorkspaceYaml throws on duplicate in registry', () => {
  const yaml = [
    'active_project_id: a',
    'projects:',
    '  - project_id: a',
    '    repo_root: /x/a',
    '  - project_id: a',
    '    repo_root: /x/b',
  ].join('\n');

  assert.throws(
    () => parseWorkspaceYaml(yaml, null),
    (err) => {
      assert.equal(err.code, 'ERR_PROJECT_DUPLICATE_ID');
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// Test 7 — mutation command fails without project (assertProjectResolved)
// ---------------------------------------------------------------------------

test('mutation command fails without project: assertProjectResolved throws ERR_PROJECT_REQUIRED', () => {
  assert.throws(
    () => assertProjectResolved(null, 'kbx status'),
    (err) => {
      assert.equal(err.code, 'ERR_PROJECT_REQUIRED');
      assert.equal(err.commandName, 'kbx status');
      return true;
    }
  );
});

test('mutation command fails without project: assertProjectResolved passes when project resolved', () => {
  const resolution = { type: 'project', project: { project_id: 'ok', repo_root: '/x' } };
  assert.doesNotThrow(() => assertProjectResolved(resolution, 'kbx status'));
});

// ---------------------------------------------------------------------------
// Test 8 — mutation command works with --project
// ---------------------------------------------------------------------------

test('mutation command works with --project: resolveProject + assertProjectResolved succeeds', () => {
  const root = tmpDir();
  writeProjectYaml(root, { project_id: 'my-proj' });

  const resolution = resolveProject({ projectId: 'my-proj', cwd: root });
  assert.doesNotThrow(() => assertProjectResolved(resolution, 'kbx intent create'));
  assert.equal(resolution.project.project_id, 'my-proj');
});

// ---------------------------------------------------------------------------
// Test 9 — workspace promote creates registry (buildWorkspaceYaml)
// ---------------------------------------------------------------------------

test('workspace promote creates registry: buildWorkspaceYaml produces valid yaml', () => {
  const projects = [
    { project_id: 'alpha', repo_root: '/workspace/alpha' },
    { project_id: 'beta', repo_root: '/workspace/beta' },
  ];
  const yaml = buildWorkspaceYaml(projects, '/workspace', 'alpha');

  assert.ok(yaml.includes('active_project_id: alpha'));
  assert.ok(yaml.includes('project_id: alpha'));
  assert.ok(yaml.includes('project_id: beta'));
  assert.ok(yaml.includes('repo_root: alpha'));
  assert.ok(yaml.includes('repo_root: beta'));
});

test('workspace promote creates registry: written file is re-parseable', () => {
  const ws = tmpDir();
  const repoA = path.join(ws, 'repo-a');
  fs.mkdirSync(repoA);
  writeProjectYaml(repoA, { project_id: 'repo-a' });

  const projects = [{ project_id: 'repo-a', repo_root: repoA }];
  const yaml = buildWorkspaceYaml(projects, ws, 'repo-a');
  writeWorkspaceYaml(ws, yaml);

  const { readWorkspaceYaml } = require('../../src/lib/project-resolver');
  const registry = readWorkspaceYaml(ws);
  assert.equal(registry.active_project_id, 'repo-a');
  assert.equal(registry.projects.length, 1);
  assert.equal(registry.projects[0].project_id, 'repo-a');
});

// ---------------------------------------------------------------------------
// Test 10 — workspace verify detects drift (verifyWorkspace)
// ---------------------------------------------------------------------------

test('workspace verify detects drift: missing repo returns missing list', () => {
  const ws = tmpDir();
  const repoA = path.join(ws, 'repo-a');
  fs.mkdirSync(repoA);
  writeProjectYaml(repoA, { project_id: 'repo-a' });

  // Registry references repo-b which does not exist
  writeWorkspaceYaml(ws, [
    'active_project_id: repo-a',
    'projects:',
    '  - project_id: repo-a',
    '    repo_root: repo-a',
    '  - project_id: repo-b',
    '    repo_root: repo-b',
  ].join('\n') + '\n');

  const result = verifyWorkspace(ws);
  assert.equal(result.ok, false);
  assert.ok(result.missing.includes('repo-b'), `expected repo-b in missing: ${JSON.stringify(result.missing)}`);
});

test('workspace verify detects drift: extra unregistered project returns extra list', () => {
  const ws = tmpDir();
  const repoA = path.join(ws, 'repo-a');
  const repoB = path.join(ws, 'repo-b');
  fs.mkdirSync(repoA);
  fs.mkdirSync(repoB);
  writeProjectYaml(repoA, { project_id: 'repo-a' });
  writeProjectYaml(repoB, { project_id: 'repo-b' }); // exists on disk, not in registry

  writeWorkspaceYaml(ws, [
    'active_project_id: repo-a',
    'projects:',
    '  - project_id: repo-a',
    '    repo_root: repo-a',
  ].join('\n') + '\n');

  const result = verifyWorkspace(ws);
  assert.equal(result.ok, false);
  assert.ok(result.extra.includes('repo-b'), `expected repo-b in extra: ${JSON.stringify(result.extra)}`);
});

test('workspace verify: ok=true when registry matches filesystem', () => {
  const ws = tmpDir();
  const repoA = path.join(ws, 'repo-a');
  fs.mkdirSync(repoA);
  writeProjectYaml(repoA, { project_id: 'repo-a' });

  writeWorkspaceYaml(ws, [
    'active_project_id: repo-a',
    'projects:',
    '  - project_id: repo-a',
    '    repo_root: repo-a',
  ].join('\n') + '\n');

  const result = verifyWorkspace(ws);
  assert.equal(result.ok, true);
  assert.equal(result.missing.length, 0);
  assert.equal(result.extra.length, 0);
  assert.equal(result.invalid.length, 0);
});

test('workspace verify: throws ERR_WORKSPACE_NOT_FOUND when no workspace.yaml', () => {
  const ws = tmpDir();
  assert.throws(
    () => verifyWorkspace(ws),
    (err) => {
      assert.equal(err.code, 'ERR_WORKSPACE_NOT_FOUND');
      return true;
    }
  );
});

