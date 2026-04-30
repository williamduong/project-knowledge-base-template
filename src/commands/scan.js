const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { computeImpact, deriveVerdict, writeImpactFile } = require('../lib/impact');

function parseArgs(args) {
  const options = { json: false, quiet: false };
  for (const arg of args || []) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--quiet') {
      options.quiet = true;
      continue;
    }
    throw new Error(`Unknown scan option "${arg}". Supported: --json, --quiet`);
  }
  return options;
}

function printHumanReport(impactData, verdict, filePath) {
  console.log(`kb scan: ${verdict.label}${verdict.reason ? ` (${verdict.reason})` : ''}`);
  console.log(`  baseline: ${impactData.baseline || 'NOT_AVAILABLE'}`);
  console.log(`  head    : ${impactData.head || 'NOT_AVAILABLE'}`);
  console.log(`  scanned : ${impactData.scanned_at}`);
  console.log(`  written : ${filePath}`);

  if (impactData.skipped_reason) {
    console.log(`  skipped : ${impactData.skipped_reason}`);
    return;
  }

  console.log(`  impacted docs   : ${impactData.impacted.length}`);
  for (const item of impactData.impacted) {
    console.log(`    - ${item.doc}  (${item.matched_changes.length} match, source=${item.binding_source})`);
  }

  console.log(`  unbound changes : ${impactData.unbound_changes.length}`);
  for (const p of impactData.unbound_changes.slice(0, 10)) {
    console.log(`    - ${p}`);
  }
  if (impactData.unbound_changes.length > 10) {
    console.log(`    ... +${impactData.unbound_changes.length - 10} more`);
  }

  console.log(`  KB self-edits   : ${impactData.self_edits.length}`);
}

function runScan({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });

  const impactData = computeImpact({ workspaceRoot, ctx: context });
  const filePath = writeImpactFile(context.contentRoot, impactData);
  const verdict = deriveVerdict(impactData);

  if (options.quiet) {
    console.log(verdict.label);
  } else if (options.json) {
    console.log(JSON.stringify({
      command: 'kb scan',
      written: filePath,
      verdict,
      impact: impactData,
    }, null, 2));
  } else {
    printHumanReport(impactData, verdict, filePath);
  }

  if (verdict.code !== 0) {
    process.exit(verdict.code);
  }
}

module.exports = {
  runScan,
};
