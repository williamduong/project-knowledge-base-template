const path = require('path');

const packageJson = require('../package.json');
const { runHelp } = require('./commands/help');
const { runInit } = require('./commands/init');

const PLANNED_COMMANDS = new Set(['show', 'hide', 'test', 'sync', 'update']);

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

  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(packageJson.version);
    return;
  }

  if (PLANNED_COMMANDS.has(command)) {
    throw new Error(`Command \"${command}\" is planned but not implemented yet.`);
  }

  throw new Error(`Unknown command \"${command}\". Run \"kb help\" for usage.`);
}

module.exports = {
  run,
};