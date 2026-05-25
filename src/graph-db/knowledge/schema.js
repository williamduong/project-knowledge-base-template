'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Schema definition (Phase 3)
//
// Semantic entities (non-code): Intent, Goal, Decision, Principle, Risk, Lesson,
// Document, Agent, Version, Milestone.
//
// No ontology inheritance — flat schema, open for enterprise extension.
// Each enterprise can add domain-specific node/edge types via KG config.
// ---------------------------------------------------------------------------

// Vertex collections
const COLLECTIONS = {
  INTENTS:    'kg_intents',    // Initiative / feature / epic
  GOALS:      'kg_goals',      // Objective to achieve
  MILESTONES: 'kg_milestones', // Checkpoint in intent
  DECISIONS:  'kg_decisions',  // Architectural choice
  PRINCIPLES: 'kg_principles', // Governance rule (P0-P15)
  RISKS:      'kg_risks',      // Concern, blocker, chaos score
  LESSONS:    'kg_lessons',    // Learning from completion
  VERSIONS:   'kg_versions',   // Release version (v2.8, v2.9, etc.)
  DOCUMENTS:  'kg_documents',  // KB article, guide, decision record
  AGENTS:     'kg_agents',     // Person, AI, or system (William, Claude, etc.)
};

// Edge collections — relationships between entities
const EDGE_COLLECTIONS = {
  IMPLEMENTS:     'kg_implements',     // Intent → Goal
  HAS_MILESTONE:  'kg_has_milestone',  // Intent → Milestone
  HAS_PHASE:      'kg_has_phase',      // Intent → Phase (0, 1, 2...)
  FOLLOWS:        'kg_follows',        // Intent → Principle (what rules apply)
  DECIDES_FOR:    'kg_decides_for',    // Decision → Intent (decision made for)
  THREATENS:      'kg_threatens',      // Risk → Goal | Milestone (risk threatens)
  RELEASES:       'kg_releases',       // Version → Intent | Goal
  LEARNED_FROM:   'kg_learned_from',   // Lesson → Intent (lesson after completion)
  DESCRIBES:      'kg_describes',      // Document → Intent | Goal | Decision | Principle
  AUTHORED_BY:    'kg_authored_by',    // Decision | Document → Agent
  CREATED_BY:     'kg_created_by',     // Intent → Agent
  DEPENDS_ON:     'kg_depends_on',     // Intent → Intent (dependency)
  BLOCKS:         'kg_blocks',         // Risk | Decision → Intent | Goal (blocks progress)
  APPLIES_TO:     'kg_applies_to',     // Principle → Code Symbol (Phase 6)
  RELATED_TO:     'kg_related_to',     // Generic relation between entities
};

// Node kind — type discriminator for each vertex
const NODE_KIND = {
  INTENT:     'intent',
  GOAL:       'goal',
  MILESTONE:  'milestone',
  DECISION:   'decision',
  PRINCIPLE:  'principle',
  RISK:       'risk',
  LESSON:     'lesson',
  VERSION:    'version',
  DOCUMENT:   'document',
  AGENT:      'agent',
};

// Risk severity levels
const RISK_SEVERITY = {
  LOW:      'low',
  MEDIUM:   'medium',
  HIGH:     'high',
  CRITICAL: 'critical',
};

// Intent status lifecycle
const INTENT_STATUS = {
  OPEN:       'open',
  IN_PROGRESS: 'in_progress',
  BLOCKED:    'blocked',
  ON_HOLD:    'on_hold',
  COMPLETED:  'completed',
  CANCELLED:  'cancelled',
  ARCHIVED:   'archived',
};

// Intent lifecycle classification
const INTENT_LIFECYCLE = {
  ACTIVE:     'active',
  COMPLETED:  'completed',
  ARCHIVED:   'archived',
  DEPRECATED: 'deprecated',
};

// Document type
const DOCUMENT_TYPE = {
  ORIENTATION: 'orientation',
  GUIDE:       'guide',
  DECISION:    'decision_record',
  PROCEDURE:   'procedure',
  REPORT:      'report',
  ANALYSIS:    'analysis',
  REFERENCE:   'reference',
};

// Version status
const VERSION_STATUS = {
  PLANNING:  'planning',
  BETA:      'beta',
  STABLE:    'stable',
  EOL:       'end_of_life',
};

// Agent type
const AGENT_TYPE = {
  HUMAN: 'human',
  AI:    'ai',
  SYSTEM: 'system',
};

