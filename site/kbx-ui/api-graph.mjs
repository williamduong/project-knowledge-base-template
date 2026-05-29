import express from 'express';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const require = createRequire(import.meta.url);
const apiGoals = require(path.join(repoRoot, 'src', 'graph-db', 'knowledge', 'api-goals.js'));
const apiDecisions = require(path.join(repoRoot, 'src', 'graph-db', 'knowledge', 'api-decisions.js'));
const apiPrinciples = require(path.join(repoRoot, 'src', 'graph-db', 'knowledge', 'api-principles.js'));
const apiSymbols = require(path.join(repoRoot, 'src', 'graph-db', 'code', 'api-symbols.js')); // Phase 6: Track A
const planningGraph = require(path.join(repoRoot, 'src', 'graph-db', 'planning'));
const { getDatabase } = require(path.join(repoRoot, 'src', 'graph-db', 'db.js'));
const { graphCache } = require(path.join(repoRoot, 'src', 'lib', 'graph-cache.js')); // Phase 6: caching layer
const {
  addIntentKeyResultLink,
  removeIntentKeyResultLink,
  addIntentToRelease,
  removeIntentFromRelease,
  applyAssistantDecision,
} = require(path.join(repoRoot, 'src', 'lib', 'svfactory-planning-seed.js'));
const {
  generateIntentPlanSuggestion,
} = require(path.join(repoRoot, 'src', 'lib', 'planning-assistant.js'));

// Lazily initialized graph database connection
let graphDb = null;

async function getGraphDb() {
  if (!graphDb) {
    graphDb = await getDatabase();
  }
  return graphDb;
}

