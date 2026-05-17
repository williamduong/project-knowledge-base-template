'use strict';

const { resolveExistingState } = require('../lib/context');
const {
  GATE_TYPES,
  GATE_SCOPES,
  GATE_PRIORITIES,
  listIntentGates,
  addIntentGate,
  updateIntentGate,
} = require('../lib/gates');

function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(args = []) {
  const options = {
    sub: null,
    gateId: null,
    intentId: null,
    json: false,
    includeResolved: false,
    actor: 'human',
    action: null,
    why: null,
    inputsNeeded: [],
    expectedOutput: '',
    blocking: [],
    priority: 'high',
    output: '',
    reason: null,
  };

  const rest = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') { options.json = true; continue; }
    if (arg === '--all-statuses') { options.includeResolved = true; continue; }
    if (arg === '--intent' && args[i + 1]) { options.intentId = args[++i]; continue; }
    if (arg.startsWith('--intent=')) { options.intentId = arg.slice('--intent='.length).trim(); continue; }
    if (arg.startsWith('--actor=')) { options.actor = arg.slice('--actor='.length).trim(); continue; }
    if (arg.startsWith('--action=')) { options.action = arg.slice('--action='.length).trim(); continue; }
    if (arg.startsWith('--why=')) { options.why = arg.slice('--why='.length).trim(); continue; }
    if (arg.startsWith('--input=')) { options.inputsNeeded.push(arg.slice('--input='.length).trim()); continue; }
    if (arg.startsWith('--inputs=')) { options.inputsNeeded.push(...parseCsv(arg.slice('--inputs='.length))); continue; }
    if (arg.startsWith('--expected-output=')) { options.expectedOutput = arg.slice('--expected-output='.length).trim(); continue; }
    if (arg.startsWith('--blocking=')) { options.blocking = parseCsv(arg.slice('--blocking='.length)); continue; }
    if (arg.startsWith('--priority=')) { options.priority = arg.slice('--priority='.length).trim(); continue; }
    if (arg.startsWith('--output=')) { options.output = arg.slice('--output='.length).trim(); continue; }
    if (arg.startsWith('--reason=')) { options.reason = arg.slice('--reason='.length).trim(); continue; }
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    throw new Error(`Unknown gates option "${arg}". Run "kbx gates help" for usage.`);
  }

  if (rest.length === 0) {
    throw new Error('kbx gates requires a subcommand: list | add | done | skip | help');
  }

  options.sub = rest[0];
  if (options.sub === 'done' || options.sub === 'skip') {
    if (rest.length < 2) {
      throw new Error(`kbx gates ${options.sub} requires a gate ID.`);
    }
    options.gateId = rest[1];
  }

  if (options.sub === 'add' || options.sub === 'done' || options.sub === 'skip') {
    if (!options.intentId) {
      throw new Error(`kbx gates ${options.sub} requires --intent <id>.`);
    }
  }

  if (options.sub === 'add' && !GATE_PRIORITIES.includes(options.priority)) {
    throw new Error(`kbx gates add: invalid priority "${options.priority}". Supported: ${GATE_PRIORITIES.join(', ')}`);
  }

  if (options.sub === 'skip' && !options.reason) {
    throw new Error('kbx gates skip requires --reason="...".');
  }

  return options;
}

function printHelp() {
  console.log('kbx gates - intent-local human gate workflow');
  console.log('');
  console.log('Usage:');
  console.log('  kbx gates list [--intent <id>] [--all-statuses] [--json]');
  console.log('  kbx gates add --intent <id> --action="..." --why="..." [--input="..."] [--expected-output="..."] [--blocking=P1,P2] [--priority=low|medium|high] [--json]');
  console.log('  kbx gates done <HG-ID> --intent <id> [--output="..."] [--json]');
  console.log('  kbx gates skip <HG-ID> --intent <id> --reason="..." [--output="..."] [--json]');
  console.log('  kbx gates help');
  console.log('');
  console.log('Taxonomy:');
  console.log(`  gate_type: ${GATE_TYPES.join(', ')}`);
  console.log(`  scope: ${GATE_SCOPES.join(', ')}`);
  console.log('');
  console.log('Notes:');
  console.log('  This CLI surface owns intent-local human gates stored in gates.md.');
  console.log('  It does not provide a --skip-gates override for kbx intent apply.');
}

