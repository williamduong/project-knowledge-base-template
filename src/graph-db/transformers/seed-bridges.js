'use strict';

// ---------------------------------------------------------------------------
// Data Transformer — Seed Semantic Bridges
//
// Phase 2: Link Intent ↔ Goals, create hierarchy relationships.
// Creates implements, has_phase edges between semantic entities.
// ---------------------------------------------------------------------------

// Phase 2.1: Intent implements Goal
// Extract goal references from intent descriptions
async function linkIntentsToGoals(db) {
  const stats = {
    edges_created: 0,
    errors: 0,
  };

  try {
    // Get all intents
    const intentCol = db.collection('kg_intents');
    const intentCursor = await db.query(`
      FOR doc IN ${intentCol.name}
        RETURN doc
    `);
    const intents = await intentCursor.all();

    // Get all goals
    const goalCol = db.collection('kg_goals');
    const goalCursor = await db.query(`
      FOR doc IN ${goalCol.name}
        RETURN doc
    `);
    const goals = await goalCursor.all();

    // For each intent, find related goals
    for (const intent of intents) {
      // v2-10-code-graph implements M0, M1, M3 (Foundation goals)
      // v2-7-0-1 implements M0 (reset goal)

      let relatedGoalIds = [];

      if (intent.id === 'v2-10-code-graph') {
        // Code graph intent relates to Foundation/DNA phases
        relatedGoalIds = [
          'g-milestone-v3-0-m0-foundation-reset-deliverable',
          'g-milestone-v3-0-m1-dna-schema-spec',
          'g-milestone-v3-0-m3-dna-compiler-mvp',
        ];
      } else if (intent.id === 'v2-7-0-1') {
        // UI state contract relates to foundation reset
        relatedGoalIds = [
          'g-milestone-v3-0-m0-foundation-reset-deliverable',
        ];
      }

      // Create implements edges
      const edgeCol = db.collection('kg_implements');
      for (const goalId of relatedGoalIds) {
        const goalExists = goals.find(g => g._key === goalId);
        if (goalExists) {
          try {
            await edgeCol.save({
              _from: `kg_intents/${intent._key}`,
              _to: `kg_goals/${goalId}`,
              created_at: new Date().toISOString(),
              provenance: 'seed-bridges',
            });
            stats.edges_created++;
          } catch (err) {
            console.error(`Error creating implements edge: ${err.message}`);
            stats.errors++;
          }
        }
      }
    }
  } catch (err) {
    console.error(`[Seed Bridges] Error linking intents to goals: ${err.message}`);
    stats.errors++;
  }

  return stats;
}

// Phase 2.2: Goal hierarchy (parent → child)
// Create has_phase edges for milestone hierarchies
async function linkGoalHierarchy(db) {
  const stats = {
    edges_created: 0,
    errors: 0,
  };

  try {
    // Get all goals
    const goalCol = db.collection('kg_goals');
    const cursor = await db.query(`
      FOR doc IN ${goalCol.name}
        FILTER doc.parent_goal_id != null
        RETURN {
          child: doc._key,
          parent: doc.parent_goal_id
        }
    `);
    const relationships = await cursor.all();

    // Create has_phase edges for parent-child relationships
    const edgeCol = db.collection('kg_has_phase');
    for (const rel of relationships) {
      try {
        await edgeCol.save({
          _from: `kg_goals/${rel.parent}`,
          _to: `kg_goals/${rel.child}`,
          created_at: new Date().toISOString(),
          provenance: 'seed-bridges',
        });
        stats.edges_created++;
      } catch (err) {
        // Parent might not exist, skip
        if (!err.message.includes('404')) {
          console.error(`Error creating has_phase edge: ${err.message}`);
          stats.errors++;
        }
      }
    }
  } catch (err) {
    console.error(`[Seed Bridges] Error linking goal hierarchy: ${err.message}`);
    stats.errors++;
  }

  return stats;
}

// Seed all bridges
async function seedBridges(db) {
  const results = {};

  console.log('[Seed Bridges] Phase 2.1: Intent implements Goal...');
  results.phase_2_1 = await linkIntentsToGoals(db);

  console.log('[Seed Bridges] Phase 2.2: Goal hierarchy...');
  results.phase_2_2 = await linkGoalHierarchy(db);

  const total = {
    edges_created: (results.phase_2_1.edges_created || 0) + (results.phase_2_2.edges_created || 0),
    errors: (results.phase_2_1.errors || 0) + (results.phase_2_2.errors || 0),
  };

  return { results, total };
}

module.exports = {
  linkIntentsToGoals,
  linkGoalHierarchy,
  seedBridges,
};
