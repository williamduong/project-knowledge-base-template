const fs = require('fs');
const os = require('os');
const path = require('path');

const { getGitMetadata, getWorkingTreeStatus } = require('../lib/git');

function parseMinNodeMajor(range) {
  const match = /(\d+)/.exec(range || '');
  return match ? Number(match[1]) : 18;
}

function testLinkCapability(cwd) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-doctor-'));
  const source = path.join(base, 'source');
  const target = path.join(base, 'target-link');

  fs.mkdirSync(source, { recursive: true });

  try {
    const linkType = process.platform === 'win32' ? 'junction' : 'dir';
    fs.symlinkSync(source, target, linkType);
    return { ok: true, detail: `Created ${linkType} link successfully.` };
  } catch (error) {
    return { ok: false, detail: error.message };
  } finally {
    try {
      fs.rmSync(base, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

function parseDoctorArgs(args) {
  const options = {
    json: false,
  };

  for (const arg of args || []) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }

    throw new Error(`Unknown doctor option \"${arg}\".`);
  }

  return options;
}

function runDoctor({ args, cwd, packageJson }) {
  const options = parseDoctorArgs(args);

  const checks = [];
  const workspaceRoot = path.resolve(cwd);
  const minNodeMajor = parseMinNodeMajor(packageJson.engines && packageJson.engines.node);
  const nodeMajor = Number(process.versions.node.split('.')[0]);

  checks.push({
    name: 'Node version',
    status: nodeMajor >= minNodeMajor ? 'PASS' : 'FAIL',
    detail: `Current: v${process.versions.node}, required: >=${minNodeMajor}`,
  });

  const git = getGitMetadata(workspaceRoot);
  if (!git.isGitRepo) {
    checks.push({
      name: 'Git state',
      status: 'WARN',
      detail: 'No git repository detected in current workspace.',
    });
  } else {
    const dirty = getWorkingTreeStatus(workspaceRoot);
    checks.push({
      name: 'Git state',
      status: dirty.length === 0 ? 'PASS' : 'WARN',
      detail:
        dirty.length === 0
          ? `Clean working tree on branch ${git.branch || 'unknown'}.`
          : `Working tree has ${dirty.length} uncommitted change(s).`,
    });
  }

  const linkCheck = testLinkCapability(workspaceRoot);
  checks.push({
    name: 'Symlink/Junction capability',
    status: linkCheck.ok ? 'PASS' : 'FAIL',
    detail: linkCheck.detail,
  });

  const hookDir = path.join(workspaceRoot, '.github', 'hooks');
  const hookFile = path.join(hookDir, 'revision-state-guard.json');
  checks.push({
    name: 'Hook load path',
    status: fs.existsSync(hookFile) ? 'PASS' : 'WARN',
    detail: fs.existsSync(hookFile)
      ? `Found hook: ${hookFile}`
      : `Hook file missing at ${hookFile}`,
  });

  const hasFailure = checks.some((check) => check.status === 'FAIL');
  const hasWarning = checks.some((check) => check.status === 'WARN');
  const summary = hasFailure ? 'FAIL' : hasWarning ? 'WARN' : 'PASS';

  if (options.json) {
    const report = {
      command: 'kb doctor',
      mode: 'json',
      result: summary,
      workspaceRoot,
      nodeVersion: process.versions.node,
      minimumNodeMajor: minNodeMajor,
      checks,
    };
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('kb doctor publish-readiness');
    for (const check of checks) {
      console.log(`- [${check.status}] ${check.name}: ${check.detail}`);
    }
    console.log(`Result: ${summary}`);
  }

  if (hasFailure) {
    throw new Error('Doctor check failed. Resolve FAIL items before publish.');
  }
}

module.exports = {
  runDoctor,
};