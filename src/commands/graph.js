'use strict';

const fs   = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { exportGraph, checkGraph } = require('../lib/graph');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = {
    sub: null,
    output: null,
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
    if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
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
    throw new Error('kb graph requires a subcommand: export | check | help');
  }
  options.sub = rest[0];
  return options;
}

// ---------------------------------------------------------------------------
// Subcommand: export
// ---------------------------------------------------------------------------

function runExport(contentRoot, options) {
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
  kb graph export [--output=<path>] [--json]
  kb graph check  [--json]

Subcommands:
  export    Export KB entities and relations as JSONL. Writes to stdout unless
            --output=<path> is given.
  check     Run basic consistency checks:
              - missing node reference (broken relation target)
              - invalid relation type (outside allowed dictionary)
              - duplicate entity id
  help      Show this message.

Options:
  --output=<path>   Write JSONL to file instead of stdout.
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
      runExport(contentRoot, options);
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
