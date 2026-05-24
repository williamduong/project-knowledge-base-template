'use strict';

const { aql } = require('arangojs');

// Fetch goal tree with hierarchy and decision inheritance
async function getGoalsTree(db) {
  const query = aql`
    FOR goal IN kg_goals
      FILTER goal.parent_goal_id == null
      LET children = (
        FOR child IN kg_goals
          FILTER child.parent_goal_id == goal._key
          LET child_decisions = (
            FOR edge IN kg_decides_for
              FILTER edge._from == CONCAT('kg_decisions/', edge._from)
                  OR edge._from == CONCAT('kg_decisions/', (
                    FOR parent IN kg_goals
                      FILTER parent._key == child.parent_goal_id
                      FOR dec IN kg_decides_for
                        FILTER dec._to == CONCAT('kg_goals/', parent._key)
                        RETURN dec._from
                  )[0])
              RETURN {
                decision_id: SPLIT(edge._from, '/')[1],
                goal_id: SPLIT(edge._to, '/')[1]
              }
          )
          RETURN {
            id: child._key,
            title: child.title,
            description: child.description,
            status: child.status,
            parent_goal_id: child.parent_goal_id,
            success_metrics: child.success_metrics,
            target_version: child.target_version,
            created_at: child.created_at,
            updated_at: child.updated_at,
            decisions: child_decisions,
            decision_count: LENGTH(child_decisions)
          }
      )
      LET goal_decisions = (
        FOR edge IN kg_decides_for
          FILTER edge._to == CONCAT('kg_goals/', goal._key)
          RETURN {
            decision_id: SPLIT(edge._from, '/')[1],
            goal_id: goal._key
          }
      )
      SORT goal.created_at
      RETURN {
        id: goal._key,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        parent_goal_id: goal.parent_goal_id,
        success_metrics: goal.success_metrics,
        target_version: goal.target_version,
        created_at: goal.created_at,
        updated_at: goal.updated_at,
        children: children,
        child_count: LENGTH(children),
        decisions: goal_decisions,
        decision_count: LENGTH(goal_decisions)
      }
  `;

  const cursor = await db.query(query);
  return cursor.all();
}

// Fetch single goal with full context
async function getGoal(db, goalId) {
  const query = aql`
    FOR goal IN kg_goals
      FILTER goal._key == ${goalId}
      LET decisions = (
        FOR edge IN kg_decides_for
          FILTER edge._to == CONCAT('kg_goals/', goal._key)
          FOR dec IN kg_decisions
            FILTER dec._key == SPLIT(edge._from, '/')[1]
            RETURN {
              id: dec._key,
              title: dec.title,
              decision: dec.decision,
              rationale: dec.rationale,
              status: dec.status
            }
      )
      LET parent = (
        FOR p IN kg_goals
          FILTER p._key == goal.parent_goal_id
          RETURN {
            id: p._key,
            title: p.title
          }
      )[0]
      LET children = (
        FOR child IN kg_goals
          FILTER child.parent_goal_id == goal._key
          RETURN {
            id: child._key,
            title: child.title,
            status: child.status
          }
      )
      LET intents = (
        FOR edge IN kg_implements
          FILTER edge._to == CONCAT('kg_goals/', goal._key)
          FOR intent IN kg_intents
            FILTER intent._key == SPLIT(edge._from, '/')[1]
            RETURN {
              id: intent._key,
              title: intent.title,
              status: intent.status
            }
      )
      RETURN {
        id: goal._key,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        parent_goal: parent,
        children: children,
        decisions: decisions,
        intents: intents,
        success_metrics: goal.success_metrics,
        target_version: goal.target_version,
        created_at: goal.created_at,
        updated_at: goal.updated_at
      }
  `;

  const cursor = await db.query(query);
  const results = await cursor.all();
  return results.length > 0 ? results[0] : null;
}

// Fetch goals for a specific intent
async function getGoalsForIntent(db, intentId) {
  const query = aql`
    FOR edge IN kg_implements
      FILTER edge._from == CONCAT('kg_intents/', ${intentId})
      FOR goal IN kg_goals
        FILTER goal._key == SPLIT(edge._to, '/')[1]
        LET decisions = (
          FOR dec_edge IN kg_decides_for
            FILTER dec_edge._to == CONCAT('kg_goals/', goal._key)
            RETURN {
              decision_id: SPLIT(dec_edge._from, '/')[1]
            }
        )
        RETURN {
          id: goal._key,
          title: goal.title,
          description: goal.description,
          status: goal.status,
          decision_count: LENGTH(decisions)
        }
  `;

  const cursor = await db.query(query);
  return cursor.all();
}

// Count goals by status
async function getGoalsStats(db) {
  const query = aql`
    FOR goal IN kg_goals
      COLLECT status = goal.status WITH COUNT INTO count
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
  getGoalsTree,
  getGoal,
  getGoalsForIntent,
  getGoalsStats,
};
