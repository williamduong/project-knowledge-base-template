'use strict';

const fs = require('fs');
const path = require('path');

// Extract semantic keywords from intent description
function extractSemanticKeywords(intentContent) {
  const keywords = new Set();

  // Extract from goal_text, decision_summary, change_scope
  const textContent = intentContent.toLowerCase();

  // Domain keywords to look for
  const domainKeywords = [
    'code graph', 'knowledge graph', 'arangodb', 'database',
    'architecture', 'decision', 'contract', 'schema',
    'ui', 'server', 'cli', 'state', 'governance',
    'principle', 'rules', 'clean architecture', 'refactor',
    'ast', 'import', 'symbol', 'commit',
    'dna', 'template', 'compiler', 'pipeline',
  ];

  domainKeywords.forEach(keyword => {
    if (textContent.includes(keyword)) {
      keywords.add(keyword);
    }
  });

  return Array.from(keywords);
}

// Search for KB documents that match intent semantic keywords
async function findRelevantKBDocuments(db, intentId, keywords) {
  const matches = [];

  if (keywords.length === 0) return matches;

  try {
    // For each keyword, search in document titles and content hints
    for (const keyword of keywords) {
      const cursor = await db.query(`
        FOR doc IN kg_documents
          LET titleMatch = LIKE(doc.title || '', @pattern, true)
          LET keywordMatch = LIKE(doc._key || '', @keywordLike, true)
          FILTER titleMatch OR keywordMatch
          LIMIT 3
          RETURN doc._key
      `, {
        pattern: `%${keyword}%`,
        keywordLike: `%${keyword.replace(/\s+/g, '_')}%`
      });

      const results = await cursor.all();
      results.forEach(docKey => {
        if (!matches.includes(docKey)) {
          matches.push(docKey);
        }
      });
    }
  } catch (err) {
    console.error(`[Semantic Bridges] Error searching KB documents: ${err.message}`);
  }

  return matches;
}

// Create intent_describes_document edges based on semantic relevance
async function seedSemanticDocumentBridges(db) {
  const stats = {
    intents_processed: 0,
    keywords_extracted: 0,
    documents_matched: 0,
    bridges_created: 0,
    errors: 0,
  };

  try {
    // Get all intents
    const intents = await (await db.query('FOR i IN kg_intents RETURN i')).all();
    stats.intents_processed = intents.length;

    const intentsDir = path.join(process.cwd(), 'knowledge-base', 'intents');

    for (const intent of intents) {
      let keywords = [];

      // Try to read intent.md from filesystem
      try {
        const intentPath = path.join(intentsDir, '_active', intent._key, 'intent.md');
        if (fs.existsSync(intentPath)) {
          const content = fs.readFileSync(intentPath, 'utf8');
          keywords = extractSemanticKeywords(content);
        }
      } catch (err) {
        // Skip file read errors
      }

      stats.keywords_extracted += keywords.length;

      // Find relevant KB documents
      const relevantDocs = await findRelevantKBDocuments(db, intent._key, keywords);
      stats.documents_matched += relevantDocs.length;

      // Create describes edges
      for (const docKey of relevantDocs) {
        try {
          const bridgeCol = db.collection('kg_describes');
          await bridgeCol.save({
            _from: `kg_intents/${intent._key}`,
            _to: `kg_documents/${docKey}`,
            created_at: new Date().toISOString(),
            provenance: 'seed-semantic-document-bridges',
          }, { overwriteMode: 'update' });
          stats.bridges_created++;
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.error(`[Semantic Bridges] Error creating edge: ${err.message}`);
            stats.errors++;
          }
        }
      }
    }
  } catch (err) {
    console.error(`[Semantic Bridges] Error seeding semantic document bridges: ${err.message}`);
    stats.errors++;
  }

  return stats;
}

module.exports = {
  extractSemanticKeywords,
  findRelevantKBDocuments,
  seedSemanticDocumentBridges,
};
