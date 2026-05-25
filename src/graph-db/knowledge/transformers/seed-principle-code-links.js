'use strict';

/**
 * Seed Principle→Code Links (Phase 5.1 Implementation)
 *
 * Phase 6 Track A: Link principles to code symbols via pattern matching.
 * Creates kg_applies_to edges when principle keywords match symbol names/docs.
 *
 * Pattern matching strategy:
 * - Extract principle keywords from title + statement
 * - Search for matching symbols (exact name match, case-insensitive)
 * - Create edges only for high-confidence matches
 */

const { aql } = require('arangojs');

/**
 * Extract keywords from principle text.
 *
 * Strategy: Use principle title as primary keyword.
 * Examples:
 *   "Single Responsibility" → ["single", "responsibility", "principle"]
 *   "DRY" → ["dry", "don't", "repeat"]
 *
 * @param {object} principle — { title, statement }
 * @returns {array} normalized keywords
 */
function extractKeywords(principle) {
  const text = `${principle.title} ${principle.statement || ''}`;

  // Split on spaces, punctuation; convert to lowercase; remove short words
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3); // Only words >=3 chars

  // Deduplicate
  return [...new Set(words)];
}

/**
 * Find symbol matches for principle keywords.
 *
 * @param {ArangoDatabase} db
 * @param {array} keywords
 * @returns {object} { exact_matches: [], partial_matches: [] }
 */
async function findSymbolMatches(db, keywords) {
  const exact = [];
  const partial = [];

  // Query: Find symbols where name matches keyword (case-insensitive)
  for (const keyword of keywords) {
    const query = aql`
      FOR symbol IN cg_symbols
        FILTER LOWER(symbol.name) == ${keyword}
        RETURN {
          id: symbol._key,
          name: symbol.name,
          kind: symbol.kind,
          file: symbol.file,
          line: symbol.line
        }
    `;

    try {
      const cursor = await db.query(query);
      const results = await cursor.all();
      if (results.length > 0) {
        exact.push(...results);
      }
    } catch (err) {
      // Query error; skip
    }
  }

  // Deduplicate by _key
  const seen = new Set();
  const deduped = [];
  for (const match of exact) {
    if (!seen.has(match.id)) {
      seen.add(match.id);
      deduped.push(match);
    }
  }

  return { exact_matches: deduped, partial_matches: partial };
}

/**
 * Seed principle→code links into Knowledge Graph.
 *
 * @param {ArangoDatabase} db
 * @param {object} options — { verbose: boolean }
 * @returns {object} { principles_processed, links_created, errors }
 */
async function seedPrincipleCodeLinks(db, options = {}) {
  const { verbose = false } = options;

  const stats = {
    principles_processed: 0,
    links_created: 0,
    no_matches: 0,
    errors: [],
  };

  // Get all principles
  const principlesQuery = aql`
    FOR principle IN kg_principles
      RETURN {
        id: principle._key,
        title: principle.title,
        statement: principle.statement
      }
  `;

  let principles = [];
  try {
    const cursor = await db.query(principlesQuery);
    principles = await cursor.all();
  } catch (err) {
    stats.errors.push(`Failed to fetch principles: ${err.message}`);
    return stats;
  }

  if (verbose) console.log(`[Principle→Code] Processing ${principles.length} principles...`);

  // For each principle, find matching symbols
  for (const principle of principles) {
    try {
      const keywords = extractKeywords(principle);
      const matches = await findSymbolMatches(db, keywords);

      stats.principles_processed++;

      if (matches.exact_matches.length === 0) {
        stats.no_matches++;
        if (verbose) {
          console.log(`  ✗ ${principle.title} — no symbol matches`);
        }
        continue;
      }

      // Create edges for each match
      const edgeCol = db.collection('kg_applies_to');
      for (const symbol of matches.exact_matches) {
        try {
          const edgeKey = `${principle.id}__applies_to__${symbol.id}`;
          const edge = {
            _key: edgeKey,
            _from: `kg_principles/${principle.id}`,
            _to: `cg_symbols/${symbol.id}`,
            type: 'APPLIES_TO',
            created_at: new Date().toISOString(),
            matched_keywords: keywords.filter(k => k === symbol.name.toLowerCase()),
          };

          // Use insertOne if available (ArangoDB 3.8+), else save
          if (edgeCol.insertOne) {
            await edgeCol.insertOne(edge, { overwriteMode: 'update' });
          } else {
            await edgeCol.save(edge, { overwriteMode: 'update' });
          }

          stats.links_created++;
        } catch (err) {
          stats.errors.push(`Failed to create edge ${principle.id}→${symbol.id}: ${err.message}`);
        }
      }

      if (verbose) {
        console.log(`  ✓ ${principle.title} — ${matches.exact_matches.length} symbol(s)`);
      }
    } catch (err) {
      stats.errors.push(`Error processing principle ${principle.id}: ${err.message}`);
      if (verbose) {
        console.error(`  Error: ${err.message}`);
      }
    }
  }

  if (verbose) {
    console.log(
      `[Principle→Code] Complete: ${stats.links_created} links from ${stats.principles_processed} principles (${stats.no_matches} no match)`
    );
  }

  return stats;
}

module.exports = { seedPrincipleCodeLinks, extractKeywords, findSymbolMatches };
