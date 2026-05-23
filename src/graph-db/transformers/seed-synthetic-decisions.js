'use strict';

// System Goals that lack explicit ADR-based decisions
const SYSTEM_GOAL_DECISIONS = [
  {
    goal_id: 'g-system-svfactory-sg1-build-to-build',
    decision_id: 'd-sg1-end-to-end-capability',
    title: 'SG-1 End-to-End Build Capability',
    decision: 'SVFactory must synthesize complete KB Agents from context, end-to-end, verified via git branch isolation.',
    rationale: 'Core mission: no E2E capability = no SVFactory. Each KB Agent is independent npm package on isolated git branch. This is non-negotiable.',
  },
  {
    goal_id: 'g-system-svfactory-sg5-self-maintenance',
    decision_id: 'd-sg5-self-healing-branch-system',
    title: 'SG-5 Self-Healing via Branch System',
    decision: 'KB Agent self-maintenance mechanism: git branch-per-agent + SVFactory orchestrating updates via pull/push/merge.',
    rationale: 'Without self-maintenance, KB Agents stale rapidly. Branch-isolation ensures safe updates without impacting other agents. SVFactory manages the flow.',
  },
];

// Create synthetic decisions for System Goals without ADRs
async function seedSyntheticDecisions(db) {
  const stats = {
    decisions_created: 0,
    edges_created: 0,
    errors: 0,
  };

  try {
    for (const decisionData of SYSTEM_GOAL_DECISIONS) {
      try {
        // Create Decision entity
        const decisionCol = db.collection('kg_decisions');
        const doc = {
          _key: decisionData.decision_id,
          id: decisionData.decision_id,
          title: decisionData.title,
          decision: decisionData.decision,
          rationale: decisionData.rationale,
          alternatives_considered: [],
          impact_scope: 'system',
          status: 'active',
          decided_at: new Date().toISOString(),
          kind: 'decision',
          extracted_at: new Date().toISOString(),
          provenance: 'seed-synthetic-decisions',
        };
        await decisionCol.save(doc, { overwriteMode: 'update' });
        stats.decisions_created++;

        // Create decides_for edge to System Goal
        try {
          const edgeCol = db.collection('kg_decides_for');
          await edgeCol.save({
            _from: `kg_decisions/${decisionData.decision_id}`,
            _to: `kg_goals/${decisionData.goal_id}`,
            created_at: new Date().toISOString(),
            provenance: 'seed-synthetic-decisions',
          }, { overwriteMode: 'update' });
          stats.edges_created++;
        } catch (err) {
          console.error(`[Synthetic Decisions] Error creating edge: ${err.message}`);
          stats.errors++;
        }
      } catch (err) {
        console.error(`[Synthetic Decisions] Error creating decision: ${err.message}`);
        stats.errors++;
      }
    }
  } catch (err) {
    console.error(`[Synthetic Decisions] Error seeding synthetic decisions: ${err.message}`);
    stats.errors++;
  }

  return stats;
}

module.exports = {
  SYSTEM_GOAL_DECISIONS,
  seedSyntheticDecisions,
};
