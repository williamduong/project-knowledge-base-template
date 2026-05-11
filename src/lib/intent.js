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

function backlogIntentsRoot(contentRoot) {
  return path.join(contentRoot, 'intents', '_backlog');
}

function closedIntentsRoot(contentRoot) {
  return path.join(contentRoot, 'intents', '_closed');
}

function releasedIntentsRoot(contentRoot) {
  return path.join(closedIntentsRoot(contentRoot), 'released');
}

function droppedIntentsRoot(contentRoot) {
  return path.join(closedIntentsRoot(contentRoot), 'dropped');
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

function backlogIntentPath(contentRoot, slug) {
  return path.join(backlogIntentsRoot(contentRoot), `${slug}.md`);
}

function closedIntentWorkspacePath(contentRoot, intentId, closeType) {
  const root = closeType === 'released' ? releasedIntentsRoot(contentRoot) : droppedIntentsRoot(contentRoot);
  return path.join(root, intentId);
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

function workspaceIntentMetaPath(workspacePath) {
  return path.join(workspacePath, 'intent.md');
}

function findIntentWorkspace(contentRoot, intentId) {
  const candidates = [
    intentWorkspacePath(contentRoot, intentId),
    closedIntentWorkspacePath(contentRoot, intentId, 'released'),
    closedIntentWorkspacePath(contentRoot, intentId, 'dropped'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
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
        'promotion_ready: false',
        'linked_signals: []',
        'promote_decision_ref: null',
      ].join('\n')
    : null;

  const pkgVersion = require('../../package.json').version;
  const lines = [
    '---',
    `id: ${intentId}`,
    `mode: ${mode}`,
    'lifecycle: active',
    `created_at: ${now}`,
    'focus:',
    '  current: ""',
    `  last_updated: ${now.slice(0, 10)}`,
    '  next_action: ""',
    `change_type: ${changeType || 'docs'}`,
    `change_scope: []`,
    `impact_signals: []`,
    `decision_summary: ""`,
    `review_after: null`,
    `schema_version: ${pkgVersion}`,
  ];
  if (reserveFields) {
    lines.push('# v1.8+ reserve fields:');
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
  lines.push('> Mirror path: `proposed-changes/<path-relative-to-svfactory>`');
  lines.push('');
  return lines.join('\n') + '\n';
}

function buildBacklogIntentMeta({ slug, title, description, wave }) {
  const now = new Date().toISOString();
  const pkgVersion = require('../../package.json').version;
  const lines = [
    '---',
    `slug: ${slug}`,
    `title: "${title || slug}"`,
    `description: "${description || ''}"`,
    'lifecycle: backlog',
    `created_at: ${now}`,
    'focus:',
    '  current: ""',
    `  last_updated: ${now.slice(0, 10)}`,
    '  next_action: ""',
  ];
  if (wave) {
    lines.push('architecture_position:');
    lines.push(`  wave: ${wave}`);
  }
  lines.push(`schema_version: ${pkgVersion}`);
  lines.push('---');
  lines.push('');
  lines.push(`# Backlog Intent: ${slug}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('> Fill in the problem, why it matters, and the activation trigger.');
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

function createBacklogIntent(contentRoot, { slug, title, description, wave }) {
  const filePath = backlogIntentPath(contentRoot, slug);
  if (fs.existsSync(filePath)) {
    throw new Error(`Backlog intent "${slug}" already exists at:\n  ${filePath}`);
  }
  fs.mkdirSync(backlogIntentsRoot(contentRoot), { recursive: true });
  fs.writeFileSync(filePath, buildBacklogIntentMeta({ slug, title, description, wave }), 'utf8');
  return filePath;
}

function activateBacklogIntent(contentRoot, { slug, intentId, mode, changeType, wave }) {
  const sourcePath = backlogIntentPath(contentRoot, slug);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Backlog intent "${slug}" not found. Expected: ${sourcePath}`);
  }

  const text = fs.readFileSync(sourcePath, 'utf8');
  const backlogMeta = parseIntentFrontmatter(text);
  const wsPath = createIntentWorkspace(contentRoot, { intentId, mode, changeType });
  const metaPath = intentMetaPath(contentRoot, intentId);
  const activeMeta = readIntentMeta(contentRoot, intentId);
  activeMeta.slug = slug;
  activeMeta.title = backlogMeta.title || slug;
  activeMeta.description = backlogMeta.description || '';
  activeMeta.lifecycle = 'active';
  activeMeta.activated_at = new Date().toISOString();
  activeMeta.architecture_position = {
    wave: wave || (backlogMeta.architecture_position && backlogMeta.architecture_position.wave) || null,
  };
  activeMeta.focus = backlogMeta.focus && typeof backlogMeta.focus === 'object'
    ? { ...backlogMeta.focus, last_updated: new Date().toISOString().slice(0, 10) }
    : { current: '', last_updated: new Date().toISOString().slice(0, 10), next_action: '' };
  writeIntentFrontmatter(metaPath, activeMeta);
  fs.rmSync(sourcePath, { force: true });
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
  return readIntentMetaFile(metaPath);
}

function readIntentMetaFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Intent metadata not found. Expected: ${filePath}`);
  }
  const text = fs.readFileSync(filePath, 'utf8');
  return parseIntentFrontmatter(text);
}

function listBacklogIntentIds(contentRoot) {
  const root = backlogIntentsRoot(contentRoot);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name.replace(/\.md$/, ''));
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
  let currentSection = null;
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const nestedMatch = line.match(/^\s{2}([A-Za-z0-9_]+):\s*(.*)$/);
    if (nestedMatch && currentSection) {
      result[currentSection][nestedMatch[1]] = parseFrontmatterValue(nestedMatch[2]);
      continue;
    }
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.slice(0, colonIdx).trim();
    const raw = line.slice(colonIdx + 1).trim();
    if (raw === '') {
      result[key] = {};
      currentSection = key;
    } else {
      result[key] = parseFrontmatterValue(raw);
      currentSection = null;
    }
  }
  return result;
}

function parseFrontmatterValue(raw) {
  if (raw === '[]') return [];
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  return raw;
}

function serializeFrontmatterValue(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return value.length === 0 ? '[]' : JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') {
    return /[:#]|^$|\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
  }
  return String(value);
}

function serializeIntentFrontmatter(meta) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(meta || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        lines.push(`  ${nestedKey}: ${serializeFrontmatterValue(nestedValue)}`);
      }
      continue;
    }
    lines.push(`${key}: ${serializeFrontmatterValue(value)}`);
  }
  lines.push('---');
  return `${lines.join('\n')}\n`;
}

function writeIntentFrontmatter(filePath, meta) {
  const text = fs.readFileSync(filePath, 'utf8');
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const frontmatter = serializeIntentFrontmatter(meta);
  fs.writeFileSync(filePath, `${frontmatter}\n${body.replace(/^\r?\n/, '')}`, 'utf8');
  return filePath;
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

function listClosedIntentRecords(contentRoot) {
  const results = [];
  for (const closeType of ['released', 'dropped']) {
    const root = closeType === 'released' ? releasedIntentsRoot(contentRoot) : droppedIntentsRoot(contentRoot);
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const workspacePath = path.join(root, entry.name);
      const metaPath = workspaceIntentMetaPath(workspacePath);
      let meta = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = readIntentMetaFile(metaPath);
        } catch {
          meta = {};
        }
      }
      results.push({
        scope: 'closed',
        closeType,
        folderName: entry.name,
        workspacePath,
        metaPath,
        meta,
        id: meta.id || entry.name,
        slug: meta.slug || null,
        lifecycle: 'closed',
      });
    }
  }
  return results;
}

function listArchivedIntentRecords(contentRoot) {
  const root = archiveIntentsRoot(contentRoot);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const workspacePath = path.join(root, entry.name);
      const metaPath = workspaceIntentMetaPath(workspacePath);
      let meta = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = readIntentMetaFile(metaPath);
        } catch {
          meta = {};
        }
      }
      const archiveBaseId = entry.name.match(/^(.*)-\d{14}$/)?.[1] || entry.name;
      return {
        scope: 'archived',
        closeType: meta.close_type || null,
        folderName: entry.name,
        archiveBaseId,
        workspacePath,
        metaPath,
        meta,
        id: meta.id || archiveBaseId,
        slug: meta.slug || null,
        lifecycle: 'archived',
      };
    });
}

function listIntentRecords(contentRoot, { includeBacklog = true, includeActive = true, includeClosed = true, includeArchived = true } = {}) {
  const records = [];

  if (includeBacklog) {
    for (const slug of listBacklogIntentIds(contentRoot)) {
      const metaPath = backlogIntentPath(contentRoot, slug);
      let meta = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = readIntentMetaFile(metaPath);
        } catch {
          meta = {};
        }
      }
      records.push({
        scope: 'backlog',
        closeType: null,
        folderName: `${slug}.md`,
        workspacePath: null,
        metaPath,
        meta,
        id: meta.id || slug,
        slug: meta.slug || slug,
        lifecycle: 'backlog',
      });
    }
  }

  if (includeActive) {
    for (const id of listActiveIntentIds(contentRoot)) {
      const workspacePath = intentWorkspacePath(contentRoot, id);
      const metaPath = workspaceIntentMetaPath(workspacePath);
      let meta = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = readIntentMetaFile(metaPath);
        } catch {
          meta = {};
        }
      }
      records.push({
        scope: 'active',
        closeType: null,
        folderName: id,
        workspacePath,
        metaPath,
        meta,
        id: meta.id || id,
        slug: meta.slug || null,
        lifecycle: 'active',
      });
    }
  }

  if (includeClosed) {
    records.push(...listClosedIntentRecords(contentRoot));
  }

  if (includeArchived) {
    records.push(...listArchivedIntentRecords(contentRoot));
  }

  return records;
}

function resolveIntentRecord(contentRoot, ref) {
  const records = listIntentRecords(contentRoot);
  const matches = records.filter((record) => {
    if (record.id === ref) return true;
    if (record.slug === ref) return true;
    if (record.folderName === ref) return true;
    if (record.archiveBaseId === ref) return true;
    return false;
  });

  if (matches.length === 0) return null;

  const scopeRank = { active: 0, closed: 1, backlog: 2, archived: 3 };
  matches.sort((left, right) => {
    const scopeDiff = (scopeRank[left.scope] ?? 99) - (scopeRank[right.scope] ?? 99);
    if (scopeDiff !== 0) return scopeDiff;
    if (left.scope === 'archived' && right.scope === 'archived') {
      return String(right.folderName).localeCompare(String(left.folderName));
    }
    return String(left.id).localeCompare(String(right.id));
  });
  return matches[0];
}

function listStagedFilesFromWorkspace(workspacePath) {
  const pcDir = path.join(workspacePath, 'proposed-changes');
  if (!workspacePath || !fs.existsSync(pcDir)) return [];
  const results = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        results.push(path.relative(pcDir, full).replace(/\\/g, '/'));
      }
    }
  };
  walk(pcDir);
  return results;
}

function deriveIntentStatus(recordOrLifecycle) {
  const lifecycle = typeof recordOrLifecycle === 'string'
    ? recordOrLifecycle
    : (recordOrLifecycle && recordOrLifecycle.lifecycle) || 'unknown';
  return lifecycle === 'backlog' || lifecycle === 'active' ? 'open' : 'closed';
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
        issue: 'File placed directly in proposed-changes/ root. Mirror path must be proposed-changes/<relative-from-svfactory>/<file>.',
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
  return closeIntent(contentRoot, intentId, {
    closeType: 'dropped',
    dropReason: 'cancelled via legacy command',
  });
}

function updateIntentFocus(contentRoot, intentId, { current, nextAction, lastUpdated }) {
  const metaPath = intentMetaPath(contentRoot, intentId);
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Intent "${intentId}" not found. Expected: ${metaPath}`);
  }
  const meta = readIntentMeta(contentRoot, intentId);
  const focus = meta.focus && typeof meta.focus === 'object' ? { ...meta.focus } : {};
  if (current !== undefined) focus.current = current;
  if (nextAction !== undefined) focus.next_action = nextAction;
  focus.last_updated = lastUpdated || new Date().toISOString().slice(0, 10);
  meta.focus = focus;
  writeIntentFrontmatter(metaPath, meta);
  return metaPath;
}

