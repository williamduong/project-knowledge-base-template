'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const { walkFile, collectFiles, fileKey, symbolKey } = require('../../src/graph-db/code/ast-walker');

// ---------------------------------------------------------------------------
// Helpers — write a temp file and walk it
// ---------------------------------------------------------------------------

function withTempFile(ext, source, fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-test-'));
  const filePath = path.join(tmpDir, `fixture${ext}`);
  fs.writeFileSync(filePath, source, 'utf8');
  const rel = `fixture${ext}`;
  try {
    return fn(filePath, rel, tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// fileKey / symbolKey
// ---------------------------------------------------------------------------

describe('key helpers', () => {
  it('fileKey replaces non-alphanumeric with _', () => {
    assert.equal(fileKey('src/lib/graph.js'), 'src_lib_graph_js');
  });

  it('symbolKey embeds file key + name + line', () => {
    const k = symbolKey('src/lib/foo.js', 'myFn', 42);
    assert.ok(k.includes('myFn'), 'should include symbol name');
    assert.ok(k.includes('42'), 'should include line');
    assert.ok(k.includes('src_lib_foo_js'), 'should include file key');
  });
});

// ---------------------------------------------------------------------------
// walkFile — ESM imports
// ---------------------------------------------------------------------------

describe('walkFile — ESM imports', () => {
  const source = `
import fs from 'fs';
import { join, resolve } from 'path';
import { foo } from './utils';
export function bar() { return foo(); }
`;
  it('detects external imports', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      const external = r.imports.filter(i => i.external);
      assert.equal(external.length, 2);
      assert.ok(external.some(i => i.rawSource === 'fs'));
      assert.ok(external.some(i => i.rawSource === 'path'));
    });
  });

  it('detects internal import (relative)', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      const internal = r.imports.filter(i => !i.external);
      // ./utils file doesn't exist on disk → toFile is null, but import still recorded
      assert.ok(internal.some(i => i.rawSource === './utils'));
    });
  });

  it('extracts specifiers from named import', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      const pathImport = r.imports.find(i => i.rawSource === 'path');
      assert.ok(pathImport);
      assert.ok(pathImport.specifiers.includes('join'));
      assert.ok(pathImport.specifiers.includes('resolve'));
    });
  });
});

// ---------------------------------------------------------------------------
// walkFile — CJS require
// ---------------------------------------------------------------------------

describe('walkFile — CJS require', () => {
  const source = `
'use strict';
const fs = require('fs');
const { join } = require('path');
const utils = require('./helpers');
function greet(name) { return 'hello ' + name; }
module.exports = { greet };
`;
  it('detects require() imports', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      assert.ok(r.imports.some(i => i.rawSource === 'fs'));
      assert.ok(r.imports.some(i => i.rawSource === 'path'));
      assert.ok(r.imports.some(i => i.rawSource === './helpers'));
    });
  });

  it('extracts module.exports names', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      assert.ok(r.exports.some(e => e.symbolName === 'greet'));
    });
  });
});

// ---------------------------------------------------------------------------
// walkFile — symbols (functions + classes)
// ---------------------------------------------------------------------------

describe('walkFile — symbol extraction', () => {
  const source = `
function alpha() {}
const beta = () => {};
const gamma = function namedExpr() {};
class Delta {}
class Epsilon extends Delta {}
const obj = 42;
`;
  it('extracts function declarations', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      assert.ok(r.symbols.some(s => s.name === 'alpha' && s.kind === 'function'));
    });
  });

  it('extracts arrow functions as function kind', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      assert.ok(r.symbols.some(s => s.name === 'beta' && s.kind === 'function'));
    });
  });

  it('extracts class declarations', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      assert.ok(r.symbols.some(s => s.name === 'Delta' && s.kind === 'class'));
      assert.ok(r.symbols.some(s => s.name === 'Epsilon' && s.kind === 'class'));
    });
  });

  it('extracts plain variable declarations', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      assert.ok(r.symbols.some(s => s.name === 'obj' && s.kind === 'variable'));
    });
  });

  it('records inherits for class with superClass', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      const inh = r.inherits.find(i => i.toName === 'Delta');
      assert.ok(inh, 'expected INHERITS edge from Epsilon to Delta');
      // Both defined in same file → toSymbolKey resolved
      assert.ok(inh.toSymbolKey !== null);
    });
  });
});

// ---------------------------------------------------------------------------
// walkFile — exports
// ---------------------------------------------------------------------------

