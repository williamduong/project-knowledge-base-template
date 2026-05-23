'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Lesson extractor
//
// Extracts Lesson entities from markdown documents.
// Lessons are retrospective insights from past events/work.
// ---------------------------------------------------------------------------

const { z } = require('zod');

// Schema for Lesson extraction
const LessonSchema = z.object({
  id:          z.string().describe('Unique lesson identifier'),
  title:       z.string().describe('Lesson title/headline'),
  what_happened: z.string().describe('What occurred (the event)'),
  why_it_matters: z.string().describe('Why this insight is important'),
  next_time:   z.string().describe('What to do differently next time'),
  context:     z.string().optional().describe('Background context for the lesson'),
  severity:    z.enum(['critical', 'high', 'medium', 'low']).optional(),
  learned_at:  z.string().optional().describe('ISO 8601 when this was learned'),
  created_at:  z.string().optional(),
  updated_at:  z.string().optional(),
});

// Prompt template for Lesson extraction
function buildLessonPrompt(doc) {
  return `
You are extracting Lesson entities from a markdown document.

DOCUMENT:
Title: ${doc.title}
Path: ${doc.path}
Type: ${doc.type}

Content (first 500 chars):
${doc.content.slice(0, 500)}

TASK: Extract Lesson entities in JSON format. If document describes multiple lessons, return array. If none, return null.

Example structure:
{
  "id": "lesson-nul-bytes-in-spawn",
  "title": "NUL bytes don't work in spawnSync format strings",
  "what_happened": "Attempted to use \\x00 as separator in git log format string for spawnSync; Node.js threw ERR_INVALID_ARG_VALUE",
  "why_it_matters": "String formatting for OS-level commands has strict validation; understanding these constraints prevents blocking bugs",
  "next_time": "Use non-NUL ASCII control chars (0x1E Record Separator, 0x1F Unit Separator) for format strings instead",
  "context": "Building git-walker for Code Graph Phase 2",
  "severity": "high",
  "learned_at": "2026-05-20T...",
  "created_at": "2026-05-20T...",
  "updated_at": "2026-05-20T..."
}

Rules:
- Extract ONLY if document describes retrospective insights from actual events
- Return null if this is NOT a lesson-focused document
- what_happened: specific, concrete event
- why_it_matters: the insight/principle extracted
- next_time: actionable guidance for future
- severity: one of [critical, high, medium, low]
- learned_at: when this was discovered
- created_at/updated_at: ISO 8601 format
- id: identifier from YAML or derived from title, kebab-case

Respond with ONLY the JSON object/array or null.
`;
}

async function extractLesson(doc, llmProvider) {
  if (!doc.frontmatter.id && !doc.frontmatter.title) {
    return null;
  }

  const prompt = buildLessonPrompt(doc);

  try {
    let result;
    try {
      result = await llmProvider.extract(prompt, LessonSchema);
    } catch (extractErr) {
      const response = await llmProvider.complete([{ role: 'user', content: prompt }]);
      const jsonMatch = response.text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      result = JSON.parse(jsonMatch[0]);
    }

    if (!result) return null;

    const lessons = Array.isArray(result) ? result : [result];
    return lessons.filter(l => l && l.id);
  } catch (err) {
    console.error(`[Lesson] extraction failed for ${doc.path}: ${err.message}`);
    return null;
  }
}

module.exports = {
  LessonSchema,
  buildLessonPrompt,
  extractLesson,
};
