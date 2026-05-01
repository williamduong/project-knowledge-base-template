'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  detectUnregisteredNewDocs,
  isNewDocStatus,
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
