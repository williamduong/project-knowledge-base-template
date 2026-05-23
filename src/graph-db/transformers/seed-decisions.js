'use strict';

const fs = require('fs');
const path = require('path');

// ADR-to-SystemGoal mapping (which SG each decision relates to)
const ADR_GOAL_MAP = {
  'adr-001-json-composition-format': 'g-system-svfactory-sg2-dna-library-fractal',     // JSON composition → DNA structure
  'adr-002-server-side-rendering': 'g-system-svfactory-sg4-vibe-governance',          // SSR → governance/deployment
  'adr-003-postgresql-drizzle': 'g-system-svfactory-sg3-twin-storage-impact-chain',    // PostgreSQL → storage
  'adr-004-gcs-storage': 'g-system-svfactory-sg3-twin-storage-impact-chain',          // GCS → storage
  'adr-005-monorepo-pnpm': 'g-system-svfactory-sg6-deterministic-foundation',         // Monorepo → deterministic structure
  'adr-006-multi-ai-provider': 'g-system-svfactory-sg2-dna-library-fractal',          // Multi-AI Provider → DNA extensibility
};

// Extract decision info from ADR frontmatter and title
function extractDecisionFromADR(adrPath) {
  const content = fs.readFileSync(adrPath, 'utf8');
  const filename = path.basename(adrPath, '.md');

  // Parse frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = {};
  if (fmMatch) {
    fmMatch[1].split('\n').forEach(line => {
      const [key, ...rest] = line.split(':');
      if (key && rest.length > 0) {
        frontmatter[key.trim()] = rest.join(':').trim();
      }
    });
  }

  // Extract decision ID from filename (adr-001 → d-adr-001)
  const decisionId = `d-${filename}`;
  const title = frontmatter.title || filename;

  // Parse ADR number for mapping
  const adrNum = filename.replace('adr-', '').padStart(3, '0');
  const relatedGoalId = ADR_GOAL_MAP[filename] || null;

  const decision = {
    id: decisionId,
    title: title,
    decision: `Architecture decision: ${title.replace(/^adr \d+ /i, '').toLowerCase()}`,
    rationale: frontmatter.purpose || 'Defines architectural constraint for the system.',
    alternatives_considered: [],
    impact_scope: 'architecture',
    status: frontmatter.status || 'active',
    decided_at: frontmatter.last_updated || new Date().toISOString(),
    related_goal_id: relatedGoalId,
    extracted_from: filename,
    created_at: new Date().toISOString(),
  };

  return decision;
}

// Seed Decision entities and create decides_for edges
async function seedDecisions(db) {
  const stats = {
    decisions_created: 0,
    edges_created: 0,
    errors: 0,
  };

  try {
    const adrDir = path.join(process.cwd(), 'knowledge-base', '03-architecture', 'adr');
    const adrFiles = fs.readdirSync(adrDir)
      .filter(f => f.startsWith('adr-') && f.endsWith('.md'))
      .sort();

    for (const adrFile of adrFiles) {
      const adrPath = path.join(adrDir, adrFile);
      const decision = extractDecisionFromADR(adrPath);

      try {
        // Create Decision entity
        const decisionCol = db.collection('kg_decisions');
        const doc = {
          _key: decision.id,
          ...decision,
          kind: 'decision',
          extracted_at: new Date().toISOString(),
        };
        await decisionCol.save(doc, { overwriteMode: 'update' });
        stats.decisions_created++;

        // Create decides_for edge to related goal if exists
        if (decision.related_goal_id) {
          try {
            const goalExists = await db.collection('kg_goals').document(decision.related_goal_id);
            const edgeCol = db.collection('kg_decides_for');
            await edgeCol.save({
              _from: `kg_decisions/${decision.id}`,
              _to: `kg_goals/${decision.related_goal_id}`,
              created_at: new Date().toISOString(),
              provenance: 'seed-decisions',
            }, { overwriteMode: 'update' });
            stats.edges_created++;
          } catch (err) {
            // Goal doesn't exist, skip edge creation
            if (!err.message.includes('404')) {
              console.error(`[Seed Decisions] Error creating edge for ${decision.id}: ${err.message}`);
              stats.errors++;
            }
          }
        }
      } catch (err) {
        console.error(`[Seed Decisions] Error creating decision ${decision.id}: ${err.message}`);
        stats.errors++;
      }
    }
  } catch (err) {
    console.error(`[Seed Decisions] Error seeding decisions: ${err.message}`);
    stats.errors++;
  }

  return stats;
}

module.exports = {
  extractDecisionFromADR,
  seedDecisions,
};
