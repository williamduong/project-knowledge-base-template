'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Ingester
//
// Orchestrates extraction pipeline:
//   1. Read markdown documents from KB
//   2. Route to appropriate extractors
//   3. Validate extracted entities
//   4. Upsert to ArangoDB collections
//
// Uses LLM module to extract structured data per ontology.
// ---------------------------------------------------------------------------

const { collectMarkdownFiles, readDocument } = require('./document-reader');
const { extractIntent } = require('./extractors/intent');
const { COLLECTIONS } = require('./schema');

const BATCH_SIZE = 50;

// Route documents to extractors based on path/type
async function extractEntity(doc, llmProvider) {
  // Normalize path separators to forward slashes
  const normalizedPath = doc.path.replace(/\\/g, '/').toLowerCase();

  // Intent documents: knowledge-base/intents/_active/*.md
  if (normalizedPath.includes('intents/') && normalizedPath.includes('_active/') && doc.frontmatter.id) {
    const intent = await extractIntent(doc, llmProvider);
    if (intent) return { type: 'intent', entity: intent, doc };
  }

  // TODO: Goal, Decision, Principle, Risk, Lesson extractors

  return null;
}

// Upsert documents (using key for idempotency)
async function upsertBatch(collection, docs) {
  if (docs.length === 0) return;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await collection.saveAll(docs.slice(i, i + BATCH_SIZE), { overwriteMode: 'update' });
  }
}

// Build Intent document for ArangoDB
function buildIntentDoc(extracted, sourceDoc) {
  return {
    _key:        extracted.id,
    id:          extracted.id,
    title:       extracted.title,
    status:      extracted.status,
    lifecycle:   extracted.lifecycle || 'active',
    goal_text:   extracted.goal_text,
    version_target: extracted.version_target || null,
    created_at:  extracted.created_at || new Date().toISOString(),
    updated_at:  extracted.updated_at || new Date().toISOString(),
    description: extracted.description || '',
    source_path: sourceDoc.path,
    kind:        'intent',
    extracted_at: new Date().toISOString(),
  };
}

// Main ingestion function
async function ingestKnowledgeGraph({ db, kbRoot, workspaceRoot, llmProvider, onProgress }) {
  const stats = {
    files_scanned:  0,
    extracted:      0,
    intents:        0,
    goals:          0,
    decisions:      0,
    errors:         0,
  };

  // 1. Collect all markdown files
  const mdFiles = await collectMarkdownFiles(kbRoot);
  if (onProgress) onProgress({ step: 'scan', files: mdFiles.length });

  // 2. Read and extract entities
  const entities = {
    intents: [],
  };

  for (const filePath of mdFiles) {
    try {
      const doc = await readDocument(filePath, workspaceRoot);
      stats.files_scanned++;

      const extracted = await extractEntity(doc, llmProvider);
      if (extracted) {
        const { type, entity } = extracted;
        if (type === 'intent') {
          const iDoc = buildIntentDoc(entity, doc);
          entities.intents.push(iDoc);
          stats.intents++;
        }
        stats.extracted++;
      }

      if (onProgress && stats.files_scanned % 10 === 0) {
        onProgress({ step: 'extract', files: stats.files_scanned, extracted: stats.extracted });
      }
    } catch (err) {
      stats.errors++;
      if (onProgress) onProgress({ step: 'error', file: filePath, error: err.message });
    }
  }

  // 3. Upsert to ArangoDB
  if (entities.intents.length > 0) {
    const col = db.collection(COLLECTIONS.INTENTS);
    await upsertBatch(col, entities.intents);
  }

  return { stats };
}

module.exports = { ingestKnowledgeGraph };
