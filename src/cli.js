const path = require('path');

const packageJson = require('../package.json');
const { runHelp } = require('./commands/help');
const { runInit } = require('./commands/init');
const { runShow } = require('./commands/show');
const { runHide } = require('./commands/hide');
const { runTest } = require('./commands/test');
const { runSync } = require('./commands/sync');
const { runUpdate } = require('./commands/update');

async function run(argv) {
  const [command = 'help', ...rest] = argv;

  if (command === 'help' || command === '--help' || command === '-h') {
    runHelp({ packageJson });
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

  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(packageJson.version);
    return;
  }

  throw new Error(`Unknown command \"${command}\". Run \"kb help\" for usage.`);
}

module.exports = {
  run,
};