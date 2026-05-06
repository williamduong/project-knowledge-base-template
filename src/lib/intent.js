'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * Root folder for all active intent workspaces.
 * Scoped to the KB contentRoot so it works for both tracked and private-git modes.
 */
function activeIntentsRoot(contentRoot) {
  return path.join(contentRoot, 'intents', '_active');
}

/**
 * Root folder for archived intent workspaces.
 */
function archiveIntentsRoot(contentRoot) {
  return path.join(contentRoot, 'intents', '_archive');
}

/**
 * Path to the workspace folder for a specific active intent.
 */
function intentWorkspacePath(contentRoot, intentId) {
  return path.join(activeIntentsRoot(contentRoot), intentId);
}

/**
 * Path to intent.md inside an active workspace.
 */
function intentMetaPath(contentRoot, intentId) {
  return path.join(intentWorkspacePath(contentRoot, intentId), 'intent.md');
}

/**
 * Path to the proposed-changes/ directory inside an active workspace.
 */
function proposedChangesPath(contentRoot, intentId) {
  return path.join(intentWorkspacePath(contentRoot, intentId), 'proposed-changes');
}

// ---------------------------------------------------------------------------
// ID suggestion
// ---------------------------------------------------------------------------

/**
 * Sanitize a string to a valid kebab-case intent ID.
 * Strips leading slashes (e.g. from branch names like feature/xyz),
 * replaces non-alphanumeric chars with hyphens, collapses consecutive hyphens,
 * and trims trailing/leading hyphens.
 */
function sanitizeId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || null;
}

/**
 * Suggest a human-readable intent ID.
 * Priority: current git branch name (sanitized) → timestamp fallback.
 */
function suggestIntentId(branch) {
  if (branch) {
    const sanitized = sanitizeId(branch);
    if (sanitized && sanitized.length >= 3) {
      return sanitized;
    }
  }
  // Timestamp fallback: intent-YYYYMMDD-HHMMSS
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `intent-${ts}`;
}

// ---------------------------------------------------------------------------
// Intent metadata
// ---------------------------------------------------------------------------

const VALID_MODES = new Set(['quick', 'full']);

/**
 * Build the content of intent.md for a new intent workspace.
 */
