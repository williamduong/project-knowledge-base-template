'use strict';

// ---------------------------------------------------------------------------
// kbx knowledge-graph — Knowledge Graph CLI (Phase 3 — init, status, help)
// Subcommands: init | status | help
//
// Phase 3: schema creation only. Phase 4+ adds ingest/extraction.
// ---------------------------------------------------------------------------

const path = require('path');
const { connect, ping, resolveConfig, ensureSchema, getCollectionStats } = require('../graph-db/knowledge');
const { createProvider } = require('../llm');
const { ingestKnowledgeGraph } = require('../graph-db/knowledge/kg-ingester');
const { getEntity, listEntities, getRelationships, traversePath, getImpactChain, searchEntities } = require('../graph-db/knowledge/query');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = { sub: null, json: false, verbose: false, path: null, entity: null, search: null, types: [], impact: null, path: null, from: null, to: null, depth: 3, list: null, limit: 100, offset: 0 };
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

  if (options.json) {
    console.log(JSON.stringify({ ok: true, url: cfg.url, database: cfg.database, ...result }));
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
kbx knowledge-graph — ArangoDB Knowledge Graph management (Phase 3-5)

Usage:
  kbx knowledge-graph init      [--json]                  Init DB + KG schema (10 vertex + 14 edge types).
  kbx knowledge-graph status    [--json]                  Check connection + collection counts.
  kbx knowledge-graph ingest    [--path=<dir>] [--verbose] [--json]
                                                           Extract Intent/Goal/Decision from KB markdown → ArangoDB.
  kbx knowledge-graph query     [--entity=TYPE:ID] [--search=QUERY] [--impact=ID] [--json]
                                                           Query entities, relationships, impact chains.
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
  --json                        JSON output

Entities (vertices):
  Intent, Goal, Milestone, Decision, Principle, Risk, Lesson, Version, Document, Agent

Relationships (edges):
  implements, has_milestone, has_phase, follows, decides_for, threatens, releases,
  learned_from, describes, authored_by, created_by, depends_on, blocks, related_to

Named graph: knowledge_graph

Config (env vars):
  KBX_ARANGODB_URL    ArangoDB server URL     (default: http://localhost:8529)
  KBX_ARANGODB_DB     Database name           (default: kbx_code_graph)
  KBX_ARANGODB_USER   Username                (default: root)
  KBX_ARANGODB_PASS   Password                (default: empty)

Phase 3: Schema creation. Phase 4: Extraction. Phase 5: Query API.
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

async function runKnowledgeGraph(args) {
  let options;
  try {
    options = parseArgs(args);
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }

  if (options.sub === 'help')   { printHelp();                              return; }
  if (options.sub === 'init')   { await runInit(options);                   return; }
  if (options.sub === 'status') { await runStatus(options);                 return; }
  if (options.sub === 'ingest') { await runIngest(options, process.cwd()); return; }
  if (options.sub === 'query')  { await runQuery(options);                  return; }

  console.error(`Unknown subcommand "${options.sub}". Run "kbx knowledge-graph help" for usage.`);
  process.exit(1);
}

module.exports = { runKnowledgeGraph, parseArgs };
