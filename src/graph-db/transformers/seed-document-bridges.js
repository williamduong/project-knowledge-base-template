'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('arangojs').Database;

// Extract file paths from intent file content
function extractFileReferencesFromIntent(intentContent) {
  const references = new Set();

  // Common file path patterns: src/, site/, test/, bin/, package.json, etc.
  // Match paths like: src/graph-db/code/schema.js, site/uiv2/src/..., test/...
  const filePattern = /(?:^|\s|\[|`|-\s)([a-z\.\/\-_]*(?:src|site|test|bin|svfactory|knowledge-base|packages|tools)[a-z0-9\.\/\-_]*\.(?:js|mjs|ts|tsx|json|md|yaml|yml))/gmi;

  // Match folder paths like: src/graph-db/, site/kbx-ui/, etc.
  const folderPattern = /(?:^|\s|-\s)([a-z]+\/[a-z0-9\-_/]*)\s/gmi;

  // Extract files
  const fileMatches = intentContent.match(filePattern) || [];
  fileMatches.forEach(match => {
    const cleaned = match.trim().replace(/^[-`[\s]+/, '').toLowerCase();
    if (cleaned.length > 3 && !cleaned.startsWith('http')) {
      references.add(cleaned);
    }
  });

  // Also extract from code blocks and list items
  const lines = intentContent.split('\n');
  lines.forEach(line => {
    // Lines that are code/paths: backticks, inline code
    if (line.includes('`') || line.includes('src/') || line.includes('site/') || line.includes('test/')) {
      const backtickPattern = /`([^`]+\.[a-z]+)`/gi;
      const backtickMatches = line.match(backtickPattern) || [];
      backtickMatches.forEach(match => {
        const cleaned = match.replace(/`/g, '').toLowerCase();
        if (cleaned.includes('.')) {
          references.add(cleaned);
        }
      });

      // Path patterns in brackets
      const bracketPattern = /\[([a-z0-9.\-_/]+(?:\.js|\.md|\.ts|\.tsx|\.json))\]/gi;
      const bracketMatches = line.match(bracketPattern) || [];
      bracketMatches.forEach(match => {
        const cleaned = match.slice(1, -1).toLowerCase();
        references.add(cleaned);
      });

      // Bare paths
      if (line.includes('src/') || line.includes('site/')) {
        const barePattern = /((?:src|site|test|bin|svfactory|knowledge-base|packages|tools)\/[a-z0-9\-_./]*(?:\.js|\.mjs|\.ts|\.tsx|\.json|\.md)?)/gi;
        const bareMatches = line.match(barePattern) || [];
        bareMatches.forEach(match => {
          const cleaned = match.toLowerCase();
          if (cleaned.length > 3) {
            references.add(cleaned);
          }
        });
      }
    }
  });

  return Array.from(references).filter(r => r.length > 3);
}

// Attempt to match extracted file path to actual KB document key
async function matchFileToDocument(db, filePath) {
  try {
    // Normalize path: convert to document key format
    // knowledge-base/00-start-here/repository-revision-state.md → knowledge_base_00_start_here_repository_revision_state_md
    const docKey = filePath
      .replace(/\//g, '_')
      .replace(/\./g, '_')
      .replace(/\-/g, '_')
      .toLowerCase();

    // Try exact match
    let doc = await db.collection('kg_documents').document(docKey).catch(() => null);
    if (doc) return doc._key;

    // Try partial match (last 3 path segments)
    const segments = filePath.split('/').slice(-3).join('_');
    const partialKey = segments.replace(/\./g, '_').replace(/\-/g, '_').toLowerCase();

    // Query documents with similar keys
    const cursor = await db.query(`
      FOR doc IN kg_documents
        FILTER LIKE(doc._key, @pattern, true)
        LIMIT 1
        RETURN doc._key
    `, { pattern: `%${partialKey}%` });

    const results = await cursor.all();
    if (results.length > 0) return results[0];

    return null;
  } catch (err) {
    return null;
  }
}

// Seed document bridge edges: Intent → File
async function seedDocumentBridges(db) {
  const stats = {
    intents_processed: 0,
    files_referenced: 0,
    bridges_created: 0,
    unmatched_files: [],
    errors: 0,
  };

  try {
    // Get all intents from knowledge graph
    const intents = await (await db.query('FOR i IN kg_intents RETURN i')).all();
    stats.intents_processed = intents.length;

    const intentsDir = path.join(process.cwd(), 'knowledge-base', 'intents');

    for (const intent of intents) {
      let fileRefs = [];

      // Try to read intent.md from filesystem
      try {
        const intentPath = path.join(intentsDir, '_active', intent._key, 'intent.md');
        if (fs.existsSync(intentPath)) {
          const content = fs.readFileSync(intentPath, 'utf8');
          fileRefs = extractFileReferencesFromIntent(content);
        } else {
          // Try archived intents
          const archivedPath = path.join(intentsDir, '_archive');
          if (fs.existsSync(archivedPath)) {
            const folders = fs.readdirSync(archivedPath);
            for (const folder of folders) {
              if (folder.includes(intent._key)) {
                const intentMdPath = path.join(archivedPath, folder, 'intent.md');
                if (fs.existsSync(intentMdPath)) {
                  const content = fs.readFileSync(intentMdPath, 'utf8');
                  fileRefs = extractFileReferencesFromIntent(content);
                  break;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(`[Document Bridges] Error reading intent file for ${intent._key}: ${err.message}`);
        stats.errors++;
      }

      stats.files_referenced += fileRefs.length;

      // Try to match each file reference to a document
      for (const fileRef of fileRefs) {
        try {
          const docKey = await matchFileToDocument(db, fileRef);

          if (docKey) {
            try {
              const bridgeCol = db.collection('kg_describes');
              await bridgeCol.save({
                _from: `kg_intents/${intent._key}`,
                _to: `kg_documents/${docKey}`,
                file_path: fileRef,
                created_at: new Date().toISOString(),
                provenance: 'seed-document-bridges',
              }, { overwriteMode: 'update' });
              stats.bridges_created++;
            } catch (err) {
              if (!err.message.includes('already exists')) {
                console.error(`[Document Bridges] Error creating edge: ${err.message}`);
                stats.errors++;
              }
            }
          } else {
            stats.unmatched_files.push({
              intent_id: intent._key,
              file_path: fileRef,
            });
          }
        } catch (err) {
          console.error(`[Document Bridges] Error matching file ${fileRef}: ${err.message}`);
          stats.errors++;
        }
      }
    }
  } catch (err) {
    console.error(`[Document Bridges] Error seeding document bridges: ${err.message}`);
    stats.errors++;
  }

  return stats;
}

module.exports = {
  extractFileReferencesFromIntent,
  matchFileToDocument,
  seedDocumentBridges,
};
