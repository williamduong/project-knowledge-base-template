'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Decision extractor
//
// Extracts Decision entities from markdown documents.
// Uses LLM to understand decision rationale and alternatives.
// ---------------------------------------------------------------------------

const { z } = require('zod');

// Schema for Decision extraction
const DecisionSchema = z.object({
  id:                      z.string().describe('Unique decision identifier'),
  title:                   z.string().describe('Decision title/question'),
  decision:                z.string().describe('The decision made'),
  rationale:               z.string().describe('Why this decision was made'),
  alternatives_considered: z.array(z.string()).optional().describe('Other options evaluated'),
  impact_scope:            z.enum(['local', 'module', 'system', 'organization']).optional(),
  status:                  z.enum(['open', 'proposed', 'approved', 'implemented', 'superseded']).optional(),
  decided_at:              z.string().optional().describe('ISO 8601 when decided'),
  created_at:              z.string().optional(),
  updated_at:              z.string().optional(),
});

// Prompt template for Decision extraction
function buildDecisionPrompt(doc) {
  return `
You are extracting Decision entities from a markdown document.

DOCUMENT:
Title: ${doc.title}
Path: ${doc.path}
Type: ${doc.type}

Content (first 500 chars):
${doc.content.slice(0, 500)}

TASK: Extract Decision entities in JSON format. If document describes multiple decisions, return array. If none, return null.

Example structure:
{
  "id": "decision-arangodb-over-graphdb",
  "title": "Which graph database to use?",
  "decision": "Use ArangoDB for both Code and Knowledge graphs",
  "rationale": "ArangoDB supports multi-model (vertices + edges), has mature driver, and plays well with JavaScript",
  "alternatives_considered": ["Neo4j", "Kuzu", "graphology"],
  "impact_scope": "system",
  "status": "approved",
  "decided_at": "2026-05-20T...",
  "created_at": "2026-05-20T...",
  "updated_at": "2026-05-20T..."
}

Rules:
- Extract ONLY if document discusses a choice/decision with rationale
- Return null if this is NOT a decision-focused document
- status: one of [open, proposed, approved, implemented, superseded]
- impact_scope: one of [local, module, system, organization]
- alternatives_considered: list of options that were evaluated (if available)
- created_at/updated_at: ISO 8601 format
- id: identifier from YAML or derived from title, kebab-case

Respond with ONLY the JSON object/array or null.
`;
}

async function extractDecision(doc, llmProvider) {
  if (!doc.frontmatter.id && !doc.frontmatter.title) {
    return null;
  }

  const prompt = buildDecisionPrompt(doc);

  try {
    let result;
    try {
      result = await llmProvider.extract(prompt, DecisionSchema);
    } catch (extractErr) {
      const response = await llmProvider.complete([{ role: 'user', content: prompt }]);
      const jsonMatch = response.text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      result = JSON.parse(jsonMatch[0]);
    }

    if (!result) return null;

    const decisions = Array.isArray(result) ? result : [result];
    return decisions.filter(d => d && d.id);
  } catch (err) {
    console.error(`[Decision] extraction failed for ${doc.path}: ${err.message}`);
    return null;
  }
}

module.exports = {
  DecisionSchema,
  buildDecisionPrompt,
  extractDecision,
};
