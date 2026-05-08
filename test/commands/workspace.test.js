'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Pull runWorkspace for internal testing via opts injection
const { runWorkspace } = require('../../src/commands/workspace');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-ws-cmd-'));
}

function writeProjectYaml(repoRoot, projectId) {
  const dir = path.join(repoRoot, '.kbx');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'project.yaml'), `project_id: ${projectId}\n`);
}

function writeWorkspaceYaml(wsRoot, content) {
  const dir = path.join(wsRoot, '.kbx-workspace');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'workspace.yaml'), content);
}

function captureConsole(fn) {
  const lines = [];
  const orig = { log: console.log, error: console.error };
  console.log = (...args) => lines.push(args.join(' '));
  console.error = (...args) => lines.push(args.join(' '));
  const restore = () => {
    console.log = orig.log;
    console.error = orig.error;
  };
  const run = () => {
    try { return fn(); } catch (err) { restore(); throw err; }
  };
  return { lines, run, restore };
}

// ---------------------------------------------------------------------------
// workspace detect
// ---------------------------------------------------------------------------

test('workspace detect: reports project list', async () => {
  const ws = tmpDir();
  const a = path.join(ws, 'repo-a'); fs.mkdirSync(a);
  const b = path.join(ws, 'repo-b'); fs.mkdirSync(b);
  writeProjectYaml(a, 'repo-a');
  writeProjectYaml(b, 'repo-b');

  const captured = [];
  const origLog = console.log;
  console.log = (...args) => captured.push(args.join(' '));
  try {
    await runWorkspace({ args: ['detect'], cwd: ws });
  } finally {
    console.log = origLog;
  }
  const output = captured.join('\n');
  assert.ok(output.includes('repo-a'), `expected repo-a in output: ${output}`);
  assert.ok(output.includes('repo-b'), `expected repo-b in output: ${output}`);
});

test('workspace detect: reports no projects when empty', async () => {
  const ws = tmpDir();
  const captured = [];
  const origLog = console.log;
  console.log = (...args) => captured.push(args.join(' '));
  try {
    await runWorkspace({ args: ['detect'], cwd: ws });
  } finally {
    console.log = origLog;
  }
  const output = captured.join('\n');
  assert.ok(output.includes('No KBX projects detected'), `expected no-project message: ${output}`);
});

test('workspace detect: --json outputs structured data', async () => {
  const ws = tmpDir();
  const a = path.join(ws, 'repo-a'); fs.mkdirSync(a);
  writeProjectYaml(a, 'repo-a');

  const captured = [];
  const origLog = console.log;
  console.log = (...args) => captured.push(args.join(' '));
  try {
    await runWorkspace({ args: ['detect', '--json'], cwd: ws });
  } finally {
    console.log = origLog;
  }
  const parsed = JSON.parse(captured.join(''));
  assert.ok(Array.isArray(parsed.projects));
  assert.ok(parsed.projects.some(p => p.project_id === 'repo-a'));
});

// ---------------------------------------------------------------------------
// workspace promote
// ---------------------------------------------------------------------------

test('workspace promote --yes: creates workspace.yaml', async () => {
  const ws = tmpDir();
  const a = path.join(ws, 'repo-a'); fs.mkdirSync(a);
  writeProjectYaml(a, 'repo-a');

  await runWorkspace({ args: ['promote', '--yes'], cwd: ws });

  const wsFile = path.join(ws, '.kbx-workspace', 'workspace.yaml');
  assert.ok(fs.existsSync(wsFile), `workspace.yaml should exist at ${wsFile}`);
  const content = fs.readFileSync(wsFile, 'utf8');
  assert.ok(content.includes('repo-a'));
});

test('workspace promote without --yes: dry-run only, no file written', async () => {
  const ws = tmpDir();
  const a = path.join(ws, 'repo-a'); fs.mkdirSync(a);
  writeProjectYaml(a, 'repo-a');

  const captured = [];
  const origLog = console.log;
  console.log = (...args) => captured.push(args.join(' '));
  try {
    await runWorkspace({ args: ['promote'], cwd: ws });
  } finally {
    console.log = origLog;
  }
  const wsFile = path.join(ws, '.kbx-workspace', 'workspace.yaml');
  assert.ok(!fs.existsSync(wsFile), 'workspace.yaml should NOT be written without --yes');
  const output = captured.join('\n');
  assert.ok(output.includes('--yes'), `dry-run output should mention --yes: ${output}`);
});

