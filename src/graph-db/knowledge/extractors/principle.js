'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Principle extractor
//
// Extracts Principle entities from markdown documents.
// Principles are universal, actionable statements that guide behavior.
// ---------------------------------------------------------------------------

const { z } = require('zod');

// Schema for Principle extraction
const PrincipleSchema = z.object({
  id:         z.string().describe('Unique principle identifier'),
  title:      z.string().describe('Principle title'),
  statement:  z.string().describe('The principle statement'),
  domain:     z.string().optional().describe('Domain (e.g., architecture, culture, engineering)'),
  motivation: z.string().optional().describe('Why this principle matters'),
  examples:   z.array(z.string()).optional().describe('Real examples of applying this principle'),
  created_at: z.string().optional().describe('ISO 8601 timestamp'),
  updated_at: z.string().optional(),
});

// Prompt template for Principle extraction
function buildPrinciplePrompt(doc) {
  return `
You are extracting Principle entities from a markdown document.

DOCUMENT:
Title: ${doc.title}
Path: ${doc.path}
Type: ${doc.type}

Content (first 500 chars):
${doc.content.slice(0, 500)}

TASK: Extract Principle entities in JSON format. If document describes multiple principles, return array. If none, return null.

Example structure:
{
  "id": "principle-prefer-explicit-over-implicit",
  "title": "Prefer explicit over implicit",
  "statement": "Code should be clear and unambiguous; avoid clever shortcuts that require context to understand",
  "domain": "engineering",
  "motivation": "Reduces cognitive load, prevents bugs, makes code maintainable across time",
  "examples": [
    "Use descriptive variable names rather than abbreviations",
    "Make function intent explicit in signature",
    "Avoid magic numbers; use named constants"
  ],
  "created_at": "2026-05-01T...",
  "updated_at": "2026-05-01T..."
}

Rules:
- Extract ONLY if document articulates universal or actionable principles
- Return null if this is NOT a principle-focused document
- statement: clear, actionable, applies across contexts
- domain: one of [architecture, culture, engineering, product, process, data] or custom
- examples: concrete instances of applying the principle
- created_at/updated_at: ISO 8601 format
- id: identifier from YAML or derived from title, kebab-case

Respond with ONLY the JSON object/array or null.
`;
}

async function extractPrinciple(doc, llmProvider) {
  if (!doc.frontmatter.id && !doc.frontmatter.title) {
    return null;
  }

  const prompt = buildPrinciplePrompt(doc);

  try {
    let result;
    try {
      result = await llmProvider.extract(prompt, PrincipleSchema);
    } catch (extractErr) {
      const response = await llmProvider.complete([{ role: 'user', content: prompt }]);
      const jsonMatch = response.text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      result = JSON.parse(jsonMatch[0]);
    }

    if (!result) return null;

    const principles = Array.isArray(result) ? result : [result];
    return principles.filter(p => p && p.id);
  } catch (err) {
    console.error(`[Principle] extraction failed for ${doc.path}: ${err.message}`);
    return null;
  }
}

module.exports = {
  PrincipleSchema,
  buildPrinciplePrompt,
  extractPrinciple,
};
