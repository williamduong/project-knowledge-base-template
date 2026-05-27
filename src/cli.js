const path = require('path');

const packageJson = require('../package.json');
const { runHelp } = require('./commands/kbx/help');
const { runInit } = require('./commands/kbx/init');
const { runShow } = require('./commands/kbx/show');
const { runHide } = require('./commands/kbx/hide');
const { runTest } = require('./commands/kbx/test');
const { runSync } = require('./commands/kbx/sync');
const { runUpdate } = require('./commands/kbx/update');
const { runDoctor } = require('./commands/dna-tmp/doctor');
const { runBootstrap } = require('./commands/kbx/bootstrap');
const { runPlan } = require('./commands/svfactory/plan');
const { runIndex } = require('./commands/kbx/index');
const { runQuestions } = require('./commands/svfactory/questions');
const { runMark } = require('./commands/dna-tmp/mark');
const { runNormalizeState } = require('./commands/dna-tmp/normalize-state');
const { runBootstrapApi } = require('./commands/dna-tmp/bootstrap-api');
const { runUninstall } = require('./commands/kbx/uninstall');
const { runMaintain } = require('./commands/dna-tmp/maintain');
const { runStatus } = require('./commands/dna-tmp/status');
const { runIde } = require('./commands/dna-tmp/ide');
const { runBind } = require('./commands/svfactory/bind');
const { runScan } = require('./commands/dna-tmp/scan');
const { runImpact } = require('./commands/dna-tmp/impact');
const { runVerify } = require('./commands/dna-tmp/verify');
const { runBaseline } = require('./commands/dna-tmp/baseline');
const { runRelease } = require('./commands/kbx/release');
const { runIntent } = require('./commands/kbx/intent');
const { runChaos } = require('./commands/dna-tmp/chaos');
const { runGraph } = require('./commands/svfactory/graph');
const { runCodeGraph } = require('./commands/svfactory/code-graph');
const { runKnowledgeGraph } = require('./commands/svfactory/knowledge-graph');
const { runLlm } = require('./commands/dna-tmp/llm');
const { runExtract } = require('./commands/kbx/extract');
const { runIngest } = require('./commands/kbx/ingest');
const { runNext } = require('./commands/dna-tmp/next');
const { runMigrate } = require('./commands/kbx/migrate');
const { runWorkspace } = require('./commands/svfactory/workspace');
const runOntology = require('./commands/kbx/ontology');
const { runRules } = require('./commands/svfactory/rules');
const { runUi } = require('./commands/svfactory/ui');
const { runGates } = require('./commands/svfactory/gates');

async function run(argv) {
  const [command = 'help', ...rest] = argv;

  if (command === 'help' || command === '--help' || command === '-h') {
    runHelp({ packageJson, args: rest });
    return;
  }

  if (command === 'init') {
    await runInit({ args: rest, packageJson, cwd: process.cwd(), repoRoot: path.resolve(__dirname, '..') });
    return;
  }

  if (command === 'show') {
    await runShow({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'hide') {
    await runHide({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'test') {
    await runTest({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'sync') {
    await runSync({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'update') {
    await runUpdate({ args: rest, cwd: process.cwd(), repoRoot: path.resolve(__dirname, '..') });
    return;
  }

  if (command === 'maintain') {
    await runMaintain({ args: rest, cwd: process.cwd(), packageJson });
    return;
  }

  if (command === 'doctor') {
    await runDoctor({ args: rest, cwd: process.cwd(), packageJson });
    return;
  }

  if (command === 'status') {
    await runStatus({ args: rest, cwd: process.cwd(), packageJson });
    return;
  }

  if (command === 'ide') {
    await runIde({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'bind') {
    await runBind({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'scan') {
    await runScan({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'impact') {
    await runImpact({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'verify') {
    await runVerify({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'baseline') {
    await runBaseline({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'release') {
    await runRelease({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'intent') {
    await runIntent({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'chaos') {
    await runChaos({ args: rest, cwd: process.cwd(), packageJson });
    return;
  }

  if (command === 'graph') {
    runGraph(rest, { workspaceRoot: process.cwd() });
    return;
  }

  if (command === 'code-graph') {
    await runCodeGraph(rest);
    return;
  }

  if (command === 'knowledge-graph') {
    await runKnowledgeGraph(rest);
    return;
  }

  if (command === 'llm') {
    await runLlm(rest);
    return;
  }

  if (command === 'extract') {
    await runExtract({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'ingest') {
    await runIngest({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'next') {
    await runNext({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'migrate') {
    await runMigrate({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'workspace') {
    await runWorkspace({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'bootstrap') {
    await runBootstrap({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'plan') {
    await runPlan({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'index') {
    await runIndex({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'questions') {
    await runQuestions({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'mark') {
    await runMark({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'normalize-state') {
    await runNormalizeState({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'bootstrap-api') {
    await runBootstrapApi({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'uninstall') {
    await runUninstall({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'ontology') {
    const result = runOntology({ packageJson, args: rest });
    if (result.exitCode && result.exitCode !== 0) {
      process.exit(result.exitCode);
    }
    return;
  }

  if (command === 'rules') {
    await runRules({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'gates') {
    await runGates({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === 'ui') {
    await runUi({ args: rest, cwd: process.cwd() });
    return;
  }

  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(packageJson.version);
    return;
  }

  throw new Error(`Unknown command \"${command}\". Run \"kbx help\" for usage.`);
}

module.exports = {
  run,
};
