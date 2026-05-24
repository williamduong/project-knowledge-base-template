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
const { getDatabase } = require(path.join(repoRoot, 'src', 'graph-db', 'db.js'));

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

  // ============================================================================
  // GOALS ENDPOINTS
  // ============================================================================

  // GET /api/graph/goals/tree — fetch goals tree (with hierarchy)
  router.get('/goals/tree', async (req, res) => {
    try {
      const db = await getGraphDb();
      const goals = await apiGoals.getGoalsTree(db);
      res.json(goals);
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
  router.get('/decisions', async (req, res) => {
    try {
      const db = await getGraphDb();
      const status = req.query.status;

      let decisions;
      if (status) {
        decisions = await apiDecisions.getDecisionsByStatus(db, status);
      } else {
        decisions = await apiDecisions.getDecisionsList(db);
      }

      res.json(decisions);
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
  router.get('/principles', async (req, res) => {
    try {
      const db = await getGraphDb();
      const domain = req.query.domain;

      let principles;
      if (domain) {
        principles = await apiPrinciples.getPrinciplesByDomain(db, domain);
      } else {
        principles = await apiPrinciples.getPrinciplesList(db);
      }

      res.json(principles);
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

  return router;
}

export { createGraphApiRouter };
