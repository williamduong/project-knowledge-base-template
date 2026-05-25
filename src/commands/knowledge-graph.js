'use strict';

// ---------------------------------------------------------------------------
// kbx knowledge-graph — Knowledge Graph CLI (Phase 3 — init, status, help)
// Subcommands: init | status | help
//
// Phase 3: schema creation only. Phase 4+ adds ingest/extraction.
// ---------------------------------------------------------------------------

const path = require('path');
const { connect, ping, resolveConfig, ensureSchema, getCollectionStats } = require('../graph-db/knowledge');
const { ensureIndexes } = require('../graph-db/knowledge/initialize-indexes');
const { createProvider } = require('../llm');
const { ingestKnowledgeGraph } = require('../graph-db/knowledge/kg-ingester');
const { getEntity, listEntities, getRelationships, traversePath, getImpactChain, searchEntities } = require('../graph-db/knowledge/query');
const { ensureBridgeEdges, linkIntentToFile, linkDecisionToSymbol, getBridgesFromEntity } = require('../graph-db/bridge');
const { validateGraph, getEntityCoverage } = require('../graph-db/knowledge/validate');
const { metricsCollector } = require('../lib/graph-query-metrics'); // Phase 6
const { getHealthReport } = require('../graph-db/knowledge/monitor');
const { seedGovernanceEntities } = require('../graph-db/transformers/seed-governance');
const { seedBridges } = require('../graph-db/transformers/seed-bridges');
const { runGapAnalysis } = require('../graph-db/transformers/gap-analysis');
const { seedDecisions } = require('../graph-db/transformers/seed-decisions');
const { seedDocumentBridges } = require('../graph-db/transformers/seed-document-bridges');
const { seedSemanticDocumentBridges } = require('../graph-db/transformers/seed-semantic-document-bridges');
const { seedSyntheticDecisions } = require('../graph-db/transformers/seed-synthetic-decisions');
const { seedLessons } = require('../graph-db/transformers/seed-lessons');
const { seedPrincipleCodeLinks } = require('../graph-db/knowledge/transformers/seed-principle-code-links'); // Phase 6: Track A

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = {
    sub: null, json: false, verbose: false, path: null,
    entity: null, search: null, types: [], impact: null, from: null, to: null, depth: 3,
    list: null, limit: 100, offset: 0,
    intentFile: null, decisionSymbol: null, getBridges: null, provenance: null,
  };
  const rest = [];

  for (let i = 0; i < (args || []).length; i++) {
    const arg = args[i];
    if (arg === '--json')           { options.json = true; continue; }
    if (arg === '--verbose')        { options.verbose = true; continue; }
    if (arg.startsWith('--path='))  { options.path = arg.slice('--path='.length); continue; }
    if (arg === '--path' || arg === '-p') { options.path = args[++i]; continue; }
    if (arg.startsWith('--entity=')) { options.entity = arg.slice('--entity='.length); continue; }
    if (arg === '--entity')         { options.entity = args[++i]; continue; }
    if (arg.startsWith('--search=')) { options.search = arg.slice('--search='.length); continue; }
    if (arg === '--search')         { options.search = args[++i]; continue; }
    if (arg.startsWith('--type='))  { options.types.push(arg.slice('--type='.length)); continue; }
    if (arg === '--impact')         { options.impact = args[++i]; continue; }
    if (arg === '--path-from')      { options.from = args[++i]; continue; }
    if (arg === '--path-to')        { options.to = args[++i]; continue; }
    if (arg.startsWith('--depth=')) { options.depth = parseInt(arg.slice('--depth='.length), 10); continue; }
    if (arg.startsWith('--list='))  { options.list = arg.slice('--list='.length); continue; }
    if (arg === '--list')           { options.list = args[++i]; continue; }
    if (arg.startsWith('--limit=')) { options.limit = parseInt(arg.slice('--limit='.length), 10); continue; }
    if (arg.startsWith('--offset=')) { options.offset = parseInt(arg.slice('--offset='.length), 10); continue; }
    if (arg.startsWith('--intent-file=')) { options.intentFile = arg.slice('--intent-file='.length); continue; }
    if (arg === '--intent-file')    { options.intentFile = args[++i]; continue; }
    if (arg.startsWith('--decision-symbol=')) { options.decisionSymbol = arg.slice('--decision-symbol='.length); continue; }
    if (arg === '--decision-symbol') { options.decisionSymbol = args[++i]; continue; }
    if (arg.startsWith('--get-bridges=')) { options.getBridges = arg.slice('--get-bridges='.length); continue; }
    if (arg === '--get-bridges')    { options.getBridges = args[++i]; continue; }
    if (arg.startsWith('--provenance=')) { options.provenance = arg.slice('--provenance='.length); continue; }
    if (!arg.startsWith('--')) { rest.push(arg); continue; }
    throw new Error(`Unknown knowledge-graph option "${arg}". Run "kbx knowledge-graph help" for usage.`);
  }

  options.sub = rest[0] || 'help';
  return options;
}