test('workspace promote --yes --json: outputs json result', async () => {
  const ws = tmpDir();
  const a = path.join(ws, 'repo-a'); fs.mkdirSync(a);
  writeProjectYaml(a, 'repo-a');

  const captured = [];
  const origLog = console.log;
  console.log = (...args) => captured.push(args.join(' '));
  try {
    await runWorkspace({ args: ['promote', '--yes', '--json'], cwd: ws });
  } finally {
    console.log = origLog;
  }
  const parsed = JSON.parse(captured.join(''));
  assert.equal(parsed.status, 'ok');
  assert.ok(Array.isArray(parsed.projects));
});

// ---------------------------------------------------------------------------
// workspace verify
// ---------------------------------------------------------------------------

test('workspace verify: ok=true for clean registry', async () => {
  const ws = tmpDir();
  const a = path.join(ws, 'repo-a'); fs.mkdirSync(a);
  writeProjectYaml(a, 'repo-a');
  writeWorkspaceYaml(ws, [
    'active_project_id: repo-a',
    'projects:',
    '  - project_id: repo-a',
    '    repo_root: repo-a',
  ].join('\n') + '\n');

  const captured = [];
  const origLog = console.log;
  console.log = (...args) => captured.push(args.join(' '));
  try {
    await runWorkspace({ args: ['verify'], cwd: ws });
  } finally {
    console.log = origLog;
  }
  const output = captured.join('\n');
  assert.ok(output.includes('OK'), `expected OK: ${output}`);
});

test('workspace verify --json: reports drift via json', async () => {
  const ws = tmpDir();
  const a = path.join(ws, 'repo-a'); fs.mkdirSync(a);
  writeProjectYaml(a, 'repo-a');
  // registry references nonexistent repo-b
  writeWorkspaceYaml(ws, [
    'active_project_id: repo-a',
    'projects:',
    '  - project_id: repo-a',
    '    repo_root: repo-a',
    '  - project_id: repo-b',
    '    repo_root: repo-b',
  ].join('\n') + '\n');

  const captured = [];
  const origLog = console.log;
  console.log = (...args) => captured.push(args.join(' '));
  const prevExitCode = process.exitCode;
  process.exitCode = 0;
  try {
    await runWorkspace({ args: ['verify', '--json'], cwd: ws });
  } finally {
    console.log = origLog;
    process.exitCode = prevExitCode;
  }
  const parsed = JSON.parse(captured.join(''));
  assert.equal(parsed.ok, false);
  assert.ok(parsed.missing.includes('repo-b'));
});

test('workspace verify: reports ERR_WORKSPACE_NOT_FOUND when no registry', async () => {
  const ws = tmpDir();
  const capturedErr = [];
  const origErr = console.error;
  console.error = (...args) => capturedErr.push(args.join(' '));
  const prevExitCode = process.exitCode;
  process.exitCode = 0;
  try {
    await runWorkspace({ args: ['verify'], cwd: ws });
  } finally {
    console.error = origErr;
    process.exitCode = prevExitCode;
  }
  const output = capturedErr.join('\n');
  assert.ok(output.includes('ERR_WORKSPACE_NOT_FOUND') || output.includes('workspace registry'), `expected workspace not found message: ${output}`);
});

// ---------------------------------------------------------------------------
// unknown subcommand
// ---------------------------------------------------------------------------

test('workspace unknown subcommand: exits with error', async () => {
  const ws = tmpDir();
  const capturedErr = [];
  const origErr = console.error;
  console.error = (...args) => capturedErr.push(args.join(' '));
  const prevExitCode = process.exitCode;
  process.exitCode = 0;
  try {
    await runWorkspace({ args: ['bogus'], cwd: ws });
  } finally {
    console.error = origErr;
  }
  const output = capturedErr.join('\n');
  assert.ok(output.includes('bogus'), `expected unknown subcommand error: ${output}`);
  process.exitCode = prevExitCode;
});
