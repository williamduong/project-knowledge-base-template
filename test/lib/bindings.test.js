'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  addBinding,
  emptyBindingsData,
  getDocBindings,
  listAllDocBindings,
  normalizeDocPath,
  readBindingsFile,
  readFrontmatterBindsTo,
  writeBindingsFile,
} = require('../../src/lib/bindings');

function makeTempContentRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-bindings-test-'));
}

test('normalizeDocPath: backslash, multi-slash, ./, trim', () => {
  assert.equal(normalizeDocPath('a\\b\\c.md'), 'a/b/c.md');
  assert.equal(normalizeDocPath('./a/b.md'), 'a/b.md');
  assert.equal(normalizeDocPath('a//b.md'), 'a/b.md');
  assert.equal(normalizeDocPath('  trim/me.md  '), 'trim/me.md');
  assert.equal(normalizeDocPath(null), '');
});

test('readBindingsFile: missing file returns empty data', () => {
  const root = makeTempContentRoot();
  assert.deepEqual(readBindingsFile(root), { version: 1, bindings: [] });
});

test('readBindingsFile: malformed JSON returns empty data', () => {
  const root = makeTempContentRoot();
  fs.mkdirSync(path.join(root, '.kb'), { recursive: true });
  fs.writeFileSync(path.join(root, '.kb', 'bindings.json'), '{not-json');
  assert.deepEqual(readBindingsFile(root), { version: 1, bindings: [] });
});

test('addBinding + writeBindingsFile + readBindingsFile round-trip', () => {
  const root = makeTempContentRoot();
  let data = emptyBindingsData();
  data = addBinding(data, '05-backend/auth.md', ['src/middleware/**', 'src/auth.js']);
  writeBindingsFile(root, data);

  const reloaded = readBindingsFile(root);
  assert.equal(reloaded.bindings.length, 1);
  assert.equal(reloaded.bindings[0].doc, '05-backend/auth.md');
  assert.deepEqual(reloaded.bindings[0].paths, ['src/middleware/**', 'src/auth.js']);
  assert.equal(reloaded.bindings[0].source, 'user');
});

test('addBinding: dedupe paths when adding to existing doc', () => {
  let data = emptyBindingsData();
  data = addBinding(data, 'a.md', ['x.js', 'y.js']);
  data = addBinding(data, 'a.md', ['y.js', 'z.js']);
  assert.deepEqual(data.bindings[0].paths, ['x.js', 'y.js', 'z.js']);
  assert.equal(data.bindings.length, 1);
});

test('addBinding: throws when doc or paths missing', () => {
  assert.throws(() => addBinding(emptyBindingsData(), '', ['x']), /doc path is required/);
  assert.throws(() => addBinding(emptyBindingsData(), 'a.md', []), /at least one path/);
});

test('readFrontmatterBindsTo: returns array from list-style YAML', () => {
  const root = makeTempContentRoot();
  const docPath = path.join(root, 'doc.md');
  fs.writeFileSync(docPath, '---\ntitle: x\nbinds_to:\n  - src/a.js\n  - src/b/**\n---\n\nbody');
  assert.deepEqual(readFrontmatterBindsTo(docPath), ['src/a.js', 'src/b/**']);
});

test('readFrontmatterBindsTo: returns [] when no frontmatter or no binds_to', () => {
  const root = makeTempContentRoot();
  const noFm = path.join(root, 'plain.md');
  fs.writeFileSync(noFm, '# plain markdown only');
  assert.deepEqual(readFrontmatterBindsTo(noFm), []);

  const noBinds = path.join(root, 'no-binds.md');
  fs.writeFileSync(noBinds, '---\ntitle: x\n---\nbody');
  assert.deepEqual(readFrontmatterBindsTo(noBinds), []);
});

test('getDocBindings: frontmatter takes priority over bindings.json', () => {
  const root = makeTempContentRoot();
  // Index says paths=[INDEX]
  let data = emptyBindingsData();
  data = addBinding(data, 'd.md', ['from/index.js']);
  writeBindingsFile(root, data);
  // Frontmatter says paths=[FM]
  fs.writeFileSync(path.join(root, 'd.md'), '---\nbinds_to:\n  - from/fm.js\n---\nbody');

  const resolved = getDocBindings(root, 'd.md');
  assert.deepEqual(resolved.paths, ['from/fm.js']);
  assert.equal(resolved.source, 'frontmatter');
});

test('getDocBindings: falls back to bindings.json when no frontmatter', () => {
  const root = makeTempContentRoot();
  let data = emptyBindingsData();
  data = addBinding(data, 'd.md', ['from/index.js']);
  writeBindingsFile(root, data);

  const resolved = getDocBindings(root, 'd.md');
  assert.deepEqual(resolved.paths, ['from/index.js']);
  assert.equal(resolved.source, 'user');
});

test('getDocBindings: returns empty when neither source has binding', () => {
  const root = makeTempContentRoot();
  const resolved = getDocBindings(root, 'unknown.md');
  assert.deepEqual(resolved.paths, []);
  assert.equal(resolved.source, null);
});

test('listAllDocBindings: merges frontmatter docs and index entries, no duplicates', () => {
  const root = makeTempContentRoot();
  // Index has 2 docs
  let data = emptyBindingsData();
  data = addBinding(data, 'a.md', ['p1']);
  data = addBinding(data, 'b.md', ['p2']);
  writeBindingsFile(root, data);
  // Doc a.md exists with frontmatter (priority over index)
  fs.writeFileSync(path.join(root, 'a.md'), '---\nbinds_to:\n  - from/fm-a.js\n---\nbody');
  // Doc b.md does not exist on disk → index-only

  const all = listAllDocBindings(root);
  const byDoc = Object.fromEntries(all.map((b) => [b.doc, b]));
  assert.equal(all.length, 2);
  assert.deepEqual(byDoc['a.md'].paths, ['from/fm-a.js']);
  assert.equal(byDoc['a.md'].source, 'frontmatter');
  assert.deepEqual(byDoc['b.md'].paths, ['p2']);
  assert.equal(byDoc['b.md'].source, 'user');
});

test('listAllDocBindings: skips files inside .kb/ directory', () => {
  const root = makeTempContentRoot();
  fs.mkdirSync(path.join(root, '.kb'), { recursive: true });
  fs.writeFileSync(path.join(root, '.kb', 'meta.md'), '---\nbinds_to:\n  - x\n---\n');
  const all = listAllDocBindings(root);
  assert.equal(all.length, 0);
});
