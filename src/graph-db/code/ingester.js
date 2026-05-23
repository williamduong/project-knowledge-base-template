'use strict';

// ---------------------------------------------------------------------------
// Code Graph — Ingester (Phase 1)
//
// Walks a directory, runs the AST walker on each JS/TS file, and upserts
// all extracted data into ArangoDB using the Code Graph schema.
//
// Upsert strategy: overwriteMode='update' — safe to re-run (idempotent).
// Edges use a stable _key derived from (fromKey, type, toKey) so re-runs
// update rather than duplicate.
// ---------------------------------------------------------------------------

const path = require('path');
const { COLLECTIONS, EDGE_COLLECTIONS } = require('./schema');
const { collectFiles, walkFile, fileKey, symbolKey } = require('./ast-walker');

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

function edgeKey(fromKey, type, toKey) {
  return `${fromKey}__${type}__${toKey}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

// ---------------------------------------------------------------------------
// Batch upsert helper
// ---------------------------------------------------------------------------

const BATCH_SIZE = 200;

async function upsertBatch(collection, docs) {
  if (docs.length === 0) return;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    await collection.saveAll(chunk, { overwriteMode: 'update' });
  }
}

// ---------------------------------------------------------------------------
// Build ArangoDB documents from walker output
// ---------------------------------------------------------------------------

function buildFileDocs(results) {
  return results.map(({ file }) => ({
    _key:          fileKey(file.relPath),
    path:          file.relPath,
    language:      file.language,
    size:          file.size,
    last_modified: file.last_modified,
    kind:          'file',
  }));
}

function buildSymbolDocs(results) {
  const docs = [];
  for (const { symbols } of results) {
    for (const sym of symbols) {
      docs.push({
        _key:     sym.key,
        name:     sym.name,
        kind:     sym.kind,
        file:     sym.file,
        line:     sym.line,
        exported: sym.exported,
      });
    }
  }
  return docs;
}

function buildImportEdges(results) {
  const edges = [];
  for (const { imports } of results) {
    for (const imp of imports) {
      if (!imp.toFile) continue; // skip unresolved / external
      const fromKey = fileKey(imp.fromFile);
      const toKey   = fileKey(imp.toFile);
      edges.push({
        _key:       edgeKey(fromKey, 'IMPORTS', toKey),
        _from:      `${COLLECTIONS.FILES}/${fromKey}`,
        _to:        `${COLLECTIONS.FILES}/${toKey}`,
        type:       'IMPORTS',
        specifiers: imp.specifiers,
        rawSource:  imp.rawSource,
      });
    }
  }
  return edges;
}

function buildDefinesEdges(results) {
  const edges = [];
  for (const { file, symbols } of results) {
    const fKey = fileKey(file.relPath);
    for (const sym of symbols) {
      edges.push({
        _key:  edgeKey(fKey, 'DEFINES', sym.key),
        _from: `${COLLECTIONS.FILES}/${fKey}`,
        _to:   `${COLLECTIONS.SYMBOLS}/${sym.key}`,
        type:  'DEFINES',
      });
    }
  }
  return edges;
}

function buildExportsEdges(results) {
  const edges = [];
  for (const { file, exports: exps } of results) {
    const fKey = fileKey(file.relPath);
    for (const exp of exps) {
      if (!exp.symbolKey) continue; // skip unresolvable
      edges.push({
        _key:      edgeKey(fKey, 'EXPORTS', exp.symbolKey),
        _from:     `${COLLECTIONS.FILES}/${fKey}`,
        _to:       `${COLLECTIONS.SYMBOLS}/${exp.symbolKey}`,
        type:      'EXPORTS',
        isDefault: exp.isDefault,
        name:      exp.symbolName,
      });
    }
  }
  return edges;
}

function buildCallsEdges(results) {
  const edges = [];
  for (const { calls } of results) {
    for (const call of calls) {
      edges.push({
        _key:  edgeKey(call.fromSymbolKey, 'CALLS', call.toSymbolKey),
        _from: `${COLLECTIONS.SYMBOLS}/${call.fromSymbolKey}`,
        _to:   `${COLLECTIONS.SYMBOLS}/${call.toSymbolKey}`,
        type:  'CALLS',
      });
    }
  }
  return edges;
}

function buildInheritsEdges(results) {
  const edges = [];
  for (const { inherits } of results) {
    for (const inh of inherits) {
      if (!inh.toSymbolKey) continue; // skip unresolvable parent
      edges.push({
        _key:    edgeKey(inh.fromSymbolKey, 'INHERITS', inh.toSymbolKey),
        _from:   `${COLLECTIONS.SYMBOLS}/${inh.fromSymbolKey}`,
        _to:     `${COLLECTIONS.SYMBOLS}/${inh.toSymbolKey}`,
        type:    'INHERITS',
        toName:  inh.toName,
      });
    }
  }
  return edges;
}

// ---------------------------------------------------------------------------
// Main: ingestDirectory
//
// db           — arangojs Database handle (from connect())
// rootDir      — absolute path to directory to scan (e.g. workspaceRoot/src)
// workspaceRoot — absolute workspace root (for relative path computation)
// onProgress   — optional callback({ file, index, total })
//
// Returns: { stats: { files, symbols, imports, defines, exports, calls, inherits, skipped } }
// ---------------------------------------------------------------------------

async function ingestDirectory({ db, rootDir, workspaceRoot, onProgress }) {
  const absoluteFiles = collectFiles(rootDir);
  const total = absoluteFiles.length;

  const results = [];
  let skipped = 0;

  for (let i = 0; i < absoluteFiles.length; i++) {
    const abs = absoluteFiles[i];
    const rel = path.relative(workspaceRoot, abs).replace(/\\/g, '/');
    const parsed = walkFile(abs, rel, workspaceRoot);
    if (!parsed) { skipped++; continue; }
    results.push(parsed);
    if (onProgress) onProgress({ file: rel, index: i + 1, total });
  }

  // Build all documents
  const fileDocs    = buildFileDocs(results);
  const symbolDocs  = buildSymbolDocs(results);
  const importEdges = buildImportEdges(results);
  const defineEdges = buildDefinesEdges(results);
  const exportEdges = buildExportsEdges(results);
  const callEdges   = buildCallsEdges(results);
  const inheritEdges = buildInheritsEdges(results);

  // Upsert in dependency order
  await upsertBatch(db.collection(COLLECTIONS.FILES),           fileDocs);
  await upsertBatch(db.collection(COLLECTIONS.SYMBOLS),         symbolDocs);
  await upsertBatch(db.collection(EDGE_COLLECTIONS.IMPORTS),    importEdges);
  await upsertBatch(db.collection(EDGE_COLLECTIONS.DEFINES),    defineEdges);
  await upsertBatch(db.collection(EDGE_COLLECTIONS.EXPORTS),    exportEdges);
  await upsertBatch(db.collection(EDGE_COLLECTIONS.CALLS),      callEdges);
  await upsertBatch(db.collection(EDGE_COLLECTIONS.INHERITS),   inheritEdges);

  return {
    stats: {
      files:    fileDocs.length,
      symbols:  symbolDocs.length,
      imports:  importEdges.length,
      defines:  defineEdges.length,
      exports:  exportEdges.length,
      calls:    callEdges.length,
      inherits: inheritEdges.length,
      skipped,
    },
  };
}

module.exports = { ingestDirectory };
