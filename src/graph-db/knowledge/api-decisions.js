'use strict';

const { aql } = require('arangojs');

// Fetch all decisions with goal relationships
async function getDecisionsList(db) {
  const query = aql`
    FOR dec IN kg_decisions
      LET affected_goals = (
        FOR edge IN kg_decides_for
          FILTER edge._from == CONCAT('kg_decisions/', dec._key)
          FOR goal IN kg_goals
            FILTER goal._key == SPLIT(edge._to, '/')[1]
            RETURN {
              id: goal._key,
              title: goal.title,
              type: goal.parent_goal_id == null ? 'system' : 'milestone'
            }
      )
      SORT dec.decided_at DESC
      RETURN {
        id: dec._key,
        title: dec.title,
        decision: dec.decision,
        rationale: dec.rationale,
        alternatives_considered: dec.alternatives_considered,
        impact_scope: dec.impact_scope,
        status: dec.status,
        decided_at: dec.decided_at,
        affected_goals: affected_goals,
        goal_count: LENGTH(affected_goals)
      }
  `;

  const cursor = await db.query(query);
  return cursor.all();
}

// Fetch single decision with full context
async function getDecision(db, decisionId) {
  const query = aql`
    FOR dec IN kg_decisions
      FILTER dec._key == ${decisionId}
      LET affected_goals = (
        FOR edge IN kg_decides_for
          FILTER edge._from == CONCAT('kg_decisions/', dec._key)
          FOR goal IN kg_goals
            FILTER goal._key == SPLIT(edge._to, '/')[1]
            LET child_goals = (
              FOR child IN kg_goals
                FILTER child.parent_goal_id == goal._key
                RETURN {
                  id: child._key,
                  title: child.title,
                  status: child.status
                }
            )
            RETURN {
              id: goal._key,
              title: goal.title,
              status: goal.status,
              is_system_goal: goal.parent_goal_id == null,
              child_goals: child_goals
            }
      )
      RETURN {
        id: dec._key,
        title: dec.title,
        decision: dec.decision,
        rationale: dec.rationale,
        alternatives_considered: dec.alternatives_considered,
        impact_scope: dec.impact_scope,
        status: dec.status,
        decided_at: dec.decided_at,
        affected_goals: affected_goals,
        extracted_from: dec.extracted_from,
        provenance: dec.provenance
      }
  `;

  const cursor = await db.query(query);
  const results = await cursor.all();
  return results.length > 0 ? results[0] : null;
}

// Fetch decisions for a specific goal (including inherited from parent)
async function getDecisionsForGoal(db, goalId) {
  const query = aql`
    FOR goal IN kg_goals
      FILTER goal._key == ${goalId}
      LET direct_decisions = (
        FOR edge IN kg_decides_for
          FILTER edge._to == CONCAT('kg_goals/', goal._key)
          FOR dec IN kg_decisions
            FILTER dec._key == SPLIT(edge._from, '/')[1]
            RETURN {
              id: dec._key,
              title: dec.title,
              decision: dec.decision,
              rationale: dec.rationale,
              status: dec.status,
              inherited: false
            }
      )
      LET inherited_decisions = (
        FOR parent IN kg_goals
          FILTER parent._key == goal.parent_goal_id
          FOR edge IN kg_decides_for
            FILTER edge._to == CONCAT('kg_goals/', parent._key)
            FOR dec IN kg_decisions
              FILTER dec._key == SPLIT(edge._from, '/')[1]
              RETURN {
                id: dec._key,
                title: dec.title,
                decision: dec.decision,
                rationale: dec.rationale,
                status: dec.status,
                inherited: true,
                inherited_from: parent._key
              }
      )
      RETURN {
        goal_id: goal._key,
        goal_title: goal.title,
        direct_decisions: direct_decisions,
        inherited_decisions: inherited_decisions,
        total_decisions: LENGTH(direct_decisions) + LENGTH(inherited_decisions)
      }
  `;

  const cursor = await db.query(query);
  const results = await cursor.all();
  return results.length > 0 ? results[0] : null;
}

// Fetch decisions by status
async function getDecisionsByStatus(db, status) {
  const query = aql`
    FOR dec IN kg_decisions
      FILTER dec.status == ${status}
      LET affected_goals = (
        FOR edge IN kg_decides_for
          FILTER edge._from == CONCAT('kg_decisions/', dec._key)
          RETURN SPLIT(edge._to, '/')[1]
      )
      SORT dec.decided_at DESC
      RETURN {
        id: dec._key,
        title: dec.title,
        decision: dec.decision,
        status: dec.status,
        decided_at: dec.decided_at,
        goal_count: LENGTH(affected_goals)
      }
  `;

  const cursor = await db.query(query);
  return cursor.all();
}

// Get decision impact analysis
async function getDecisionImpact(db, decisionId) {
  const query = aql`
    FOR dec IN kg_decisions
      FILTER dec._key == ${decisionId}
      LET direct_goals = (
        FOR edge IN kg_decides_for
          FILTER edge._from == CONCAT('kg_decisions/', dec._key)
          FOR goal IN kg_goals
            FILTER goal._key == SPLIT(edge._to, '/')[1]
            RETURN goal._key
      )
      LET child_goals = (
        FOR goal_id IN direct_goals
          FOR goal IN kg_goals
            FILTER goal.parent_goal_id == goal_id
            RETURN goal._key
      )
      LET intents = (
        FOR goal_id IN UNION(direct_goals, child_goals)
          FOR edge IN kg_implements
            FILTER edge._to == CONCAT('kg_goals/', goal_id)
            FOR intent IN kg_intents
              FILTER intent._key == SPLIT(edge._from, '/')[1]
              RETURN DISTINCT intent._key
      )
      RETURN {
        decision_id: dec._key,
        decision_title: dec.title,
        direct_goal_count: LENGTH(direct_goals),
        child_goal_count: LENGTH(child_goals),
        total_goal_impact: LENGTH(UNION(direct_goals, child_goals)),
        affected_intent_count: LENGTH(intents),
        affected_intents: intents
      }
  `;

  const cursor = await db.query(query);
  const results = await cursor.all();
  return results.length > 0 ? results[0] : null;
}

// Get decision statistics
async function getDecisionsStats(db) {
  const query = aql`
    FOR dec IN kg_decisions
      COLLECT status = dec.status WITH COUNT INTO count
      RETURN {
        status: status,
        count: count
      }
  `;

  const cursor = await db.query(query);
  const results = await cursor.all();
  const stats = {
    total: 0,
    by_status: {},
  };

  for (const row of results) {
    stats.total += row.count;
    stats.by_status[row.status || 'unknown'] = row.count;
  }

  return stats;
}

module.exports = {
  getDecisionsList,
  getDecision,
  getDecisionsForGoal,
  getDecisionsByStatus,
  getDecisionImpact,
  getDecisionsStats,
};