function buildIntentMeta({ intentId, mode, changeType }) {
  const now = new Date().toISOString();
  const reserveFields = mode === 'full'
    ? [
        'lesson_id: null',
        'lifecycle_state: proposed',
        'promotion_ready: false',
        'linked_signals: []',
        'promote_decision_ref: null',
      ].join('\n')
    : null;

  const lines = [
    '---',
    `id: ${intentId}`,
    `mode: ${mode}`,
    `status: open`,
    `created_at: ${now}`,
    `change_type: ${changeType || 'docs'}`,
    `change_scope: []`,
    `impact_signals: []`,
    `decision_summary: ""`,
    `review_after: null`,
  ];
  if (reserveFields) {
    lines.push('# v1.8-ready reserve fields (do not remove):');
    lines.push(reserveFields);
  }
  lines.push('---');
  lines.push('');
  lines.push(`# Intent: ${intentId}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('> Fill in: what this change achieves and why.');
  lines.push('');
  if (mode === 'full') {
    lines.push('## Plan');
    lines.push('');
    lines.push('> See `plan.md` for full details.');
    lines.push('');
    lines.push('## Impact');
    lines.push('');
    lines.push('> See `impact.md` for full details.');
    lines.push('');
  }
  lines.push('## Staged Files');
  lines.push('');
  lines.push('> List files staged in `proposed-changes/` here as you add them.');
  lines.push('> Mirror path: `proposed-changes/<path-relative-to-kb-root>`');
  lines.push('');
  return lines.join('\n') + '\n';
}

/**
 * Build the content of plan.md stub for full-mode intents.
 */
function buildPlanStub(intentId) {
  return [
    '---',
    `intent_id: ${intentId}`,
    'type: intent-plan',
    '---',
    '',
    '# Plan',
    '',
    '## Goal',
    '',
    '> What does this change achieve?',
    '',
    '## Files Touched',
    '',
    '> List each file and describe whether it is new or modified.',
    '',
    '## Acceptance Criteria',
    '',
    '> When is this intent done? What must be true to apply?',
    '',
  ].join('\n');
}

/**
 * Build the content of impact.md stub for full-mode intents.
 */
function buildImpactStub(intentId) {
  return [
    '---',
    `intent_id: ${intentId}`,
    'type: intent-impact',
    '---',
    '',
    '# Impact',
    '',
    '## Affected Areas',
    '',
    '> Which KB tiers, agents, or docs are affected?',
    '',
    '## Breaking Change',
    '',
    '> yes / no — if yes, describe migration.',
    '',
    '## Downstream Risk',
    '',
    '> Describe risks to downstream consumers.',
    '',
    '## Impact Signals',
    '',
    '> List observed or anticipated impact signals (e.g. drift, rework, user confusion).',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Filesystem operations
// ---------------------------------------------------------------------------

/**
 * Create a new intent workspace on disk.
 * Returns the workspace path.
 */
function createIntentWorkspace(contentRoot, { intentId, mode, changeType }) {
  const wsPath = intentWorkspacePath(contentRoot, intentId);

  if (fs.existsSync(wsPath)) {
    throw new Error(
      `Intent workspace "${intentId}" already exists at:\n  ${wsPath}\n` +
      `Use a different ID or cancel the existing intent first.`
    );
  }

  fs.mkdirSync(wsPath, { recursive: true });
  fs.mkdirSync(proposedChangesPath(contentRoot, intentId), { recursive: true });

  // intent.md (required for all modes)
  fs.writeFileSync(intentMetaPath(contentRoot, intentId), buildIntentMeta({ intentId, mode, changeType }));

  // plan.md and impact.md stubs (required for full mode)
  if (mode === 'full') {
    fs.writeFileSync(path.join(wsPath, 'plan.md'), buildPlanStub(intentId));
    fs.writeFileSync(path.join(wsPath, 'impact.md'), buildImpactStub(intentId));
  }

  return wsPath;
}

/**
 * Read and parse the frontmatter of intent.md.
 * Returns a plain object with the frontmatter fields.
 * Throws if the file does not exist.
 */
function readIntentMeta(contentRoot, intentId) {
  const metaPath = intentMetaPath(contentRoot, intentId);
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Intent "${intentId}" not found. Expected: ${metaPath}`);
  }
  const text = fs.readFileSync(metaPath, 'utf8');
  return parseIntentFrontmatter(text);
}

/**
 * Parse YAML-like frontmatter from intent.md text.
 * Supports only simple key: value and key: [] forms (no nested objects).
 */
function parseIntentFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const block = match[1];
  const result = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.slice(0, colonIdx).trim();
    const raw = line.slice(colonIdx + 1).trim();
    if (raw === '[]') {
      result[key] = [];
    } else if (raw === 'null') {
      result[key] = null;
    } else if (raw === 'true') {
      result[key] = true;
    } else if (raw === 'false') {
      result[key] = false;
    } else if (raw.startsWith('"') && raw.endsWith('"')) {
      result[key] = raw.slice(1, -1);
    } else {
      result[key] = raw;
    }
  }
  return result;
}

/**
 * List all active intent IDs by scanning the _active directory.
 */
function listActiveIntentIds(contentRoot) {
  const root = activeIntentsRoot(contentRoot);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

/**
 * Collect staged file paths (relative to KB root) for a given intent.
 * Walks proposed-changes/ recursively and returns relative paths from KB root.
 */
function listStagedFiles(contentRoot, intentId) {
  const pcDir = proposedChangesPath(contentRoot, intentId);
  if (!fs.existsSync(pcDir)) return [];
  const results = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        // Return relative to contentRoot (which is the KB root)
        const rel = path.relative(path.join(contentRoot, 'intents', '_active', intentId, 'proposed-changes'), full);
        results.push(rel.replace(/\\/g, '/'));
      }
    }
  };
  walk(pcDir);
  return results;
}