// ---------------------------------------------------------------------------
// Subcommand: init
// Connects to ArangoDB, creates the Knowledge Graph schema.
// ---------------------------------------------------------------------------

async function runInit(options) {
  const cfg = resolveConfig();

  if (!options.json) {
    console.log(`Connecting to ArangoDB at ${cfg.url} (database: ${cfg.database}) …`);
  }

  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
      console.error(`Check KBX_ARANGODB_URL / KBX_ARANGODB_DB / KBX_ARANGODB_USER / KBX_ARANGODB_PASS`);
    }
    process.exit(1);
  }

  let result;
  try {
    result = await ensureSchema(db);
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'ensureSchema', error: err.message }));
    } else {
      console.error(`Schema init failed: ${err.message}`);
    }
    process.exit(1);
  }

  // Phase 6: Ensure indexes (performance optimization)
  let indexResult;
  try {
    indexResult = await ensureIndexes(db, { verbose: !options.json });
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'ensureIndexes', error: err.message }));
    } else {
      console.error(`Index init failed: ${err.message}`);
    }
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify({
      ok: true,
      url: cfg.url,
      database: cfg.database,
      schema: result,
      indexes: indexResult,
    }));
    return;
  }

  const { created, existing } = result;
  if (created.vertexCollections.length || created.edgeCollections.length || created.graphs.length) {
    if (created.vertexCollections.length) console.log(`  Created vertex collections: ${created.vertexCollections.join(', ')}`);
    if (created.edgeCollections.length)   console.log(`  Created edge collections:   ${created.edgeCollections.join(', ')}`);
    if (created.graphs.length)            console.log(`  Created named graph:        ${created.graphs.join(', ')}`);
  }
  if (existing.vertexCollections.length || existing.edgeCollections.length || existing.graphs.length) {
    console.log(`  Already existing: ${[...existing.vertexCollections, ...existing.edgeCollections, ...existing.graphs].join(', ')}`);
  }
  console.log(`Knowledge Graph schema ready — database "${cfg.database}" at ${cfg.url}`);
}

// ---------------------------------------------------------------------------
// Subcommand: status
// Pings ArangoDB and reports collection document counts.
// ---------------------------------------------------------------------------

