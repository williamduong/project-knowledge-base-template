'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Goal extractor
//
// Extracts Goal entities from markdown documents in knowledge-base/.
// Uses LLM to understand goal structure and create structured output.
// ---------------------------------------------------------------------------

const { z } = require('zod');

// Schema for Goal extraction
const GoalSchema = z.object({
  id:           z.string().describe('Unique goal identifier'),
  title:        z.string().describe('Goal title/name'),
  description:  z.string().describe('What this goal aims to achieve'),
  status:       z.enum(['open', 'in_progress', 'blocked', 'on_hold', 'completed', 'cancelled']).optional(),
  parent_goal_id: z.string().optional().describe('Parent goal if hierarchical'),
  success_metrics: z.array(z.string()).optional().describe('Measurable success criteria'),
  target_version: z.string().optional().describe('Target version (e.g., v2.8.0)'),
  created_at:   z.string().optional().describe('ISO 8601 timestamp'),
  updated_at:   z.string().optional(),
});

// Prompt template for Goal extraction
function buildGoalPrompt(doc) {
  return `
You are extracting Goal entities from a markdown document.

DOCUMENT:
Title: ${doc.title}
Path: ${doc.path}
Type: ${doc.type}

Content (first 500 chars):
${doc.content.slice(0, 500)}

TASK: Extract Goal entities in JSON format. If document describes multiple goals, return array. If none, return null.

Example structure:
{
  "id": "goal-code-graph-phase-0",
  "title": "Build structural Code Graph foundation",
  "description": "Establish core Code Graph infrastructure for AST + git history tracking",
  "status": "in_progress",
  "parent_goal_id": null,
  "success_metrics": ["AST walker working", "Git walker functional", "Schema complete"],
  "target_version": "v2.9",
  "created_at": "2026-05-23T...",
  "updated_at": "2026-05-23T..."
}

Rules:
- Extract ONLY if document discusses measurable goals or objectives
- Return null (JSON null) if this is NOT a goal-focused document
- status: use one of [open, in_progress, blocked, on_hold, completed, cancelled]
- success_metrics: array of specific, measurable outcomes
- created_at/updated_at: ISO 8601 format
- id: should be identifier from YAML frontmatter or derived from title, kebab-case

Respond with ONLY the JSON object/array or null.
`;
}

async function extractGoal(doc, llmProvider) {
  if (!doc.frontmatter.id && !doc.frontmatter.title) {
    return null;
  }

  const prompt = buildGoalPrompt(doc);

  try {
    let result;
    try {
      result = await llmProvider.extract(prompt, GoalSchema);
    } catch (extractErr) {
      const response = await llmProvider.complete([{ role: 'user', content: prompt }]);
      const jsonMatch = response.text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      result = JSON.parse(jsonMatch[0]);
    }

    if (!result) return null;

    // Handle single object or array
    const goals = Array.isArray(result) ? result : [result];
    return goals.filter(g => g && g.id);
  } catch (err) {
    console.error(`[Goal] extraction failed for ${doc.path}: ${err.message}`);
    return null;
  }
}

module.exports = {
  GoalSchema,
  buildGoalPrompt,
  extractGoal,
};
