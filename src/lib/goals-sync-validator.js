'use strict';

/**
 * Goals Sync Validator — Dual-read validation for safe file→graph migration
 *
 * Phase 6 Track B: Compare file-based (goals.state.json) and graph-based (kg_goals)
 * to ensure they stay synchronized during migration period.
 *
 * Used by /api/goals/* endpoints to validate graph queries match file data.
 */

const fs = require('fs');
const path = require('path');

class GoalsSyncValidator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.goalsStatePath = path.join(projectRoot, 'svfactory', 'goals.state.json');
    this.discrepancies = [];
    this.lastValidation = null;
  }

  /**
   * Load goals from file (legacy source)
   */
  loadGoalsFromFile() {
    try {
      if (!fs.existsSync(this.goalsStatePath)) {
        return [];
      }
      const content = fs.readFileSync(this.goalsStatePath, 'utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : data.goals || [];
    } catch (err) {
      console.error(`[GoalsSyncValidator] Failed to load goals.state.json: ${err.message}`);
      return [];
    }
  }

  /**
   * Compare goals from file vs graph
   * Returns: { match: boolean, differences: string[] }
   */
  async compareGoals(graphGoals) {
    const fileGoals = this.loadGoalsFromFile();
    const differences = [];

    // Map both sources by ID for comparison
    const fileMap = {};
    const graphMap = {};

    fileGoals.forEach(goal => {
      fileMap[goal.id || goal._key] = goal;
    });

    graphGoals.forEach(goal => {
      graphMap[goal._key] = goal;
    });

    // Check for missing in graph
    for (const [id, fileGoal] of Object.entries(fileMap)) {
      if (!graphMap[id]) {
        differences.push(`Missing in graph: goal/${id} (${fileGoal.title || fileGoal.name})`);
      } else {
        const graphGoal = graphMap[id];
        // Deep comparison of key fields
        if (fileGoal.title !== graphGoal.title) {
          differences.push(`Title mismatch: goal/${id} file="${fileGoal.title}" graph="${graphGoal.title}"`);
        }
        if (fileGoal.status !== graphGoal.status) {
          differences.push(`Status mismatch: goal/${id} file="${fileGoal.status}" graph="${graphGoal.status}"`);
        }
      }
    }

    // Check for missing in file
    for (const [id, graphGoal] of Object.entries(graphMap)) {
      if (!fileMap[id]) {
        differences.push(`Missing in file: goal/${id} (${graphGoal.title})`);
      }
    }

    return {
      match: differences.length === 0,
      count_file: fileGoals.length,
      count_graph: graphGoals.length,
      differences,
    };
  }

  /**
   * Validate query result matches expectations
   */
  async validateQueryResult(source, operationType, expectedCount) {
    if (source === 'graph') {
      // Graph queries should succeed and return data
      return {
        valid: expectedCount !== undefined,
        message: expectedCount !== undefined ? 'Graph query valid' : 'No data returned',
      };
    }
    return { valid: true, message: 'Fallback source' };
  }

  /**
   * Log discrepancy for monitoring
   */
  logDiscrepancy(type, details) {
    const discrepancy = {
      timestamp: new Date().toISOString(),
      type,
      details,
    };
    this.discrepancies.push(discrepancy);

    // Keep only last 100 discrepancies in memory
    if (this.discrepancies.length > 100) {
      this.discrepancies.shift();
    }

    console.warn(`[GoalsSyncValidator] Discrepancy: ${type} — ${JSON.stringify(details)}`);
  }

  /**
   * Get validation report
   */
  getReport() {
    return {
      last_validation: this.lastValidation,
      total_discrepancies: this.discrepancies.length,
      recent_discrepancies: this.discrepancies.slice(-10),
    };
  }

  /**
   * Clear discrepancies (call after archival decision)
   */
  reset() {
    this.discrepancies = [];
    this.lastValidation = null;
  }
}

// Global singleton
const syncValidator = new GoalsSyncValidator(process.cwd());

module.exports = { GoalsSyncValidator, syncValidator };
