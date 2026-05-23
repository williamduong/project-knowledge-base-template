'use strict';

// ---------------------------------------------------------------------------
// kbx knowledge-graph — Knowledge Graph CLI (Phase 3 — init, status, help)
// Subcommands: init | status | help
//
// Phase 3: schema creation only. Phase 4+ adds ingest/extraction.
// ---------------------------------------------------------------------------

const { connect, ping, resolveConfig, ensureSchema, getCollectionStats } = require('../graph-db/knowledge');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = { sub: null, json: false };
  const rest = [];

  for (let i = 0; i < (args || []).length; i++) {
    const arg = args[i];
    if (arg === '--json') { options.json = true; continue; }
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
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
kbx knowledge-graph — ArangoDB Knowledge Graph management (Phase 3)

Usage:
  kbx knowledge-graph init      [--json]    Init DB + KG schema (10 vertex + 14 edge types).
  kbx knowledge-graph status    [--json]    Check connection + collection counts.
  kbx knowledge-graph help                  Show this message.

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

Phase 3: Schema creation only. Phase 4+ adds extraction from KB markdown.
  `.trim());
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

async function runKnowledgeGraph(args) {
  let options;
  try {
    options = parseArgs(args);
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }

  if (options.sub === 'help')   { printHelp();              return; }
  if (options.sub === 'init')   { await runInit(options);   return; }
  if (options.sub === 'status') { await runStatus(options); return; }

  console.error(`Unknown subcommand "${options.sub}". Run "kbx knowledge-graph help" for usage.`);
  process.exit(1);
}

module.exports = { runKnowledgeGraph, parseArgs };
