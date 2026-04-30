const fs = require('fs');
const os = require('os');
const path = require('path');

const { getGitMetadata, getWorkingTreeStatus } = require('../lib/git');
const { detectKbArtifacts } = require('../lib/kb-presence');
const { resolveExistingState } = require('../lib/context');
const { readImpactFile } = require('../lib/impact');

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
    strict: false,
  };

  for (const arg of args || []) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--strict') {
      options.strict = true;
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

  // git-impact-pending: read-only check against impact.json (does not auto-scan).
  // Does not depend on KB presence checks below — handles its own resolution.
  let impactCtx = null;
  try {
    impactCtx = resolveExistingState({ workspaceRoot });
  } catch {
    // No state, no impact check — KB presence check below will surface this.
  }
  if (impactCtx) {
    let impactData = null;
    try {
      impactData = readImpactFile(impactCtx.contentRoot);
    } catch (err) {
      checks.push({
        name: 'git-impact-pending',
        status: 'WARN',
        detail: `Unable to read impact.json: ${err.message}`,
      });
      impactData = null;
    }
    if (impactData) {
      const impactedCount = (impactData.impacted || []).length;
      const unboundCount = (impactData.unbound_changes || []).length;
      if (impactData.skipped_reason) {
        checks.push({
          name: 'git-impact-pending',
          status: 'WARN',
          detail: `Impact scan skipped: ${impactData.skipped_reason}. Run "kb status" or "kb scan" once baseline is set.`,
        });
      } else if (impactedCount > 0 || unboundCount > 0) {
        const parts = [];
        if (impactedCount > 0) parts.push(`${impactedCount} doc(s) need re-verification`);
        if (unboundCount > 0) parts.push(`${unboundCount} unbound change(s)`);
        checks.push({
          name: 'git-impact-pending',
          status: 'WARN',
          detail: `${parts.join('; ')}. Run "kb status" for details.`,
        });
      } else {
        checks.push({
          name: 'git-impact-pending',
          status: 'PASS',
          detail: `No pending impact (baseline ${impactData.baseline || 'unknown'} → ${impactData.head || 'HEAD'}).`,
        });
      }
    } else if (impactCtx) {
      checks.push({
        name: 'git-impact-pending',
        status: 'WARN',
        detail: 'No impact.json found. Run "kb scan" to generate.',
      });
    }
  }

  const presence = detectKbArtifacts(workspaceRoot);
  if (presence.classification === 'partial') {
    const missing = presence.stateFileRawExists ? 'state.json present but invalid (missing schemaVersion or unparseable)' : 'state.json missing';
    const leftovers = [
      presence.kbDir ? 'knowledge-base/' : null,
      presence.agentFile ? '.github/agents/kb.agent.md' : null,
      presence.promptFile ? '.github/prompts/kb-*.prompt.md' : null,
      presence.agentsMd ? 'AGENTS.md' : null,
    ].filter(Boolean);
    checks.push({
      name: 'KB install state',
      status: 'FAIL',
      detail: `Partial / corrupted: ${missing}. Leftovers: ${leftovers.join(', ')}. Run "kb status" for recovery guidance; do NOT run "kb init" before troubleshooting.`,
    });
  } else {
    checks.push({
      name: 'KB install state',
      status: 'PASS',
      detail: presence.classification === 'healthy' ? 'state.json valid (schemaVersion present).' : 'No KB detected (fresh workspace).',
    });
  }

  const hasFailure = checks.some((check) => check.status === 'FAIL');
  const hasWarning = checks.some((check) => check.status === 'WARN');
  const summary = hasFailure ? 'FAIL' : hasWarning ? 'WARN' : 'PASS';

  if (options.json) {
    const report = {
      command: 'kb doctor',
      mode: 'json',
      strict: options.strict,
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

  const shouldFail = hasFailure || (options.strict && hasWarning);
  if (shouldFail) {
    const failureMessage = hasFailure
      ? 'Doctor check failed. Resolve FAIL items before publish.'
      : 'Doctor strict check failed. Resolve WARN items before publish or run without --strict.';

    if (options.json) {
      process.exitCode = 1;
      return;
    }

    throw new Error(failureMessage);
  }
}

module.exports = {
  runDoctor,
};