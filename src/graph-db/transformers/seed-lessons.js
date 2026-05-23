'use strict';

// Lessons learned from Phase 4 problem-solving
const PHASE_4_LESSONS = [
  {
    id: 'lesson-001-inheritance-gap-analysis',
    title: 'Gap analysis must check both direct and inherited constraints',
    what_happened: 'Initial gap analysis reported 38 goals missing decisions. Investigation showed goals inherit decision constraints from their parent System Goals, causing false positive gaps.',
    why_it_matters: 'Without accounting for inheritance, we cannot accurately measure graph completeness. False gaps mislead optimization efforts and metrics.',
    next_time: 'When analyzing relationship coverage, always consider transitive closure and hierarchy inheritance. Query both direct edges AND parent edges.',
    context: 'Knowledge Graph design: goal hierarchy with decision inheritance',
    severity: 'medium',
    learned_from_intent: 'v2-10-code-graph',
    learned_at: new Date().toISOString(),
  },
  {
    id: 'lesson-002-semantic-matching-bridges',
    title: 'Semantic keyword matching outperforms filename matching for bridge discovery',
    what_happened: 'Attempted to match intent file references (src/graph-db/code/schema.js) to KB documents by filename. Result: 0% match rate. Switched to semantic keyword extraction and matching.',
    why_it_matters: 'Different entity types (source code vs documentation) exist in separate domains. Filename-based matching fails across domain boundaries. Semantic bridges succeed by matching intent keywords to document content.',
    next_time: 'When bridging across different entity types, extract semantic keywords first. Use fuzzy matching on semantics rather than exact filename matching.',
    context: 'Knowledge Graph bridging: Intent → KB Document links',
    severity: 'high',
    learned_from_intent: 'v2-10-code-graph',
    learned_at: new Date().toISOString(),
  },
  {
    id: 'lesson-003-synthetic-decisions-valid',
    title: 'Synthetic decisions derived from goals are valid when ADRs unavailable',
    what_happened: '6 ADRs were template stubs with no content. Rather than wait for content, synthesized 2 additional decisions for System Goals SG-1 and SG-5 based on their purpose statements.',
    why_it_matters: 'Empty templates can block graph completion. Synthetic decisions (derived from purpose, rationale, scope) are architecturally sound and upgradeable when real ADR content arrives.',
    next_time: 'Do not wait for perfect source data. Synthesize from available metadata (titles, descriptions, purpose statements) and mark as updateable. This provides structure while allowing future refinement.',
    context: 'Decision extraction: balance pragmatism with completeness',
    severity: 'low',
    learned_from_intent: 'v2-10-code-graph',
    learned_at: new Date().toISOString(),
  },
  {
    id: 'lesson-004-bidirectional-edge-detection',
    title: 'Orphan detection must check both inbound and outbound edges',
    what_happened: 'Gap analysis reported 119 orphaned documents. Investigation found describes edges pointing INTO documents, not from them. Query only checked outgoing edges.',
    why_it_matters: 'Nodes with incoming edges are not truly orphaned. Bidirectional edge checking provides accurate connectivity metrics. One-directional checks lead to false orphan reports.',
    next_time: 'When detecting orphaned nodes, always check BOTH inbound and outbound edges: COUNT(inbound) + COUNT(outbound) > 0 means the node is connected.',
    context: 'Graph analysis: orphan detection correctness',
    severity: 'medium',
    learned_from_intent: 'v2-10-code-graph',
    learned_at: new Date().toISOString(),
  },
  {
    id: 'lesson-005-two-graph-architecture-boundaries',
    title: 'Clear boundaries needed between semantic and structural graphs',
    what_happened: 'Attempted to bridge Intent → Code File, but Code Graph (structural) and Knowledge Graph (semantic) operate independently. Cross-graph bridges require explicit design.',
    why_it_matters: 'Without clear semantics for cross-graph edges, bridge creation becomes ambiguous. Two-graph architecture requires explicit boundary definition before implementation.',
    next_time: 'Before implementing cross-graph relationships, define: (1) edge semantics, (2) query patterns, (3) consistency rules. Do this as explicit design phase.',
    context: 'Multi-graph architecture: Code Graph + Knowledge Graph',
    severity: 'high',
    learned_from_intent: 'v2-10-code-graph',
    learned_at: new Date().toISOString(),
  },
  {
    id: 'lesson-006-incremental-transformation-strategy',
    title: 'Problem resolution enables incremental graph normalization',
    what_happened: 'Rather than big-bang normalization, systematically addressed 7 problems. Each solution improved graph metrics: 64→34 gaps (-47%), 150→31 orphans (-79%).',
    why_it_matters: 'Incremental problem-solving with metrics-driven verification allows us to improve graph while maintaining system stability. Each fix is isolated and measurable.',
    next_time: 'Use this pattern: (1) identify gaps, (2) understand root causes, (3) solve in priority order with metrics, (4) verify improvement. Iterate until target achieved.',
    context: 'Data transformation: incremental normalization strategy',
    severity: 'low',
    learned_from_intent: 'v2-7-0-1',
    learned_at: new Date().toISOString(),
  },
];

// Seed lessons into graph
async function seedLessons(db) {
  const stats = {
    lessons_created: 0,
    edges_created: 0,
    errors: 0,
  };

  try {
    for (const lesson of PHASE_4_LESSONS) {
      try {
        // Create Lesson entity
        const lessonCol = db.collection('kg_lessons');
        const doc = {
          _key: lesson.id,
          ...lesson,
          kind: 'lesson',
          extracted_at: new Date().toISOString(),
        };
        await lessonCol.save(doc, { overwriteMode: 'update' });
        stats.lessons_created++;

        // Create learned_from edge to Intent
        if (lesson.learned_from_intent) {
          try {
            const edgeCol = db.collection('kg_learned_from');
            await edgeCol.save({
              _from: `kg_lessons/${lesson.id}`,
              _to: `kg_intents/${lesson.learned_from_intent}`,
              created_at: new Date().toISOString(),
              provenance: 'seed-lessons',
            }, { overwriteMode: 'update' });
            stats.edges_created++;
          } catch (err) {
            console.error(`[Seed Lessons] Error creating edge: ${err.message}`);
            stats.errors++;
          }
        }
      } catch (err) {
        console.error(`[Seed Lessons] Error creating lesson: ${err.message}`);
        stats.errors++;
      }
    }
  } catch (err) {
    console.error(`[Seed Lessons] Error seeding lessons: ${err.message}`);
    stats.errors++;
  }

  return stats;
}

module.exports = {
  PHASE_4_LESSONS,
  seedLessons,
};
