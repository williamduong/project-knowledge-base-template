const fs = require('fs');
const path = require('path');

const { readStateFile } = require('./state');
const { resolveExistingState } = require('./context');
const { getGitMetadata, getChangedFilesSince } = require('./git');
const { listAllDocBindings, normalizeDocPath } = require('./bindings');
const { matchPaths, normalizePath } = require('./binding-matcher');
const { parseFrontmatter } = require('./kb-analysis');

const IMPACT_FILE_VERSION = 1;
const IMPACT_RELATIVE_PATH = path.join('.kb', 'impact.json');

function impactFilePath(contentRoot) {
  return path.join(contentRoot, IMPACT_RELATIVE_PATH);
}

function readDocFrontmatter(absoluteDocPath) {
  if (!fs.existsSync(absoluteDocPath)) return null;
  let raw;
  try {
    raw = fs.readFileSync(absoluteDocPath, 'utf8');
  } catch {
    return null;
  }
  return parseFrontmatter(raw);
}

function contentRootRelativeToWorkspace(workspaceRoot, contentRoot) {
  const rel = path.relative(workspaceRoot, contentRoot);
  return normalizePath(rel);
}

/**
 * Phân loại changed files thành 2 nhóm:
 * - selfEdits: path nằm dưới contentRoot relative (KB tự đổi — R12)
 * - codeChanges: phần còn lại (candidate cho impact match)
 */
function partitionChanges(changedFiles, contentRootRel) {
  const prefix = contentRootRel ? `${contentRootRel.replace(/\/+$/, '')}/` : null;
  const selfEdits = [];
  const codeChanges = [];
  for (const entry of changedFiles) {
    const p = normalizePath(entry.path);
    if (prefix && (p === contentRootRel || p.startsWith(prefix))) {
      selfEdits.push({ ...entry, path: p });
    } else {
      codeChanges.push({ ...entry, path: p });
    }
  }
  return { selfEdits, codeChanges };
}

/**
 * Build impact data structure cho 1 workspace.
 * Không ghi file — caller quyết.
 */
function computeImpact({ workspaceRoot, ctx = null }) {
  const resolvedCtx = ctx || resolveExistingState({ workspaceRoot });
  const state = readStateFile({ statePath: resolvedCtx.statePath });
  const baseline = state.sourceRepositoryGitBaseline;
  const gitMeta = getGitMetadata(workspaceRoot);
  const head = gitMeta.head || null;
  const scannedAt = new Date().toISOString();

  const baseResult = {
    version: IMPACT_FILE_VERSION,
    scanned_at: scannedAt,
    baseline: baseline || null,
    head,
    storage_mode: resolvedCtx.mode,
    impacted: [],
    self_edits: [],
    unbound_changes: [],
    skipped_reason: null,
  };

  if (!gitMeta.isGitRepo) {
    baseResult.skipped_reason = 'not-a-git-repo';
    return baseResult;
  }
  if (!baseline || baseline === 'NOT_AVAILABLE') {
    baseResult.skipped_reason = 'no-baseline';
    return baseResult;
  }

  const changedFiles = getChangedFilesSince(workspaceRoot, baseline, head || 'HEAD');
  const contentRootRel = contentRootRelativeToWorkspace(workspaceRoot, resolvedCtx.contentRoot);
  const { selfEdits, codeChanges } = partitionChanges(changedFiles, contentRootRel);

  const codePaths = codeChanges.map((c) => c.path);
  const docBindings = listAllDocBindings(resolvedCtx.contentRoot);

  const impacted = [];
  const matchedPathSet = new Set();

  for (const binding of docBindings) {
    const matches = matchPaths(codePaths, binding.paths);
    if (matches.length === 0) continue;

    matches.forEach((m) => matchedPathSet.add(m));

    const fm = readDocFrontmatter(path.join(resolvedCtx.contentRoot, binding.doc));
    impacted.push({
      doc: normalizeDocPath(binding.doc),
      kb_state: (fm && typeof fm.kb_state === 'string') ? fm.kb_state : null,
      last_verified: (fm && typeof fm.last_verified === 'string') ? fm.last_verified : null,
      last_verified_commit: (fm && typeof fm.last_verified_commit === 'string') ? fm.last_verified_commit : null,
      verification: (fm && typeof fm.verification === 'string') ? fm.verification : null,
      binding_source: binding.source,
      matched_changes: matches,
    });
  }

  const unbound = codePaths.filter((p) => !matchedPathSet.has(p));

  baseResult.impacted = impacted;
  baseResult.self_edits = selfEdits.map((e) => ({ status: e.status, path: e.path }));
  baseResult.unbound_changes = unbound;
  return baseResult;
}

function writeImpactFile(contentRoot, data) {
  const filePath = impactFilePath(contentRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return filePath;
}

function readImpactFile(contentRoot) {
  const filePath = impactFilePath(contentRoot);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Verdict cho `kb scan --quiet` exit codes:
 * - 0 clean: 0 impacted, 0 self_edits, 0 unbound
 * - 1 attention: có impacted hoặc unbound (cần review)
 * - 2 blocked: skipped_reason set (không scan được)
 *
 * Note: self_edits không tự nâng verdict — chỉ là info; `kb status` sẽ dùng riêng.
 */
function deriveVerdict(impactData) {
  if (!impactData) return { code: 2, label: 'error', reason: 'no-data' };
  if (impactData.skipped_reason) {
    return { code: 2, label: 'blocked', reason: impactData.skipped_reason };
  }
  const impactedCount = (impactData.impacted || []).length;
  const unboundCount = (impactData.unbound_changes || []).length;
  if (impactedCount === 0 && unboundCount === 0) {
    return { code: 0, label: 'clean', reason: null };
  }
  return { code: 1, label: 'attention', reason: impactedCount > 0 ? 'impacted-docs' : 'unbound-changes' };
}

module.exports = {
  IMPACT_FILE_VERSION,
  computeImpact,
  contentRootRelativeToWorkspace,
  deriveVerdict,
  impactFilePath,
  partitionChanges,
  readImpactFile,
  writeImpactFile,
};