function printGateList(gates) {
  if (gates.length === 0) {
    console.log('No matching gates found.');
    return;
  }

  let currentIntent = null;
  for (const gate of gates) {
    if (gate.intentId !== currentIntent) {
      currentIntent = gate.intentId;
      console.log(currentIntent);
    }
    console.log(`  ${gate.id} · ${gate.status}  [${gate.priority}]  ${gate.action}`);
    console.log(`    actor=${gate.actor} gate_type=${gate.gate_type} scope=${gate.scope}`);
    if (gate.blocking && gate.blocking.length > 0) {
      console.log(`    blocking: ${gate.blocking.join(', ')}`);
    }
    if (gate.outputReceived && gate.outputReceived !== '—') {
      console.log(`    output: ${gate.outputReceived}`);
    }
    if (gate.skipReason) {
      console.log(`    skip_reason: ${gate.skipReason}`);
    }
  }
}

async function runGates({ args = [], cwd = process.cwd() } = {}) {
  const options = parseArgs(args);
  if (options.sub === 'help' || options.sub === '--help' || options.sub === '-h') {
    printHelp();
    return;
  }

  const ctx = resolveExistingState({ workspaceRoot: cwd });

  if (options.sub === 'list') {
    const gates = listIntentGates(ctx.contentRoot, {
      intentId: options.intentId,
      includeResolved: options.includeResolved,
    });
    if (options.json) {
      console.log(JSON.stringify({
        command: 'kbx gates list',
        intent_id: options.intentId || null,
        include_resolved: options.includeResolved,
        count: gates.length,
        gates,
      }, null, 2));
      return;
    }
    printGateList(gates);
    return;
  }

  if (options.sub === 'add') {
    const gate = addIntentGate(ctx.contentRoot, {
      intentId: options.intentId,
      actor: options.actor,
      action: options.action,
      why: options.why,
      inputsNeeded: options.inputsNeeded,
      expectedOutput: options.expectedOutput,
      blocking: options.blocking,
      priority: options.priority,
    });
    if (options.json) {
      console.log(JSON.stringify({
        command: 'kbx gates add',
        intent_id: options.intentId,
        gate,
      }, null, 2));
      return;
    }
    console.log(`Added ${gate.id} to intent "${options.intentId}".`);
    return;
  }

  if (options.sub === 'done') {
    const gate = updateIntentGate(ctx.contentRoot, {
      intentId: options.intentId,
      gateId: options.gateId,
      status: 'done',
      output: options.output,
    });
    if (options.json) {
      console.log(JSON.stringify({
        command: 'kbx gates done',
        intent_id: options.intentId,
        gate,
      }, null, 2));
      return;
    }
    console.log(`Marked ${options.gateId} done in intent "${options.intentId}".`);
    return;
  }

  if (options.sub === 'skip') {
    const gate = updateIntentGate(ctx.contentRoot, {
      intentId: options.intentId,
      gateId: options.gateId,
      status: 'skipped',
      output: options.output,
      reason: options.reason,
    });
    if (options.json) {
      console.log(JSON.stringify({
        command: 'kbx gates skip',
        intent_id: options.intentId,
        gate,
      }, null, 2));
      return;
    }
    console.log(`Marked ${options.gateId} skipped in intent "${options.intentId}".`);
    return;
  }

  throw new Error(`Unknown gates subcommand "${options.sub}". Run "kbx gates help" for usage.`);
}

module.exports = {
  parseArgs,
  printHelp,
  runGates,
};
