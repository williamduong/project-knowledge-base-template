'use strict';

// ---------------------------------------------------------------------------
// Gap Analysis — Phase 3
// Identify missing relationships and entities needed for full semantic graph
// ---------------------------------------------------------------------------

async function analyzeIntentGoalGaps(db) {
  const stats = {
    intents_total: 0,
    intents_with_goals: 0,
    intents_missing_goals: [],
    gaps: 0,
  };

  try {
    const cursor = await db.query(`
      FOR intent IN kg_intents
        LET hasGoal = COUNT(FOR e IN kg_implements FILTER e._from == CONCAT('kg_intents/', intent._key) RETURN 1) > 0
        RETURN {
          id: intent._key,
          title: intent.title,
          hasGoal: hasGoal
        }
    `);
    const intents = await cursor.all();
    stats.intents_total = intents.length;

    intents.forEach(intent => {
      if (intent.hasGoal) {
        stats.intents_with_goals++;
      } else {
        stats.intents_missing_goals.push({
          id: intent.id,
          title: intent.title,
        });
        stats.gaps++;
      }
    });
  } catch (err) {
    console.error(`[Gap Analysis] Error analyzing Intent→Goal gaps: ${err.message}`);
  }

  return stats;
}

async function analyzeGoalDecisionGaps(db) {
  const stats = {
    goals_total: 0,
    goals_with_direct_decisions: 0,
    goals_with_inherited_decisions: 0,
    goals_missing_decisions: [],
    gaps: 0,
  };

  try {
    const cursor = await db.query(`
      FOR goal IN kg_goals
        LET directDecision = COUNT(FOR e IN kg_decides_for FILTER e._to == CONCAT('kg_goals/', goal._key) RETURN 1)
        LET parentDecision = (
          goal.parent_goal_id != null ?
            COUNT(FOR e IN kg_decides_for FILTER e._to == CONCAT('kg_goals/', goal.parent_goal_id) RETURN 1)
          : 0
        )
        LET hasDecision = directDecision > 0 OR parentDecision > 0
        RETURN {
          id: goal._key,
          title: goal.title,
          status: goal.status,
          direct: directDecision > 0,
          inherited: parentDecision > 0,
          hasDecision: hasDecision
        }
    `);
    const goals = await cursor.all();
    stats.goals_total = goals.length;

    goals.forEach(goal => {
      if (goal.hasDecision) {
        stats.goals_with_direct_decisions += goal.direct ? 1 : 0;
        stats.goals_with_inherited_decisions += goal.inherited ? 1 : 0;
      } else {
        stats.goals_missing_decisions.push({
          id: goal.id,
          title: goal.title,
          status: goal.status,
        });
        stats.gaps++;
      }
    });
  } catch (err) {
    console.error(`[Gap Analysis] Error analyzing Goal→Decision gaps: ${err.message}`);
  }

  return stats;
}

async function analyzePrincipleCodeGaps(db) {
  const stats = {
    principles_total: 0,
    principles_linked_to_code: 0,
    principles_unlinked: [],
    gaps: 0,
    note: 'kg_applies_to collection not yet created (deferred to Phase 4)',
  };

  try {
    const cursor = await db.query(`
      FOR principle IN kg_principles
        RETURN {
          id: principle._key,
          title: principle.title,
          domain: principle.domain
        }
    `);
    const principles = await cursor.all();
    stats.principles_total = principles.length;

    // All principles are unlinked since kg_applies_to doesn't exist yet
    principles.forEach(principle => {
      stats.principles_unlinked.push({
        id: principle.id,
        title: principle.title,
        domain: principle.domain,
      });
      stats.gaps++;
    });
  } catch (err) {
    console.error(`[Gap Analysis] Error analyzing Principle→Code gaps: ${err.message}`);
  }

  return stats;
}