async function runStatus(options) {
  const result = await ping();

  if (!result.ok) {
    if (options.json) {
      console.log(JSON.stringify(result));
    } else {
      console.error(`ArangoDB unreachable: ${result.error}`);
      console.error(`URL: ${result.url}`);
    }
    process.exit(1);
  }

  let stats;
  try {
    const db = await connect();
    stats = await getCollectionStats(db);
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ...result, statsError: err.message }));
    } else {
      console.error(`Could not fetch collection stats: ${err.message}`);
    }
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify({ ...result, collections: stats }));
    return;
  }

  console.log(`ArangoDB OK — ${result.url} (${result.database}) [${result.latencyMs}ms]`);
  console.log('');
  console.log('Collection             Exists   Count');
  console.log('-------------------   ------   -----');
  for (const s of stats) {
    const exists = s.exists ? 'yes' : 'NO';
    const count  = s.exists ? String(s.count) : '-';
    console.log(`${s.collection.padEnd(21)}${exists.padEnd(9)}${count}`);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: ingest
// Extracts Intent/Goal/Decision/etc. from KB markdown using LLM.
// ---------------------------------------------------------------------------

async function runIngest(options, cwd) {
  const kbRoot = options.path ? path.resolve(cwd, options.path) : path.join(cwd, 'knowledge-base');

  if (!options.json) {
    console.log(`Ingesting KB documents from: ${kbRoot}`);
    console.log('Resolving LLM provider …');
  }

  let llmConfig;
  try {
    const { resolveConfig: resolveLlmConfig } = require('../llm');
    llmConfig = resolveLlmConfig();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'llm_config', error: err.message }));
    } else {
      console.error(`LLM config error: ${err.message}`);
    }
    process.exit(1);
  }

  let llmProvider;
  try {
    llmProvider = createProvider(llmConfig);
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'llm_provider', error: err.message }));
    } else {
      console.error(`LLM provider error: ${err.message}`);
    }
    process.exit(1);
  }

  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  const onProgress = options.verbose && !options.json
    ? ({ step, files, extracted, error }) => {
        if (step === 'scan')  console.log(`  Scanning: ${files} files found`);
        if (step === 'extract') console.log(`  Extracting: ${files} files scanned, ${extracted} entities extracted`);
        if (step === 'error')  console.error(`  Error: ${error}`);
      }
    : null;

  let result;
  try {
    result = await ingestKnowledgeGraph({
      db,
      kbRoot,
      workspaceRoot: cwd,
      llmProvider,
      onProgress,
    });
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'ingest', error: err.message }));
    } else {
      console.error(`Ingest failed: ${err.message}`);
    }
    process.exit(1);
  }

  const { stats } = result;
  if (options.json) {
    console.log(JSON.stringify({ ok: true, kbRoot, ...stats }));
    return;
  }

  console.log(`\nKB ingest complete:`);
  console.log(`  files_scanned: ${stats.files_scanned}`);
  console.log(`  extracted:     ${stats.extracted}`);
  console.log(`  intents:       ${stats.intents}`);
  if (stats.errors > 0) console.log(`  errors:        ${stats.errors}`);
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
kbx knowledge-graph — ArangoDB Knowledge Graph management (Phase 3-5.75 + Transformation)

Usage:
  kbx knowledge-graph init      [--json]                  Init DB + KG schema (10 vertex + 14 edge types).
  kbx knowledge-graph status    [--json]                  Check connection + collection counts.
  kbx knowledge-graph ingest    [--path=<dir>] [--verbose] [--json]
                                                           Extract Intent/Goal/Decision from KB markdown → ArangoDB.
  kbx knowledge-graph seed      [--json]                  Seed governance entities (Goals, Principles) from svfactory/.
  kbx knowledge-graph query     [--entity=TYPE:ID] [--search=QUERY] [--impact=ID] [--json]
                                                           Query entities, relationships, impact chains.
  kbx knowledge-graph validate  [--json]                  Run consistency checks (dangling edges, orphaned nodes).
  kbx knowledge-graph monitor   [--json]                  Health report + analytics.
  kbx knowledge-graph link      [--intent-file ID:FILE] [--decision-symbol ID:SYM] [--get-bridges ID] [--json]
                                                           Create semantic bridges Code Graph ↔ Knowledge Graph.
  kbx knowledge-graph help                                Show this message.

Query options:
  --entity=TYPE:ID              Fetch single entity (TYPE: intent, goal, decision, etc.)
  --search=QUERY                Search entities by title/description
  --type=TYPE                   Filter search results by entity type (repeatable)
  --impact=ID                   Get impact chain from entity (all reachable nodes)
  --depth=N                     Traversal depth (default: 3)
  --path-from=ID --path-to=ID   Find shortest path between entities
  --list=TYPE                   List entities of given type
  --limit=N                     Pagination limit (default: 100)
  --offset=N                    Pagination offset (default: 0)

Link options (Phase 5.5 — Bridge Layer):
  --intent-file ID:FILE         Link Intent → Code File
  --decision-symbol ID:SYM      Link Decision → Code Symbol
  --get-bridges ID              Get all bridges from/to entity
  --provenance STR              Annotation: 'manual', 'cli', 'lim' (default: cli)

Entities (vertices):
  Intent, Goal, Milestone, Decision, Principle, Risk, Lesson, Version, Document, Agent

