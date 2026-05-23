'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Document extractor
//
// Extracts Document entities from markdown documents.
// Documents are structured knowledge artifacts (guides, procedures, references).
// ---------------------------------------------------------------------------

const { z } = require('zod');

// Schema for Document extraction
const DocumentSchema = z.object({
  id:           z.string().describe('Unique document identifier'),
  title:        z.string().describe('Document title'),
  doc_type:     z.enum(['guide', 'procedure', 'specification', 'reference', 'tutorial', 'report', 'decision_record']).optional(),
  summary:      z.string().optional().describe('Brief summary of document content'),
  version:      z.string().optional().describe('Document version'),
  audience:     z.string().optional().describe('Intended audience'),
  published_at: z.string().optional().describe('ISO 8601 publication date'),
  created_at:   z.string().optional(),
  updated_at:   z.string().optional(),
});

// Prompt template for Document extraction
function buildDocumentPrompt(doc) {
  return `
You are extracting Document metadata from a markdown document.

DOCUMENT:
Title: ${doc.title}
Path: ${doc.path}
Type: ${doc.type}

Content (first 500 chars):
${doc.content.slice(0, 500)}

TASK: Extract Document entity metadata in JSON format. Return ONE document per file (not multiple).

Example structure:
{
  "id": "doc-git-walker-design",
  "title": "Git Walker Design & Implementation",
  "doc_type": "specification",
  "summary": "Specification for extracting git history into structured commits, hunks, and file-level changes using spawnSync and ASCII separators",
  "version": "1.0",
  "audience": "Backend developers, Code Graph team",
  "published_at": "2026-05-20T...",
  "created_at": "2026-05-20T...",
  "updated_at": "2026-05-20T..."
}

Rules:
- Extract ONCE per document file (return single JSON object, not array)
- Return null if file is not a substantive document (e.g., is a template, empty, meta-file)
- doc_type: one of [guide, procedure, specification, reference, tutorial, report, decision_record]
- summary: 1–3 sentences of what the document covers
- version: semantic version if available
- audience: who should read this
- published_at: when document was made available/published
- created_at/updated_at: ISO 8601 format
- id: identifier from YAML frontmatter or derived from title, kebab-case

Respond with ONLY the JSON object or null.
`;
}

async function extractDocument(doc, llmProvider) {
  const prompt = buildDocumentPrompt(doc);

  try {
    let result;
    try {
      result = await llmProvider.extract(prompt, DocumentSchema);
    } catch (extractErr) {
      const response = await llmProvider.complete([{ role: 'user', content: prompt }]);
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      result = JSON.parse(jsonMatch[0]);
    }

    if (!result || !result.id) return null;
    return result;
  } catch (err) {
    console.error(`[Document] extraction failed for ${doc.path}: ${err.message}`);
    return null;
  }
}

module.exports = {
  DocumentSchema,
  buildDocumentPrompt,
  extractDocument,
};