function closeIntent(contentRoot, intentId, { closeType, releaseRef, dropReason, timestamp }) {
  const srcPath = intentWorkspacePath(contentRoot, intentId);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Intent "${intentId}" not found. Expected: ${srcPath}`);
  }
  const closedAt = timestamp || new Date().toISOString();
  const metaPath = intentMetaPath(contentRoot, intentId);
  const meta = readIntentMeta(contentRoot, intentId);
  meta.lifecycle = 'closed';
  if (Object.prototype.hasOwnProperty.call(meta, 'status')) {
    if (!Object.prototype.hasOwnProperty.call(meta, 'legacy_status')) {
      meta.legacy_status = meta.status;
    }
    delete meta.status;
  }
  meta.close_type = closeType;
  meta.closed_at = closedAt;
  if (closeType === 'released') {
    if (!releaseRef) throw new Error('Released close requires releaseRef.');
    meta.release_ref = releaseRef;
    meta.drop_reason = null;
  } else {
    if (!dropReason) throw new Error('Dropped close requires dropReason.');
    meta.drop_reason = dropReason;
    meta.release_ref = null;
  }
  writeIntentFrontmatter(metaPath, meta);

  const destRoot = closeType === 'released' ? releasedIntentsRoot(contentRoot) : droppedIntentsRoot(contentRoot);
  fs.mkdirSync(destRoot, { recursive: true });
  const destPath = path.join(destRoot, intentId);
  if (fs.existsSync(destPath)) {
    throw new Error(`Closed intent destination already exists: ${destPath}`);
  }
  fs.renameSync(srcPath, destPath);
  return destPath;
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
  const srcPath = findIntentWorkspace(contentRoot, intentId);
  if (!srcPath) {
    throw new Error(`Intent "${intentId}" not found.`);
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

/**
 * Load forward estimates from backlog intents that have estimate_factors field.
 * Returns array of {plan, factors, source: 'backlog'}.
 * Validates factors against SUPPORTED_FACTORS set.
 */
function loadForwardEstimatesFromBacklog(contentRoot) {
  const backlogIds = listBacklogIntentIds(contentRoot);
  const estimates = [];

  const SUPPORTED_FACTORS = new Set([
    'addedUncoveredLOC',
    'newUncoveredModules',
    'addedHighCoupling',
    'resolvedHighEntropy',
    'resolvedHighDebt',
    'addedTests',
    'resolvedCoverageDebt',
  ]);

  for (const id of backlogIds) {
    try {
      const meta = readIntentMeta(contentRoot, id);
      if (!meta.estimate_factors || Object.keys(meta.estimate_factors).length === 0) {
        continue; // Skip intents without estimate_factors
      }

      // Validate factor keys
      const factors = meta.estimate_factors;
      let hasInvalidFactor = false;
      for (const key of Object.keys(factors)) {
        if (!SUPPORTED_FACTORS.has(key)) {
          console.warn(`⚠ Intent "${id}": unsupported factor "${key}". Skipped.`);
          hasInvalidFactor = true;
          break;
        }
      }
      if (hasInvalidFactor) continue;

      // Build estimate entry: use slug + title as plan identifier
      const planLabel = `${meta.slug || id}: ${meta.title || id}`;
      estimates.push({
        plan: planLabel,
        factors: factors,
        source: 'backlog',
      });
    } catch (err) {
      // Silently skip malformed intents
      continue;
    }
  }

  return estimates;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Path helpers
  activeIntentsRoot,
  backlogIntentsRoot,
  closedIntentsRoot,
  releasedIntentsRoot,
  droppedIntentsRoot,
  archiveIntentsRoot,
  intentWorkspacePath,
  backlogIntentPath,
  closedIntentWorkspacePath,
  intentMetaPath,
  proposedChangesPath,
  workspaceIntentMetaPath,
  findIntentWorkspace,
  // ID helpers
  sanitizeId,
  suggestIntentId,
  // Metadata builders
  buildIntentMeta,
  buildBacklogIntentMeta,
  buildPlanStub,
  buildImpactStub,
  // Frontmatter parser
  parseIntentFrontmatter,
  parseFrontmatterValue,
  serializeIntentFrontmatter,
  writeIntentFrontmatter,
  // Filesystem ops
  createIntentWorkspace,
  createBacklogIntent,
  activateBacklogIntent,
  readIntentMeta,
  readIntentMetaFile,
  listBacklogIntentIds,
  loadForwardEstimatesFromBacklog,
  listActiveIntentIds,
  listClosedIntentRecords,
  listArchivedIntentRecords,
  listIntentRecords,
  resolveIntentRecord,
  listStagedFiles,
  listStagedFilesFromWorkspace,
  validateStagedFilePaths,
  deriveIntentStatus,
  cancelIntent,
  updateIntentFocus,
  closeIntent,
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

