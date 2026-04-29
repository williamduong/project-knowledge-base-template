const path = require('path');

const packageJson = require('../package.json');
const { runHelp } = require('./commands/help');
const { runInit } = require('./commands/init');
const { runShow } = require('./commands/show');
const { runHide } = require('./commands/hide');
const { runTest } = require('./commands/test');
const { runSync } = require('./commands/sync');
const { runUpdate } = require('./commands/update');
const { runDoctor } = require('./commands/doctor');
const { runBootstrap } = require('./commands/bootstrap');
const { runPlan } = require('./commands/plan');
const { runIndex } = require('./commands/index');
const { runQuestions } = require('./commands/questions');
const { runMark } = require('./commands/mark');
const { runNormalizeState } = require('./commands/normalize-state');
const { runBootstrapApi } = require('./commands/bootstrap-api');

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

  if (command === 'doctor') {
    await runDoctor({ args: rest, cwd: process.cwd(), packageJson });
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

  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(packageJson.version);
    return;
  }

  throw new Error(`Unknown command \"${command}\". Run \"kb help\" for usage.`);
}

module.exports = {
  run,
};