function createGraphApiRouter() {
  const router = express.Router();
  const planningCacheKey = 'planning:workspace';

  async function refreshPlanningWorkspace({ forceRefresh = true } = {}) {
    const db = await getGraphDb();
    const workspace = await planningGraph.getPlanningWorkspace(db, {
      workspaceRoot: repoRoot,
      forceRefresh,
    });
    graphCache.set(planningCacheKey, workspace);
    return workspace;
  }

  // ============================================================================
  // PLANNING WORKSPACE (OKR + INTENT + RELEASE + TASK)
  // ============================================================================

  router.get('/planning/workspace', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === 'true';

      if (!forceRefresh) {
        const cached = graphCache.get(planningCacheKey);
        if (cached) {
          res.set('X-Cache', 'HIT');
          return res.json(cached);
        }
      }

      const workspace = await refreshPlanningWorkspace({ forceRefresh });
      res.set('X-Cache', 'MISS');
      res.json(workspace);
    } catch (error) {
      console.error('[api-graph] GET /planning/workspace failed:', error.message, error.stack?.split('\n').slice(0, 3).join(' | '));
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/planning/intents/:intentId/key-results/:keyResultId', async (req, res) => {
    try {
      const relation = typeof req.body?.relation === 'string' ? req.body.relation : 'advances';
      const notes = typeof req.body?.notes === 'string' ? req.body.notes : '';
      addIntentKeyResultLink(repoRoot, {
        intentId: req.params.intentId,
        keyResultId: req.params.keyResultId,
        relation,
        notes,
      });
      const workspace = await refreshPlanningWorkspace({ forceRefresh: true });
      res.json({ ok: true, workspace });
    } catch (error) {
      console.error('[api-graph] POST /planning/intents/:intentId/key-results/:keyResultId failed:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/planning/intents/:intentId/key-results/:keyResultId', async (req, res) => {
    try {
      removeIntentKeyResultLink(repoRoot, {
        intentId: req.params.intentId,
        keyResultId: req.params.keyResultId,
      });
      const workspace = await refreshPlanningWorkspace({ forceRefresh: true });
      res.json({ ok: true, workspace });
    } catch (error) {
      console.error('[api-graph] DELETE /planning/intents/:intentId/key-results/:keyResultId failed:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/planning/releases/:releaseId/intents/:intentId', async (req, res) => {
    try {
      addIntentToRelease(repoRoot, {
        releaseId: req.params.releaseId,
        intentId: req.params.intentId,
      });
      const workspace = await refreshPlanningWorkspace({ forceRefresh: true });
      res.json({ ok: true, workspace });
    } catch (error) {
      console.error('[api-graph] POST /planning/releases/:releaseId/intents/:intentId failed:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/planning/releases/:releaseId/intents/:intentId', async (req, res) => {
    try {
      removeIntentFromRelease(repoRoot, {
        releaseId: req.params.releaseId,
        intentId: req.params.intentId,
      });
      const workspace = await refreshPlanningWorkspace({ forceRefresh: true });
      res.json({ ok: true, workspace });
    } catch (error) {
      console.error('[api-graph] DELETE /planning/releases/:releaseId/intents/:intentId failed:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/planning/intents/:intentId/assistant-plan', express.json(), async (req, res) => {
    try {
      const workspace = graphCache.get(planningCacheKey) || await refreshPlanningWorkspace({ forceRefresh: false });
      const suggestion = await generateIntentPlanSuggestion(repoRoot, workspace, req.params.intentId);
      res.json(suggestion);
    } catch (error) {
      console.error('[api-graph] POST /planning/intents/:intentId/assistant-plan failed:', error.message, error.stack?.split('\n').slice(0, 3).join(' | '));
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  router.post('/planning/intents/:intentId/assistant-apply', express.json(), async (req, res) => {
    try {
      const body = req.body || {};
      const result = applyAssistantDecision(repoRoot, {
        intentId: req.params.intentId,
        decision: body.decision,
        summary: body.summary,
        whyNow: body.why_now,
        nextAction: body.next_action,
        keyResultId: body.primary_key_result_id,
        releaseId: body.primary_release_id,
        proposedObjective: body.proposed_objective,
        proposedKeyResult: body.proposed_key_result,
        outOfScopeReason: body.out_of_scope_reason,
        warnings: body.warnings,
      });
      const workspace = await refreshPlanningWorkspace({ forceRefresh: true });
      res.json({ ok: true, workspace, review: result.review });
    } catch (error) {
      console.error('[api-graph] POST /planning/intents/:intentId/assistant-apply failed:', error.message, error.stack?.split('\n').slice(0, 3).join(' | '));
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GOALS ENDPOINTS
  // ============================================================================

  // GET /api/graph/goals/tree — fetch goals tree (with hierarchy)
  // Phase 6: Cached for 5 minutes (expensive traversal)
  router.get('/goals/tree', async (req, res) => {
    try {
      const cacheKey = 'goals:tree';

      // Check cache first
      let goals = graphCache.get(cacheKey);
      if (goals) {
        res.set('X-Cache', 'HIT');
        return res.json(goals);
      }

      // Cache miss — fetch from DB
      const db = await getGraphDb();
      goals = await apiGoals.getGoalsTree(db);

      // Store in cache
      graphCache.set(cacheKey, goals);
      res.set('X-Cache', 'MISS');
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/goals/stats — fetch goals statistics
  router.get('/goals/stats', async (req, res) => {
    try {
      const db = await getGraphDb();
      const stats = await apiGoals.getGoalsStats(db);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/goals/:id — fetch single goal
  router.get('/goals/:id', async (req, res) => {
    try {
      const db = await getGraphDb();
      const goal = await apiGoals.getGoal(db, req.params.id);
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      res.json(goal);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/intents/:intentId/goals — fetch goals for intent
  router.get('/intents/:intentId/goals', async (req, res) => {
    try {
      const db = await getGraphDb();
      const goals = await apiGoals.getGoalsForIntent(db, req.params.intentId);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // DECISIONS ENDPOINTS
  // ============================================================================

  // GET /api/graph/decisions — fetch all decisions
  // Phase 6: Cached when no status filter
  router.get('/decisions', async (req, res) => {
    try {
      const db = await getGraphDb();
      const status = req.query.status;
      const cacheKey = status ? `decisions:status:${status}` : 'decisions:list';

      // Check cache first
      let decisions = graphCache.get(cacheKey);
      if (decisions) {
        res.set('X-Cache', 'HIT');
        return res.json(decisions);
      }

      // Cache miss — fetch from DB
      if (status) {
        decisions = await apiDecisions.getDecisionsByStatus(db, status);
      } else {
        decisions = await apiDecisions.getDecisionsList(db);
      }

      // Store in cache
      graphCache.set(cacheKey, decisions);
      res.set('X-Cache', 'MISS');
      res.json(decisions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/decisions/stats — fetch decisions statistics
  router.get('/decisions/stats', async (req, res) => {
    try {
      const db = await getGraphDb();
      const stats = await apiDecisions.getDecisionsStats(db);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/decisions/:id — fetch single decision
  router.get('/decisions/:id', async (req, res) => {
    try {
      const db = await getGraphDb();
      const decision = await apiDecisions.getDecision(db, req.params.id);
      if (!decision) {
        return res.status(404).json({ error: 'Decision not found' });
      }
      res.json(decision);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/decisions/:id/impact — fetch decision impact analysis
  router.get('/decisions/:id/impact', async (req, res) => {
    try {
      const db = await getGraphDb();
      const impact = await apiDecisions.getDecisionImpact(db, req.params.id);
      if (!impact) {
        return res.status(404).json({ error: 'Decision not found' });
      }
      res.json(impact);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/goals/:goalId/decisions — fetch decisions for goal (with inheritance)
  router.get('/goals/:goalId/decisions', async (req, res) => {
    try {
      const db = await getGraphDb();
      const decisions = await apiDecisions.getDecisionsForGoal(db, req.params.goalId);
      if (!decisions) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      res.json(decisions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // PRINCIPLES ENDPOINTS
  // ============================================================================

  // GET /api/graph/principles — fetch all principles
  // Phase 6: Cached when no domain filter
  router.get('/principles', async (req, res) => {
    try {
      const db = await getGraphDb();
      const domain = req.query.domain;
      const cacheKey = domain ? `principles:domain:${domain}` : 'principles:list';

      // Check cache first
      let principles = graphCache.get(cacheKey);
      if (principles) {
        res.set('X-Cache', 'HIT');
        return res.json(principles);
      }

      // Cache miss — fetch from DB
      if (domain) {
        principles = await apiPrinciples.getPrinciplesByDomain(db, domain);
      } else {
        principles = await apiPrinciples.getPrinciplesList(db);
      }

      // Store in cache
      graphCache.set(cacheKey, principles);
      res.set('X-Cache', 'MISS');
      res.json(principles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/principles/domains — fetch principle domain statistics
  router.get('/principles/domains', async (req, res) => {
    try {
      const db = await getGraphDb();
      const stats = await apiPrinciples.getPrinciplesDomainStats(db);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/principles/coverage — fetch principles code coverage status
  router.get('/principles/coverage', async (req, res) => {
    try {
      const db = await getGraphDb();
      const coverage = await apiPrinciples.getPrinciplesCoverageStatus(db);
      res.json(coverage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/principles/:id — fetch single principle
  router.get('/principles/:id', async (req, res) => {
    try {
      const db = await getGraphDb();
      const principle = await apiPrinciples.getPrinciple(db, req.params.id);
      if (!principle) {
        return res.status(404).json({ error: 'Principle not found' });
      }
      res.json(principle);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // SYMBOLS ENDPOINTS (Phase 6 — Track A)
  // ============================================================================

  // GET /api/graph/symbols — fetch all symbols with optional filtering
  router.get('/symbols', async (req, res) => {
    try {
      const db = await getGraphDb();
      const filters = {
        kind: req.query.kind,
        file: req.query.file,
      };
      if (req.query.exported === 'true') {
        filters.exported = true;
      } else if (req.query.exported === 'false') {
        filters.exported = false;
      }

      const cacheKey = `symbols:list:${JSON.stringify(filters)}`;
      let symbols = graphCache.get(cacheKey);

      if (!symbols) {
        symbols = await apiSymbols.listSymbols(db, filters);
        graphCache.set(cacheKey, symbols);
        res.set('X-Cache', 'MISS');
      } else {
        res.set('X-Cache', 'HIT');
      }

      res.json(symbols);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/symbols/stats — fetch symbol statistics
  router.get('/symbols/stats', async (req, res) => {
    try {
      const db = await getGraphDb();
      const cacheKey = 'symbols:stats';
      let stats = graphCache.get(cacheKey);

      if (!stats) {
        stats = await apiSymbols.getSymbolsStats(db);
        graphCache.set(cacheKey, stats);
        res.set('X-Cache', 'MISS');
      } else {
        res.set('X-Cache', 'HIT');
      }

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/symbols/:id/calls — fetch call graph for symbol
  router.get('/symbols/:id/calls', async (req, res) => {
    try {
      const db = await getGraphDb();
      const depth = parseInt(req.query.depth) || 2;
      const callGraph = await apiSymbols.getCallGraph(db, req.params.id, depth);
      res.json(callGraph);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/graph/symbols/:id — fetch single symbol
  router.get('/symbols/:id', async (req, res) => {
    try {
      const db = await getGraphDb();
      const symbol = await apiSymbols.getSymbol(db, req.params.id);
      if (!symbol) {
        return res.status(404).json({ error: 'Symbol not found' });
      }
      res.json(symbol);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CACHE MONITORING & CONTROL (Phase 6)
  // ============================================================================

  // GET /api/graph/cache/stats — fetch cache health metrics
  router.get('/cache/stats', (req, res) => {
    const stats = graphCache.getStats();
    res.json(stats);
  });

  // POST /api/graph/cache/invalidate — invalidate cache by pattern
  // Example: POST /api/graph/cache/invalidate?pattern=goals/*
  router.post('/cache/invalidate', express.json(), (req, res) => {
    const pattern = req.query.pattern || '*';
    const count = graphCache.invalidate(pattern);
    res.json({
      pattern,
      invalidated_count: count,
      cache_stats: graphCache.getStats(),
    });
  });

  // POST /api/graph/cache/clear — clear entire cache
  router.post('/cache/clear', express.json(), (req, res) => {
    const count = graphCache.clear();
    res.json({
      cleared_count: count,
      cache_stats: graphCache.getStats(),
    });
  });

  return router;
}

export { createGraphApiRouter };
