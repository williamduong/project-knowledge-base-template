'use strict';

const fs   = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { exportGraph, checkGraph, buildGraphData } = require('../lib/graph');
const { exportGraphIngest } = require('../lib/rule-lifecycle');
const { listIntentRecords } = require('../lib/intent');

const VALID_LANES = new Set(['rules', 'intents', 'source']);

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = {
    sub: null,
    output: null,
    lane: null,
    json: false,
    cwd: null,
  };

  const rest = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
    if (arg === '--json') { options.json = true; continue; }
    if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length).trim();
      continue;
    }
    if (arg.startsWith('--lane=')) {
      options.lane = arg.slice('--lane='.length).trim();
      continue;
    }
    if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
      continue;
    }
    if (arg === '--lane') {
      options.lane = args[++i];
      continue;
    }
    if (arg.startsWith('--cwd=')) {
      options.cwd = arg.slice('--cwd='.length).trim();
      continue;
    }
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    throw new Error(`Unknown graph option "${arg}". Run "kb graph help" for usage.`);
  }

  if (rest.length === 0) {
    throw new Error('kb graph requires a subcommand: export | lane | check | help');
  }
  options.sub = rest[0];

  if (options.sub === 'lane' || options.sub === 'export-lane') {
    options.sub = 'export';
    if (!options.lane) {
      options.lane = rest[1] || null;
    }
  } else if (options.sub === 'export' && !options.lane && rest[1]) {
    options.lane = rest[1];
  }

  if (options.lane && !VALID_LANES.has(options.lane)) {
    throw new Error(`Invalid lane "${options.lane}". Allowed: rules, intents, source`);
  }

  return options;
}

// ---------------------------------------------------------------------------
// Subcommand: export
// ---------------------------------------------------------------------------

function resolveLaneOutputPath(contentRoot, lane) {
  return path.join(contentRoot, '.kb', 'graph-ingest', `${lane}.json`);
}

function parseDependsOn(meta) {
  const raw = meta && meta.depends_on;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string') {
    return raw.split(',').map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

function buildIntentsLanePayload(contentRoot) {
  const records = listIntentRecords(contentRoot);
  const nodes = [];
  const edges = [];

  for (const record of records) {
    const intentId = String(record.id || record.folderName || 'unknown');
    nodes.push({
      id: `intent:${intentId}`,
      type: 'Intent',
      properties: {
        id: intentId,
        slug: record.slug || null,
        scope: record.scope,
        lifecycle: record.lifecycle,
        close_type: record.closeType || null,
      },
    });

    const dependencies = parseDependsOn(record.meta || {});
    for (const dep of dependencies) {
      edges.push({
        type: 'INTENT_DEPENDS_ON',
        from: `intent:${dep}`,
        to: `intent:${intentId}`,
        properties: {
          dependency: dep,
        },
      });
    }
  }

  return {
    format: 'graph-ingest-v1',
    lane: 'intents',
    exported_at: new Date().toISOString(),
    nodes,
    edges,
    stats: {
      intent_count: nodes.length,
      dependency_count: edges.length,
      node_count: nodes.length,
      edge_count: edges.length,
    },
  };
}

function buildSourceLanePayload(contentRoot) {
  const { entities, relations } = buildGraphData(contentRoot);
  const nodes = entities.map((entity) => ({
    id: entity.id,
    type: 'SourceEntity',
    properties: {
      kind: entity.kind,
      source_path: entity.source_path,
      status: entity.status,
      updated_at: entity.updated_at,
    },
  }));

  const edges = relations.map((relation) => ({
    type: relation.type,
    from: relation.from_id,
    to: relation.to_id,
    properties: {
      relation_id: relation.id,
      direction: relation.direction,
      source: relation.source,
      updated_at: relation.updated_at,
    },
  }));

  return {
    format: 'graph-ingest-v1',
    lane: 'source',
    exported_at: new Date().toISOString(),
    nodes,
    edges,
    stats: {
      entity_count: entities.length,
      relation_count: relations.length,
      node_count: nodes.length,
      edge_count: edges.length,
    },
  };
}

function buildLanePayload(workspaceRoot, contentRoot, lane) {
  if (lane === 'rules') {
    const payload = exportGraphIngest(workspaceRoot, { includeHistory: true });
    return { ...payload, lane: 'rules' };
  }
  if (lane === 'intents') {
    return buildIntentsLanePayload(contentRoot);
  }
  if (lane === 'source') {
    return buildSourceLanePayload(contentRoot);
  }
  throw new Error(`Unsupported lane "${lane}"`);
}

function writeLanePayload(outputPath, payload) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
}

