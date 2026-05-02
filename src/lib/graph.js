'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Entity kinds supported in v1.9 mini
// ---------------------------------------------------------------------------

const ENTITY_KINDS = ['doc', 'intent', 'release-entry'];

// ---------------------------------------------------------------------------
// Relation types supported in v1.9 mini
// ---------------------------------------------------------------------------

const RELATION_TYPES = ['links', 'intent-applies-to', 'release-includes-intent'];

// ---------------------------------------------------------------------------
// Filesystem walk (sync)
// ---------------------------------------------------------------------------

function walkMd(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip hidden dirs and .kb internal dir
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walkMd(full, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Entity extraction from contentRoot doc tree
// ---------------------------------------------------------------------------

function extractDocEntities(contentRoot) {
  const docs = walkMd(contentRoot);
  return docs.map(absPath => {
    const relPath = path.relative(contentRoot, absPath).replace(/\\/g, '/');
    const stat = fs.statSync(absPath);
    return {
      id: relPath,
      kind: 'doc',
      source_path: relPath,
      status: 'active',
      updated_at: stat.mtime.toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// Entity extraction from intent archive
// ---------------------------------------------------------------------------

function extractIntentEntities(contentRoot) {
  const archiveRoot = path.join(contentRoot, 'intents', '_archive');
  if (!fs.existsSync(archiveRoot)) return [];

  const entities = [];
  for (const folder of fs.readdirSync(archiveRoot, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const intentId = folder.name;
    const applyRecordPath = path.join(archiveRoot, intentId, 'apply-record.json');
    if (!fs.existsSync(applyRecordPath)) continue;

    let appliedAt;
    try {
      const rec = JSON.parse(fs.readFileSync(applyRecordPath, 'utf8'));
      appliedAt = rec.applied_at || null;
    } catch (_) {
      appliedAt = null;
    }

    const relPath = path.relative(contentRoot, applyRecordPath).replace(/\\/g, '/');
    entities.push({
      id: 'intent:' + intentId,
      kind: 'intent',
      source_path: relPath,
      status: 'archived',
      updated_at: appliedAt || new Date(fs.statSync(applyRecordPath).mtime).toISOString(),
    });
  }
  return entities;
}

// ---------------------------------------------------------------------------
// Entity extraction from release catalog
// ---------------------------------------------------------------------------

function extractReleaseEntities(contentRoot) {
  const catalogPath = path.join(contentRoot, '.kb', 'catalog.json');
  if (!fs.existsSync(catalogPath)) return [];

  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  } catch (_) {
    return [];
  }

  const releases = Array.isArray(catalog.releases) ? catalog.releases : [];
  return releases.map(r => ({
    id: 'release:' + r.version,
    kind: 'release-entry',
    source_path: '.kb/catalog.json',
    status: 'released',
    updated_at: r.tagged_at || r.created_at || new Date().toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Relation extraction: markdown link scan
// ---------------------------------------------------------------------------

const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+\.md(?:#[^)]*)?)\)/g;

function extractLinkRelations(contentRoot, docEntities) {
  const entityIds = new Set(docEntities.map(e => e.id));
  const relations = [];
  const edgeCounts = {};

  for (const entity of docEntities) {
    const absPath = path.join(contentRoot, entity.source_path);
    let content;
    try {
      content = fs.readFileSync(absPath, 'utf8');
    } catch (_) {
      continue;
    }

    const docDir = path.dirname(entity.source_path);
    const updatedAt = entity.updated_at;

    MD_LINK_RE.lastIndex = 0;
    let m;
    while ((m = MD_LINK_RE.exec(content)) !== null) {
      const rawHref = m[2].split('#')[0]; // strip fragment
      if (!rawHref || rawHref.startsWith('http')) continue;

      // Resolve relative to doc's directory
      const toId = path.posix.normalize(
        docDir === '.' ? rawHref : path.posix.join(docDir, rawHref)
      ).replace(/\\/g, '/');

      // Only register relations to known entities
      if (!entityIds.has(toId)) continue;

      // Dedup: use base id + count suffix
      const baseId = entity.id + ':links:' + toId;
      edgeCounts[baseId] = (edgeCounts[baseId] || 0) + 1;
      const edgeId = edgeCounts[baseId] === 1 ? baseId : baseId + '#' + edgeCounts[baseId];

      relations.push({
        id: edgeId,
        type: 'links',
        from_id: entity.id,
        to_id: toId,
        direction: 'outbound',
        source: entity.source_path,
        updated_at: updatedAt,
      });
    }
  }
  return relations;
}

// ---------------------------------------------------------------------------
// Relation extraction: intent → release
// ---------------------------------------------------------------------------

function extractReleaseIntentRelations(contentRoot, releaseEntities, intentEntities) {
  const catalogPath = path.join(contentRoot, '.kb', 'catalog.json');
  if (!fs.existsSync(catalogPath)) return [];

  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  } catch (_) {
    return [];
  }

  const releases = Array.isArray(catalog.releases) ? catalog.releases : [];
  const relations = [];

  for (const r of releases) {
    const releaseEntityId = 'release:' + r.version;
    const applied = Array.isArray(r.intents_applied) ? r.intents_applied : [];
    for (const iid of applied) {
      const intentEntityId = 'intent:' + iid;
      relations.push({
        id: releaseEntityId + ':release-includes-intent:' + intentEntityId,
        type: 'release-includes-intent',
        from_id: releaseEntityId,
        to_id: intentEntityId,
        direction: 'outbound',
        source: '.kb/catalog.json',
        updated_at: r.tagged_at || new Date().toISOString(),
      });
    }
  }
  return relations;
}

// ---------------------------------------------------------------------------
// Graph builder (entities + relations)
// ---------------------------------------------------------------------------

function buildGraphData(contentRoot) {
  const docEntities     = extractDocEntities(contentRoot);
  const intentEntities  = extractIntentEntities(contentRoot);
  const releaseEntities = extractReleaseEntities(contentRoot);

  const entities = [
    ...docEntities,
    ...intentEntities,
    ...releaseEntities,
  ].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  const linkRelations           = extractLinkRelations(contentRoot, docEntities);
  const releaseIntentRelations  = extractReleaseIntentRelations(contentRoot, releaseEntities, intentEntities);

  const relations = [
    ...linkRelations,
    ...releaseIntentRelations,
  ].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  return { entities, relations };
}

// ---------------------------------------------------------------------------
// Export: write JSONL to outputPath (or stdout if outputPath is null)
// ---------------------------------------------------------------------------

function exportGraph(contentRoot, outputPath) {
  const { entities, relations } = buildGraphData(contentRoot);
  const lines = [];

  for (const e of entities) {
    lines.push(JSON.stringify({ _type: 'entity', ...e }));
  }
  for (const r of relations) {
    lines.push(JSON.stringify({ _type: 'relation', ...r }));
  }

  const jsonl = lines.join('\n') + (lines.length > 0 ? '\n' : '');

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, jsonl, 'utf8');
  }

  return { entities, relations, jsonl };
}

// ---------------------------------------------------------------------------
// Check: basic consistency rules
// ---------------------------------------------------------------------------

/**
 * Check 1: missing node reference — a relation points to an entity id that doesn't exist.
 * Check 2: invalid relation type — type not in RELATION_TYPES.
 * Check 3: duplicate entity id — two entities share the same id.
 */
function checkGraph(contentRoot) {
  const { entities, relations } = buildGraphData(contentRoot);
  const issues = [];

  // Build entity id set
  const entityIdMap = new Map();
  for (const e of entities) {
    if (entityIdMap.has(e.id)) {
      issues.push({
        check_id: 'duplicate-entity-id',
        severity: 'error',
        entity_or_relation_id: e.id,
        message: `Duplicate entity id: "${e.id}"`,
        evidence_path: e.source_path,
        suggested_fix: `Rename one of the conflicting docs or intents so entity ids are unique.`,
      });
    } else {
      entityIdMap.set(e.id, e);
    }
  }

  // Check relations
  for (const r of relations) {
    // Invalid relation type
    if (!RELATION_TYPES.includes(r.type)) {
      issues.push({
        check_id: 'invalid-relation-type',
        severity: 'error',
        entity_or_relation_id: r.id,
        message: `Unknown relation type "${r.type}" in relation "${r.id}". Allowed: ${RELATION_TYPES.join(', ')}.`,
        evidence_path: r.source,
        suggested_fix: `Update the relation type to one of: ${RELATION_TYPES.join(', ')}.`,
      });
    }

    // Missing node reference
    if (!entityIdMap.has(r.from_id)) {
      issues.push({
        check_id: 'missing-node-reference',
        severity: 'error',
        entity_or_relation_id: r.id,
        message: `Relation "${r.id}" references unknown from_id "${r.from_id}".`,
        evidence_path: r.source,
        suggested_fix: `Create entity "${r.from_id}" or remove the relation.`,
      });
    }
    if (!entityIdMap.has(r.to_id)) {
      issues.push({
        check_id: 'missing-node-reference',
        severity: 'error',
        entity_or_relation_id: r.id,
        message: `Relation "${r.id}" references unknown to_id "${r.to_id}".`,
        evidence_path: r.source,
        suggested_fix: `Create entity "${r.to_id}" or update the link target.`,
      });
    }
  }

  return {
    entity_count: entities.length,
    relation_count: relations.length,
    issue_count: issues.length,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  ENTITY_KINDS,
  RELATION_TYPES,
  buildGraphData,
  exportGraph,
  checkGraph,
};
