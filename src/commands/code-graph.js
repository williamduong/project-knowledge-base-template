'use strict';

// ---------------------------------------------------------------------------
// kbx code-graph — Code Graph CLI (Phase 0 + 1)
// Subcommands: init | status | ingest | help
// ---------------------------------------------------------------------------

const path = require('path');
const { connect, ping, resolveConfig, ensureSchema, getCollectionStats, ingestDirectory, ingestGit } = require('../graph-db/code');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = { sub: null, json: false, path: null, verbose: false, limit: null, since: null, branch: null };
  const rest = [];

  for (let i = 0; i < (args || []).length; i++) {
    const arg = args[i];
    if (arg === '--json')    { options.json = true; continue; }
    if (arg === '--verbose') { options.verbose = true; continue; }
    if (arg.startsWith('--path='))   { options.path   = arg.slice('--path='.length);   continue; }
    if (arg.startsWith('--limit='))  { options.limit  = parseInt(arg.slice('--limit='.length), 10); continue; }
    if (arg.startsWith('--since='))  { options.since  = arg.slice('--since='.length);  continue; }
    if (arg.startsWith('--branch=')) { options.branch = arg.slice('--branch='.length); continue; }
    if (arg === '--path'   || arg === '-p') { options.path   = args[++i]; continue; }
    if (arg === '--limit'  || arg === '-n') { options.limit  = parseInt(args[++i], 10); continue; }
    if (!arg.startsWith('--')) { rest.push(arg); continue; }
    throw new Error(`Unknown code-graph option "${arg}". Run "kbx code-graph help" for usage.`);
  }

  options.sub = rest[0] || 'help';
  return options;
}

// ---------------------------------------------------------------------------
// Subcommand: init
// Connects to ArangoDB, creates the database if needed, runs ensureSchema().
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
  console.log(`Code graph schema ready — database "${cfg.database}" at ${cfg.url}`);
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
  console.log('Collection            Exists   Count');
  console.log('--------------------  ------   -----');
  for (const s of stats) {
    const exists = s.exists ? 'yes' : 'NO';
    const count  = s.exists ? String(s.count) : '-';
    console.log(`${s.collection.padEnd(22)}${exists.padEnd(9)}${count}`);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: ingest
// ---------------------------------------------------------------------------

async function runIngest(options, cwd) {
  const rootDir = options.path ? path.resolve(cwd, options.path) : cwd;

  if (!options.json) {
    console.log(`Ingesting JS/TS files from: ${rootDir}`);
    console.log('Connecting to ArangoDB …');
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

  const tick = options.verbose && !options.json
    ? ({ file, index, total }) => process.stdout.write(`\r  [${index}/${total}] ${file.slice(-60).padEnd(60)}`)
    : null;

  let result;
  try {
    result = await ingestDirectory({ db, rootDir, workspaceRoot: cwd, onProgress: tick });
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'ingest', error: err.message }));
    } else {
      console.error(`Ingest failed: ${err.message}`);
    }
    process.exit(1);
  }

  if (options.verbose && !options.json) process.stdout.write('\n');

  const { stats } = result;
  if (options.json) {
    console.log(JSON.stringify({ ok: true, path: rootDir, ...stats }));
    return;
  }

  console.log(`\nIngest complete:`);
  console.log(`  files:    ${stats.files}   (skipped: ${stats.skipped})`);
  console.log(`  symbols:  ${stats.symbols}`);
  console.log(`  imports:  ${stats.imports}`);
  console.log(`  defines:  ${stats.defines}`);
  console.log(`  exports:  ${stats.exports}`);
  console.log(`  calls:    ${stats.calls}   (intra-file only)`);
  console.log(`  inherits: ${stats.inherits}`);
}

// ---------------------------------------------------------------------------
// Subcommand: ingest-git
// ---------------------------------------------------------------------------

async function runIngestGit(options, cwd) {
  const repoRoot = options.path ? path.resolve(cwd, options.path) : cwd;

  if (!options.json) {
    const parts = ['Ingesting git log from:', repoRoot];
    if (options.limit)  parts.push(`(limit: ${options.limit})`);
    if (options.since)  parts.push(`(since: ${options.since})`);
    if (options.branch) parts.push(`(branch: ${options.branch})`);
    console.log(parts.join(' '));
    console.log('Connecting to ArangoDB …');
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

  const gitOptions = {
    limit:  options.limit  || null,
    since:  options.since  || null,
    branch: options.branch || null,
    onProgress: ({ step, commits }) => {
      if (!options.json && options.verbose) console.log(`  git: ${step} — ${commits} commits`);
    },
  };

  let result;
  try {
    result = await ingestGit({ db, repoRoot, options: gitOptions });
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, step: 'ingest-git', error: err.message }));
    } else {
      console.error(`Git ingest failed: ${err.message}`);
    }
    process.exit(1);
  }

  const { stats } = result;
  if (options.json) {
    console.log(JSON.stringify({ ok: true, repoRoot, ...stats }));
    return;
  }

  console.log('\nGit ingest complete:');
  console.log(`  commits:      ${stats.commits}`);
  console.log(`  hunks:        ${stats.hunks}`);
  console.log(`  changed_in:   ${stats.changedIn}`);
  console.log(`  contains_hunk:${stats.containsHunk}`);
  if (stats.fileStubs > 0) {
    console.log(`  file stubs:   ${stats.fileStubs}  (deleted/renamed files not in AST ingestion)`);
  }
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
kbx code-graph — ArangoDB Code Graph management (Phase 0 + 1)

Usage:
  kbx code-graph init              [--json]               Init DB + schema.
  kbx code-graph status            [--json]               Check connection + collection counts.
  kbx code-graph ingest     [--path=<dir>] [--verbose] [--json]               Parse JS/TS files → ArangoDB.
  kbx code-graph ingest-git [--path=<repo>] [--limit=<n>] [--since=<date>] [--branch=<ref>] [--json]
                                                                              Parse git log → ArangoDB.
  kbx code-graph help                                     Show this message.

Options for ingest:
  --path=<dir>   Directory to scan (default: current working directory)
  --verbose      Print progress per file
  --json         Machine-readable output

Config (env vars):
  KBX_ARANGODB_URL    ArangoDB server URL     (default: http://localhost:8529)
  KBX_ARANGODB_DB     Database name           (default: kbx_code_graph)
  KBX_ARANGODB_USER   Username                (default: root)
  KBX_ARANGODB_PASS   Password                (default: empty)

Named graph:  code_graph
Vertex collections:  cg_files, cg_symbols, cg_commits, cg_hunks
Edge collections:    cg_imports, cg_defines, cg_exports, cg_calls,
                     cg_inherits, cg_changed_in, cg_contains_hunk
  `.trim());
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

async function runCodeGraph(args) {
  let options;
  try {
    options = parseArgs(args);
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }

  if (options.sub === 'help') { printHelp(); return; }

  if (options.sub === 'init')   { await runInit(options);             return; }
  if (options.sub === 'status') { await runStatus(options);           return; }
  if (options.sub === 'ingest')     { await runIngest(options, process.cwd());    return; }
  if (options.sub === 'ingest-git') { await runIngestGit(options, process.cwd()); return; }

  console.error(`Unknown subcommand "${options.sub}". Run "kbx code-graph help" for usage.`);
  process.exit(1);
}

module.exports = { runCodeGraph, parseArgs };
