'use strict';

/**
 * Code Graph — Symbol Query API
 *
 * Phase 6: Query symbols extracted from source code.
 * Provides REST API layer for symbol data (Track A Phase 1).
 */

const { aql } = require('arangojs');

/**
 * List all symbols with optional filtering.
 *
 * @param {ArangoDatabase} db
 * @param {object} filters — { kind?, file?, exported? }
 * @returns {array} symbols
 */
async function listSymbols(db, filters = {}) {
  let query = aql`
    FOR symbol IN cg_symbols
  `;

  // Apply filters
  if (filters.kind) {
    query = aql.append(query, aql`
      FILTER symbol.kind == ${filters.kind}
    `);
  }
  if (filters.file) {
    query = aql.append(query, aql`
      FILTER symbol.file == ${filters.file}
    `);
  }
  if (filters.exported !== undefined) {
    query = aql.append(query, aql`
      FILTER symbol.exported == ${filters.exported}
    `);
  }

  query = aql.append(query, aql`
    SORT symbol.file, symbol.line
    RETURN {
      id: symbol._key,
      name: symbol.name,
      kind: symbol.kind,
      file: symbol.file,
      line: symbol.line,
      exported: symbol.exported,
      location: CONCAT(symbol.file, ':', symbol.line)
    }
  `);

  const cursor = await db.query(query);
  return cursor.all();
}

/**
 * Get single symbol by ID.
 *
 * @param {ArangoDatabase} db
 * @param {string} symbolId
 * @returns {object|null}
 */
async function getSymbol(db, symbolId) {
  const query = aql`
    FOR symbol IN cg_symbols
      FILTER symbol._key == ${symbolId}
      LET calls = (
        FOR edge IN cg_calls
          FILTER edge._from == CONCAT('cg_symbols/', symbol._key)
          FOR callee IN cg_symbols
            FILTER callee._key == SPLIT(edge._to, '/')[1]
            RETURN {
              id: callee._key,
              name: callee.name,
              kind: callee.kind,
              file: callee.file,
              line: callee.line
            }
      )
      LET callers = (
        FOR edge IN cg_calls
          FILTER edge._to == CONCAT('cg_symbols/', symbol._key)
          FOR caller IN cg_symbols
            FILTER caller._key == SPLIT(edge._from, '/')[1]
            RETURN {
              id: caller._key,
              name: caller.name,
              kind: caller.kind,
              file: caller.file,
              line: caller.line
            }
      )
      RETURN {
        id: symbol._key,
        name: symbol.name,
        kind: symbol.kind,
        file: symbol.file,
        line: symbol.line,
        exported: symbol.exported,
        calls: calls,
        callers: callers,
        call_count: LENGTH(calls),
        caller_count: LENGTH(callers)
      }
  `;

  const cursor = await db.query(query);
  const results = await cursor.all();
  return results[0] || null;
}

/**
 * Get symbols by file.
 *
 * @param {ArangoDatabase} db
 * @param {string} filePath
 * @returns {array} symbols in file
 */
async function getSymbolsByFile(db, filePath) {
  const query = aql`
    FOR symbol IN cg_symbols
      FILTER symbol.file == ${filePath}
      SORT symbol.line
      RETURN {
        id: symbol._key,
        name: symbol.name,
        kind: symbol.kind,
        line: symbol.line,
        exported: symbol.exported
      }
  `;

  const cursor = await db.query(query);
  return cursor.all();
}

/**
 * Get call graph for a symbol (who calls this, who this calls).
 *
 * @param {ArangoDatabase} db
 * @param {string} symbolId
 * @param {number} depth — traversal depth (default 2)
 * @returns {object} call graph with nodes and edges
 */
async function getCallGraph(db, symbolId, depth = 2) {
  const query = aql`
    LET root = (
      FOR symbol IN cg_symbols
        FILTER symbol._key == ${symbolId}
        RETURN symbol._key
    )[0]

    LET calls = (
      FOR v, e, p IN 1..${depth} OUTBOUND CONCAT('cg_symbols/', root)
        cg_calls
        RETURN {
          source: SPLIT(p.vertices[0]._key, '__')[1],
          target: SPLIT(v._key, '__')[1],
          depth: p.edges ? LENGTH(p.edges) : 0
        }
    )

    LET callers = (
      FOR v, e, p IN 1..${depth} INBOUND CONCAT('cg_symbols/', root)
        cg_calls
        RETURN {
          source: SPLIT(v._key, '__')[1],
          target: SPLIT(p.vertices[-1]._key, '__')[1],
          depth: p.edges ? LENGTH(p.edges) : 0
        }
    )

    RETURN {
      root_id: root,
      calls: calls,
      callers: callers,
      call_count: LENGTH(calls),
      caller_count: LENGTH(callers)
    }
  `;

  const cursor = await db.query(query);
  const results = await cursor.all();
  return results[0] || { root_id: symbolId, calls: [], callers: [], call_count: 0, caller_count: 0 };
}

/**
 * Get statistics about symbols in the code graph.
 *
 * @param {ArangoDatabase} db
 * @returns {object} { total_symbols, by_kind, by_file, exported_count }
 */
async function getSymbolsStats(db) {
  const query = aql`
    FOR symbol IN cg_symbols
      COLLECT kind = symbol.kind WITH COUNT INTO count
      RETURN {
        kind: kind,
        count: count
      }
  `;

  const cursor = await db.query(query);
  const byKind = await cursor.all();

  // Total count
  const totalQuery = aql`
    FOR symbol IN cg_symbols
      COLLECT WITH COUNT INTO count
      RETURN count
  `;
  const totalCursor = await db.query(totalQuery);
  const total = (await totalCursor.all())[0] || 0;

  // Exported count
  const exportedQuery = aql`
    FOR symbol IN cg_symbols
      FILTER symbol.exported == true
      COLLECT WITH COUNT INTO count
      RETURN count
  `;
  const exportedCursor = await db.query(exportedQuery);
  const exportedCount = (await exportedCursor.all())[0] || 0;

  return {
    total_symbols: total,
    by_kind: byKind.reduce((acc, item) => ({ ...acc, [item.kind]: item.count }), {}),
    exported_count: exportedCount,
    exported_percent: total > 0 ? Math.round((exportedCount / total) * 100) : 0,
  };
}

module.exports = {
  listSymbols,
  getSymbol,
  getSymbolsByFile,
  getCallGraph,
  getSymbolsStats,
};