function runExport(workspaceRoot, contentRoot, options) {
  if (options.lane) {
    const outputPath = options.output ? path.resolve(options.output) : resolveLaneOutputPath(contentRoot, options.lane);
    const payload = buildLanePayload(workspaceRoot, contentRoot, options.lane);
    writeLanePayload(outputPath, payload);

    if (options.json) {
      console.log(JSON.stringify({
        ok: true,
        command: 'kb graph export',
        format: payload.format,
        lane: options.lane,
        output: outputPath,
        stats: payload.stats,
      }));
      return;
    }

    const relOut = path.relative(process.cwd(), outputPath);
    console.log(`Graph ingest exported (${options.lane}) -> ${relOut}`);
    return;
  }

  const { entities, relations, jsonl } = exportGraph(contentRoot, options.output || null);

  if (options.output) {
    const relOut = path.relative(process.cwd(), options.output);
    if (options.json) {
      console.log(JSON.stringify({
        ok: true,
        output: options.output,
        entity_count: entities.length,
        relation_count: relations.length,
      }));
    } else {
      console.log(`Graph exported: ${entities.length} entities, ${relations.length} relations → ${relOut}`);
    }
  } else {
    // Stdout mode: print JSONL directly
    process.stdout.write(jsonl);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: check
// ---------------------------------------------------------------------------

function runCheck(contentRoot, options) {
  const result = checkGraph(contentRoot);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Graph check: ${result.entity_count} entities, ${result.relation_count} relations`);

  if (result.issue_count === 0) {
    console.log('✓ No issues found.');
    return;
  }

  console.log(`\n${result.issue_count} issue(s) found:\n`);
  for (const issue of result.issues) {
    const sev = issue.severity === 'error' ? '[ERROR]' : '[WARN] ';
    console.log(`${sev} [${issue.check_id}]`);
    console.log(`        ${issue.message}`);
    console.log(`        Evidence: ${issue.evidence_path}`);
    console.log(`        Fix:      ${issue.suggested_fix}`);
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
kb graph — graph export and consistency check (v1.9 mini)

Usage:
  kb graph export [--output=<path>] [--lane=<rules|intents|source>] [--json]
  kb graph export <rules|intents|source> [--output=<path>] [--json]
  kb graph lane <rules|intents|source> [--output=<path>] [--json]
  kb graph check  [--json]

Subcommands:
  export    Export KB entities and relations as JSONL. Writes to stdout unless
            --output=<path> is given. When --lane is set, exports graph-ingest-v1
            JSON payload to file. Default path: knowledge-base/.kb/graph-ingest/<lane>.json.
  check     Run basic consistency checks:
              - missing node reference (broken relation target)
              - invalid relation type (outside allowed dictionary)
              - duplicate entity id
  help      Show this message.

Options:
  --output=<path>   Write JSONL to file instead of stdout.
  --lane=<name>     Export lane payload: rules | intents | source.
  --json            Machine-readable JSON output (for check) or summary JSON (for export).
  `.trim());
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

function runGraph(args, { workspaceRoot }) {
  let options;
  try {
    options = parseArgs(args);
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }

  if (options.sub === 'help') {
    printHelp();
    return;
  }

  const resolvedRoot = options.cwd
    ? path.resolve(options.cwd)
    : (workspaceRoot || process.cwd());

  let ctx;
  try {
    ctx = resolveExistingState({ workspaceRoot: resolvedRoot });
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }

  const { contentRoot } = ctx;

  try {
    if (options.sub === 'export') {
      runExport(resolvedRoot, contentRoot, options);
    } else if (options.sub === 'check') {
      runCheck(contentRoot, options);
    } else {
      console.error(`Unknown subcommand "${options.sub}". Run "kb graph help" for usage.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }
}

module.exports = { runGraph, parseArgs };
