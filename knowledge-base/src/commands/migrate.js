'use strict';

const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { listIntentRecords, parseIntentFrontmatter, writeIntentFrontmatter } = require('../lib/intent');

function normalizeTargetVersion(raw) {
  const value = String(raw || '').trim();
  if (!/^v?\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(`Invalid migrate target version "${raw}". Expected vX.Y.Z.`);
  }
  return value.startsWith('v') ? value : `v${value}`;
}

function parseArgs(args) {
  const options = {
    targetVersion: null,
    dryRun: false,
    json: false,
  };

  for (const arg of args || []) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg.startsWith('--to=')) {
      options.targetVersion = normalizeTargetVersion(arg.slice('--to='.length));
      continue;
    }
    throw new Error(`Unknown migrate option "${arg}". Supported: --to=<version>, --dry-run, --json`);
  }

  if (!options.targetVersion) {
    throw new Error('kb migrate requires --to=<version>.');
  }

  return options;
}

function getCanonicalLifecycle(record) {
  if (record.scope === 'archived') return 'archived';
  if (record.scope === 'closed') return 'closed';
  if (record.scope === 'active') return 'active';
  if (record.scope === 'backlog') return 'backlog';
  return 'unknown';
}

function getMissingRequiredLegacyFields(meta) {
  const missing = [];
  if (!meta.type) missing.push('type');
  if (!meta.strategic_mode) missing.push('strategic_mode');
  if (!meta.urgency) missing.push('urgency');
  const wave = meta.architecture_position && meta.architecture_position.wave;
  if (!wave) missing.push('architecture_position.wave');
  return missing;
}

function inspectIntentMigration(record, targetVersion) {
  const meta = record.meta || {};
  const canonicalLifecycle = getCanonicalLifecycle(record);
  const proposedUpdates = [];
  const warnings = [];
  const legacySignals = [];
  const missingRequired = getMissingRequiredLegacyFields(meta);
  const isArchived = record.scope === 'archived';

  if ((meta.schema_version || null) !== targetVersion) {
    proposedUpdates.push({ field: 'schema_version', from: meta.schema_version || null, to: targetVersion });
  }

  if ((meta.lifecycle || null) !== canonicalLifecycle) {
    proposedUpdates.push({
      field: 'lifecycle',
      from: meta.lifecycle || null,
      to: canonicalLifecycle,
      reason: 'folder-first mapping',
    });
  }

  if (Object.prototype.hasOwnProperty.call(meta, 'status')) {
    legacySignals.push('status');
    proposedUpdates.push({ field: 'legacy_status', from: null, to: meta.status });
  }

  if (Object.prototype.hasOwnProperty.call(meta, 'lifecycle_state')) {
    legacySignals.push('lifecycle_state');
    proposedUpdates.push({ field: 'legacy_lifecycle_state', from: null, to: meta.lifecycle_state });
  }

  if (String(meta.lifecycle_state || '').toLowerCase() === 'superseded') {
    proposedUpdates.push({
      field: 'close_type',
      from: meta.close_type || null,
      to: 'dropped',
      reason: 'superseded maps to dropped',
    });
    proposedUpdates.push({
      field: 'drop_reason',
      from: meta.drop_reason || null,
      to: `superseded by ${meta.superseded_by || meta.superseded_by_intent || 'unknown'}`,
    });
  }

  if (missingRequired.length > 0) {
    proposedUpdates.push({ field: 'legacy', from: meta.legacy || false, to: true });
    legacySignals.push('missing-required-metadata');
  }

  if (proposedUpdates.length > 0) {
    proposedUpdates.push({
      field: 'migration_note',
      from: meta.migration_note || null,
      to: `derived ${canonicalLifecycle} via ${record.scope} scope during ${targetVersion} migration preview`,
    });
  }

  if (!isArchived && record.scope !== 'active' && record.scope !== 'closed') {
    warnings.push(`Unsupported migrate scope: ${record.scope}`);
  }

  return {
    id: record.id,
    slug: record.slug || null,
    scope: record.scope,
    path: record.workspacePath || record.metaPath,
    meta_path: record.metaPath || null,
    canonical_lifecycle: canonicalLifecycle,
    write_mode: isArchived ? 'marker-only' : 'full',
    legacy: proposedUpdates.length > 0,
    legacy_signals: Array.from(new Set(legacySignals)),
    missing_required: missingRequired,
    proposed_updates: proposedUpdates,
    warnings,
  };
}

