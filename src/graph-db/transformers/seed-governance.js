'use strict';

// ---------------------------------------------------------------------------
// Data Transformer — Seed Governance Entities
//
// Extract Goals, Principles from svfactory docs into Knowledge Graph.
// Phase 1 of data transformation.
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

// Extract principles from principles.md (P1-P15)
function extractPrinciples(principlesPath) {
  const content = fs.readFileSync(principlesPath, 'utf8');
  const principles = [];

  // Parse principles (P1, P2, ..., P15)
  const lines = content.split('\n');
  let currentP = null;
  let currentTitle = '';
  let currentStatement = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match ## P<N>. Title
    const match = line.match(/^## P(\d+\.?\d*)\.?\s+(.+)$/);
    if (match) {
      if (currentP) {
        principles.push({
          id: `principle-p${currentP}`,
          title: currentTitle,
          statement: currentStatement.trim(),
          domain: 'governance',
          motivation: '',
          examples: [],
          created_at: new Date().toISOString(),
        });
      }
      currentP = match[1];
      currentTitle = match[2];
      currentStatement = '';
    } else if (currentP && line.trim() && !line.startsWith('##')) {
      currentStatement += '\n' + line;
    }
  }

  // Add last principle
  if (currentP) {
    principles.push({
      id: `principle-p${currentP}`,
      title: currentTitle,
      statement: currentStatement.trim(),
      domain: 'governance',
      motivation: '',
      examples: [],
      created_at: new Date().toISOString(),
    });
  }

  return principles;
}

// Extract goals from goals.state.json
function extractGoals(goalsPath) {
  const content = JSON.parse(fs.readFileSync(goalsPath, 'utf8'));
  const goals = [];

  if (content.goals && Array.isArray(content.goals)) {
    content.goals.forEach(goal => {
      if (goal.entity_level === 'milestone') {
        goals.push({
          id: goal.id,
          title: goal.title,
          description: goal.description || '',
          status: goal.state === 'active' ? 'in_progress' :
                  goal.state === 'deprecated' ? 'archived' :
                  'open',
          parent_goal_id: goal.parent_goal_id || null,
          success_metrics: [],
          target_version: null,
          created_at: goal.created_at || new Date().toISOString(),
          updated_at: goal.updated_at || new Date().toISOString(),
        });
      }
    });
  }

  return goals;
}

// Seed entities into ArangoDB
async function seedGovernanceEntities(db) {
  const stats = {
    principles_created: 0,
    goals_created: 0,
    errors: 0,
  };

  // Extract principles
  const principlesPath = path.join(process.cwd(), 'svfactory', 'principles.md');
  const principles = extractPrinciples(principlesPath);

  for (const principle of principles) {
    try {
      const col = db.collection('kg_principles');
      const doc = {
        _key: principle.id,
        ...principle,
        kind: 'principle',
        extracted_at: new Date().toISOString(),
      };
      await col.save(doc, { overwriteMode: 'update' });
      stats.principles_created++;
    } catch (err) {
      console.error(`[Seed] Error creating principle ${principle.id}:`, err.message);
      stats.errors++;
    }
  }

  // Extract goals
  const goalsPath = path.join(process.cwd(), 'svfactory', 'goals.state.json');
  const goals = extractGoals(goalsPath);

  for (const goal of goals) {
    try {
      const col = db.collection('kg_goals');
      const doc = {
        _key: goal.id,
        ...goal,
        kind: 'goal',
        extracted_at: new Date().toISOString(),
      };
      await col.save(doc, { overwriteMode: 'update' });
      stats.goals_created++;
    } catch (err) {
      console.error(`[Seed] Error creating goal ${goal.id}:`, err.message);
      stats.errors++;
    }
  }

  return stats;
}

module.exports = {
  extractPrinciples,
  extractGoals,
  seedGovernanceEntities,
};
