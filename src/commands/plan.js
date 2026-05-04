const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');

function parseArgs(args) {
  const [subcommand = 'list', ...rest] = args;

  if (subcommand === 'add') {
    const text = rest.join(' ').trim();
    if (!text) {
      throw new Error('Usage: kb plan add "<description>" [--owner <name>] [--priority P0|P1|P2]');
    }

    const options = { subcommand: 'add', text, owner: 'knowledge-management', priority: 'P1' };
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '--owner' && rest[i + 1]) {
        options.owner = rest[i + 1];
        i++;
      } else if (rest[i] === '--priority' && rest[i + 1]) {
        options.priority = rest[i + 1];
        i++;
      }
    }

    // text is everything before first --flag
    const textEnd = rest.findIndex((r) => r.startsWith('--'));
    options.text = (textEnd === -1 ? rest : rest.slice(0, textEnd)).join(' ').trim();
    if (!options.text) {
      throw new Error('kb plan add requires a non-empty description.');
    }

    return options;
  }

  if (subcommand === 'list') {
    return { subcommand: 'list' };
  }

  throw new Error(`Unknown plan subcommand "${subcommand}". Use: kb plan add "<text>" | kb plan list`);
}

function resolvePlanPath(cwd) {
  const context = resolveExistingState({ workspaceRoot: cwd });
  const strategicPath = path.join(context.contentRoot, '00-start-here', 'strategic-backlog.md');
  const legacyPath = path.join(context.contentRoot, '00-start-here', 'finalization-plan.md');

  if (fs.existsSync(strategicPath)) {
    return strategicPath;
  }
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  // Default path for freshly initialized or not-yet-created queues.
  return strategicPath;
}

function nextId(content) {
  const matches = [...content.matchAll(/\|\s*(KB-\d+)\s*\|/g)];
  if (matches.length === 0) {
    return 'KB-100';
  }

  const nums = matches
    .map((m) => parseInt(m[1].replace('KB-', ''), 10))
    .filter((n) => !Number.isNaN(n));

  const max = Math.max(...nums);
  return `KB-${String(max + 1).padStart(3, '0')}`;
}

function addPlanItem({ planPath, text, owner, priority }) {
  if (!fs.existsSync(planPath)) {
    throw new Error(`Queue file not found at: ${planPath}. Expected strategic-backlog.md (or legacy finalization-plan.md). Run kb init first.`);
  }

  const content = fs.readFileSync(planPath, 'utf8');
  const id = nextId(content);
  const today = new Date().toISOString().slice(0, 10);
  const newRow = `| ${id} | ${text} | ${owner} | ${priority} | ${today} | todo | |`;

  // Insert before the first "## Add / Edit / Delete" section or at end of last table row
  const insertMarker = '## Add / Edit / Delete';
  if (content.includes(insertMarker)) {
    const updated = content.replace(insertMarker, `${newRow}\n\n${insertMarker}`);
    fs.writeFileSync(planPath, updated, 'utf8');
  } else {
    // Append to end of file
    const updated = content.trimEnd() + '\n' + newRow + '\n';
    fs.writeFileSync(planPath, updated, 'utf8');
  }

  return id;
}

function listPlanItems({ planPath }) {
  if (!fs.existsSync(planPath)) {
    throw new Error(`Queue file not found at: ${planPath}. Expected strategic-backlog.md (or legacy finalization-plan.md). Run kb init first.`);
  }

  const content = fs.readFileSync(planPath, 'utf8');
  const rows = [];

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\|\s*(KB-\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/);
    if (!match) continue;
    const [, id, item, owner, priority, due, status] = match;
    if (id === 'ID') continue; // header row
    rows.push({ id, item, owner, priority, due, status: status.trim() });
  }

  return rows;
}

async function runPlan({ args, cwd }) {
  const options = parseArgs(args);

  if (options.subcommand === 'add') {
    const planPath = resolvePlanPath(cwd);
    const id = addPlanItem({ planPath, text: options.text, owner: options.owner, priority: options.priority });
    console.log(`Added: ${id} — ${options.text}`);
    return;
  }

  if (options.subcommand === 'list') {
    const planPath = resolvePlanPath(cwd);
    const items = listPlanItems({ planPath });

    if (items.length === 0) {
      console.log('No plan items found.');
      return;
    }

    const pending = items.filter((r) => r.status !== 'done');
    const done = items.filter((r) => r.status === 'done');
    console.log(`\nPending (${pending.length}):`);
    for (const r of pending) {
      console.log(`  [${r.priority}] ${r.id} — ${r.item} (${r.status})`);
    }

    if (done.length > 0) {
      console.log(`\nDone (${done.length}):`);
      for (const r of done) {
        console.log(`  ${r.id} — ${r.item}`);
      }
    }
  }
}

module.exports = {
  runPlan,
};