function collectIntentMigrations(contentRoot, targetVersion) {
  const records = listIntentRecords(contentRoot, {
    includeBacklog: false,
    includeActive: true,
    includeClosed: true,
    includeArchived: true,
  });

  const items = records.map((record) => inspectIntentMigration(record, targetVersion));
  const legacyItems = items.filter((item) => item.legacy);
  const warnings = items.flatMap((item) => item.warnings.map((warning) => ({ id: item.id, warning })));

  return {
    target_version: targetVersion,
    count: items.length,
    legacy_count: legacyItems.length,
    marker_only_count: legacyItems.filter((item) => item.write_mode === 'marker-only').length,
    full_write_count: legacyItems.filter((item) => item.write_mode === 'full').length,
    warning_count: warnings.length,
    intents: items,
    warnings,
  };
}

function applyProposedUpdates(meta, proposedUpdates) {
  const updated = Object.assign({}, meta);
  for (const update of proposedUpdates) {
    updated[update.field] = update.to;
  }
  return updated;
}

async function runMigrate({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const result = collectIntentMigrations(context.contentRoot, options.targetVersion);

  if (options.dryRun) {
    if (options.json) {
      console.log(JSON.stringify({
        command: 'kb migrate',
        dry_run: true,
        workspace_root: workspaceRoot,
        ...result,
      }, null, 2));
      return;
    }

    console.log('kb migrate: DRY-RUN');
    console.log(`Target: ${result.target_version}`);
    console.log(`Legacy intents: ${result.legacy_count}/${result.count}`);
    console.log(`Full-write candidates: ${result.full_write_count}`);
    console.log(`Marker-only archive candidates: ${result.marker_only_count}`);
    console.log(`Warnings: ${result.warning_count}`);

    const preview = result.intents.filter((item) => item.legacy).slice(0, 20);
    if (preview.length > 0) {
      console.log('');
      console.log('Preview:');
      for (const item of preview) {
        const fields = item.proposed_updates.map((entry) => entry.field).join(', ');
        console.log(`  [${item.scope}] ${item.id} -> ${item.canonical_lifecycle} (${item.write_mode}; ${fields})`);
      }
    }
    return;
  }

  // Live write-path: only full-write (active/closed), archive stays marker-only
  const fullWriteItems = result.intents.filter((item) => item.legacy && item.write_mode === 'full');
  const written = [];
  const skipped = [];

  for (const item of fullWriteItems) {
    if (!item.meta_path) {
      skipped.push({ id: item.id, reason: 'no meta_path resolved' });
      continue;
    }
    const rawText = fs.readFileSync(item.meta_path, 'utf8');
    const liveMeta = parseIntentFrontmatter(rawText);
    const updatedMeta = applyProposedUpdates(liveMeta, item.proposed_updates);
    writeIntentFrontmatter(item.meta_path, updatedMeta);
    written.push(item.id);
  }

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kb migrate',
      dry_run: false,
      workspace_root: workspaceRoot,
      target_version: result.target_version,
      written_count: written.length,
      skipped_count: skipped.length,
      marker_only_count: result.marker_only_count,
      written,
      skipped,
    }, null, 2));
    return;
  }

  console.log(`kb migrate: DONE`);
  console.log(`Target: ${result.target_version}`);
  console.log(`Written (full): ${written.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Archive unchanged (marker-only): ${result.marker_only_count}`);
  if (written.length > 0) {
    for (const id of written) {
      console.log(`  [written] ${id}`);
    }
  }
}

module.exports = {
  normalizeTargetVersion,
  parseArgs,
  inspectIntentMigration,
  collectIntentMigrations,
  runMigrate,
};