// ArangoDB named graph definition
const GRAPH_DEFINITION = {
  name: 'knowledge_graph',
  edgeDefinitions: [
    { collection: EDGE_COLLECTIONS.IMPLEMENTS,    from: [COLLECTIONS.INTENTS], to: [COLLECTIONS.GOALS] },
    { collection: EDGE_COLLECTIONS.HAS_MILESTONE, from: [COLLECTIONS.INTENTS], to: [COLLECTIONS.MILESTONES] },
    { collection: EDGE_COLLECTIONS.HAS_PHASE,     from: [COLLECTIONS.INTENTS], to: [COLLECTIONS.MILESTONES] },
    { collection: EDGE_COLLECTIONS.FOLLOWS,       from: [COLLECTIONS.INTENTS], to: [COLLECTIONS.PRINCIPLES] },
    { collection: EDGE_COLLECTIONS.DECIDES_FOR,   from: [COLLECTIONS.DECISIONS], to: [COLLECTIONS.INTENTS, COLLECTIONS.GOALS] },
    { collection: EDGE_COLLECTIONS.THREATENS,     from: [COLLECTIONS.RISKS], to: [COLLECTIONS.GOALS, COLLECTIONS.MILESTONES] },
    { collection: EDGE_COLLECTIONS.RELEASES,      from: [COLLECTIONS.VERSIONS], to: [COLLECTIONS.INTENTS, COLLECTIONS.GOALS] },
    { collection: EDGE_COLLECTIONS.LEARNED_FROM,  from: [COLLECTIONS.LESSONS], to: [COLLECTIONS.INTENTS] },
    { collection: EDGE_COLLECTIONS.DESCRIBES,     from: [COLLECTIONS.DOCUMENTS], to: [COLLECTIONS.INTENTS, COLLECTIONS.GOALS, COLLECTIONS.DECISIONS, COLLECTIONS.PRINCIPLES] },
    { collection: EDGE_COLLECTIONS.AUTHORED_BY,   from: [COLLECTIONS.DECISIONS, COLLECTIONS.DOCUMENTS, COLLECTIONS.LESSONS], to: [COLLECTIONS.AGENTS] },
    { collection: EDGE_COLLECTIONS.CREATED_BY,    from: [COLLECTIONS.INTENTS, COLLECTIONS.GOALS, COLLECTIONS.RISKS], to: [COLLECTIONS.AGENTS] },
    { collection: EDGE_COLLECTIONS.DEPENDS_ON,    from: [COLLECTIONS.INTENTS], to: [COLLECTIONS.INTENTS] },
    { collection: EDGE_COLLECTIONS.BLOCKS,        from: [COLLECTIONS.RISKS, COLLECTIONS.DECISIONS], to: [COLLECTIONS.INTENTS, COLLECTIONS.GOALS, COLLECTIONS.MILESTONES] },
    { collection: EDGE_COLLECTIONS.APPLIES_TO,    from: [COLLECTIONS.PRINCIPLES], to: ['cg_symbols'] }, // Phase 6: Cross-graph edge
    { collection: EDGE_COLLECTIONS.RELATED_TO,    from: Object.values(COLLECTIONS), to: Object.values(COLLECTIONS) },
  ],
};

// Indexes — for common queries (Phase 6 optimized)
const INDEXES = [
  // Intent lookups
  { collection: COLLECTIONS.INTENTS,  type: 'hash', fields: ['id'] },
  { collection: COLLECTIONS.INTENTS,  type: 'hash', fields: ['status'] },
  { collection: COLLECTIONS.INTENTS,  type: 'hash', fields: ['lifecycle'] },
  { collection: COLLECTIONS.INTENTS,  type: 'skiplist', fields: ['created_at'] },

  // Goal: single field + composite for tree queries (Phase 6)
  { collection: COLLECTIONS.GOALS,    type: 'hash', fields: ['status'] },
  { collection: COLLECTIONS.GOALS,    type: 'persistent', fields: ['parent_goal_id', 'status'], unique: false },

  // Decision: single field + composite for filtering (Phase 6)
  { collection: COLLECTIONS.DECISIONS, type: 'hash', fields: ['status'] },
  { collection: COLLECTIONS.DECISIONS, type: 'persistent', fields: ['goal_id', 'status'], unique: false },

  // Principle by id (P0-P15)
  { collection: COLLECTIONS.PRINCIPLES, type: 'hash', fields: ['id'] },

  // Risk by severity
  { collection: COLLECTIONS.RISKS,    type: 'hash', fields: ['severity'] },

  // Version by number
  { collection: COLLECTIONS.VERSIONS, type: 'hash', fields: ['number'] },

  // Document by type and id
  { collection: COLLECTIONS.DOCUMENTS, type: 'hash', fields: ['type'] },
  { collection: COLLECTIONS.DOCUMENTS, type: 'hash', fields: ['id'] },

  // Agent by type
  { collection: COLLECTIONS.AGENTS,   type: 'hash', fields: ['type'] },
];

module.exports = {
  COLLECTIONS,
  EDGE_COLLECTIONS,
  NODE_KIND,
  RISK_SEVERITY,
  INTENT_STATUS,
  INTENT_LIFECYCLE,
  DOCUMENT_TYPE,
  VERSION_STATUS,
  AGENT_TYPE,
  GRAPH_DEFINITION,
  INDEXES,
};
