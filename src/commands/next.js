'use strict';

const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { readImpactFile } = require('../lib/impact');
const { buildDocumentIndex } = require('../lib/kb-analysis');
const { readSourceIndex } = require('../lib/source-index');
const { collectNextActions } = require('../lib/work-queue');

function parseArgs(args) {
  const options = { json: false };
  for (const arg of args || []) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    throw new Error(`Unknown next option "${arg}". Supported: --json`);
  }
  return options;
}

function printSection(title, items, limit, render) {
  if (!items.length) return;
  console.log('');
  console.log(`${title} (${items.length}):`);
  for (const item of items.slice(0, limit)) {
    render(item);
  }
  if (items.length > limit) {
    console.log(`  ... +${items.length - limit} more`);
  }
}

function runNext({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const ctx = resolveExistingState({ workspaceRoot });
  const impactData = readImpactFile(ctx.contentRoot) || { impacted: [], unbound_changes: [] };
  const documents = buildDocumentIndex({ contentRoot: ctx.contentRoot, workspaceRoot });
  const sourceIndex = readSourceIndex(ctx.contentRoot);
  const queue = collectNextActions({ impactData, documents, sourceIndex, now: new Date() });

  if (options.json) {
    console.log(JSON.stringify({ command: 'kb next', ...queue }, null, 2));
    return;
  }

  if (queue.summary.total === 0) {
    console.log('kb next: KB clean — no actions needed');
    return;
  }

  console.log(`kb next: ${queue.summary.total} actionable item(s) (drift=${queue.summary.drift}, review=${queue.summary.review}, missing=${queue.summary.missing}, source=${queue.summary.source})`);
  if (queue.nextBestAction) {
    const top = queue.nextBestAction.sourcePath || queue.nextBestAction.doc;
    console.log('');
    console.log(`-> Next best action: ${queue.nextBestAction.command}   (${top})`);
  }

  printSection('Drift unresolved', queue.sections.drift, 3, (item) => {
    console.log(`  - ${item.doc} (${item.matchedChangeCount} binding change${item.matchedChangeCount === 1 ? '' : 's'}${item.autoDowngraded ? ', auto-downgraded' : ''})`);
    console.log(`    -> ${item.command}`);
  });

  printSection('Review backlog', queue.sections.review, 3, (item) => {
    const age = item.ageDays === null ? 'age unknown' : `${item.ageDays} day(s)`;
    console.log(`  - ${item.doc} (${age})`);
    console.log(`    -> ${item.command}`);
  });

  printSection('Missing critical', queue.sections.missing, 3, (item) => {
    console.log(`  - ${item.doc} (template/unset)`);
    console.log(`    -> ${item.command}`);
  });

  printSection('Source mirror', queue.sections.source, 3, (item) => {
    console.log(`  - ${item.sourcePath} (stale)`);
    console.log(`    -> ${item.command}`);
  });
}

module.exports = {
  runNext,
  parseArgs,
};