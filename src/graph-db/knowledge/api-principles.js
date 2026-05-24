'use strict';

const { aql } = require('arangojs');

// Fetch all principles with metadata
async function getPrinciplesList(db) {
  const query = aql`
    FOR principle IN kg_principles
      LET code_symbols = (
        FOR edge IN kg_applies_to
          FILTER edge._from == CONCAT('kg_principles/', principle._key)
          RETURN SPLIT(edge._to, '/')[1]
      )
      SORT principle.title
      RETURN {
        id: principle._key,
        title: principle.title,
        statement: principle.statement,
        domain: principle.domain,
        motivation: principle.motivation,
        examples: principle.examples,
        code_symbol_count: LENGTH(code_symbols),
        code_symbols: code_symbols,
        extracted_at: principle.extracted_at
      }
  `;

  const cursor = await db.query(query);
  return cursor.all();
}

// Fetch single principle with full context
async function getPrinciple(db, principleId) {
  const query = aql`
    FOR principle IN kg_principles
      FILTER principle._key == ${principleId}
      LET code_symbols = (
        FOR edge IN kg_applies_to
          FILTER edge._from == CONCAT('kg_principles/', principle._key)
          RETURN {
            id: SPLIT(edge._to, '/')[1],
            edge_provenance: edge.provenance
          }
      )
      RETURN {
        id: principle._key,
        title: principle.title,
        statement: principle.statement,
        domain: principle.domain,
        motivation: principle.motivation,
        examples: principle.examples,
        code_symbols: code_symbols,
        code_symbol_count: LENGTH(code_symbols),
        extracted_at: principle.extracted_at
      }
  `;

  const cursor = await db.query(query);
  const results = await cursor.all();
  return results.length > 0 ? results[0] : null;
}

// Fetch principles by domain
async function getPrinciplesByDomain(db, domain) {
  const query = aql`
    FOR principle IN kg_principles
      FILTER principle.domain == ${domain}
      LET code_symbol_count = (
        FOR edge IN kg_applies_to
          FILTER edge._from == CONCAT('kg_principles/', principle._key)
          RETURN 1
      )
      SORT principle.title
      RETURN {
        id: principle._key,
        title: principle.title,
        statement: principle.statement,
        motivation: principle.motivation,
        code_symbol_count: LENGTH(code_symbol_count)
      }
  `;

  const cursor = await db.query(query);
  return cursor.all();
}

// Get principles that apply to a specific code symbol (Phase 5.1+)
async function getPrinciplesForSymbol(db, symbolId) {
  const query = aql`
    FOR edge IN kg_applies_to
      FILTER edge._to == CONCAT('cg_symbols/', ${symbolId})
      FOR principle IN kg_principles
        FILTER principle._key == SPLIT(edge._from, '/')[1]
        RETURN {
          id: principle._key,
          title: principle.title,
          statement: principle.statement,
          domain: principle.domain,
          motivation: principle.motivation
        }
  `;

  const cursor = await db.query(query);
  return cursor.all();
}

// Get principles by domain with statistics
async function getPrinciplesDomainStats(db) {
  const query = aql`
    FOR principle IN kg_principles
      COLLECT domain = principle.domain WITH COUNT INTO count
      SORT domain
      RETURN {
        domain: domain,
        count: count
      }
  `;

  const cursor = await db.query(query);
  const results = await cursor.all();
  const stats = {
    total: 0,
    by_domain: {},
  };

  for (const row of results) {
    stats.total += row.count;
    stats.by_domain[row.domain || 'uncategorized'] = row.count;
  }

  return stats;
}

// Get principles coverage status (Phase 5+ metric)
async function getPrinciplesCoverageStatus(db) {
  const query = aql`
    FOR principle IN kg_principles
      LET has_code_symbols = (
        FOR edge IN kg_applies_to
          FILTER edge._from == CONCAT('kg_principles/', principle._key)
          RETURN 1
      )
      RETURN {
        id: principle._key,
        title: principle.title,
        has_code_coverage: LENGTH(has_code_symbols) > 0,
        code_symbol_count: LENGTH(has_code_symbols)
      }
  `;

  const cursor = await db.query(query);
  const results = await cursor.all();

  let covered = 0;
  let uncovered = 0;

  for (const row of results) {
    if (row.has_code_coverage) {
      covered += 1;
    } else {
      uncovered += 1;
    }
  }

  return {
    total: results.length,
    covered: covered,
    uncovered: uncovered,
    coverage_percent: results.length > 0 ? Math.round((covered / results.length) * 100) : 0,
    principles: results
  };
}

module.exports = {
  getPrinciplesList,
  getPrinciple,
  getPrinciplesByDomain,
  getPrinciplesForSymbol,
  getPrinciplesDomainStats,
  getPrinciplesCoverageStatus,
};