async function analyzeOrphanedNodesDetail(db) {
  const stats = {
    intents_orphaned: [],
    goals_orphaned: [],
    principles_orphaned: [],
    documents_orphaned: [],
    total_orphaned: 0,
  };

  try {
    // Get all intents with no edges
    let cursor = await db.query(`
      FOR intent IN kg_intents
        LET out_count = COUNT(FOR e IN kg_implements FILTER e._from == CONCAT('kg_intents/', intent._key) RETURN 1)
        LET in_count = COUNT(FOR e IN kg_implements FILTER e._to == CONCAT('kg_intents/', intent._key) RETURN 1)
        FILTER out_count == 0 AND in_count == 0
        RETURN { id: intent._key, title: intent.title, status: intent.status }
    `);
    stats.intents_orphaned = await cursor.all();

    // Get all goals with no edges
    cursor = await db.query(`
      FOR goal IN kg_goals
        LET phase_out = COUNT(FOR e IN kg_has_phase FILTER e._from == CONCAT('kg_goals/', goal._key) RETURN 1)
        LET phase_in = COUNT(FOR e IN kg_has_phase FILTER e._to == CONCAT('kg_goals/', goal._key) RETURN 1)
        LET impl_in = COUNT(FOR e IN kg_implements FILTER e._to == CONCAT('kg_goals/', goal._key) RETURN 1)
        FILTER phase_out == 0 AND phase_in == 0 AND impl_in == 0
        RETURN { id: goal._key, title: goal.title, status: goal.status }
    `);
    stats.goals_orphaned = await cursor.all();

    // Get all principles with no edges (all are orphaned for now since kg_applies_to doesn't exist)
    cursor = await db.query(`
      FOR principle IN kg_principles
        RETURN { id: principle._key, title: principle.title }
    `);
    stats.principles_orphaned = await cursor.all();

    // Get documents with no incoming or outgoing edges
    cursor = await db.query(`
      FOR doc IN kg_documents
        LET inbound = COUNT(FOR e IN kg_describes FILTER e._to == CONCAT('kg_documents/', doc._key) RETURN 1)
        LET outbound = COUNT(FOR e IN kg_describes FILTER e._from == CONCAT('kg_documents/', doc._key) RETURN 1)
        FILTER inbound == 0 AND outbound == 0
        RETURN { id: doc._key, title: doc.title }
    `);
    stats.documents_orphaned = await cursor.all();

    stats.total_orphaned = stats.intents_orphaned.length + stats.goals_orphaned.length +
                           stats.principles_orphaned.length + stats.documents_orphaned.length;
  } catch (err) {
    console.error(`[Gap Analysis] Error analyzing orphaned nodes: ${err.message}`);
  }

  return stats;
}

async function runGapAnalysis(db) {
  const results = {};

  console.log('[Gap Analysis] Phase 3.1: Intent → Goal gaps...');
  results.intent_goal_gaps = await analyzeIntentGoalGaps(db);

  console.log('[Gap Analysis] Phase 3.2: Goal → Decision gaps...');
  results.goal_decision_gaps = await analyzeGoalDecisionGaps(db);

  console.log('[Gap Analysis] Phase 3.3: Principle → Code gaps...');
  results.principle_code_gaps = await analyzePrincipleCodeGaps(db);

  console.log('[Gap Analysis] Phase 3.4: Orphaned nodes detail...');
  results.orphaned_detail = await analyzeOrphanedNodesDetail(db);

  const summary = {
    total_gaps: (results.intent_goal_gaps.gaps || 0) +
                (results.goal_decision_gaps.gaps || 0) +
                (results.principle_code_gaps.gaps || 0),
    intent_goal_gaps: results.intent_goal_gaps.gaps || 0,
    goal_decision_gaps: results.goal_decision_gaps.gaps || 0,
    principle_code_gaps: results.principle_code_gaps.gaps || 0,
    orphaned_nodes: results.orphaned_detail.total_orphaned || 0,
  };

  return { results, summary };
}

module.exports = {
  analyzeIntentGoalGaps,
  analyzeGoalDecisionGaps,
  analyzePrincipleCodeGaps,
  analyzeOrphanedNodesDetail,
  runGapAnalysis,
};