describe('walkFile — exports', () => {
  const source = `
export function foo() {}
export class Bar {}
export const baz = 1;
export default foo;
`;
  it('marks exported symbols', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      assert.ok(r.symbols.some(s => s.name === 'foo' && s.exported === true));
      assert.ok(r.symbols.some(s => s.name === 'Bar' && s.exported === true));
    });
  });

  it('creates export edges', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      assert.ok(r.exports.some(e => e.symbolName === 'foo' && !e.isDefault));
      assert.ok(r.exports.some(e => e.symbolName === 'Bar' && !e.isDefault));
      assert.ok(r.exports.some(e => e.isDefault));
    });
  });
});

// ---------------------------------------------------------------------------
// walkFile — intra-file CALLS
// ---------------------------------------------------------------------------

describe('walkFile — intra-file calls', () => {
  const source = `
function helper() { return 1; }
function main() { return helper() + helper(); }
function unused() {}
`;
  it('records call from main to helper', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      const helperSym = r.symbols.find(s => s.name === 'helper');
      const mainSym   = r.symbols.find(s => s.name === 'main');
      assert.ok(helperSym);
      assert.ok(mainSym);
      const call = r.calls.find(
        c => c.fromSymbolKey === mainSym.key && c.toSymbolKey === helperSym.key
      );
      assert.ok(call, 'expected CALLS edge from main → helper');
    });
  });

  it('deduplicates repeated calls', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      const mainSym   = r.symbols.find(s => s.name === 'main');
      const helperSym = r.symbols.find(s => s.name === 'helper');
      const callsFromMain = r.calls.filter(c => c.fromSymbolKey === mainSym.key && c.toSymbolKey === helperSym.key);
      assert.equal(callsFromMain.length, 1, 'duplicate calls should be deduped');
    });
  });

  it('does not record calls to non-local symbols', () => {
    withTempFile('.js', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      // 'unused' is never called → should not appear as a callee
      const unusedSym = r.symbols.find(s => s.name === 'unused');
      assert.ok(r.calls.every(c => c.toSymbolKey !== unusedSym.key));
    });
  });
});

// ---------------------------------------------------------------------------
// walkFile — TypeScript
// ---------------------------------------------------------------------------

describe('walkFile — TypeScript support', () => {
  const source = `
type UserId = string;
interface User { id: UserId; name: string; }
enum Status { Active = 'active', Inactive = 'inactive' }
export function getUser(id: UserId): User { return { id, name: '' }; }
`;
  it('extracts TypeScript type aliases + interfaces + enums', () => {
    withTempFile('.ts', source, (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      assert.ok(r.symbols.some(s => s.name === 'UserId'  && s.kind === 'type'));
      assert.ok(r.symbols.some(s => s.name === 'User'    && s.kind === 'type'));
      assert.ok(r.symbols.some(s => s.name === 'Status'  && s.kind === 'type'));
      assert.ok(r.symbols.some(s => s.name === 'getUser' && s.kind === 'function'));
    });
  });
});

// ---------------------------------------------------------------------------
// walkFile — returns null for unsupported extensions
// ---------------------------------------------------------------------------

describe('walkFile — unsupported extension', () => {
  it('returns null for .json', () => {
    withTempFile('.json', '{}', (abs, rel, root) => {
      const r = walkFile(abs, rel, root);
      assert.equal(r, null);
    });
  });
});

// ---------------------------------------------------------------------------
// collectFiles
// ---------------------------------------------------------------------------

describe('collectFiles', () => {
  it('collects JS/TS files recursively, skips node_modules', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-collect-'));
    try {
      fs.mkdirSync(path.join(tmpDir, 'src'));
      fs.mkdirSync(path.join(tmpDir, 'node_modules'));
      fs.writeFileSync(path.join(tmpDir, 'src', 'a.js'), '');
      fs.writeFileSync(path.join(tmpDir, 'src', 'b.ts'), '');
      fs.writeFileSync(path.join(tmpDir, 'node_modules', 'c.js'), '');
      fs.writeFileSync(path.join(tmpDir, 'data.json'), '');

      const files = collectFiles(tmpDir);
      const names = files.map(f => path.basename(f));
      assert.ok(names.includes('a.js'));
      assert.ok(names.includes('b.ts'));
      assert.ok(!names.includes('c.js'), 'node_modules should be skipped');
      assert.ok(!names.includes('data.json'), '.json should be skipped');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