Relationships (edges):
  implements, has_milestone, has_phase, follows, decides_for, threatens, releases,
  learned_from, describes, authored_by, created_by, depends_on, blocks, related_to

Bridge edges:
  intent_describes_file, decision_constrains_symbol, goal_involves_file,
  principle_applies_to_symbol, lesson_references_commit, document_documents_file

Named graph: knowledge_graph

Config (env vars):
  KBX_ARANGODB_URL    ArangoDB server URL     (default: http://localhost:8529)
  KBX_ARANGODB_DB     Database name           (default: kbx_code_graph)
  KBX_ARANGODB_USER   Username                (default: root)
  KBX_ARANGODB_PASS   Password                (default: empty)

Phase 3: Schema. Phase 4: Extraction. Phase 5: Query API. Phase 5.5: Bridge Layer.
  `.trim());
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Subcommand: query
// Query entities and relationships in the knowledge graph.
// ---------------------------------------------------------------------------

async function runQuery(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    let result;

    if (options.entity) {
      // Get single entity
      const [type, id] = options.entity.split(':');
      result = await getEntity(db, type, id);
      if (!result && !options.json) console.log('Entity not found');
    } else if (options.search) {
      // Search entities
      result = await searchEntities(db, options.search, options.types || []);
    } else if (options.impact) {
      // Impact chain
      const depth = options.depth || 3;
      result = await getImpactChain(db, options.entity || options.impact, depth);
    } else if (options.path) {
      // Path between entities
      result = await traversePath(db, options.from, options.to, options.depth || 5);
    } else if (options.list) {
      // List entities
      const type = options.list;
      result = await listEntities(db, type, { limit: options.limit || 100, offset: options.offset || 0 });
    } else {
      if (!options.json) console.error('No query specified. Use --help for options.');
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify({ ok: true, result }));
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Query failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: validate
// Run consistency checks on the knowledge graph.
// ---------------------------------------------------------------------------

async function runValidate(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    const results = await validateGraph(db);

    if (options.json) {
      console.log(JSON.stringify({ ok: true, results }));
      return;
    }

    console.log(`\nKnowledge Graph Validation Report`);
    console.log(`Timestamp: ${results.timestamp}`);
    console.log(`\nSummary:`);
    console.log(`  Total issues:  ${results.summary.total_issues}`);
    console.log(`  Critical:      ${results.summary.critical}`);
    console.log(`  High:          ${results.summary.high}`);
    console.log(`  Medium:        ${results.summary.medium}`);
    console.log(`  Passed checks: ${results.summary.passed}`);

    if (results.checks.length > 0) {
      console.log(`\nIssues found:`);
      results.checks.forEach(issue => {
        console.log(`\n  [${issue.severity.toUpperCase()}] ${issue.check}`);
        console.log(`    Type: ${issue.type || 'N/A'}`);
        console.log(`    Count: ${issue.count}`);
        if (issue.examples && issue.examples.length > 0) {
          console.log(`    Examples:`);
          issue.examples.forEach(ex => {
            console.log(`      - ${ex.node_id || ex.edge_id || 'N/A'}`);
          });
        }
      });
    } else {
      console.log(`\n✓ Graph is consistent! All checks passed.`);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Validation failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: monitor
// Get health report and analytics on the knowledge graph.
// ---------------------------------------------------------------------------

async function runMonitor(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    const report = await getHealthReport(db);

    if (options.json) {
      console.log(JSON.stringify({ ok: true, report }));
      return;
    }

    console.log(`\nKnowledge Graph Health Report`);
    console.log(`Status: ${report.status === 'healthy' ? '✓ Healthy' : '⚠ Degraded'}`);
    console.log(`Timestamp: ${report.timestamp}`);

    console.log(`\nStatistics:`);
    console.log(`  Total entities: ${report.stats.entities.total}`);
    console.log(`  Total edges:    ${report.stats.edges.total}`);
    console.log(`  Graph density:  ${report.stats.density}`);

    console.log(`\nEntity breakdown:`);
    Object.entries(report.stats.entities.byType).forEach(([type, count]) => {
      if (count > 0) console.log(`  ${type.padEnd(12)}: ${count}`);
    });

    if (report.orphaned.count > 0) {
      console.log(`\n⚠ Orphaned nodes: ${report.orphaned.count}`);
      report.orphaned.examples.forEach(node => {
        console.log(`  - ${node.kind}: ${node.title}`);
      });
    }

    if (report.dangling.count > 0) {
      console.log(`\n⚠ Dangling edges: ${report.dangling.count}`);
      report.dangling.examples.forEach(edge => {
        console.log(`  - ${edge.from} → ${edge.to}`);
      });
    }

    if (report.lastModified.length > 0) {
      console.log(`\nRecent activity:`);
      report.lastModified.forEach(item => {
        const date = new Date(item.updated_at).toLocaleString();
        console.log(`  - ${item.title.substring(0, 40).padEnd(40)} (${date})`);
      });
    }

    if (report.hubs.length > 0) {
      console.log(`\nMost connected nodes:`);
      report.hubs.forEach(hub => {
        console.log(`  - ${hub.title.substring(0, 35).padEnd(35)} (${hub.edge_count} edges)`);
      });
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Monitor failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: link
// Create semantic bridges between Code Graph and Knowledge Graph.
// ---------------------------------------------------------------------------

async function runLink(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  // Ensure bridge collections exist
  try {
    const bridgeResult = await ensureBridgeEdges(db);
    if (!options.json && (bridgeResult.created.length > 0 || bridgeResult.existing.length > 0)) {
      console.log(`Bridge edges ready: ${bridgeResult.created.length} created, ${bridgeResult.existing.length} existing`);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'ensureBridges', error: err.message }));
    } else {
      console.error(`Failed to ensure bridge edges: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    let result;

    // Manual link creation
    if (options.intentFile) {
      // Link Intent → File: --intent-file intent-id file-path
      const [intentId, filePath] = options.intentFile.split(':');
      result = await linkIntentToFile(db, intentId, filePath, { provenance: options.provenance || 'cli' });
      if (!options.json) console.log(`Linked Intent ${intentId} → File ${filePath}`);
    } else if (options.decisionSymbol) {
      // Link Decision → Symbol: --decision-symbol decision-id symbol-name
      const [decisionId, symbolName] = options.decisionSymbol.split(':');
      result = await linkDecisionToSymbol(db, decisionId, symbolName, { provenance: options.provenance || 'cli' });
      if (!options.json) console.log(`Linked Decision ${decisionId} → Symbol ${symbolName}`);
    } else if (options.getBridges) {
      // Get bridges FROM entity
      result = await getBridgesFromEntity(db, options.getBridges);
      if (!options.json) console.log(`Bridges from ${options.getBridges}:`);
    } else {
      if (!options.json) console.error('No link operation specified. Use --help for options.');
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify({ ok: true, result }));
    } else if (result && !options.getBridges) {
      console.log(`Link created: ${result._id}`);
    } else if (options.getBridges) {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Link operation failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: bridge-seed
// Seed semantic bridges between entities (Intent → Goal, Goal hierarchy).
// ---------------------------------------------------------------------------

async function runBridgeSeed(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    if (!options.json) console.log(`Seeding semantic bridges (Phase 2)...`);

    const { results, total } = await seedBridges(db);

    if (options.json) {
      console.log(JSON.stringify({ ok: true, results, total }));
    } else {
      console.log(`\nBridge seeding complete:`);
      console.log(`  Phase 2.1 (Intent → Goal): ${results.phase_2_1.edges_created} edges`);
      console.log(`  Phase 2.2 (Goal hierarchy): ${results.phase_2_2.edges_created} edges`);
      console.log(`  Total: ${total.edges_created} edges created`);
      if (total.errors > 0) console.log(`  Errors: ${total.errors}`);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Bridge seed failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: gap-analysis
// Identify missing relationships and entities needed for full semantic graph.
// ---------------------------------------------------------------------------

async function runGapAnalysisCmd(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    if (!options.json) console.log(`Analyzing graph gaps (Phase 3)...`);

    const { results, summary } = await runGapAnalysis(db);

    if (options.json) {
      console.log(JSON.stringify({ ok: true, results, summary }));
    } else {
      console.log(`\nGap Analysis Report:`);
      console.log(`\n  Intent → Goal relationships:`);
      console.log(`    Total intents: ${results.intent_goal_gaps.intents_total}`);
      console.log(`    With goals: ${results.intent_goal_gaps.intents_with_goals}`);
      console.log(`    Missing goals: ${results.intent_goal_gaps.gaps}`);
      if (results.intent_goal_gaps.intents_missing_goals.length > 0) {
        console.log(`    Details:`);
        results.intent_goal_gaps.intents_missing_goals.forEach(i => {
          console.log(`      - ${i.id}: ${i.title}`);
        });
      }

      console.log(`\n  Goal → Decision relationships:`);
      console.log(`    Total goals: ${results.goal_decision_gaps.goals_total}`);
      console.log(`    Direct decisions: ${results.goal_decision_gaps.goals_with_direct_decisions}`);
      console.log(`    Inherited from parent: ${results.goal_decision_gaps.goals_with_inherited_decisions}`);
      console.log(`    Total with constraints: ${results.goal_decision_gaps.goals_with_direct_decisions + results.goal_decision_gaps.goals_with_inherited_decisions}`);
      console.log(`    Missing decisions: ${results.goal_decision_gaps.gaps}`);

      console.log(`\n  Principle → Code relationships:`);
      console.log(`    Total principles: ${results.principle_code_gaps.principles_total}`);
      console.log(`    Linked to code: ${results.principle_code_gaps.principles_linked_to_code}`);
      console.log(`    Unlinked: ${results.principle_code_gaps.gaps}`);

      console.log(`\n  Orphaned nodes (no edges):`);
      console.log(`    Intents: ${results.orphaned_detail.intents_orphaned.length}`);
      console.log(`    Goals: ${results.orphaned_detail.goals_orphaned.length}`);
      console.log(`    Principles: ${results.orphaned_detail.principles_orphaned.length}`);
      console.log(`    Documents: ${results.orphaned_detail.documents_orphaned.length}`);
      console.log(`    Total: ${results.orphaned_detail.total_orphaned}`);

      console.log(`\n  Summary:`);
      console.log(`    Total gaps: ${summary.total_gaps}`);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Gap analysis failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: seed-decisions
// Extract Decision entities from architecture ADRs (Phase 4.1).
// ---------------------------------------------------------------------------

async function runSeedDecisions(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    if (!options.json) console.log(`Seeding Decision entities from ADRs (Phase 4.1)...`);

    const stats = await seedDecisions(db);

    if (options.json) {
      console.log(JSON.stringify({ ok: true, stats }));
    } else {
      console.log(`\nDecision seeding complete:`);
      console.log(`  Decisions created: ${stats.decisions_created}`);
      console.log(`  Edges created: ${stats.edges_created}`);
      if (stats.errors > 0) console.log(`  Errors: ${stats.errors}`);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Decision seed failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: seed-document-bridges
// Create Intent → Document edges by matching file references (Phase 4.2).
// ---------------------------------------------------------------------------

async function runSeedDocumentBridgesCmd(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    if (!options.json) console.log(`Seeding document bridges from intent file references (Phase 4.2)...`);

    const stats = await seedDocumentBridges(db);

    if (options.json) {
      console.log(JSON.stringify({ ok: true, stats }));
    } else {
      console.log(`\nDocument bridges seeding complete:`);
      console.log(`  Intents processed: ${stats.intents_processed}`);
      console.log(`  Files referenced: ${stats.files_referenced}`);
      console.log(`  Bridges created: ${stats.bridges_created}`);
      if (stats.unmatched_files.length > 0) {
        console.log(`  Unmatched files: ${stats.unmatched_files.length}`);
        if (stats.unmatched_files.length <= 10) {
          stats.unmatched_files.forEach(u => {
            console.log(`    - ${u.intent_id}: ${u.file_path}`);
          });
        }
      }
      if (stats.errors > 0) console.log(`  Errors: ${stats.errors}`);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Document bridges seed failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: seed-semantic-document-bridges
// Create Intent → Document edges using semantic keyword matching.
// ---------------------------------------------------------------------------

async function runSeedSemanticDocumentBridgesCmd(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    if (!options.json) console.log(`Seeding semantic document bridges (Problem 2 solution)...`);

    const stats = await seedSemanticDocumentBridges(db);

    if (options.json) {
      console.log(JSON.stringify({ ok: true, stats }));
    } else {
      console.log(`\nSemantic document bridges seeding complete:`);
      console.log(`  Intents processed: ${stats.intents_processed}`);
      console.log(`  Keywords extracted: ${stats.keywords_extracted}`);
      console.log(`  Documents matched: ${stats.documents_matched}`);
      console.log(`  Bridges created: ${stats.bridges_created}`);
      if (stats.errors > 0) console.log(`  Errors: ${stats.errors}`);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Semantic document bridges seed failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: seed-synthetic-decisions
// Create synthetic decisions for System Goals without ADRs (Problem 1).
// ---------------------------------------------------------------------------

async function runSeedSyntheticDecisionsCmd(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    if (!options.json) console.log(`Seeding synthetic decisions for System Goals (Problem 1 solution)...`);

    const stats = await seedSyntheticDecisions(db);

    if (options.json) {
      console.log(JSON.stringify({ ok: true, stats }));
    } else {
      console.log(`\nSynthetic decisions seeding complete:`);
      console.log(`  Decisions created: ${stats.decisions_created}`);
      console.log(`  Edges created: ${stats.edges_created}`);
      if (stats.errors > 0) console.log(`  Errors: ${stats.errors}`);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Synthetic decisions seed failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: seed-lessons
// Capture lessons learned from Phase 4 work (Phase 4.4).
// ---------------------------------------------------------------------------

async function runSeedLessonsCmd(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    if (!options.json) console.log(`Seeding lessons from Phase 4 transformation (Phase 4.4)...`);

    const stats = await seedLessons(db);

    if (options.json) {
      console.log(JSON.stringify({ ok: true, stats }));
    } else {
      console.log(`\nLessons seeding complete:`);
      console.log(`  Lessons created: ${stats.lessons_created}`);
      console.log(`  Edges created: ${stats.edges_created}`);
      if (stats.errors > 0) console.log(`  Errors: ${stats.errors}`);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Lessons seed failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: seed
// Seed governance entities (Goals, Principles) from svfactory docs.
// ---------------------------------------------------------------------------

async function runSeed(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    if (!options.json) console.log(`Seeding governance entities from svfactory/...`);

    const stats = await seedGovernanceEntities(db);

    if (options.json) {
      console.log(JSON.stringify({ ok: true, stats }));
    } else {
      console.log(`\nSeeding complete:`);
      console.log(`  Principles created: ${stats.principles_created}`);
      console.log(`  Goals created:      ${stats.goals_created}`);
      if (stats.errors > 0) console.log(`  Errors:             ${stats.errors}`);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Seed failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: doctor (Phase 6 Track C)
// Health check: validation + coverage + performance metrics.
// ---------------------------------------------------------------------------

async function runDoctor(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    if (!options.json) {
      console.log('Knowledge Graph Health Check');
      console.log('============================\n');
    }

    // 1. Run validation
    const validation = await validateGraph(db);

    // 2. Get metrics
    const metrics = metricsCollector.getMetrics();

    // 3. Compile report
    const report = {
      ok: true,
      timestamp: new Date().toISOString(),
      status: validation.summary.total_issues === 0 ? 'healthy' : 'issues_found',
      validation: {
        summary: validation.summary,
        checks: validation.checks,
      },
      coverage: validation.coverage,
      performance: {
        cache_hit_rate_percent: metrics.cacheStats.hit_rate_percent,
        total_cache_hits: metrics.cacheStats.hits,
        total_cache_misses: metrics.cacheStats.misses,
        metrics_duration_ms: metrics.duration_ms,
      },
    };

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      // Text output
      console.log(`Status: ${report.status === 'healthy' ? '✓ HEALTHY' : '✗ ISSUES FOUND'}`);
      console.log(`Timestamp: ${report.timestamp}\n`);

      console.log('Validation Summary:');
      console.log(`  Total Issues: ${validation.summary.total_issues}`);
      console.log(`  Critical: ${validation.summary.critical}, High: ${validation.summary.high}, Medium: ${validation.summary.medium}`);
      console.log(`  Checks Passed: ${validation.summary.passed}\n`);

      console.log('Entity Coverage:');
      for (const [coll, count] of Object.entries(report.coverage.collections)) {
        console.log(`  ${coll}: ${count}`);
      }
      console.log('');

      console.log('Edge Coverage:');
      for (const [coll, count] of Object.entries(report.coverage.edges)) {
        console.log(`  ${coll}: ${count}`);
      }
      console.log('');

      console.log('Performance Metrics:');
      console.log(`  Cache Hit Rate: ${report.performance.cache_hit_rate_percent}%`);
      console.log(`  Cache Hits: ${report.performance.total_cache_hits}`);
      console.log(`  Cache Misses: ${report.performance.total_cache_misses}`);

      if (validation.checks.length > 0) {
        console.log('\nIssues Detected:');
        validation.checks.forEach(check => {
          console.log(`  [${check.severity.toUpperCase()}] ${check.check}`);
          console.log(`    Count: ${check.count}`);
          if (check.examples && check.examples.length > 0) {
            console.log(`    Example: ${JSON.stringify(check.examples[0])}`);
          }
        });
      }
    }

    // Exit code
    if (options.strict && validation.summary.total_issues > 0) {
      process.exit(1);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Doctor check failed: ${err.message}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: seed-principle-code-links (Phase 6 Track A)
// Link principles to code symbols via keyword matching.
// ---------------------------------------------------------------------------

async function runSeedPrincipleCodeLinksCmd(options) {
  let db;
  try {
    db = await connect();
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'connect', error: err.message }));
    } else {
      console.error(`Connection failed: ${err.message}`);
    }
    process.exit(1);
  }

  try {
    if (!options.json) console.log(`Seeding Principle→Code links (Phase 6 Track A)...`);

    const stats = await seedPrincipleCodeLinks(db, { verbose: !options.json });

    if (options.json) {
      console.log(JSON.stringify({ ok: true, stats }));
    } else {
      console.log(`\nPrinciple→Code linking complete:`);
      console.log(`  Principles processed: ${stats.principles_processed}`);
      console.log(`  Links created: ${stats.links_created}`);
      console.log(`  No matches: ${stats.no_matches}`);
      if (stats.errors.length > 0) console.log(`  Errors: ${stats.errors.length}`);
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Principle→Code seeding failed: ${err.message}`);
    }
    process.exit(1);
  }
}

async function runKnowledgeGraph(args) {
  let options;
  try {
    options = parseArgs(args);
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }

  if (options.sub === 'help')                              { printHelp();                                  return; }
  if (options.sub === 'init')                              { await runInit(options);                       return; }
  if (options.sub === 'status')                            { await runStatus(options);                     return; }
  if (options.sub === 'ingest')                            { await runIngest(options, process.cwd());     return; }
  if (options.sub === 'query')                             { await runQuery(options);                      return; }
  if (options.sub === 'validate')                          { await runValidate(options);                   return; }
  if (options.sub === 'monitor')                           { await runMonitor(options);                    return; }
  if (options.sub === 'seed')                              { await runSeed(options);                       return; }
  if (options.sub === 'bridge-seed')                       { await runBridgeSeed(options);                 return; }
  if (options.sub === 'gap-analysis')                      { await runGapAnalysisCmd(options);             return; }
  if (options.sub === 'seed-decisions')                    { await runSeedDecisions(options);              return; }
  if (options.sub === 'seed-synthetic-decisions')          { await runSeedSyntheticDecisionsCmd(options);  return; }
  if (options.sub === 'seed-document-bridges')             { await runSeedDocumentBridgesCmd(options);     return; }
  if (options.sub === 'seed-semantic-document-bridges')    { await runSeedSemanticDocumentBridgesCmd(options); return; }
  if (options.sub === 'seed-lessons')                      { await runSeedLessonsCmd(options);             return; }
  if (options.sub === 'seed-principle-code-links')         { await runSeedPrincipleCodeLinksCmd(options);  return; } // Phase 6
  if (options.sub === 'doctor')                            { await runDoctor(options);                     return; } // Phase 6 Track C
  if (options.sub === 'link')                              { await runLink(options);                       return; }

  console.error(`Unknown subcommand "${options.sub}". Run "kbx knowledge-graph help" for usage.`);
  process.exit(1);
}

module.exports = { runKnowledgeGraph, parseArgs };
