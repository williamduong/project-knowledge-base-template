'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  detectUnregisteredNewDocs,
  isNewDocStatus,
  scanLegacySchemaIntents,
} = require('../../src/commands/doctor');

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-doctor-routing-'));
  const kbRoot = path.join(root, 'knowledge-base');
  fs.mkdirSync(path.join(kbRoot, '00-start-here'), { recursive: true });
  fs.writeFileSync(path.join(kbRoot, 'INDEX.md'), '# Index\n', 'utf8');
  fs.writeFileSync(path.join(kbRoot, '00-start-here', 'intent-index.md'), '# Intent\n', 'utf8');
  fs.writeFileSync(path.join(kbRoot, '00-start-here', 'code-qa-index.md'), '# Code QA\n', 'utf8');
  return { root, kbRoot };
}

test('isNewDocStatus: detects A and ?? states', () => {
  assert.equal(isNewDocStatus('A'), true);
  assert.equal(isNewDocStatus('AM'), true);
  assert.equal(isNewDocStatus('??'), true);
  assert.equal(isNewDocStatus('M'), false);
  assert.equal(isNewDocStatus(' D'), false);
});

test('detectUnregisteredNewDocs: flags new docs missing routing registration', () => {
  const { root, kbRoot } = makeWorkspace();

  const result = detectUnregisteredNewDocs({
    workspaceRoot: root,
    contentRoot: kbRoot,
    workingTree: [
      { status: 'A', filePath: 'knowledge-base/05-backend/new-api.md' },
      { status: 'M', filePath: 'knowledge-base/INDEX.md' },
    ],
  });

  assert.deepEqual(result.newDocs, ['05-backend/new-api.md']);
  assert.deepEqual(result.missingDocs, ['05-backend/new-api.md']);
});

test('detectUnregisteredNewDocs: accepts registration in intent-index with relative path', () => {
  const { root, kbRoot } = makeWorkspace();

  fs.writeFileSync(
    path.join(kbRoot, '00-start-here', 'intent-index.md'),
    '# Intent\n- [New API](../05-backend/new-api.md)\n',
    'utf8'
  );

  const result = detectUnregisteredNewDocs({
    workspaceRoot: root,
    contentRoot: kbRoot,
    workingTree: [
      { status: '??', filePath: 'knowledge-base/05-backend/new-api.md' },
    ],
  });

  assert.deepEqual(result.newDocs, ['05-backend/new-api.md']);
  assert.deepEqual(result.missingDocs, []);
});

test('detectUnregisteredNewDocs: accepts registration in folder INDEX by basename', () => {
  const { root, kbRoot } = makeWorkspace();
  fs.mkdirSync(path.join(kbRoot, '06-api'), { recursive: true });
  fs.writeFileSync(path.join(kbRoot, '06-api', 'INDEX.md'), '# API\n- [Endpoint](endpoint.md)\n', 'utf8');

  const result = detectUnregisteredNewDocs({
    workspaceRoot: root,
    contentRoot: kbRoot,
    workingTree: [
      { status: 'A', filePath: 'knowledge-base/06-api/endpoint.md' },
      { status: 'A', filePath: 'knowledge-base/.kb/reports/temp.md' },
    ],
  });

  assert.deepEqual(result.newDocs, ['06-api/endpoint.md']);
  assert.deepEqual(result.missingDocs, []);
});

test('scanLegacySchemaIntents: detects active intents missing schema_version', () => {
  const contentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-doctor-legacy-'));
  const activeRoot = path.join(contentRoot, 'intents', '_active', 'old-intent');
  fs.mkdirSync(activeRoot, { recursive: true });
  // legacy frontmatter: has status but no schema_version
  const legacyFm = '---\nstatus: open\nlifecycle: active\n---\n# Intent\n';
  fs.writeFileSync(path.join(activeRoot, 'intent.md'), legacyFm, 'utf8');

  const result = scanLegacySchemaIntents(contentRoot);
  assert.deepEqual(result, ['old-intent']);
});

test('scanLegacySchemaIntents: returns empty when all intents have schema_version', () => {
  const contentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-doctor-modern-'));
  const activeRoot = path.join(contentRoot, 'intents', '_active', 'new-intent');
  fs.mkdirSync(activeRoot, { recursive: true });
  const modernFm = '---\nlifecycle: active\nschema_version: v2.4.0\n---\n# Intent\n';
  fs.writeFileSync(path.join(activeRoot, 'intent.md'), modernFm, 'utf8');

  const result = scanLegacySchemaIntents(contentRoot);
  assert.deepEqual(result, []);
});
