'use strict';

// ---------------------------------------------------------------------------
// Code Graph — Schema constants (Phase 0)
// No ontology. Pure structural relationships.
// ---------------------------------------------------------------------------

// Named graph registered in ArangoDB
const GRAPH_NAME = 'code_graph';

// ---------------------------------------------------------------------------
// Vertex collections
// ---------------------------------------------------------------------------

const COLLECTIONS = Object.freeze({
  // Source file on disk
  FILES:   'cg_files',
  // Named symbol: function / class / variable / type
  SYMBOLS: 'cg_symbols',
  // Git commit
  COMMITS: 'cg_commits',
  // Changed hunk within a commit
  HUNKS:   'cg_hunks',
});

// ---------------------------------------------------------------------------
// Edge collections
// ---------------------------------------------------------------------------

const EDGE_COLLECTIONS = Object.freeze({
  // File statically imports/requires another File
  IMPORTS:        'cg_imports',
  // File defines a Symbol
  DEFINES:        'cg_defines',
  // File exports a Symbol
  EXPORTS:        'cg_exports',
  // Symbol calls another Symbol
  CALLS:          'cg_calls',
  // Symbol inherits from another Symbol (class hierarchy)
  INHERITS:       'cg_inherits',
  // File was modified in a Commit
  CHANGED_IN:     'cg_changed_in',
  // Commit contains a Hunk
  CONTAINS_HUNK:  'cg_contains_hunk',
});

// ---------------------------------------------------------------------------
// Node kind values (stored in each vertex as `kind`)
// ---------------------------------------------------------------------------

const NODE_KIND = Object.freeze({
  FILE:   'file',
  SYMBOL: 'symbol',
  COMMIT: 'commit',
  HUNK:   'hunk',
});

// ---------------------------------------------------------------------------
// Symbol kind values (sub-type of symbol vertex)
// ---------------------------------------------------------------------------

const SYMBOL_KIND = Object.freeze({
  FUNCTION:  'function',
  CLASS:     'class',
  VARIABLE:  'variable',
  TYPE:      'type',
});

// ---------------------------------------------------------------------------
// Edge relation type names (stored in each edge as `type`)
// ---------------------------------------------------------------------------

const EDGE_TYPE = Object.freeze({
  IMPORTS:       'IMPORTS',
  DEFINES:       'DEFINES',
  EXPORTS:       'EXPORTS',
  CALLS:         'CALLS',
  INHERITS:      'INHERITS',
  CHANGED_IN:    'CHANGED_IN',
  CONTAINS_HUNK: 'CONTAINS_HUNK',
});

// ---------------------------------------------------------------------------
// ArangoDB named graph definition
// Used by ensureSchema() to create or verify the named graph.
// ---------------------------------------------------------------------------

const GRAPH_DEFINITION = Object.freeze({
  name: GRAPH_NAME,
  edgeDefinitions: [
    {
      collection: EDGE_COLLECTIONS.IMPORTS,
      from: [COLLECTIONS.FILES],
      to:   [COLLECTIONS.FILES],
    },
    {
      collection: EDGE_COLLECTIONS.DEFINES,
      from: [COLLECTIONS.FILES],
      to:   [COLLECTIONS.SYMBOLS],
    },
    {
      collection: EDGE_COLLECTIONS.EXPORTS,
      from: [COLLECTIONS.FILES],
      to:   [COLLECTIONS.SYMBOLS],
    },
    {
      collection: EDGE_COLLECTIONS.CALLS,
      from: [COLLECTIONS.SYMBOLS],
      to:   [COLLECTIONS.SYMBOLS],
    },
    {
      collection: EDGE_COLLECTIONS.INHERITS,
      from: [COLLECTIONS.SYMBOLS],
      to:   [COLLECTIONS.SYMBOLS],
    },
    {
      collection: EDGE_COLLECTIONS.CHANGED_IN,
      from: [COLLECTIONS.FILES],
      to:   [COLLECTIONS.COMMITS],
    },
    {
      collection: EDGE_COLLECTIONS.CONTAINS_HUNK,
      from: [COLLECTIONS.COMMITS],
      to:   [COLLECTIONS.HUNKS],
    },
  ],
  orphanCollections: [],
});

// ---------------------------------------------------------------------------
// Index definitions per collection
// Applied by ensureSchema() after collections are created.
// ---------------------------------------------------------------------------

const INDEXES = Object.freeze({
  [COLLECTIONS.FILES]: [
    { type: 'persistent', fields: ['path'],     unique: true, name: 'idx_files_path' },
    { type: 'persistent', fields: ['language'], unique: false, name: 'idx_files_language' },
  ],
  [COLLECTIONS.SYMBOLS]: [
    { type: 'persistent', fields: ['file', 'name', 'kind'], unique: false, name: 'idx_symbols_file_name_kind' },
    { type: 'persistent', fields: ['name'],                 unique: false, name: 'idx_symbols_name' },
  ],
  [COLLECTIONS.COMMITS]: [
    { type: 'persistent', fields: ['hash'],   unique: true,  name: 'idx_commits_hash' },
    { type: 'persistent', fields: ['branch'], unique: false, name: 'idx_commits_branch' },
  ],
  [COLLECTIONS.HUNKS]: [
    { type: 'persistent', fields: ['file_path'], unique: false, name: 'idx_hunks_file_path' },
  ],
});

module.exports = {
  GRAPH_NAME,
  COLLECTIONS,
  EDGE_COLLECTIONS,
  NODE_KIND,
  SYMBOL_KIND,
  EDGE_TYPE,
  GRAPH_DEFINITION,
  INDEXES,
};
