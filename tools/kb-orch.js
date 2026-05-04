'use strict';

const { runPlan } = require('./orch');

function parseArgs(argv) {
  const [subcommand, maybePlanPath, ...rest] = argv;

  if (!subcommand || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    return { mode: 'help' };
  }

  if (subcommand !== 'run') {
    throw new Error(`Unknown subcommand: ${subcommand}`);
  }

  if (!maybePlanPath) {
    throw new Error('Missing plan path. Usage: node tools/kb-orch.js run <plan.json> [--dry-run] [--output <file>]');
  }

  let dryRun = false;
  let outputPath = null;

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (token === '--output') {
      outputPath = rest[i + 1] || null;
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${token}`);
  }

  return {
    mode: 'run',
    planPath: maybePlanPath,
    dryRun,
    outputPath,
  };
}

function printHelp() {
  console.log('KB Local Test Orchestrator');
  console.log('Usage: node tools/kb-orch.js run <plan.json> [--dry-run] [--output <file>]');
  console.log('Default report path: notes/orch-reports/kb-orch-report-<timestamp>.json');
}

async function main(argv) {
  const parsed = parseArgs(argv);

  if (parsed.mode === 'help') {
    printHelp();
    return 0;
  }

  const result = await runPlan(parsed.planPath, {
    dryRun: parsed.dryRun,
    outputPath: parsed.outputPath,
    workspaceRoot: process.cwd(),
  });

  console.log(JSON.stringify({
    planId: result.report.planId,
    summary: result.report.summary,
    outputPath: result.outputPath,
    ok: result.ok,
  }, null, 2));

  return result.ok ? 0 : 1;
}

if (require.main === module) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error.message || String(error));
      process.exitCode = 1;
    });
}

module.exports = {
  parseArgs,
  main,
};
