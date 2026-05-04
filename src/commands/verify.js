'use strict';

const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const {
  findFrontmatterBounds,
  removeFrontmatterFields,
  updateFrontmatterFields,
} = require('../lib/frontmatter');
const { getGitMetadata, getWorkingTreeStatus } = require('../lib/git');
const { readImpactFile, writeImpactFile } = require('../lib/impact');
const { normalizeDocPath } = require('../lib/bindings');

function parseArgs(args) {
  const options = { json: false, all: false, target: null };
  const rest = [];
  for (const arg of args || []) {
    if (arg === '--json') { options.json = true; continue; }
    if (arg === '--all') { options.all = true; continue; }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown verify option "${arg}". Supported: --json, --all`);
    }
    rest.push(arg);
  }
  if (options.all) {
    if (rest.length > 0) {
      throw new Error('kb verify --all does not accept a target argument.');
    }
  } else {
    if (rest.length !== 1) {
      throw new Error('kb verify requires exactly 1 target: <doc-path>   (or use --all)');
    }
    options.target = rest[0];
  }
  return options;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function verifyOneDoc({ contentRoot, workspaceRoot, docRel, headSha }) {
  const absolute = path.join(contentRoot, docRel);
  if (!fs.existsSync(absolute)) {
    return { doc: docRel, ok: false, reason: 'doc-not-found' };
  }

  const dirty = getWorkingTreeStatus(workspaceRoot)
    .map((entry) => (entry && typeof entry.filePath === 'string') ? entry.filePath : '')
    .filter(Boolean);

  const relFromWorkspace = path.relative(workspaceRoot, absolute).replace(/\\/g, '/');
  const isDocDirty = dirty.some((p) => p === relFromWorkspace || p.endsWith(relFromWorkspace));
  const warning = isDocDirty
    ? 'Doc is dirty in working tree; verify will still update frontmatter, but commit changes carefully.'
    : null;

  const text = fs.readFileSync(absolute, 'utf8');
  let updated;
  try {
    updated = updateFrontmatterFields(text, {
      last_verified: todayIso(),
      last_verified_commit: headSha || 'NOT_AVAILABLE',
    });
    updated = removeFrontmatterFields(updated, ['downgraded_at', 'downgraded_from', 'downgrade_reason']);
  } catch (err) {
    return { doc: docRel, ok: false, reason: err.message };
  }

  fs.writeFileSync(absolute, updated, 'utf8');
  return {
    doc: docRel,
    ok: true,
    last_verified: todayIso(),
    last_verified_commit: headSha || 'NOT_AVAILABLE',
    warning,
  };
}

function clearImpactEntries({ contentRoot, verifiedDocs }) {
  let impactData;
  try {
    impactData = readImpactFile(contentRoot);
  } catch {
    return { cleared: 0, written: false };
  }
  if (!impactData || !Array.isArray(impactData.impacted)) {
    return { cleared: 0, written: false };
  }
  const before = impactData.impacted.length;
  const verifiedSet = new Set(verifiedDocs.map(normalizeDocPath));
  impactData.impacted = impactData.impacted.filter((entry) => !verifiedSet.has(normalizeDocPath(entry.doc)));
  const cleared = before - impactData.impacted.length;
  if (cleared > 0) {
    writeImpactFile(contentRoot, impactData);
    return { cleared, written: true };
  }
  return { cleared: 0, written: false };
}

function runVerify({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const ctx = resolveExistingState({ workspaceRoot });
  const git = getGitMetadata(workspaceRoot);
  const headSha = git.head;

  const targets = [];
  if (options.all) {
    let impactData;
    try {
      impactData = readImpactFile(ctx.contentRoot);
    } catch {
      impactData = null;
    }
    if (!impactData || !Array.isArray(impactData.impacted) || impactData.impacted.length === 0) {
      const msg = 'kb verify --all: no impacted docs in impact.json. Run `kb scan` first or pass a single doc.';
      if (options.json) {
        console.log(JSON.stringify({ command: 'kb verify', mode: 'all', verified: [], failed: [], cleared: 0, message: msg }, null, 2));
      } else {
        console.log(msg);
      }
      return;
    }
    for (const entry of impactData.impacted) targets.push(normalizeDocPath(entry.doc));
  } else {
    targets.push(normalizeDocPath(options.target));
  }

  const verified = [];
  const failed = [];
  for (const docRel of targets) {
    const result = verifyOneDoc({ contentRoot: ctx.contentRoot, workspaceRoot, docRel, headSha });
    if (result.ok) verified.push(result);
    else failed.push(result);
  }

  // Atomicity: if --all and any failure, do NOT clear impact entries (R7-style).
  let clearResult = { cleared: 0, written: false };
  if (failed.length === 0) {
    clearResult = clearImpactEntries({
      contentRoot: ctx.contentRoot,
      verifiedDocs: verified.map((v) => v.doc),
    });
  }

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kb verify',
      mode: options.all ? 'all' : 'single',
      head_sha: headSha,
      verified,
      failed,
      cleared_impact_entries: clearResult.cleared,
      impact_file_written: clearResult.written,
    }, null, 2));
    if (failed.length > 0) process.exit(1);
    return;
  }

  console.log(`kb verify: ${verified.length} ok, ${failed.length} failed (HEAD=${headSha || 'NOT_AVAILABLE'})`);
  for (const v of verified) {
    console.log(`  ok  : ${v.doc}  (last_verified=${v.last_verified}, commit=${v.last_verified_commit})`);
    if (v.warning) console.log(`        warning: ${v.warning}`);
  }
  for (const f of failed) {
    console.log(`  fail: ${f.doc}  (${f.reason})`);
  }
  if (clearResult.written) {
    console.log(`  impact.json: cleared ${clearResult.cleared} entr${clearResult.cleared === 1 ? 'y' : 'ies'}`);
  } else if (failed.length > 0) {
    console.log('  impact.json: NOT updated (kept entries because some verifications failed)');
  }
  if (failed.length > 0) process.exit(1);
}

module.exports = {
  runVerify,
  parseArgs,
  updateFrontmatterFields,
  findFrontmatterBounds,
};
