'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Intent extractor
//
// Extracts Intent entities from intent.md files in knowledge-base/intents/_active/.
// Uses LLM to understand intent structure and create structured output.
// ---------------------------------------------------------------------------

const { z } = require('zod');

// Schema for Intent extraction
const IntentSchema = z.object({
  id:           z.string().describe('Unique intent identifier'),
  title:        z.string().describe('Intent title/name'),
  status:       z.enum(['open', 'in_progress', 'blocked', 'on_hold', 'completed', 'cancelled', 'archived']),
  lifecycle:    z.enum(['active', 'completed', 'archived', 'deprecated']).optional(),
  goal_text:    z.string().describe('What this intent aims to achieve'),
  version_target: z.string().optional().describe('Target version (e.g., v2.8.0)'),
  created_at:   z.string().optional().describe('ISO 8601 timestamp'),
  updated_at:   z.string().optional(),
  description:  z.string().optional().describe('Additional description'),
});

// Prompt template for Intent extraction
function buildIntentPrompt(doc) {
  return `
You are extracting an Intent entity from a markdown document.

DOCUMENT:
Title: ${doc.title}
Path: ${doc.path}
Type: ${doc.type}

Content (first 500 chars):
${doc.content.slice(0, 500)}

TASK: Extract the Intent entity in JSON format matching this structure:
{
  "id": "v2-10-code-graph",
  "title": "Code Graph Phase 0",
  "status": "open",
  "lifecycle": "active",
  "goal_text": "Build structural Code Graph foundation",
  "version_target": "v2.9",
  "created_at": "2026-05-23T...",
  "updated_at": "2026-05-23T...",
  "description": "..."
}

Rules:
- Extract ONLY if document is an Intent (check if path contains 'intents/' and type is appropriate)
- Return null (JSON null) if this is NOT an intent document
- status: use one of [open, in_progress, blocked, on_hold, completed, cancelled, archived]
- lifecycle: use one of [active, completed, archived, deprecated]
- created_at/updated_at: ISO 8601 format
- id: should be identifier from YAML frontmatter or derived from title

Respond with ONLY the JSON object or null.
`;
}

async function extractIntent(doc, llmProvider) {
  if (!doc.frontmatter.id) {
    // Not a valid intent document (missing id)
    return null;
  }

  const prompt = buildIntentPrompt(doc);

  try {
    // Try structured extraction first, fall back to simple completion if it fails
    let result;
    try {
      result = await llmProvider.extract(prompt, IntentSchema);
    } catch (extractErr) {
      // If structured extraction fails, use simple completion
      // and parse JSON from response
      const response = await llmProvider.complete([{ role: 'user', content: prompt }]);
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      result = JSON.parse(jsonMatch[0]);
    }

    if (!result || !result.id) return null;
    return result;
  } catch (err) {
    console.error(`[Intent] extraction failed for ${doc.path}: ${err.message}`);
    return null;
  }
}

module.exports = {
  IntentSchema,
  buildIntentPrompt,
  extractIntent,
};
