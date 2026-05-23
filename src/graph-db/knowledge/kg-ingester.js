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
const { extractGoal } = require('./extractors/goal');
const { extractDecision } = require('./extractors/decision');
const { extractPrinciple } = require('./extractors/principle');
const { extractLesson } = require('./extractors/lesson');
const { extractDocument } = require('./extractors/document');
const { extractAgent } = require('./extractors/agent');
const { COLLECTIONS } = require('./schema');

const BATCH_SIZE = 50;

// Route documents to extractors based on path/type
async function extractEntity(doc, llmProvider) {
  // Normalize path separators to forward slashes
  const normalizedPath = doc.path.replace(/\\/g, '/').toLowerCase();

  // Intent documents: knowledge-base/intents/_active/*.md
  if (normalizedPath.includes('intents/') && normalizedPath.includes('_active/') && doc.frontmatter.id) {
    const intents = await extractIntent(doc, llmProvider);
    if (intents) return { type: 'intent', entities: Array.isArray(intents) ? intents : [intents], doc };
  }

  // Goal documents
  if (normalizedPath.includes('goals/') && doc.frontmatter.id) {
    const goals = await extractGoal(doc, llmProvider);
    if (goals) return { type: 'goal', entities: goals, doc };
  }

  // Decision documents
  if (normalizedPath.includes('decisions/') && doc.frontmatter.id) {
    const decisions = await extractDecision(doc, llmProvider);
    if (decisions) return { type: 'decision', entities: decisions, doc };
  }

  // Principle documents
  if (normalizedPath.includes('principles/') && doc.frontmatter.id) {
    const principles = await extractPrinciple(doc, llmProvider);
    if (principles) return { type: 'principle', entities: principles, doc };
  }

  // Lesson documents
  if (normalizedPath.includes('lessons/') && doc.frontmatter.id) {
    const lessons = await extractLesson(doc, llmProvider);
    if (lessons) return { type: 'lesson', entities: lessons, doc };
  }

  // Agent documents
  if (normalizedPath.includes('agents/') && doc.frontmatter.id) {
    const agents = await extractAgent(doc, llmProvider);
    if (agents) return { type: 'agent', entities: agents, doc };
  }

  // Document: create auto-document for substantive files with title + frontmatter
  if (doc.frontmatter.title && doc.content.length > 100) {
    const autoDoc = {
      id: doc.id,
      title: doc.frontmatter.title,
      doc_type: doc.frontmatter.doc_type || 'guide',
      summary: doc.content.slice(0, 200).split('\n')[0],
      version: doc.frontmatter.version || null,
      audience: doc.frontmatter.audience || null,
      published_at: doc.frontmatter.published_at || new Date().toISOString(),
      created_at: doc.frontmatter.created_at || new Date().toISOString(),
      updated_at: doc.frontmatter.updated_at || new Date().toISOString(),
    };
    return { type: 'document', entities: [autoDoc], doc };
  }

  return null;
}

// Upsert documents (using key for idempotency)
async function upsertBatch(collection, docs) {
  if (docs.length === 0) return;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await collection.saveAll(docs.slice(i, i + BATCH_SIZE), { overwriteMode: 'update' });
  }
}

// Build documents for ArangoDB — one per entity type
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

function buildGoalDoc(extracted, sourceDoc) {
  return {
    _key:        extracted.id,
    id:          extracted.id,
    title:       extracted.title,
    description: extracted.description,
    status:      extracted.status || null,
    parent_goal_id: extracted.parent_goal_id || null,
    success_metrics: extracted.success_metrics || [],
    target_version: extracted.target_version || null,
    created_at:  extracted.created_at || new Date().toISOString(),
    updated_at:  extracted.updated_at || new Date().toISOString(),
    source_path: sourceDoc.path,
    kind:        'goal',
    extracted_at: new Date().toISOString(),
  };
}

function buildDecisionDoc(extracted, sourceDoc) {
  return {
    _key:        extracted.id,
    id:          extracted.id,
    title:       extracted.title,
    decision:    extracted.decision,
    rationale:   extracted.rationale,
    alternatives_considered: extracted.alternatives_considered || [],
    impact_scope: extracted.impact_scope || null,
    status:      extracted.status || 'approved',
    decided_at:  extracted.decided_at || new Date().toISOString(),
    created_at:  extracted.created_at || new Date().toISOString(),
    updated_at:  extracted.updated_at || new Date().toISOString(),
    source_path: sourceDoc.path,
    kind:        'decision',
    extracted_at: new Date().toISOString(),
  };
}

