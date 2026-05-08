const fs = require('fs');
const os = require('os');
const path = require('path');

const { getGitMetadata, getWorkingTreeStatus } = require('../lib/git');
const { detectKbArtifacts } = require('../lib/kb-presence');
const { resolveExistingState } = require('../lib/context');
const { readImpactFile } = require('../lib/impact');
const { buildGraph, coerceListField, collectMarkdownFiles, findStrongCycles } = require('../lib/impact-graph');
const { parseFrontmatter } = require('../lib/kb-analysis');
const { listActiveIntentIds, listClosedIntentRecords, workspaceIntentMetaPath, intentWorkspacePath } = require('../lib/intent');

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

function scanLastVerifiedCommitMissing(contentRoot) {
  const fs = require('fs');
  const stale = [];
  const files = collectMarkdownFiles(contentRoot, []);
  for (const abs of files) {
    let raw;
    try { raw = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    const fm = parseFrontmatter(raw);
    if (!fm) continue;
    const lv = typeof fm.last_verified === 'string' ? fm.last_verified.trim() : '';
    const lvc = typeof fm.last_verified_commit === 'string' ? fm.last_verified_commit.trim() : '';
    if (lv && !lvc) {
      stale.push(abs);
    }
  }
  return stale;
}

function scanLegacySchemaIntents(contentRoot) {
  const legacy = [];
  let ids = [];
  try { ids = listActiveIntentIds(contentRoot); } catch { return legacy; }
  for (const id of ids) {
    const workspacePath = intentWorkspacePath(contentRoot, id);
    const metaPath = workspaceIntentMetaPath(workspacePath);
    if (!fs.existsSync(metaPath)) continue;
    let text;
    try { text = fs.readFileSync(metaPath, 'utf8'); } catch { continue; }
    const meta = parseFrontmatter(text);
    if (!meta) continue;
    if (!meta.schema_version && (meta.status || meta.lifecycle_state || meta.legacy)) {
      legacy.push(id);
    }
  }
  // Also check closed intents
  let closed = [];
  try { closed = listClosedIntentRecords(contentRoot); } catch { return legacy; }
  for (const record of closed) {
    if (!record.metaPath || !fs.existsSync(record.metaPath)) continue;
    const meta = record.meta || {};
    if (!meta.schema_version && (meta.status || meta.lifecycle_state || meta.legacy)) {
      legacy.push(record.id);
    }
  }
  return legacy;
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

function normalizePosix(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

function isNewDocStatus(status) {
  const s = String(status || '').trim();
  if (s === '??') return true;
  return s.includes('A');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsDocReference(text, candidateRelPath, docRelPath) {
  const body = String(text || '');
  const candidate = normalizePosix(candidateRelPath);
  const doc = normalizePosix(docRelPath);
  if (!body || !doc) return false;

  if (body.includes(doc)) return true;

  const candidateDir = normalizePosix(path.posix.dirname(candidate));
  const docDir = normalizePosix(path.posix.dirname(doc));
  const docBase = path.posix.basename(doc);
  const relFromCandidate = normalizePosix(path.posix.relative(candidateDir, doc));

  const patterns = [
    new RegExp(`\\]\\((?:\\./)?${escapeRegExp(docBase)}(?:#[^)]+)?\\)`),
    new RegExp(`\\]\\((?:\\./)?${escapeRegExp(relFromCandidate)}(?:#[^)]+)?\\)`),
  ];

  // If the candidate is in a different folder, basename-only links are ambiguous.
  if (candidateDir !== docDir) {
    patterns.shift();
  }

  return patterns.some((p) => p.test(body));
}

function listRoutingCandidateFiles(docRelPath) {
  const doc = normalizePosix(docRelPath);
  const dir = path.posix.dirname(doc);
  const candidates = [
    'INDEX.md',
    '00-start-here/intent-index.md',
    '00-start-here/code-qa-index.md',
  ];

  if (dir && dir !== '.') {
    candidates.push(`${dir}/INDEX.md`);
    candidates.push(`${dir}/README.md`);
  }

  return Array.from(new Set(candidates.map(normalizePosix)));
}

function isDocRegisteredInRouting(contentRoot, docRelPath, cache) {
  const candidates = listRoutingCandidateFiles(docRelPath);
  for (const candidateRelPath of candidates) {
    if (!cache.has(candidateRelPath)) {
      const abs = path.join(contentRoot, ...candidateRelPath.split('/'));
      if (!fs.existsSync(abs)) {
        cache.set(candidateRelPath, null);
      } else {
        cache.set(candidateRelPath, fs.readFileSync(abs, 'utf8'));
      }
    }

    const body = cache.get(candidateRelPath);
    if (typeof body !== 'string') continue;
    if (containsDocReference(body, candidateRelPath, docRelPath)) {
      return true;
    }
  }
  return false;
}

function detectUnregisteredNewDocs({ workspaceRoot, contentRoot, workingTree }) {
  const contentRootRel = normalizePosix(path.relative(workspaceRoot, contentRoot));
  const rootPrefix = contentRootRel ? `${contentRootRel}/` : '';
  const tree = Array.isArray(workingTree) ? workingTree : getWorkingTreeStatus(workspaceRoot);

  const newDocs = [];
  for (const entry of tree) {
    if (!entry || !isNewDocStatus(entry.status)) continue;
    const filePath = normalizePosix(entry.filePath);
    if (!filePath) continue;
    if (rootPrefix && !(filePath === contentRootRel || filePath.startsWith(rootPrefix))) continue;

    const rel = rootPrefix ? filePath.slice(rootPrefix.length) : filePath;
    if (!rel.toLowerCase().endsWith('.md')) continue;
    if (rel.startsWith('.kb/')) continue;
    newDocs.push(rel);
  }

  const uniqueNewDocs = Array.from(new Set(newDocs)).sort();
  const cache = new Map();
  const missingDocs = uniqueNewDocs.filter((doc) => !isDocRegisteredInRouting(contentRoot, doc, cache));

  return {
    newDocs: uniqueNewDocs,
    missingDocs,
  };
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

  // Register-first guard: detect newly added docs that are not routed in indexes.
  if (impactCtx && git.isGitRepo) {
    try {
      const { newDocs, missingDocs } = detectUnregisteredNewDocs({
        workspaceRoot,
        contentRoot: impactCtx.contentRoot,
      });

      if (newDocs.length > 0 && missingDocs.length > 0) {
        const sample = missingDocs.slice(0, 5).join(', ');
        checks.push({
          name: 'routing-registration-missing',
          status: 'WARN',
          detail: `${missingDocs.length}/${newDocs.length} new markdown doc(s) are not registered in KB routing/index files. Sample: ${sample}${missingDocs.length > 5 ? ' ...' : ''}. Update intent-index/code-qa-index or folder INDEX/README in the same change set.`,
        });
      } else if (newDocs.length > 0) {
        checks.push({
          name: 'routing-registration-missing',
          status: 'PASS',
          detail: `All ${newDocs.length} new markdown doc(s) are registered in KB routing/index files.`,
        });
      }
    } catch (err) {
      checks.push({
        name: 'routing-registration-scan',
        status: 'WARN',
        detail: `Failed to scan new-doc routing registration: ${err.message}`,
      });
    }
  }

  // related-semantic + last_verified_commit doctor rules (v1.4)
  if (impactCtx) {
    try {
      const { graph, stats } = buildGraph({ contentRoot: impactCtx.contentRoot });
      if (stats.legacyRelatedDocs > 0) {
        checks.push({
          name: 'related-legacy-field',
          status: 'INFO',
          detail: `${stats.legacyRelatedDocs} doc(s) still use legacy "related:" field. Rename to "related_weak:" (or promote to "related_strong:") per template/15-governance/related-semantic.md. Not auto-rewritten by upgrade.`,
        });
      }
      if (stats.conflictPairs > 0) {
        checks.push({
          name: 'related-strong-weak-conflict',
          status: 'WARN',
          detail: `${stats.conflictPairs} path(s) appear in both related_strong and related_weak across the KB. Strong wins for traversal; remove the weak duplicate.`,
        });
      }
      // Cycle detection in related_strong subgraph (v1.4 Phase 2).
      const cycles = findStrongCycles(graph);
      if (cycles.length > 0) {
        const sample = cycles.slice(0, 3).map((c) => c.concat([c[0]]).join(' -> ')).join('; ');
        checks.push({
          name: 'related-strong-cycle',
          status: 'WARN',
          detail: `${cycles.length} cycle(s) detected in related_strong graph. Cycles inflate recursive impact and complicate review. Sample: ${sample}${cycles.length > 3 ? ' ...' : ''}`,
        });
      }
    } catch (err) {
      checks.push({
        name: 'related-semantic-scan',
        status: 'WARN',
        detail: `Failed to scan related-semantic: ${err.message}`,
      });
    }

    try {
      const stale = scanLastVerifiedCommitMissing(impactCtx.contentRoot);
      if (stale.length > 0) {
        checks.push({
          name: 'last-verified-commit-missing',
          status: 'WARN',
          detail: `${stale.length} doc(s) have last_verified set but last_verified_commit missing. Run "kb verify <doc>" to fill commit SHA.`,
        });
      }
    } catch (err) {
      checks.push({
        name: 'last-verified-commit-scan',
        status: 'WARN',
        detail: `Failed to scan last_verified_commit: ${err.message}`,
      });
    }

    // legacy-schema-migration: detect intent files that still use pre-v2.4 schema (missing schema_version)
    try {
      const legacyIntents = scanLegacySchemaIntents(impactCtx.contentRoot);
      if (legacyIntents.length > 0) {
        checks.push({
          name: 'legacy-schema-migration',
          status: 'WARN',
          detail: `${legacyIntents.length} intent(s) use pre-v2.4 schema (no schema_version). Run "kb migrate --to=v2.4.0" to upgrade. Affected: ${legacyIntents.slice(0, 5).join(', ')}${legacyIntents.length > 5 ? ' ...' : ''}.`,
        });
      } else {
        checks.push({
          name: 'legacy-schema-migration',
          status: 'PASS',
          detail: 'All active/closed intents have schema_version. No migration needed.',
        });
      }
    } catch (err) {
      checks.push({
        name: 'legacy-schema-migration',
        status: 'WARN',
        detail: `Failed to scan intent schema versions: ${err.message}`,
      });
    }
  }

  const presence = detectKbArtifacts(workspaceRoot);
  if (presence.classification === 'partial') {
    const missing = presence.stateFileRawExists ? 'state.json present but invalid (missing schemaVersion or unparseable)' : 'state.json missing';
    const leftovers = [
      presence.kbDir ? 'knowledge-base/' : null,
      presence.agentFile ? '.github/agents/kbx.agent.md' : null,
      presence.promptFile ? '.github/prompts/kbx-*.prompt.md' : null,
      presence.agentsMd ? 'AGENTS.md' : null,
    ].filter(Boolean);
    checks.push({
      name: 'KB install state',
      status: 'FAIL',
      detail: `Partial / corrupted: ${missing}. Leftovers: ${leftovers.join(', ')}. Run "kbx status" for recovery guidance; do NOT run "kbx init" before troubleshooting.`,
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
  const summary = hasFailure ? 'FAIL' : hasWarning ? 'WARN' : 'PASS';  if (options.json) {
    const report = {
      command: 'kbx doctor',
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
    console.log('kbx doctor publish-readiness');
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
  detectUnregisteredNewDocs,
  isNewDocStatus,
  scanLegacySchemaIntents,
  runDoctor,
};