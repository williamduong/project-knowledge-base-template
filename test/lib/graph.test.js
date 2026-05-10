'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const {
  ENTITY_KINDS,
  RELATION_TYPES,
  buildGraphData,
  exportGraph,
  checkGraph,
} = require('../../src/lib/graph');

const { parseArgs } = require('../../src/commands/graph');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-graph-test-'));
}

/**
 * Creates a minimal initialized KB structure under dir.
 * Returns { contentRoot }.
 */
function initMinimalKb(dir) {
  const contentRoot = path.join(dir, 'knowledge-base');
  const kbDir = path.join(contentRoot, '.kb');
  fs.mkdirSync(kbDir, { recursive: true });

  // state.json required by resolveExistingState
  fs.writeFileSync(
    path.join(dir, 'knowledge-base', '.kb', 'state.json'),
    JSON.stringify({ schemaVersion: 1, storageMode: 'tracked' }),
    'utf8'
  );

  return { contentRoot };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

test('ENTITY_KINDS contains expected values', () => {
  assert.ok(ENTITY_KINDS.includes('doc'));
  assert.ok(ENTITY_KINDS.includes('intent'));
  assert.ok(ENTITY_KINDS.includes('release-entry'));
});

test('RELATION_TYPES contains expected values', () => {
  assert.ok(RELATION_TYPES.includes('links'));
  assert.ok(RELATION_TYPES.includes('intent-applies-to'));
  assert.ok(RELATION_TYPES.includes('release-includes-intent'));
});

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

test('parseArgs: default sub required', () => {
  assert.throws(() => parseArgs([]), /requires a subcommand/);
});

test('parseArgs: export sub', () => {
  const o = parseArgs(['export']);
  assert.equal(o.sub, 'export');
  assert.equal(o.output, null);
  assert.equal(o.json, false);
});

test('parseArgs: check sub with --json', () => {
  const o = parseArgs(['check', '--json']);
  assert.equal(o.sub, 'check');
  assert.equal(o.json, true);
});

test('parseArgs: export positional lane', () => {
  const o = parseArgs(['export', 'rules', '--json']);
  assert.equal(o.sub, 'export');
  assert.equal(o.lane, 'rules');
  assert.equal(o.json, true);
});

test('parseArgs: lane alias sets export + lane', () => {
  const o = parseArgs(['lane', 'intents']);
  assert.equal(o.sub, 'export');
  assert.equal(o.lane, 'intents');
});

test('parseArgs: --output= value', () => {
  const o = parseArgs(['export', '--output=/tmp/out.jsonl']);
  assert.equal(o.output, '/tmp/out.jsonl');
});

test('parseArgs: --output separate arg', () => {
  const o = parseArgs(['export', '--output', '/tmp/x.jsonl']);
  assert.equal(o.output, '/tmp/x.jsonl');
});

test('parseArgs: unknown flag throws', () => {
  assert.throws(() => parseArgs(['export', '--unknown-flag']), /Unknown graph option/);
});

// ---------------------------------------------------------------------------
// buildGraphData: empty KB
// ---------------------------------------------------------------------------

test('buildGraphData: empty KB returns empty arrays', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);

  const { entities, relations } = buildGraphData(contentRoot);
  assert.equal(entities.length, 0);
  assert.equal(relations.length, 0);
});

// ---------------------------------------------------------------------------
// buildGraphData: doc entities
// ---------------------------------------------------------------------------

test('buildGraphData: detects doc entities from md files', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);

  fs.writeFileSync(path.join(contentRoot, 'README.md'), '# Hello', 'utf8');
  fs.mkdirSync(path.join(contentRoot, '01-product'), { recursive: true });
  fs.writeFileSync(path.join(contentRoot, '01-product', 'overview.md'), '# Overview', 'utf8');

  const { entities } = buildGraphData(contentRoot);
  const ids = entities.map(e => e.id);
  assert.ok(ids.includes('README.md'), 'README.md entity missing');
  assert.ok(ids.includes('01-product/overview.md'), '01-product/overview.md entity missing');
});

test('buildGraphData: doc entity has correct shape', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);
  fs.writeFileSync(path.join(contentRoot, 'doc.md'), '# Doc', 'utf8');

  const { entities } = buildGraphData(contentRoot);
  const e = entities.find(x => x.id === 'doc.md');
  assert.ok(e, 'entity not found');
  assert.equal(e.kind, 'doc');
  assert.equal(e.source_path, 'doc.md');
  assert.equal(e.status, 'active');
  assert.ok(typeof e.updated_at === 'string', 'updated_at must be string');
});

// ---------------------------------------------------------------------------
// buildGraphData: relation extraction
// ---------------------------------------------------------------------------

test('buildGraphData: extracts link relation between docs', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);

  fs.writeFileSync(path.join(contentRoot, 'INDEX.md'), '[overview](01-product/overview.md)', 'utf8');
  fs.mkdirSync(path.join(contentRoot, '01-product'), { recursive: true });
  fs.writeFileSync(path.join(contentRoot, '01-product', 'overview.md'), '# O', 'utf8');

  const { relations } = buildGraphData(contentRoot);
  const rel = relations.find(r => r.from_id === 'INDEX.md' && r.to_id === '01-product/overview.md');
  assert.ok(rel, 'link relation not found');
  assert.equal(rel.type, 'links');
  assert.equal(rel.direction, 'outbound');
});

