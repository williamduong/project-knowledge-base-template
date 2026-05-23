'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  GRAPH_NAME,
  COLLECTIONS,
  EDGE_COLLECTIONS,
  NODE_KIND,
  SYMBOL_KIND,
  EDGE_TYPE,
  GRAPH_DEFINITION,
  INDEXES,
  resolveConfig,
} = require('../../src/graph-db/code');

// ---------------------------------------------------------------------------
// Schema constants
// ---------------------------------------------------------------------------

describe('Code Graph schema constants', () => {
  it('GRAPH_NAME is a non-empty string', () => {
    assert.equal(typeof GRAPH_NAME, 'string');
    assert.ok(GRAPH_NAME.length > 0);
  });

  it('COLLECTIONS has exactly 4 vertex collections', () => {
    const names = Object.values(COLLECTIONS);
    assert.equal(names.length, 4);
    assert.ok(names.every(n => n.startsWith('cg_')));
  });

  it('EDGE_COLLECTIONS has exactly 7 edge collections', () => {
    const names = Object.values(EDGE_COLLECTIONS);
    assert.equal(names.length, 7);
    assert.ok(names.every(n => n.startsWith('cg_')));
  });

  it('COLLECTIONS and EDGE_COLLECTIONS have no name overlap', () => {
    const vSet = new Set(Object.values(COLLECTIONS));
    const eSet = new Set(Object.values(EDGE_COLLECTIONS));
    for (const name of eSet) {
      assert.ok(!vSet.has(name), `"${name}" appears in both COLLECTIONS and EDGE_COLLECTIONS`);
    }
  });

  it('NODE_KIND has file, symbol, commit, hunk', () => {
    assert.equal(NODE_KIND.FILE,   'file');
    assert.equal(NODE_KIND.SYMBOL, 'symbol');
    assert.equal(NODE_KIND.COMMIT, 'commit');
    assert.equal(NODE_KIND.HUNK,   'hunk');
  });

  it('SYMBOL_KIND has function, class, variable, type', () => {
    assert.equal(SYMBOL_KIND.FUNCTION,  'function');
    assert.equal(SYMBOL_KIND.CLASS,     'class');
    assert.equal(SYMBOL_KIND.VARIABLE,  'variable');
    assert.equal(SYMBOL_KIND.TYPE,      'type');
  });

  it('EDGE_TYPE keys match EDGE_COLLECTIONS keys', () => {
    const edgeKeys = Object.keys(EDGE_COLLECTIONS).sort();
    const typeKeys = Object.keys(EDGE_TYPE).sort();
    assert.deepEqual(edgeKeys, typeKeys);
  });
});

// ---------------------------------------------------------------------------
// GRAPH_DEFINITION
// ---------------------------------------------------------------------------

describe('GRAPH_DEFINITION', () => {
  it('name matches GRAPH_NAME', () => {
    assert.equal(GRAPH_DEFINITION.name, GRAPH_NAME);
  });

  it('edgeDefinitions covers all 7 edge collections', () => {
    const defined = new Set(GRAPH_DEFINITION.edgeDefinitions.map(d => d.collection));
    for (const name of Object.values(EDGE_COLLECTIONS)) {
      assert.ok(defined.has(name), `Missing edge definition for "${name}"`);
    }
    assert.equal(defined.size, 7);
  });

  it('each edgeDefinition has from and to arrays with known vertex collections', () => {
    const vcSet = new Set(Object.values(COLLECTIONS));
    for (const def of GRAPH_DEFINITION.edgeDefinitions) {
      assert.ok(Array.isArray(def.from), `${def.collection}.from is not an array`);
      assert.ok(Array.isArray(def.to),   `${def.collection}.to is not an array`);
      for (const col of [...def.from, ...def.to]) {
        assert.ok(vcSet.has(col), `"${col}" in ${def.collection} is not a known vertex collection`);
      }
    }
  });

  it('is frozen (immutable)', () => {
    assert.ok(Object.isFrozen(GRAPH_DEFINITION));
    assert.ok(Object.isFrozen(COLLECTIONS));
    assert.ok(Object.isFrozen(EDGE_COLLECTIONS));
  });
});

// ---------------------------------------------------------------------------
// INDEXES
// ---------------------------------------------------------------------------

describe('INDEXES', () => {
  it('only defines indexes for known vertex collections', () => {
    const vcSet = new Set(Object.values(COLLECTIONS));
    for (const col of Object.keys(INDEXES)) {
      assert.ok(vcSet.has(col), `INDEXES has entry for unknown collection "${col}"`);
    }
  });

  it('every index has type, fields, name', () => {
    for (const [col, defs] of Object.entries(INDEXES)) {
      for (const def of defs) {
        assert.ok(def.type,             `${col} index missing type`);
        assert.ok(Array.isArray(def.fields) && def.fields.length > 0, `${col} index missing fields`);
        assert.ok(def.name,             `${col} index missing name`);
      }
    }
  });

  it('index names are unique across all collections', () => {
    const allNames = [];
    for (const defs of Object.values(INDEXES)) {
      for (const def of defs) allNames.push(def.name);
    }
    const uniqueNames = new Set(allNames);
    assert.equal(uniqueNames.size, allNames.length, 'Duplicate index names found');
  });
});

// ---------------------------------------------------------------------------
// resolveConfig
// ---------------------------------------------------------------------------

describe('resolveConfig', () => {
  it('returns defaults when no env and no overrides', () => {
    const saved = {
      url:  process.env.KBX_ARANGODB_URL,
      db:   process.env.KBX_ARANGODB_DB,
      user: process.env.KBX_ARANGODB_USER,
      pass: process.env.KBX_ARANGODB_PASS,
    };
    delete process.env.KBX_ARANGODB_URL;
    delete process.env.KBX_ARANGODB_DB;
    delete process.env.KBX_ARANGODB_USER;
    delete process.env.KBX_ARANGODB_PASS;

    const cfg = resolveConfig();
    assert.equal(cfg.url,      'http://localhost:8529');
    assert.equal(cfg.database, 'kbx_code_graph');
    assert.equal(cfg.username, 'root');
    assert.equal(cfg.password, '');

    // Restore
    if (saved.url  !== undefined) process.env.KBX_ARANGODB_URL  = saved.url;
    if (saved.db   !== undefined) process.env.KBX_ARANGODB_DB   = saved.db;
    if (saved.user !== undefined) process.env.KBX_ARANGODB_USER = saved.user;
    if (saved.pass !== undefined) process.env.KBX_ARANGODB_PASS = saved.pass;
  });

  it('overrides take precedence over env and defaults', () => {
    const cfg = resolveConfig({
      url:      'http://myhost:8529',
      database: 'my_db',
      username: 'admin',
      password: 'secret',
    });
    assert.equal(cfg.url,      'http://myhost:8529');
    assert.equal(cfg.database, 'my_db');
    assert.equal(cfg.username, 'admin');
    assert.equal(cfg.password, 'secret');
  });
});
