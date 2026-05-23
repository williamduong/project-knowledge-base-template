'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Agent extractor
//
// Extracts Agent entities from markdown documents.
// Agents are roles/actors (human, AI, teams) involved in the system.
// ---------------------------------------------------------------------------

const { z } = require('zod');

// Schema for Agent extraction
const AgentSchema = z.object({
  id:              z.string().describe('Unique agent identifier'),
  name:            z.string().describe('Agent name'),
  agent_type:      z.enum(['human', 'ai', 'team', 'tool']).optional(),
  role:            z.string().optional().describe('Role or title'),
  responsible_for: z.array(z.string()).optional().describe('What this agent is responsible for'),
  created_at:      z.string().optional().describe('ISO 8601 timestamp'),
  updated_at:      z.string().optional(),
});

// Prompt template for Agent extraction
function buildAgentPrompt(doc) {
  return `
You are extracting Agent entities from a markdown document.

DOCUMENT:
Title: ${doc.title}
Path: ${doc.path}
Type: ${doc.type}

Content (first 500 chars):
${doc.content.slice(0, 500)}

TASK: Extract Agent entities in JSON format. If document mentions multiple agents, return array. If none, return null.

Example structure:
{
  "id": "agent-claude-code",
  "name": "Claude Code",
  "agent_type": "ai",
  "role": "Assistant for software engineering tasks in VSCode",
  "responsible_for": ["code review", "refactoring suggestions", "test writing", "debugging"],
  "created_at": "2026-05-01T...",
  "updated_at": "2026-05-01T..."
}

Rules:
- Extract ONLY if document mentions agents/roles/actors in the system
- Return null if this is NOT an agent-focused document
- agent_type: one of [human, ai, team, tool]
- name: specific name or role identifier
- role: what they do or their title
- responsible_for: array of domains/areas they own
- created_at/updated_at: ISO 8601 format
- id: identifier from YAML or derived from name, kebab-case

Respond with ONLY the JSON object/array or null.
`;
}

async function extractAgent(doc, llmProvider) {
  if (!doc.frontmatter.id && !doc.frontmatter.title) {
    return null;
  }

  const prompt = buildAgentPrompt(doc);

  try {
    let result;
    try {
      result = await llmProvider.extract(prompt, AgentSchema);
    } catch (extractErr) {
      const response = await llmProvider.complete([{ role: 'user', content: prompt }]);
      const jsonMatch = response.text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      result = JSON.parse(jsonMatch[0]);
    }

    if (!result) return null;

    const agents = Array.isArray(result) ? result : [result];
    return agents.filter(a => a && a.id);
  } catch (err) {
    console.error(`[Agent] extraction failed for ${doc.path}: ${err.message}`);
    return null;
  }
}

module.exports = {
  AgentSchema,
  buildAgentPrompt,
  extractAgent,
};