/**
 * Validate that staged files are properly mirrored.
 * A valid staged file must be at proposed-changes/<relative-path> where
 * the relative path is at least 1 directory deep (i.e. not directly under proposed-changes/).
 * Returns array of { file, issue } for any violations.
 */
function validateStagedFilePaths(stagedFiles) {
  const issues = [];
  for (const f of stagedFiles) {
    const parts = f.replace(/\\/g, '/').split('/');
    if (parts.length < 2) {
      issues.push({
        file: f,
        issue: 'File placed directly in proposed-changes/ root. Mirror path must be proposed-changes/<relative-from-kb-root>/<file>.',
      });
    }
  }
  return issues;
}

/**
 * Cancel (delete) an active intent workspace.
 * Returns the workspace path that was removed.
 */
function cancelIntent(contentRoot, intentId) {
  const wsPath = intentWorkspacePath(contentRoot, intentId);
  if (!fs.existsSync(wsPath)) {
    throw new Error(`Intent "${intentId}" not found. Nothing to cancel.`);
  }
  fs.rmSync(wsPath, { recursive: true, force: true });
  return wsPath;
}

/**
 * Derive an archive folder name: <intentId>-<yyyymmdd-hhmmss>.
 * Uses the provided timestamp string or generates one.
 */
function archiveFolderName(intentId, timestamp) {
  const ts = (timestamp || new Date().toISOString())
    .replace(/[-:T.]/g, '')
    .slice(0, 14);
  return `${intentId}-${ts}`;
}

/**
 * Move an active intent workspace to the archive.
 * Returns the archive workspace path.
 */