test('buildGraphData: duplicate link in same file gets unique id', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);

  // Same link appears twice in the file
  fs.writeFileSync(
    path.join(contentRoot, 'INDEX.md'),
    '[a](other.md)\n[b](other.md)',
    'utf8'
  );
  fs.writeFileSync(path.join(contentRoot, 'other.md'), '# O', 'utf8');

  const { relations } = buildGraphData(contentRoot);
  const rels = relations.filter(r => r.from_id === 'INDEX.md' && r.to_id === 'other.md');
  assert.equal(rels.length, 2, 'should have 2 link relations');
  // IDs must be unique
  const ids = rels.map(r => r.id);
  assert.notEqual(ids[0], ids[1], 'duplicate relation ids not disambiguated');
});

test('buildGraphData: ignores external http links', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);
  fs.writeFileSync(path.join(contentRoot, 'doc.md'), '[ext](https://example.com)', 'utf8');

  const { relations } = buildGraphData(contentRoot);
  assert.equal(relations.length, 0);
});

test('buildGraphData: ignores link to unknown entity', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);
  fs.writeFileSync(path.join(contentRoot, 'doc.md'), '[x](nonexistent.md)', 'utf8');

  const { relations } = buildGraphData(contentRoot);
  assert.equal(relations.length, 0);
});

// ---------------------------------------------------------------------------
// buildGraphData: deterministic order
// ---------------------------------------------------------------------------

test('buildGraphData: entity order is deterministic', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);

  fs.writeFileSync(path.join(contentRoot, 'z.md'), '', 'utf8');
  fs.writeFileSync(path.join(contentRoot, 'a.md'), '', 'utf8');
  fs.writeFileSync(path.join(contentRoot, 'm.md'), '', 'utf8');

  const r1 = buildGraphData(contentRoot).entities.map(e => e.id);
  const r2 = buildGraphData(contentRoot).entities.map(e => e.id);
  assert.deepEqual(r1, r2, 'order not deterministic');
  assert.deepEqual(r1, [...r1].sort(), 'entities not sorted alphabetically');
});

// ---------------------------------------------------------------------------
// exportGraph
// ---------------------------------------------------------------------------

test('exportGraph: writes JSONL file', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);
  fs.writeFileSync(path.join(contentRoot, 'doc.md'), '# D', 'utf8');

  const outputPath = path.join(dir, 'graph.jsonl');
  exportGraph(contentRoot, outputPath);

  const lines = fs.readFileSync(outputPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1, 'should have 1 entity line');
  const obj = JSON.parse(lines[0]);
  assert.equal(obj._type, 'entity');
  assert.equal(obj.kind, 'doc');
});

test('exportGraph: each line is valid JSON', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);
  fs.writeFileSync(path.join(contentRoot, 'a.md'), '[b](b.md)', 'utf8');
  fs.writeFileSync(path.join(contentRoot, 'b.md'), '', 'utf8');

  const outputPath = path.join(dir, 'out.jsonl');
  exportGraph(contentRoot, outputPath);

  const lines = fs.readFileSync(outputPath, 'utf8').trim().split('\n');
  for (const line of lines) {
    assert.doesNotThrow(() => JSON.parse(line), `Invalid JSON line: ${line}`);
  }
});

test('exportGraph: returns entities and relations counts', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);
  fs.writeFileSync(path.join(contentRoot, 'x.md'), '', 'utf8');

  const { entities, relations } = exportGraph(contentRoot, null);
  assert.equal(entities.length, 1);
  assert.equal(relations.length, 0);
});

// ---------------------------------------------------------------------------
// checkGraph
// ---------------------------------------------------------------------------

test('checkGraph: no issues for valid KB', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);
  fs.writeFileSync(path.join(contentRoot, 'a.md'), '[b](b.md)', 'utf8');
  fs.writeFileSync(path.join(contentRoot, 'b.md'), '', 'utf8');

  const result = checkGraph(contentRoot);
  assert.equal(result.issue_count, 0);
  assert.deepEqual(result.issues, []);
});

test('checkGraph: result has required summary fields', () => {
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);

  const result = checkGraph(contentRoot);
  assert.ok('entity_count' in result);
  assert.ok('relation_count' in result);
  assert.ok('issue_count' in result);
  assert.ok(Array.isArray(result.issues));
});

test('checkGraph: issue has required contract fields', () => {
  // Manufacture a check issue by injecting a catalog with a bad intents_applied reference
  // The simplest path: no KB docs but a relation with missing node would come from
  // a catalog. Instead, test via the internal check by constructing a KB with a
  // link to a file that resolves to a known entity but then deleting it after first pass.
  // Simpler: patch catalog.json to reference an intent that doesn't exist in archive.
  const dir = tmpDir();
  const { contentRoot } = initMinimalKb(dir);
  const kbDir = path.join(contentRoot, '.kb');

  // Add a release catalog entry that references a non-existent intent
  fs.writeFileSync(
    path.join(kbDir, 'catalog.json'),
    JSON.stringify({
      releases: [{ version: '1.0.0', tagged_at: '2026-01-01T00:00:00Z', intents_applied: ['ghost-intent-1'] }]
    }),
    'utf8'
  );
  // Add the release entity but not the intent entity (no archive folder)
  // checkGraph will detect missing node reference for intent:ghost-intent-1

  const result = checkGraph(contentRoot);
  // The release entity will try to link to intent:ghost-intent-1 which doesn't exist
  assert.ok(result.issue_count >= 1, 'expected at least 1 issue');
  const issue = result.issues[0];
  assert.ok('check_id' in issue);
  assert.ok('severity' in issue);
  assert.ok('entity_or_relation_id' in issue);
  assert.ok('message' in issue);
  assert.ok('evidence_path' in issue);
  assert.ok('suggested_fix' in issue);
});