function buildPrincipleDoc(extracted, sourceDoc) {
  return {
    _key:        extracted.id,
    id:          extracted.id,
    title:       extracted.title,
    statement:   extracted.statement,
    domain:      extracted.domain || null,
    motivation:  extracted.motivation || '',
    examples:    extracted.examples || [],
    created_at:  extracted.created_at || new Date().toISOString(),
    updated_at:  extracted.updated_at || new Date().toISOString(),
    source_path: sourceDoc.path,
    kind:        'principle',
    extracted_at: new Date().toISOString(),
  };
}

function buildLessonDoc(extracted, sourceDoc) {
  return {
    _key:        extracted.id,
    id:          extracted.id,
    title:       extracted.title,
    what_happened: extracted.what_happened,
    why_it_matters: extracted.why_it_matters,
    next_time:   extracted.next_time,
    context:     extracted.context || '',
    severity:    extracted.severity || null,
    learned_at:  extracted.learned_at || new Date().toISOString(),
    created_at:  extracted.created_at || new Date().toISOString(),
    updated_at:  extracted.updated_at || new Date().toISOString(),
    source_path: sourceDoc.path,
    kind:        'lesson',
    extracted_at: new Date().toISOString(),
  };
}

function buildDocumentDoc(extracted, sourceDoc) {
  return {
    _key:        extracted.id,
    id:          extracted.id,
    title:       extracted.title,
    doc_type:    extracted.doc_type || null,
    summary:     extracted.summary || '',
    version:     extracted.version || null,
    audience:    extracted.audience || null,
    published_at: extracted.published_at || new Date().toISOString(),
    created_at:  extracted.created_at || new Date().toISOString(),
    updated_at:  extracted.updated_at || new Date().toISOString(),
    source_path: sourceDoc.path,
    kind:        'document',
    extracted_at: new Date().toISOString(),
  };
}

function buildAgentDoc(extracted, sourceDoc) {
  return {
    _key:        extracted.id,
    id:          extracted.id,
    name:        extracted.name,
    agent_type:  extracted.agent_type || null,
    role:        extracted.role || '',
    responsible_for: extracted.responsible_for || [],
    created_at:  extracted.created_at || new Date().toISOString(),
    updated_at:  extracted.updated_at || new Date().toISOString(),
    source_path: sourceDoc.path,
    kind:        'agent',
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
    principles:     0,
    lessons:        0,
    documents:      0,
    agents:         0,
    errors:         0,
  };

  // 1. Collect all markdown files
  const mdFiles = await collectMarkdownFiles(kbRoot);
  if (onProgress) onProgress({ step: 'scan', files: mdFiles.length });

  // 2. Read and extract entities
  const entities = {
    intents:    [],
    goals:      [],
    decisions:  [],
    principles: [],
    lessons:    [],
    documents:  [],
    agents:     [],
  };

  for (const filePath of mdFiles) {
    try {
      const doc = await readDocument(filePath, workspaceRoot);
      stats.files_scanned++;

      const extracted = await extractEntity(doc, llmProvider);
      if (extracted) {
        const { type, entities: extractedList } = extracted;

        if (type === 'intent') {
          extractedList.forEach(e => {
            entities.intents.push(buildIntentDoc(e, doc));
            stats.intents++;
          });
        } else if (type === 'goal') {
          extractedList.forEach(e => {
            entities.goals.push(buildGoalDoc(e, doc));
            stats.goals++;
          });
        } else if (type === 'decision') {
          extractedList.forEach(e => {
            entities.decisions.push(buildDecisionDoc(e, doc));
            stats.decisions++;
          });
        } else if (type === 'principle') {
          extractedList.forEach(e => {
            entities.principles.push(buildPrincipleDoc(e, doc));
            stats.principles++;
          });
        } else if (type === 'lesson') {
          extractedList.forEach(e => {
            entities.lessons.push(buildLessonDoc(e, doc));
            stats.lessons++;
          });
        } else if (type === 'document') {
          extractedList.forEach(e => {
            entities.documents.push(buildDocumentDoc(e, doc));
            stats.documents++;
          });
        } else if (type === 'agent') {
          extractedList.forEach(e => {
            entities.agents.push(buildAgentDoc(e, doc));
            stats.agents++;
          });
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
  const collections = [
    { name: COLLECTIONS.INTENTS, docs: entities.intents },
    { name: COLLECTIONS.GOALS, docs: entities.goals },
    { name: COLLECTIONS.DECISIONS, docs: entities.decisions },
    { name: COLLECTIONS.PRINCIPLES, docs: entities.principles },
    { name: COLLECTIONS.LESSONS, docs: entities.lessons },
    { name: COLLECTIONS.DOCUMENTS, docs: entities.documents },
    { name: COLLECTIONS.AGENTS, docs: entities.agents },
  ];

  for (const { name, docs } of collections) {
    if (docs.length > 0) {
      const col = db.collection(name);
      await upsertBatch(col, docs);
    }
  }

  return { stats };
}

module.exports = { ingestKnowledgeGraph };