function archiveIntent(contentRoot, intentId, timestamp) {
  const srcPath = intentWorkspacePath(contentRoot, intentId);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Intent "${intentId}" not found at:\n  ${srcPath}`);
  }
  const archiveRoot = archiveIntentsRoot(contentRoot);
  fs.mkdirSync(archiveRoot, { recursive: true });
  const destName = archiveFolderName(intentId, timestamp);
  const destPath = path.join(archiveRoot, destName);
  fs.renameSync(srcPath, destPath);
  return destPath;
}

// ---------------------------------------------------------------------------
// Apply: write staged files + apply-record.json
// ---------------------------------------------------------------------------

/**
 * Classify a staged file as new (+) or modified (~) by checking whether the
 * target path already exists in the KB content root.
 */
function classifyStagedFile(contentRoot, intentId, relFile) {
  const targetPath = path.join(contentRoot, relFile);
  return fs.existsSync(targetPath) ? 'modified' : 'new';
}

/**
 * Build the apply-record.json payload (calibration-ready evidence §6.4).
 */
function buildApplyRecord({ meta, stagedFiles, appliedAt }) {
  return {
    intent_id: meta.id,
    mode: meta.mode,
    applied_at: appliedAt || new Date().toISOString(),
    applied_files: stagedFiles,
    change_type: meta.change_type || 'docs',
    change_scope: Array.isArray(meta.change_scope) && meta.change_scope.length > 0
      ? meta.change_scope
      : stagedFiles,
    impact_signals: Array.isArray(meta.impact_signals) ? meta.impact_signals : [],
    decision_summary: meta.decision_summary || '',
    review_after: meta.review_after || null,
  };
}

/**
 * Copy staged files from proposed-changes/ to the KB content root.
 * Returns array of { file, op } where op is 'new' or 'modified'.
 */
function applyStagedFiles(contentRoot, intentId, stagedFiles) {
  const pcDir = proposedChangesPath(contentRoot, intentId);
  const results = [];
  for (const relFile of stagedFiles) {
    const src = path.join(pcDir, relFile);
    const dest = path.join(contentRoot, relFile);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const op = fs.existsSync(dest) ? 'modified' : 'new';
    fs.copyFileSync(src, dest);
    results.push({ file: relFile, op });
  }
  return results;
}

/**
 * Write apply-record.json into the active intent workspace (before archiving).
 */
function writeApplyRecord(contentRoot, intentId, record) {
  const wsPath = intentWorkspacePath(contentRoot, intentId);
  const dest = path.join(wsPath, 'apply-record.json');
  fs.writeFileSync(dest, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return dest;
}

// ---------------------------------------------------------------------------
// intents_applied[] derivation (§6.2 release ledger boundary rule)
// ---------------------------------------------------------------------------

/**
 * Derive intents applied since the last release boundary.
 *
 * Boundary rule (I5): "all intents archived after last release ledger entry timestamp".
 * - Reads _archive/ directories, extracts applied_at from apply-record.json.
 * - Compares against lastReleasedAt (ISO string from the last release ledger entry).
 * - If no lastReleasedAt (no prior release), returns all archived intents.
 * - Returns array of { intent_id, mode, change_type, applied_at } objects.
 */
function deriveIntentsApplied(contentRoot, lastReleasedAt) {
  const archiveRoot = archiveIntentsRoot(contentRoot);
  if (!fs.existsSync(archiveRoot)) return [];

  const entries = fs.readdirSync(archiveRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const cutoff = lastReleasedAt ? new Date(lastReleasedAt).getTime() : 0;
  const results = [];

  for (const dirName of entries) {
    const recordPath = path.join(archiveRoot, dirName, 'apply-record.json');
    if (!fs.existsSync(recordPath)) continue;
    let record;
    try {
      record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
    } catch {
      continue;
    }
    const appliedAt = record.applied_at ? new Date(record.applied_at).getTime() : 0;
    if (appliedAt > cutoff) {
      results.push({
        intent_id: record.intent_id || dirName,
        mode: record.mode || null,
        change_type: record.change_type || null,
        applied_at: record.applied_at || null,
      });
    }
  }

  // Sort ascending by applied_at
  results.sort((a, b) => {
    const ta = a.applied_at ? new Date(a.applied_at).getTime() : 0;
    const tb = b.applied_at ? new Date(b.applied_at).getTime() : 0;
    return ta - tb;
  });

  return results;
}

// ---------------------------------------------------------------------------
// Active intent summary for kb status
// ---------------------------------------------------------------------------

/**
 * Collect a lightweight summary of all active intents for kb status output.
 * Returns { count, intents: [{ id, mode, staged_count, has_warnings }] }
 */
function getActiveIntentsSummary(contentRoot) {
  const ids = listActiveIntentIds(contentRoot);
  const intents = [];
  for (const id of ids) {
    let mode = null;
    let staged_count = 0;
    let has_warnings = false;
    try {
      const meta = readIntentMeta(contentRoot, id);
      mode = meta.mode || null;
      const staged = listStagedFiles(contentRoot, id);
      staged_count = staged.length;
      // Warn if decision_summary empty
      if (!meta.decision_summary || meta.decision_summary === '') has_warnings = true;
      // Warn if full mode missing plan or impact
      const wsPath = intentWorkspacePath(contentRoot, id);
      if (meta.mode === 'full') {
        if (!fs.existsSync(path.join(wsPath, 'plan.md'))) has_warnings = true;
        if (!fs.existsSync(path.join(wsPath, 'impact.md'))) has_warnings = true;
      }
    } catch {
      has_warnings = true;
    }
    intents.push({ id, mode, staged_count, has_warnings });
  }
  return { count: ids.length, intents };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Path helpers
  activeIntentsRoot,
  archiveIntentsRoot,
  intentWorkspacePath,
  intentMetaPath,
  proposedChangesPath,
  // ID helpers
  sanitizeId,
  suggestIntentId,
  // Metadata builders
  buildIntentMeta,
  buildPlanStub,
  buildImpactStub,
  // Frontmatter parser
  parseIntentFrontmatter,
  // Filesystem ops
  createIntentWorkspace,
  readIntentMeta,
  listActiveIntentIds,
  listStagedFiles,
  validateStagedFilePaths,
  cancelIntent,
  archiveIntent,
  archiveFolderName,
  // Apply
  classifyStagedFile,
  buildApplyRecord,
  applyStagedFiles,
  writeApplyRecord,
  // Release ledger
  deriveIntentsApplied,
  // Status summary
  getActiveIntentsSummary,
  // Constants
  VALID_MODES,
};
